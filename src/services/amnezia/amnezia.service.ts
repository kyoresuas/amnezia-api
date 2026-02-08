import { deflateSync } from "zlib";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { ClientTableEntry } from "@/types/amnezia";
import { AmneziaBackupData } from "@/types/server";
import { ClientErrorCode, Protocol } from "@/types/shared";
import { AmneziaConnection } from "@/helpers/amneziaConnection";
import { ClientRecord, ClientPeer, CreateClientResult } from "@/types/clients";

/**
 * Сервис для работы с AmneziaWG
 */
export class AmneziaService {
  static key = "amneziaService";

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

  constructor(private amnezia: AmneziaConnection) {}

  /**
   * Экспортировать данные AmneziaWG для резервной копии
   */
  async exportBackup(): Promise<AmneziaBackupData> {
    const [wgConfig, clients, serverPublicKeyRaw, presharedKeyRaw] =
      await Promise.all([
        this.amnezia.readWgConfig(),
        this.amnezia.readClientsTable(),
        this.amnezia.readFile(AppContract.Amnezia.PATHS.SERVER_PUBLIC_KEY),
        this.amnezia.readFile(AppContract.Amnezia.PATHS.WG_PSK),
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
    await this.amnezia.writeWgConfig(data.wgConfig);
    await this.amnezia.writeClientsTable(data.clients);
    await this.amnezia.writeFile(
      AppContract.Amnezia.PATHS.WG_PSK,
      `${data.presharedKey.trim()}\n`
    );
    await this.amnezia.writeFile(
      AppContract.Amnezia.PATHS.SERVER_PUBLIC_KEY,
      `${data.serverPublicKey.trim()}\n`
    );
    await this.amnezia.syncWgConfig();
  }

  /**
   * Получить список клиентов из wg dump
   */
  async getClients(): Promise<ClientRecord[]> {
    const dump = await this.amnezia.getWgDump();

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
    const clientsTable = await this.amnezia.readClientsTable();

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
    const peerEntries: (ClientPeer & { username: string })[] = peers.map((peer) => {
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
        protocol: Protocol.AMNEZIAWG,
      };
    });

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
      await this.amnezia.run(`wg genkey`)
    ).stdout.trim();

    // Сгенерировать публичный ключ
    const clientId = (
      await this.amnezia.run(`echo '${clientPrivateKey}' | wg pubkey`)
    ).stdout.trim();

    // Считать конфиг
    const config = await this.amnezia.readWgConfig();

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
      await this.amnezia.run(
        `cat ${AppContract.Amnezia.PATHS.WG_PSK} 2>/dev/null || true`
      )
    ).stdout.trim();

    // Добавляем peer в конфиг
    const peerPskLine = `PresharedKey = ${psk}\n`;
    const peerSection = `\n[Peer]\nPublicKey = ${clientId}\n${peerPskLine}AllowedIPs = ${assignedIp}/32\n`;

    // Собираем новый конфиг
    const newConfig =
      (config.endsWith("\n") ? config : config + "\n") + peerSection;

    await this.amnezia.writeWgConfig(newConfig);
    await this.amnezia.syncWgConfig();

    // Добавляем клиента в clientsTable
    const table = await this.amnezia.readClientsTable();

    // Добавляем дату создания
    const creationDate = new Date().toString();

    // Добавляем клиента в clientsTable
    const userData: ClientTableEntry["userData"] = {
      clientName,
      creationDate,
    };

    if (options?.expiresAt) {
      userData.expiresAt = options.expiresAt;
    }

    table.push({ clientId, userData });
    await this.amnezia.writeClientsTable(table);

    // Получаем публичный ключ сервера
    const serverPublicKey = (
      await this.amnezia.run(
        `cat ${AppContract.Amnezia.PATHS.SERVER_PUBLIC_KEY} 2>/dev/null || true`
      )
    ).stdout.trim();

    // Получаем порт
    const listenPort =
      config.match(/\[Interface\][\s\S]*?ListenPort\s*=\s*(\d+)/i)?.[1] || "";

    // Получаем хост
    const endpointHost = appConfig.SERVER_PUBLIC_HOST || "";

    // Получаем MTU
    const mtu = AppContract.Amnezia.DEFAULTS.MTU;
    const keepAlive = AppContract.Amnezia.DEFAULTS.KEEPALIVE;

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
    const configText = AmneziaService.AMNEZIAWG_CLIENT_TEMPLATE.replace(
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
      transport_proto: AppContract.Amnezia.DEFAULTS.TRANSPORT,
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
          container: AppContract.Amnezia.DOCKER_CONTAINER,
        },
      ],
      defaultContainer: AppContract.Amnezia.DOCKER_CONTAINER,
      description,
      dns1:
        (
          await this.amnezia.run(
            `getent hosts 1.1.1.1 >/dev/null 2>&1 && echo 1.1.1.1 || echo 1.1.1.1`
          )
        ).stdout.trim() || "1.1.1.1",
      dns2:
        (
          await this.amnezia.run(
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
  async updateClientExpiresAt(
    clientId: string,
    expiresAt: number | null
  ): Promise<boolean> {
    const table = await this.amnezia.readClientsTable();

    const entry = table.find(
      (x) => ((x && (x.clientId || x.publicKey)) || "") === clientId
    );

    if (!entry) return false;

    const userData = entry.userData ?? {};

    if (expiresAt === null) {
      delete userData.expiresAt;
    } else {
      userData.expiresAt = expiresAt;
    }

    entry.userData = userData;
    await this.amnezia.writeClientsTable(table);

    return true;
  }

  /**
   * Удалить клиента
   */
  async deleteClient(clientId: string): Promise<boolean> {
    let table = await this.amnezia.readClientsTable();

    // Сохраняем длину таблицы
    const before = table.length;

    // Удаляем клиента
    table = table.filter(
      (x) => ((x && (x.clientId || x.publicKey)) || "") !== clientId
    );

    // Проверяем, что клиент был удален
    if (!(table.length < before)) return false;

    // Записываем обратно
    await this.amnezia.writeClientsTable(table);

    // Считываем конфиг
    const config = await this.amnezia.readWgConfig();

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
      await this.amnezia.writeWgConfig(newConfig);

      // Применяем
      await this.amnezia.syncWgConfig();
    }

    return true;
  }

  /**
   * Удалить всех клиентов с истекшим сроком действия
   */
  async cleanupExpiredClients(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    const table = await this.amnezia.readClientsTable();

    const idsToDelete = table
      .map((entry) => {
        const expiresAt = entry?.userData?.expiresAt;
        const id = entry?.clientId?.trim();

        if (expiresAt && expiresAt <= now) {
          return id;
        }

        return null;
      })
      .filter((x): x is string => Boolean(x));

    if (!idsToDelete.length) return 0;

    let removed = 0;
    for (const id of idsToDelete) {
      const ok = await this.deleteClient(id);
      if (ok) removed++;
    }

    return removed;
  }
}
