import { deflateSync } from "zlib";
import { Protocol } from "@/types/shared";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { ClientTableEntry } from "@/types/amnezia";
import { UserRecord, UserDevice } from "@/types/users";
import { AmneziaConnection } from "@/helpers/amneziaConnection";

/**
 * Сервис для работы с AmneziaWG
 */
export class AmneziaService {
  static key = "amneziaService";

  constructor(private amnezia: AmneziaConnection) {}

  /**
   * Удалить всех клиентов с истекшим сроком действия
   */
  async cleanupExpiredClients(): Promise<number> {
    // Текущее время
    const now = Math.floor(Date.now() / 1000);

    // Таблица клиентов
    const table = await this.amnezia.readClientsTable();

    // Идентификаторы клиентов для удаления
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

    let removed = 0;
    for (const id of idsToDelete) {
      const ok = await this.deleteClient(id);
      if (ok) removed++;
    }

    return removed;
  }

  /**
   * Получить список пользователей из wg dump
   */
  async getUsers(): Promise<UserRecord[]> {
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

    // Получаем данные пользователей
    const userData: Record<
      string,
      { name: string; devices: string[]; expiresAt?: number }
    > = {};

    // Считываем clientsTable
    const clientsTable = await this.amnezia.readClientsTable();

    // Проходим по всем клиентам в clientsTable
    for (const client of clientsTable) {
      const clientKey = client?.clientId;
      const clientName = client?.userData?.clientName;
      const expiresAt = client.userData?.expiresAt;

      if (!clientKey || !clientName) continue;

      // Парсим имя клиента и его устройство
      const nameMatch = clientName.match(/^\s*(.*?)\s*(?:\[(.*)\])?\s*$/);
      const userName = (nameMatch?.[1] || clientName).trim();
      const deviceName = (nameMatch?.[2] || "").trim();

      // Инициализируем или обновляем запись пользователя
      if (!userData[clientKey]) {
        userData[clientKey] = {
          name: userName,
          devices: [],
          expiresAt,
        };
      }

      // Добавляем устройство, если оно указано и еще не добавлено
      if (deviceName && !userData[clientKey].devices.includes(deviceName)) {
        userData[clientKey].devices.push(deviceName);
      }

      // Обновляем expiresAt, если он есть
      if (expiresAt) {
        userData[clientKey].expiresAt = expiresAt;
      }
    }

    // Преобразуем peers в devices
    const devices: (UserDevice & { username: string })[] = peers.map((peer) => {
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
      const name = userData[id]?.devices?.[0] ?? null;

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
    const users = new Map<string, UserRecord>();
    for (const { username, ...device } of devices) {
      // Получаем или создаем пользователя
      const entry = users.get(username) || {
        username,
        devices: [],
      };

      // Добавляем устройство
      entry.devices.push(device);

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
  ): Promise<{
    id: string;
    config: string;
    protocol: Protocol;
  }> {
    // Проверка лимита максимального числа устройств
    const maxPeers = appConfig.SERVER_MAX_PEERS;
    if (maxPeers) {
      const users = await this.getUsers();

      const currentPeers = users.reduce(
        (acc, user) => acc + user.devices.length,
        0
      );

      if (currentPeers >= maxPeers) {
        throw new APIError(409);
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
        `cat ${AppContract.AMNEZIA_WG_PSK_PATH} 2>/dev/null || true`
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
        `cat ${AppContract.AMNEZIA_SERVER_PUBLIC_KEY_PATH} 2>/dev/null || true`
      )
    ).stdout.trim();

    // Получаем порт
    const listenPort =
      config.match(/\[Interface\][\s\S]*?ListenPort\s*=\s*(\d+)/i)?.[1] || "";

    // Получаем хост
    const endpointHost = appConfig.SERVER_PUBLIC_HOST || "";

    // Получаем MTU
    const mtu = AppContract.AMNEZIA_WG_DEFAULT_MTU;
    const keepAlive = AppContract.AMNEZIA_WG_DEFAULT_KEEPALIVE;

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
    const configText =
      `[Interface]\n` +
      `Address = ${assignedIp}/32\n` +
      `DNS = $PRIMARY_DNS, $SECONDARY_DNS\n` +
      `PrivateKey = ${clientPrivateKey}\n` +
      `Jc = ${awgParams.Jc}\n` +
      `Jmin = ${awgParams.Jmin}\n` +
      `Jmax = ${awgParams.Jmax}\n` +
      `S1 = ${awgParams.S1}\n` +
      `S2 = ${awgParams.S2}\n` +
      `H1 = ${awgParams.H1}\n` +
      `H2 = ${awgParams.H2}\n` +
      `H3 = ${awgParams.H3}\n` +
      `H4 = ${awgParams.H4}\n\n` +
      `[Peer]\n` +
      `PublicKey = ${serverPublicKey}\n` +
      `PresharedKey = ${psk}\n` +
      `AllowedIPs = 0.0.0.0/0, ::/0\n` +
      (endpointHost && listenPort
        ? `Endpoint = ${endpointHost}:${listenPort}\n`
        : "") +
      `PersistentKeepalive = ${keepAlive}\n`;

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
      transport_proto: AppContract.AMNEZIA_WG_DEFAULT_TRANSPORT,
    };

    // JSON для сервера
    const serverJson = {
      containers: [
        {
          awg,
          container: AppContract.AMNEZIA_DOCKER_CONTAINER,
        },
      ],
      defaultContainer: AppContract.AMNEZIA_DOCKER_CONTAINER,
      description: `${appConfig.SERVER_NAME} | ${clientName}`,
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
}
