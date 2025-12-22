import { deflateSync } from "zlib";
import { randomUUID } from "crypto";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { XrayBackupData } from "@/types/server";
import { UserRecord, UserDevice } from "@/types/users";
import { XrayConnection } from "@/helpers/xrayConnection";
import { XrayClientEntry, XrayServerConfig } from "@/types/xray";
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
        `${data.publicKey.trim()}\n`
      ),
      this.xray.writeFile(
        AppContract.Xray.PATHS.PRIVATE_KEY,
        `${data.privateKey.trim()}\n`
      ),
      this.xray.writeFile(
        AppContract.Xray.PATHS.SHORT_ID,
        `${data.shortId.trim()}\n`
      ),
    ]);

    await this.xray.restartContainer();
  }

  /**
   * Получить статистику трафика пользователя из Xray Stats API
   */
  private async getUserTrafficStats(
    id: string
  ): Promise<{ received: number; sent: number } | null> {
    const serverAddr = `127.0.0.1:${AppContract.Xray.DEFAULTS.API_PORT}`;

    const parseValue = (output: string): number => {
      const match = output.match(/"value"\s*:\s*"?(\d+)"?/);
      return match ? Number(match[1]) : 0;
    };

    const escapedId = id.replace(/"/g, '\\"');

    const uplinkCmd = `xray api stats -server=${serverAddr} -name "user>>>${escapedId}>>>traffic>>>uplink" -reset=false || true`;
    const downlinkCmd = `xray api stats -server=${serverAddr} -name "user>>>${escapedId}>>>traffic>>>downlink" -reset=false || true`;

    try {
      const [up, down] = await Promise.all([
        this.xray.run(uplinkCmd, { timeout: 2000 }),
        this.xray.run(downlinkCmd, { timeout: 2000 }),
      ]);

      return {
        sent: parseValue(up.stdout),
        received: parseValue(down.stdout),
      };
    } catch {
      return null;
    }
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
   * Получить список пользователей
   */
  async getUsers(): Promise<UserRecord[]> {
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

    // Устройства пользователей
    const devices: (UserDevice & { username: string })[] = await Promise.all(
      clients.map(async (client: XrayClientEntry, index: number) => {
        // id
        const id = (client.id ?? "").trim() || `xray-client-${index + 1}`;

        // username
        const username = (client.username ?? "").trim() || id;

        // expiresAt (seconds)
        const expiresAt =
          typeof client.expiresAt === "number" ? client.expiresAt : null;

        // Получить статистику трафика
        const traffic = await this.getUserTrafficStats(id);

        // Устройство пользователя
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
          protocol: Protocol.XRAY,
        };
      })
    );

    const users = new Map<string, UserRecord>();

    for (const { username, ...device } of devices) {
      const entry = users.get(username) || { username, devices: [] };
      entry.devices.push(device);
      users.set(username, entry);
    }

    return Array.from(users.values());
  }

  /**
   * Создать пользователя
   */
  async createClient(
    clientName: string,
    options?: { expiresAt?: number | null }
  ): Promise<{
    id: string;
    config: string;
    protocol: Protocol;
  }> {
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
    const siteName = AppContract.Xray.DEFAULTS.SITE;

    // Публичный ключ
    const publicKey = (
      await this.xray.readFile(AppContract.Xray.PATHS.PUBLIC_KEY)
    ).trim();

    // ID
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
      serverHost || AppContract.Xray.DEFAULTS.SITE
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
    const dns1 =
      (
        await this.xray.run(
          `getent hosts 1.1.1.1 >/dev/null 2>&1 && echo 1.1.1.1 || echo 1.1.1.1`
        )
      ).stdout.trim() || "1.1.1.1";

    const dns2 =
      (
        await this.xray.run(
          `getent hosts 1.0.0.1 >/dev/null 2>&1 && echo 1.0.0.1 || echo 1.0.0.1`
        )
      ).stdout.trim() || "1.0.0.1";

    // Конфиг контейнера Xray
    const xrayContainerConfig = {
      container: AppContract.Xray.DOCKER_CONTAINER,
      xray: {
        last_config: xrayConfigString,
        port: xrayPort,
        site: siteName,
        public_key: publicKey,
        short_id: shortId,
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

    // Данные для сервера
    const rawData = Buffer.from(JSON.stringify(serverJson), "utf-8");

    // Заголовок с размером данных
    const header = Buffer.alloc(4);
    header.writeUInt32BE(rawData.length, 0);

    // Сжимаем данные
    const compressedData = deflateSync(rawData, { level: 8 });

    // Объединяем заголовок и сжатые данные
    const finalBuffer = Buffer.concat([header, compressedData]);

    // Конвертируем в base64 и делаем URL-safe
    const base64String = finalBuffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    // Конфиг клиента
    const clientConfig = `vpn://${base64String}`;

    return {
      id: clientId,
      config: clientConfig,
      protocol: Protocol.XRAY,
    };
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
      (client: { id?: string }) => client?.id !== clientId
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

    // Перезапускаем контейнер Xray ???????????????
    // Узнать, нужно ли это
    await this.xray.restartContainer();

    return true;
  }

  /**
   * Удалить всех клиентов с истекшим сроком действия
   */
  async cleanupExpiredClients(): Promise<number> {
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

    if (!clients.length) return 0;

    const isExpired = (client: XrayClientEntry): boolean => {
      const expiresAt = client?.expiresAt;
      return typeof expiresAt === "number" && expiresAt > 0 && expiresAt <= now;
    };

    const kept = clients.filter((c) => !isExpired(c));
    const removed = clients.length - kept.length;

    if (removed <= 0) return 0;

    // Обновляем конфиг и применяем один раз
    inbound.settings = { ...(settings ?? {}), clients: kept };
    inbounds[0] = inbound;
    serverConfig.inbounds = inbounds;

    await this.xray.writeServerConfig(JSON.stringify(serverConfig, null, 2));
    await this.xray.restartContainer();

    return removed;
  }
}
