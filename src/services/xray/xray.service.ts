import { randomUUID } from "crypto";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { XrayBackupData } from "@/types/server";
import { TimeContract } from "@/contracts/time";
import { XrayConnection } from "@/helpers/xrayConnection";
import { encodeVpnConfig } from "@/helpers/encodeVpnConfig";
import { XrayClientEntry, XrayServerConfig } from "@/types/xray";
import { TrafficStats, CreateClientResult } from "@/types/clients";
import { ClientPeer, PeerStatus, ClientRecord } from "@/types/clients";
import { Protocol, ClientErrorCode, ServerErrorCode } from "@/types/shared";

/**
 * Сервис для работы с Xray
 */
export class XrayService {
  static key = "xrayService";

  // Шаблон клиентского конфига Xray
  private static readonly XRAY_CLIENT_TEMPLATE = `{
    "log": {
      "loglevel": "error"
    },
    "inbounds": [
      {
        "listen": "127.0.0.1",
        "port": 10808,
        "protocol": "socks",
        "settings": {
          "udp": true
        }
      }
    ],
    "outbounds": [
      {
        "protocol": "vless",
        "settings": {
          "vnext": [
            {
              "address": "$SERVER_IP_ADDRESS",
              "port": $XRAY_SERVER_PORT,
              "users": [
                {
                  "id": "$XRAY_CLIENT_ID",
                  "flow": "xtls-rprx-vision",
                  "encryption": "none"
                }
              ]
            }
          ]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "chrome",
            "serverName": "$XRAY_SITE_NAME",
            "publicKey": "$XRAY_PUBLIC_KEY",
            "shortId": "$XRAY_SHORT_ID",
            "spiderX": ""
          }
        }
      }
    ]
  }`;

  constructor(private xray: XrayConnection) {}

  /**
   * Экспортировать данные Xray для резервной копии
   */
  async exportBackup(): Promise<XrayBackupData> {
    const [serverConfig, uuidRaw, publicKeyRaw, privateKeyRaw, shortIdRaw] =
      await Promise.all([
        this.xray.readServerConfig(),
        this.xray.readFile(AppContract.Xray.PATHS.UUID),
        this.xray.readFile(AppContract.Xray.PATHS.PUBLIC_KEY),
        this.xray.readFile(AppContract.Xray.PATHS.PRIVATE_KEY),
        this.xray.readFile(AppContract.Xray.PATHS.SHORT_ID),
      ]);

    return {
      serverConfig,
      uuid: uuidRaw.trim(),
      publicKey: publicKeyRaw.trim(),
      privateKey: privateKeyRaw.trim(),
      shortId: shortIdRaw.trim(),
    };
  }

  /**
   * Импортировать данные Xray из резервной копии
   */
  async importBackup(data: XrayBackupData): Promise<void> {
    await Promise.all([
      this.xray.writeServerConfig(data.serverConfig),
      this.xray.writeFile(AppContract.Xray.PATHS.UUID, `${data.uuid.trim()}\n`),
      this.xray.writeFile(
        AppContract.Xray.PATHS.PUBLIC_KEY,
        `${data.publicKey.trim()}\n`,
      ),
      this.xray.writeFile(
        AppContract.Xray.PATHS.PRIVATE_KEY,
        `${data.privateKey.trim()}\n`,
      ),
      this.xray.writeFile(
        AppContract.Xray.PATHS.SHORT_ID,
        `${data.shortId.trim()}\n`,
      ),
    ]);

    await this.xray.restartContainer();
  }

  /**
   * Получить статистику трафика всех пользователей одним запросом к Xray Stats API
   */
  private async getAllTrafficStats(): Promise<Map<string, TrafficStats>> {
    const serverAddr = `127.0.0.1:${AppContract.Xray.DEFAULTS.API_PORT}`;
    const cmd = `xray api statsquery -server=${serverAddr} -pattern "user>>>" || true`;

    const stats = new Map<string, TrafficStats>();

    try {
      const { stdout } = await this.xray.run(cmd, {
        timeout: 3 * TimeContract.SECOND,
      });

      const parsed = JSON.parse(stdout || "{}") as {
        stat?: { name?: string; value?: string }[];
      };

      for (const item of parsed.stat ?? []) {
        const match = (item?.name ?? "").match(
          /^user>>>(.+)>>>traffic>>>(uplink|downlink)$/,
        );
        if (!match) continue;

        const [, id, direction] = match;
        const value = Number(item?.value ?? 0) || 0;

        const entry = stats.get(id) ?? { sent: 0, received: 0 };
        if (direction === "uplink") entry.sent = value;
        else entry.received = value;
        stats.set(id, entry);
      }
    } catch {
      // Статистика недоступна
    }

    return stats;
  }

  /**
   * Преобразовать json-конфигурацию
   */
  private parseServerConfig(raw: string): XrayServerConfig {
    if (!raw) return {};

    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as XrayServerConfig)
        : {};
    } catch {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Получить список клиентов
   */
  async getClients(): Promise<ClientRecord[]> {
    const configRaw = await this.xray.readServerConfig();
    const serverConfig = this.parseServerConfig(configRaw);

    // Входные точки
    const inbounds = Array.isArray(serverConfig.inbounds)
      ? serverConfig.inbounds
      : [];

    if (!inbounds.length) return [];

    // Первая входная точка
    const inbound = inbounds[0];

    // Клиенты внутри первой входной точки
    const clients = Array.isArray(inbound?.settings?.clients)
      ? inbound.settings?.clients
      : [];
    const clientsDisabled = Array.isArray(inbound?.settings?.clientsDisabled)
      ? inbound.settings?.clientsDisabled
      : [];

    // Один запрос статистики на весь список клиентов
    const trafficById = await this.getAllTrafficStats();

    const activeEntries: (ClientPeer & { username: string })[] = clients.map(
      (client: XrayClientEntry, index: number) => {
        // id
        const id = (client.id ?? "").trim() || `xray-client-${index + 1}`;

        // username
        const username = (client.username ?? "").trim() || id;

        // expiresAt (seconds)
        const expiresAt =
          typeof client.expiresAt === "number" ? client.expiresAt : null;
        const status = PeerStatus.Active;

        // Статистика трафика из заранее полученной карты
        const traffic = trafficById.get(id);

        return {
          username,
          id,
          name: null,
          allowedIps: [],
          lastHandshake: 0,
          traffic: {
            received: traffic?.received ?? 0,
            sent: traffic?.sent ?? 0,
          },
          endpoint: null,
          online: false,
          expiresAt,
          status,
          protocol: Protocol.XRAY,
        };
      },
    );

    const disabledEntries: (ClientPeer & { username: string })[] =
      clientsDisabled.map((client: XrayClientEntry, index: number) => {
        const id = (client.id ?? "").trim() || `xray-disabled-${index + 1}`;
        const username = (client.username ?? "").trim() || id;
        const expiresAt =
          typeof client.expiresAt === "number" ? client.expiresAt : null;

        return {
          username,
          id,
          name: null,
          allowedIps: [],
          lastHandshake: 0,
          traffic: { received: 0, sent: 0 },
          endpoint: null,
          online: false,
          expiresAt,
          status: PeerStatus.Disabled,
          protocol: Protocol.XRAY,
        };
      });

    const peerEntries: (ClientPeer & { username: string })[] = [
      ...activeEntries,
      ...disabledEntries,
    ];

    const users = new Map<string, ClientRecord>();

    for (const { username, ...peer } of peerEntries) {
      const entry = users.get(username) || { username, peers: [] };
      entry.peers.push(peer);
      users.set(username, entry);
    }

    return Array.from(users.values());
  }

  /**
   * Создать пользователя
   */
  async createClient(
    clientName: string,
    options?: { expiresAt?: number | null },
  ): Promise<CreateClientResult> {
    const clientId = randomUUID();

    // Считываем конфиг сервера
    const rawConfig = await this.xray.readServerConfig();
    const serverConfig = this.parseServerConfig(rawConfig);

    // Входные точки
    const inbounds = Array.isArray(serverConfig.inbounds)
      ? serverConfig.inbounds
      : [];

    // Если нет входных точек, то ошибка
    if (!inbounds.length) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Первая входная точка
    const inbound = inbounds[0];

    // Настройки первой входной точки
    const settings = inbound.settings;
    if (!settings) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Клиенты внутри первой входной точки
    const clients = Array.isArray(settings.clients) ? settings.clients : [];

    // Если нет клиентов, то ошибка
    if (!Array.isArray(clients)) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Если клиент уже существует, то ошибка
    if (clients.some((client) => client?.id === clientId)) {
      throw new APIError(ClientErrorCode.CONFLICT);
    }

    // Добавляем клиента в конфиг
    clients.push({
      id: clientId,
      flow: "xtls-rprx-vision",
      username: clientName,
      expiresAt: options?.expiresAt ?? null,
    });

    // Обновляем конфиг
    inbound.settings = {
      ...settings,
      clients,
    };

    // Обновляем конфиг сервера
    inbounds[0] = inbound;
    serverConfig.inbounds = inbounds;

    // Обновляем конфиг сервера
    const updatedConfigString = JSON.stringify(serverConfig, null, 2);
    await this.xray.writeServerConfig(updatedConfigString);
    await this.xray.restartContainer();

    // Хост сервера
    const serverHost = appConfig.SERVER_PUBLIC_HOST || "";

    // Порт сервера
    const xrayPort =
      typeof inbound?.port === "number"
        ? inbound.port
        : Number(AppContract.Xray.DEFAULTS.PORT);

    // Название сайта
    const siteName =
      serverConfig?.inbounds?.[0]?.streamSettings?.realitySettings
        ?.serverNames?.[0] ?? AppContract.Xray.DEFAULTS.SITE;

    // Публичный ключ
    const publicKey = (
      await this.xray.readFile(AppContract.Xray.PATHS.PUBLIC_KEY)
    ).trim();

    // Short ID
    const shortId = (
      await this.xray.readFile(AppContract.Xray.PATHS.SHORT_ID)
    ).trim();

    // Если нет публичного ключа или ID, то ошибка
    if (!publicKey || !shortId) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Шаблон клиентского конфига
    const template = XrayService.XRAY_CLIENT_TEMPLATE.replace(
      /\$SERVER_IP_ADDRESS/g,
      serverHost || AppContract.Xray.DEFAULTS.SITE,
    )
      .replace(/\$XRAY_SERVER_PORT/g, String(xrayPort))
      .replace(/\$XRAY_CLIENT_ID/g, clientId)
      .replace(/\$XRAY_PUBLIC_KEY/g, publicKey)
      .replace(/\$XRAY_SHORT_ID/g, shortId)
      .replace(/\$XRAY_SITE_NAME/g, siteName);

    // Парсим шаблон клиентского конфига
    let xrayConfigData: unknown;
    try {
      xrayConfigData = JSON.parse(template);
    } catch {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Конфиг клиента
    const xrayConfigString = JSON.stringify(xrayConfigData, null, 2);

    // DNS сервера
    const dns1 = AppContract.DNS.PRIMARY;
    const dns2 = AppContract.DNS.SECONDARY;

    // Конфиг контейнера Xray
    const xrayContainerConfig = {
      container: AppContract.Xray.DOCKER_CONTAINER,
      xray: {
        last_config: xrayConfigString,
        port: xrayPort,
        site: siteName,
        transport_proto: "tcp",
      },
    };

    // Поддерживаемые плейсхолдеры в appConfig.SERVER_NAME:
    // {protocol} — протокол подключения (например, "Xray")
    // {username} — имя клиента (clientName)
    const baseServerName = appConfig.SERVER_NAME || "";
    const protocolName = "Xray";
    let description = baseServerName;

    if (/\{protocol\}|\{username\}/i.test(baseServerName)) {
      description = baseServerName
        .replace(/\{protocol\}/gi, protocolName)
        .replace(/\{username\}/gi, clientName);
    } else if (!baseServerName) {
      description = `${clientName} | ${protocolName}`;
    }

    // JSON для сервера
    const serverJson = {
      containers: [xrayContainerConfig],
      defaultContainer: AppContract.Xray.DOCKER_CONTAINER,
      description,
      dns1,
      dns2,
      hostName: serverHost,
    };

    // Кодируем конфиг в формат vpn:// для импорта в приложение
    const clientConfig = encodeVpnConfig(serverJson);

    return {
      id: clientId,
      config: clientConfig,
      protocol: Protocol.XRAY,
    };
  }

  /**
   * Обновить expiresAt клиента
   */
  async updateClient(
    clientId: string,
    options: { expiresAt?: number | null; status?: PeerStatus },
  ): Promise<boolean> {
    const rawConfig = await this.xray.readServerConfig();

    if (!rawConfig) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    const serverConfig = this.parseServerConfig(rawConfig);

    const inbounds = Array.isArray(serverConfig.inbounds)
      ? serverConfig.inbounds
      : [];

    if (!inbounds.length) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    const inbound = inbounds[0];
    const settings = inbound.settings;

    if (!settings) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    const clients = Array.isArray(settings.clients) ? settings.clients : [];
    const clientsDisabled = Array.isArray(settings.clientsDisabled)
      ? settings.clientsDisabled
      : [];

    const now = Math.floor(Date.now() / 1000);
    const isExpired =
      typeof options.expiresAt === "number" && options.expiresAt <= now;
    const targetStatus =
      options.status ??
      (options.expiresAt !== undefined
        ? isExpired
          ? PeerStatus.Disabled
          : PeerStatus.Active
        : null);

    const activeIndex = clients.findIndex(
      (client: { id?: string }) => client?.id === clientId,
    );
    const disabledIndex = clientsDisabled.findIndex(
      (client: { id?: string }) => client?.id === clientId,
    );

    if (activeIndex < 0 && disabledIndex < 0) return false;

    if (activeIndex >= 0) {
      const updated = {
        ...clients[activeIndex],
        ...(options.expiresAt !== undefined
          ? { expiresAt: options.expiresAt }
          : {}),
      };
      if (targetStatus === PeerStatus.Disabled) {
        clients.splice(activeIndex, 1);
        clientsDisabled.push(updated);
      } else {
        clients[activeIndex] = updated;
      }
    } else if (disabledIndex >= 0) {
      const updated = {
        ...clientsDisabled[disabledIndex],
        ...(options.expiresAt !== undefined
          ? { expiresAt: options.expiresAt }
          : {}),
      };
      if (targetStatus === PeerStatus.Active) {
        clientsDisabled.splice(disabledIndex, 1);
        clients.push(updated);
      } else {
        clientsDisabled[disabledIndex] = updated;
      }
    }

    inbound.settings = {
      ...settings,
      clients,
      clientsDisabled,
    };
    inbounds[0] = inbound;
    serverConfig.inbounds = inbounds;

    await this.xray.writeServerConfig(JSON.stringify(serverConfig, null, 2));
    await this.xray.restartContainer();

    return true;
  }

  /**
   * Удалить пользователя
   */
  async deleteClient(clientId: string): Promise<boolean> {
    const rawConfig = await this.xray.readServerConfig();

    // Если нет конфига, то ошибка
    if (!rawConfig) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Парсим конфиг сервера
    const serverConfig = this.parseServerConfig(rawConfig);

    // Входные точки
    const inbounds = Array.isArray(serverConfig.inbounds)
      ? serverConfig.inbounds
      : [];

    // Если нет входных точек, то ошибка
    if (!inbounds.length) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Первая входная точка
    const inbound = inbounds[0];

    // Настройки первой входной точки
    const settings = inbound.settings;

    // Если нет настроек или нет клиентов, то ошибка
    if (!settings || !Array.isArray(settings.clients)) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    // Длина клиентов
    const initialLength = settings.clients.length;

    // Удаляем клиента
    settings.clients = settings.clients.filter(
      (client: { id?: string }) => client?.id !== clientId,
    );

    // Если клиенты не изменились, то ошибка
    if (settings.clients.length === initialLength) {
      return false;
    }

    // Обновляем конфиг
    inbound.settings = settings;
    inbounds[0] = inbound;
    serverConfig.inbounds = inbounds;

    // Обновляем конфиг сервера
    await this.xray.writeServerConfig(JSON.stringify(serverConfig, null, 2));

    // Перезапускаем контейнер
    await this.xray.restartContainer();

    return true;
  }

  /**
   * Заблокировать (отключить) всех клиентов с истекшим сроком действия
   * Записи не удаляются: клиенты переносятся в clientsDisabled
   */
  async disableExpiredClients(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    const rawConfig = await this.xray.readServerConfig();
    if (!rawConfig) {
      throw new APIError(ServerErrorCode.INTERNAL_SERVER_ERROR);
    }

    const serverConfig = this.parseServerConfig(rawConfig);

    const inbounds = Array.isArray(serverConfig.inbounds)
      ? serverConfig.inbounds
      : [];

    if (!inbounds.length) return 0;

    const inbound = inbounds[0];
    const settings = inbound.settings;
    const clients = Array.isArray(settings?.clients) ? settings!.clients! : [];
    const clientsDisabled = Array.isArray(settings?.clientsDisabled)
      ? settings!.clientsDisabled!
      : [];

    if (!clients.length) return 0;

    const isExpired = (client: XrayClientEntry): boolean => {
      const expiresAt = client?.expiresAt;
      return typeof expiresAt === "number" && expiresAt > 0 && expiresAt <= now;
    };

    const expired = clients.filter((c) => isExpired(c));
    const kept = clients.filter((c) => !isExpired(c));

    if (!expired.length) return 0;

    // Обновляем конфиг и применяем один раз
    inbound.settings = {
      ...(settings ?? {}),
      clients: kept,
      clientsDisabled: [...clientsDisabled, ...expired],
    };
    inbounds[0] = inbound;
    serverConfig.inbounds = inbounds;

    await this.xray.writeServerConfig(JSON.stringify(serverConfig, null, 2));
    await this.xray.restartContainer();

    return expired.length;
  }
}
