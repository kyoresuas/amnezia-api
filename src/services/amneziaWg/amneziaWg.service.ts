import {
  ClientPeer,
  PeerStatus,
  ClientRecord,
  CreateClientResult,
} from "@/types/clients";
import { deflateSync } from "zlib";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { ClientTableEntry } from "@/types/amnezia";
import { AmneziaBackupData } from "@/types/server";
import { ClientErrorCode, Protocol } from "@/types/shared";
import { AmneziaWgConnection } from "@/helpers/amneziaWgConnection";

/**
 * Сервис для работы с AmneziaWG
 */
export class AmneziaWgService {
  static key = "amneziaWgService";

  // Шаблон клиентского конфига AmneziaWG
  private static readonly AMNEZIAWG_CLIENT_TEMPLATE =
    `[Interface]\n` +
    `Address = $CLIENT_ADDRESS/32\n` +
    `DNS = $PRIMARY_DNS, $SECONDARY_DNS\n` +
    `PrivateKey = $CLIENT_PRIVATE_KEY\n` +
    `Jc = $JC\n` +
    `Jmin = $JMIN\n` +
    `Jmax = $JMAX\n` +
    `S1 = $S1\n` +
    `S2 = $S2\n` +
    `H1 = $H1\n` +
    `H2 = $H2\n` +
    `H3 = $H3\n` +
    `H4 = $H4\n\n` +
    `[Peer]\n` +
    `PublicKey = $SERVER_PUBLIC_KEY\n` +
    `PresharedKey = $PRESHARED_KEY\n` +
    `AllowedIPs = 0.0.0.0/0, ::/0\n` +
    `$ENDPOINT_LINE` +
    `PersistentKeepalive = $KEEPALIVE\n`;

  constructor(private amneziaWg: AmneziaWgConnection) {}

  /**
   * Получить AllowedIPs для peer'а
   */
  private getPeerAllowedIps(config: string, clientId: string): string | null {
    const sections = config.split("[Peer]");

    for (const section of sections) {
      if (
        !section.trim() ||
        !section.includes("PublicKey") ||
        !section.includes(clientId)
      ) {
        continue;
      }

      const match = section.match(/AllowedIPs\s*=\s*([^\n]+)/i);
      return match?.[1]?.trim() || null;
    }

    return null;
  }

  /**
   * Обновить AllowedIPs для peer'а
   */
  private updatePeerAllowedIps(
    config: string,
    clientId: string,
    allowedIps: string
  ): string {
    const sections = config.split("[Peer]");
    let changed = false;

    const updatedSections = sections.map((section) => {
      if (
        !section.trim() ||
        !section.includes("PublicKey") ||
        !section.includes(clientId)
      ) {
        return section;
      }

      changed = true;

      if (/AllowedIPs\s*=/i.test(section)) {
        return section.replace(
          /AllowedIPs\s*=\s*([^\n]+)/i,
          `AllowedIPs = ${allowedIps}`
        );
      }

      return section.replace(
        /PublicKey\s*=\s*([^\n]+)/i,
        (line) => `${line}\nAllowedIPs = ${allowedIps}`
      );
    });

    return changed ? updatedSections.join("[Peer]") : config;
  }

  /**
   * Экспортировать данные AmneziaWG для резервной копии
   */
  async exportBackup(): Promise<AmneziaBackupData> {
    const [wgConfig, clients, serverPublicKeyRaw, presharedKeyRaw] =
      await Promise.all([
        this.amneziaWg.readWgConfig(),
        this.amneziaWg.readClientsTable(),
        this.amneziaWg.readFile(AppContract.AmneziaWG.PATHS.SERVER_PUBLIC_KEY),
        this.amneziaWg.readFile(AppContract.AmneziaWG.PATHS.WG_PSK),
      ]);

    return {
      wgConfig,
      clients,
      serverPublicKey: serverPublicKeyRaw.trim(),
      presharedKey: presharedKeyRaw.trim(),
    };
  }

  /**
   * Импортировать данные AmneziaWG из резервной копии
   */
  async importBackup(data: AmneziaBackupData): Promise<void> {
    await this.amneziaWg.writeWgConfig(data.wgConfig);
    await this.amneziaWg.writeClientsTable(data.clients);
    await this.amneziaWg.writeFile(
      AppContract.AmneziaWG.PATHS.WG_PSK,
      `${data.presharedKey.trim()}\n`
    );
    await this.amneziaWg.writeFile(
      AppContract.AmneziaWG.PATHS.SERVER_PUBLIC_KEY,
      `${data.serverPublicKey.trim()}\n`
    );
    await this.amneziaWg.syncWgConfig();
  }

  /**
   * Получить список клиентов из wg dump
   */
  async getClients(): Promise<ClientRecord[]> {
    const dump = await this.amneziaWg.getWgDump();

    if (!dump) return [];

    const now = Math.floor(Date.now() / 1000);

    // Разбиваем на строки
    const peers = dump
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => {
        const parts = line.split("\t");
        const endpoint = parts[2] || null;
        const allowed = parts[3] || null;
        return (
          parts.length >= 8 &&
          (endpoint?.includes(":") || allowed?.includes("/"))
        );
      });

    // Получаем данные клиентов (username/label/expiresAt) из clientsTable
    const userData: Record<
      string,
      { name: string; peerNames: string[]; expiresAt?: number }
    > = {};

    // Считываем clientsTable
    const clientsTable = await this.amneziaWg.readClientsTable();

    // Проходим по всем клиентам в clientsTable
    for (const client of clientsTable) {
      const clientKey = client?.clientId;
      const clientName = client?.userData?.clientName;
      const expiresAt = client.userData?.expiresAt;

      if (!clientKey || !clientName) continue;

      // Парсим имя клиента и label peer'а
      const nameMatch = clientName.match(/^\s*(.*?)\s*(?:\[(.*)\])?\s*$/);
      const userName = (nameMatch?.[1] || clientName).trim();
      const peerName = (nameMatch?.[2] || "").trim();

      // Инициализируем или обновляем запись пользователя
      if (!userData[clientKey]) {
        userData[clientKey] = {
          name: userName,
          peerNames: [],
          expiresAt,
        };
      }

      // Добавляем label peer'а, если он указан и еще не добавлен
      if (peerName && !userData[clientKey].peerNames.includes(peerName)) {
        userData[clientKey].peerNames.push(peerName);
      }

      // Обновляем expiresAt, если он есть
      if (expiresAt) {
        userData[clientKey].expiresAt = expiresAt;
      }
    }

    // Преобразуем peers в список peer'ов
    const peerEntries: (ClientPeer & { username: string })[] = peers.map(
      (peer) => {
        const parts = peer.split("\t");

        // id
        const id = parts[0];

        // endpoint
        const endpoint = parts[2] && parts[2] !== "(none)" ? parts[2] : null;

        // allowedIps
        const allowedIps = parts[3].split(",").map((s) => s.trim());

        // lastHandshake
        const lastHandshake =
          Number(parts[4]) > 1_000_000_000_000
            ? Math.floor(Number(parts[4]) / 1_000_000_000)
            : Number(parts[4]);

        // received
        const received = Number(parts[5]);

        // sent
        const sent = Number(parts[6]);

        // lastHandshakeSecondsAgo
        const lastHandshakeSecondsAgo = now - lastHandshake;

        // online
        const online = lastHandshakeSecondsAgo < 180;

        const username = userData[id]?.name || id;
        // label peer'а (если он был закодирован в clientsTable.userData.clientName)
        const name = userData[id]?.peerNames?.[0] ?? null;

        // expiresAt
        const expiresAt = userData[id]?.expiresAt || null;
        const isBlocked =
          allowedIps.length === 1 && allowedIps[0] === "0.0.0.0/32";
        const status = isBlocked ? PeerStatus.Disabled : PeerStatus.Active;

        return {
          username,
          id,
          name,
          allowedIps,
          lastHandshake,
          traffic: {
            received,
            sent,
          },
          endpoint,
          online,
          expiresAt,
          status,
          protocol: Protocol.AMNEZIAWG,
        };
      }
    );

    // Группируем по username
    const users = new Map<string, ClientRecord>();
    for (const { username, ...peer } of peerEntries) {
      // Получаем или создаем пользователя
      const entry = users.get(username) || {
        username,
        peers: [],
      };

      // Добавляем peer
      entry.peers.push(peer);

      // Обновляем пользователя
      users.set(username, entry);
    }

    return Array.from(users.values());
  }

  /**
   * Создать нового клиента
   */
  async createClient(
    clientName: string,
    options?: { expiresAt?: number | null }
  ): Promise<CreateClientResult> {
    // Проверка лимита максимального числа peer'ов
    const maxPeers = appConfig.SERVER_MAX_PEERS;
    if (maxPeers) {
      const clients = await this.getClients();

      const currentPeers = clients.reduce(
        (acc, client) => acc + client.peers.length,
        0
      );

      if (currentPeers >= maxPeers) {
        throw new APIError(ClientErrorCode.CONFLICT);
      }
    }

    // Сгенерировать приватный ключ
    const clientPrivateKey = (
      await this.amneziaWg.run(`wg genkey`)
    ).stdout.trim();

    // Сгенерировать публичный ключ
    const clientId = (
      await this.amneziaWg.run(`echo '${clientPrivateKey}' | wg pubkey`)
    ).stdout.trim();

    // Считать конфиг
    const config = await this.amneziaWg.readWgConfig();

    // Выбор свободного IP
    const assignedIp = (() => {
      const used = new Set<number>();

      // Префикс
      const prefix =
        /Address\s*=\s*([0-9]+\.[0-9]+\.[0-9]+)\.\d+/i.exec(config)?.[1] ||
        "10.8.1";

      // Получаем используемые IP
      const matches = config.matchAll(
        /AllowedIPs\s*=\s*[0-9]+\.[0-9]+\.[0-9]+\.([0-9]+)\s*\/32/gi
      );

      for (const match of matches) {
        used.add(Number(match[1]));
      }

      // Находим первый свободный IP
      for (let host = 1; host <= 254; host++) {
        if (!used.has(host)) {
          return `${prefix}.${host}`;
        }
      }

      throw new Error("Нет свободных IP");
    })();

    // Считать PSK
    const psk = (
      await this.amneziaWg.run(
        `cat ${AppContract.AmneziaWG.PATHS.WG_PSK} 2>/dev/null || true`
      )
    ).stdout.trim();

    // Добавляем peer в конфиг
    const peerPskLine = `PresharedKey = ${psk}\n`;
    const peerSection = `\n[Peer]\nPublicKey = ${clientId}\n${peerPskLine}AllowedIPs = ${assignedIp}/32\n`;

    // Собираем новый конфиг
    const newConfig =
      (config.endsWith("\n") ? config : config + "\n") + peerSection;

    await this.amneziaWg.writeWgConfig(newConfig);
    await this.amneziaWg.syncWgConfig();

    // Добавляем клиента в clientsTable
    const table = await this.amneziaWg.readClientsTable();

    // Добавляем дату создания
    const creationDate = new Date().toString();

    // Добавляем клиента в clientsTable
    const userData: ClientTableEntry["userData"] = {
      clientName,
      creationDate,
      allowedIp: assignedIp,
    };

    if (options?.expiresAt) {
      userData.expiresAt = options.expiresAt;
    }

    table.push({ clientId, userData });
    await this.amneziaWg.writeClientsTable(table);

    // Получаем публичный ключ сервера
    const serverPublicKey = (
      await this.amneziaWg.run(
        `cat ${AppContract.AmneziaWG.PATHS.SERVER_PUBLIC_KEY} 2>/dev/null || true`
      )
    ).stdout.trim();

    // Получаем порт
    const listenPort =
      config.match(/\[Interface\][\s\S]*?ListenPort\s*=\s*(\d+)/i)?.[1] || "";

    // Получаем хост
    const endpointHost = appConfig.SERVER_PUBLIC_HOST || "";

    // Получаем MTU
    const mtu = AppContract.AmneziaWG.DEFAULTS.MTU;
    const keepAlive = AppContract.AmneziaWG.DEFAULTS.KEEPALIVE;

    // Параметры AWG
    const getVal = (key: string) =>
      config.match(new RegExp(`^\\s*${key}\\s*=\\s*([^\\s]+)`, "mi"))?.[1] ||
      "";

    const awgParams = {
      Jc: getVal("Jc"),
      Jmin: getVal("Jmin"),
      Jmax: getVal("Jmax"),
      S1: getVal("S1"),
      S2: getVal("S2"),
      H1: getVal("H1"),
      H2: getVal("H2"),
      H3: getVal("H3"),
      H4: getVal("H4"),
    } as const;

    // Текстовый конфиг
    const configText = AmneziaWgService.AMNEZIAWG_CLIENT_TEMPLATE.replace(
      /\$CLIENT_ADDRESS/g,
      assignedIp
    )
      .replace(/\$CLIENT_PRIVATE_KEY/g, clientPrivateKey)
      .replace(/\$JC/g, awgParams.Jc)
      .replace(/\$JMIN/g, awgParams.Jmin)
      .replace(/\$JMAX/g, awgParams.Jmax)
      .replace(/\$S1/g, awgParams.S1)
      .replace(/\$S2/g, awgParams.S2)
      .replace(/\$H1/g, awgParams.H1)
      .replace(/\$H2/g, awgParams.H2)
      .replace(/\$H3/g, awgParams.H3)
      .replace(/\$H4/g, awgParams.H4)
      .replace(/\$SERVER_PUBLIC_KEY/g, serverPublicKey)
      .replace(/\$PRESHARED_KEY/g, psk)
      .replace(
        /\$ENDPOINT_LINE/g,
        endpointHost && listenPort
          ? `Endpoint = ${endpointHost}:${listenPort}\n`
          : ""
      )
      .replace(/\$KEEPALIVE/g, String(keepAlive));

    // Последний конфиг
    const lastConfig = {
      ...awgParams,
      allowed_ips: ["0.0.0.0/0", "::/0"],
      clientId: clientId,
      client_ip: `${assignedIp}`,
      client_priv_key: clientPrivateKey,
      client_pub_key: clientId,
      config: configText,
      hostName: endpointHost,
      mtu,
      persistent_keep_alive: keepAlive,
      port: listenPort ? Number(listenPort) : undefined,
      psk_key: psk,
      server_pub_key: serverPublicKey,
    } as Record<string, unknown>;

    // AWG
    const awg = {
      ...awgParams,
      last_config: JSON.stringify(lastConfig, null, 2),
      port: String(listenPort || ""),
      transport_proto: AppContract.AmneziaWG.DEFAULTS.TRANSPORT,
    };

    // Поддерживаемые плейсхолдеры в appConfig.SERVER_NAME:
    // {protocol} — протокол подключения (например, "AmneziaWG")
    // {username} — имя клиента (clientName)
    const baseServerName = appConfig.SERVER_NAME || "";
    const protocolName = "AmneziaWG";
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
      containers: [
        {
          awg,
          container: AppContract.AmneziaWG.DOCKER_CONTAINER,
        },
      ],
      defaultContainer: AppContract.AmneziaWG.DOCKER_CONTAINER,
      description,
      dns1:
        (
          await this.amneziaWg.run(
            `getent hosts 1.1.1.1 >/dev/null 2>&1 && echo 1.1.1.1 || echo 1.1.1.1`
          )
        ).stdout.trim() || "1.1.1.1",
      dns2:
        (
          await this.amneziaWg.run(
            `getent hosts 1.0.0.1 >/dev/null 2>&1 && echo 1.0.0.1 || echo 1.0.0.1`
          )
        ).stdout.trim() || "1.0.0.1",
      hostName: endpointHost,
    };

    // Генерируем clientConfig
    const rawData = Buffer.from(JSON.stringify(serverJson), "utf-8");

    // Создаем заголовок с размером данных
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

    const clientConfig = `vpn://${base64String}`;

    return { id: clientId, config: clientConfig, protocol: Protocol.AMNEZIAWG };
  }

  /**
   * Обновить expiresAt клиента
   */
  async updateClient(
    clientId: string,
    options: { expiresAt?: number | null; status?: PeerStatus }
  ): Promise<boolean> {
    const table = await this.amneziaWg.readClientsTable();

    const entry = table.find(
      (x) => ((x && (x.clientId || x.publicKey)) || "") === clientId
    );

    if (!entry) return false;

    const userData = entry.userData ?? {};
    const now = Math.floor(Date.now() / 1000);

    if (options.expiresAt !== undefined) {
      if (options.expiresAt === null) {
        delete userData.expiresAt;
      } else {
        userData.expiresAt = options.expiresAt;
      }
    }

    entry.userData = userData;
    await this.amneziaWg.writeClientsTable(table);

    const config = await this.amneziaWg.readWgConfig();
    if (config) {
      const currentAllowedIps = this.getPeerAllowedIps(config, clientId);

      if (
        !userData.allowedIp &&
        currentAllowedIps &&
        currentAllowedIps !== "0.0.0.0/32"
      ) {
        const firstIp = currentAllowedIps.split(",")[0].trim();
        userData.allowedIp = firstIp.includes("/")
          ? firstIp.split("/")[0]
          : firstIp;
        entry.userData = userData;
        await this.amneziaWg.writeClientsTable(table);
      }

      const isExpired =
        typeof userData.expiresAt === "number" && userData.expiresAt <= now;
      const targetStatus =
        options.status ??
        (options.expiresAt !== undefined
          ? isExpired
            ? PeerStatus.Disabled
            : PeerStatus.Active
          : null);

      const targetAllowedIps =
        targetStatus === PeerStatus.Disabled
          ? "0.0.0.0/32"
          : targetStatus === PeerStatus.Active
          ? userData.allowedIp
            ? userData.allowedIp.includes("/")
              ? userData.allowedIp
              : `${userData.allowedIp}/32`
            : null
          : null;

      if (targetAllowedIps && currentAllowedIps !== targetAllowedIps) {
        const newConfig = this.updatePeerAllowedIps(
          config,
          clientId,
          targetAllowedIps
        );

        if (newConfig !== config) {
          await this.amneziaWg.writeWgConfig(newConfig);
          await this.amneziaWg.syncWgConfig();
        }
      }
    }

    return true;
  }

  /**
   * Удалить клиента
   */
  async deleteClient(clientId: string): Promise<boolean> {
    let table = await this.amneziaWg.readClientsTable();

    // Сохраняем длину таблицы
    const before = table.length;

    // Удаляем клиента
    table = table.filter(
      (x) => ((x && (x.clientId || x.publicKey)) || "") !== clientId
    );

    // Проверяем, что клиент был удален
    if (!(table.length < before)) return false;

    // Записываем обратно
    await this.amneziaWg.writeClientsTable(table);

    // Считываем конфиг
    const config = await this.amneziaWg.readWgConfig();

    if (config) {
      // Разбиваем конфиг на секции
      const sections = config.split("[Peer]");

      // Сохраняем секции, которые не нужно удалять
      const sectionsToKeep: string[] = [];

      for (const section of sections) {
        if (
          !section.trim() ||
          !section.includes("PublicKey") ||
          !section.includes(clientId)
        ) {
          sectionsToKeep.push(section);
          continue;
        }
      }

      // Собираем секции обратно в конфиг
      const newConfig = sectionsToKeep.join("[Peer]");
      await this.amneziaWg.writeWgConfig(newConfig);

      // Применяем
      await this.amneziaWg.syncWgConfig();
    }

    return true;
  }

  /**
   * Удалить всех клиентов с истекшим сроком действия
   */
  async cleanupExpiredClients(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    const table = await this.amneziaWg.readClientsTable();

    const expired = table.filter((entry) => {
      const expiresAt = entry?.userData?.expiresAt;
      return typeof expiresAt === "number" && expiresAt <= now;
    });

    if (!expired.length) return 0;

    const config = await this.amneziaWg.readWgConfig();
    let updatedConfig = config;
    let updatedTable = false;

    if (config) {
      for (const entry of expired) {
        const clientId = entry?.clientId?.trim();
        if (!clientId) continue;

        const userData = entry.userData ?? {};
        const currentAllowedIps = this.getPeerAllowedIps(config, clientId);

        if (
          !userData.allowedIp &&
          currentAllowedIps &&
          currentAllowedIps !== "0.0.0.0/32"
        ) {
          const firstIp = currentAllowedIps.split(",")[0].trim();
          userData.allowedIp = firstIp.includes("/")
            ? firstIp.split("/")[0]
            : firstIp;
          entry.userData = userData;
          updatedTable = true;
        }

        updatedConfig = this.updatePeerAllowedIps(
          updatedConfig,
          clientId,
          "0.0.0.0/32"
        );
      }
    }

    if (updatedTable) {
      await this.amneziaWg.writeClientsTable(table);
    }

    if (config && updatedConfig !== config) {
      await this.amneziaWg.writeWgConfig(updatedConfig);
      await this.amneziaWg.syncWgConfig();
    }

    return expired.length;
  }
}
