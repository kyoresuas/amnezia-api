import { deflateSync } from "zlib";
import { exec } from "child_process";
import appConfig from "@/constants/appConfig";
import { AmneziaUser, AmneziaDevice, ClientTableEntry } from "@/types/user";

/**
 * Сервис получения пользователей AmneziaVPN
 */
export class UserService {
  static key = "userService";

  // Путь к файлу clientsTable внутри контейнера
  private readonly clientsTablePath = "/opt/amnezia/awg/clientsTable";

  // Путь к wg конфигу внутри контейнера
  private readonly wgConfPath = "/opt/amnezia/awg/wg0.conf";

  // Выполнить команду в целевой среде
  private async execInTarget(cmd: string, timeout = 3000): Promise<string> {
    const container = appConfig.AMNEZIA_DOCKER_CONTAINER;
    const escaped = cmd.replace(/'/g, "'\\''");
    const finalCmd = container
      ? `docker exec ${container} sh -lc '${escaped}'`
      : cmd;

    return new Promise<string>((resolve) => {
      exec(finalCmd, { timeout }, (_err, stdout) => resolve(stdout || ""));
    });
  }

  // Прочитать clientsTable
  private async readClientsTable(): Promise<ClientTableEntry[]> {
    const raw = await this.execInTarget(
      `cat ${this.clientsTablePath} 2>/dev/null || echo []`,
      3000
    );
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ClientTableEntry[]) : [];
    } catch {
      // Это что такое?
      return [];
    }
  }

  // Записать clientsTable
  private async writeClientsTable(table: ClientTableEntry[]): Promise<void> {
    const payload = JSON.stringify(table);

    const cmd = `cat > ${this.clientsTablePath} <<"EOF"\n${payload}\nEOF`;

    await this.execInTarget(cmd, 3000);
  }

  // Прочитать wg0.conf
  private async readWgConf(): Promise<string> {
    return this.execInTarget(
      `cat ${this.wgConfPath} 2>/dev/null || true`,
      3000
    );
  }

  // Записать wg0.conf
  private async writeWgConf(content: string): Promise<void> {
    const cmd = `cat > ${this.wgConfPath} <<"EOF"\n${content}\nEOF`;
    await this.execInTarget(cmd, 3000);
  }

  // Применить конфигурацию wg
  private async syncWgConf(): Promise<void> {
    const iface = appConfig.AMNEZIA_INTERFACE;
    if (!iface) return;
    const cmd = `wg syncconf ${iface} <(wg-quick strip ${this.wgConfPath})`;
    await this.execInTarget(cmd, 5000);
  }

  /**
   * Получить список пользователей из wg dump
   */
  async getUsers(): Promise<AmneziaUser[]> {
    const iface = appConfig.AMNEZIA_INTERFACE;

    // Выполняем команду
    const raw = await this.execInTarget(`wg show ${iface} dump`, 5000);

    if (!raw) return [];

    const now = Math.floor(Date.now() / 1000);
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => {
        const p = l.split("\t");
        const endpoint = p[2] || "";
        const allowed = p[3] || "";
        return endpoint.includes(":") || allowed.includes("/");
      });

    // Попробуем получить дружественные имена и устройства (Amnezia clientsTable)
    const friendly = await this.getAmneziaFriendlyNames();

    // Преобразуем строки в устройства
    const devices: (AmneziaDevice & { username: string })[] = lines.map(
      (line, idx) => {
        const parts = line.split("\t");
        // Формат peer строки wg dump:
        // 0: publicKey
        // 1: presharedKey
        // 2: endpoint (host:port)
        // 3: allowedIps (comma-separated)
        // 4: latestHandshake (unix timestamp, seconds)
        // 5: transferRx (bytes)
        // 6: transferTx (bytes)
        // 7: persistentKeepalive (seconds or off)

        // publicKey
        const publicKey = parts[0] || `peer-${idx}`;

        // endpoint
        const endpoint = parts[2] || "";

        // allowedIps
        const allowedIpsRaw = parts[3] || "";

        // latestHandshake
        let latestHandshake = Number(parts[4]) || 0;
        if (latestHandshake > 1_000_000_000_000) {
          latestHandshake = Math.floor(latestHandshake / 1_000_000_000);
        }

        // transferRx
        const transferRx = Number(parts[5]) || 0;

        // transferTx
        const transferTx = Number(parts[6]) || 0;

        // persistentKeepalive
        const keepaliveRaw = parts[7] || "off";

        // endpointHost
        let endpointHost: string | undefined;

        // endpointPort
        let endpointPort: number | undefined;

        // Разбиваем endpoint на host и port
        if (endpoint?.includes(":")) {
          const lastColon = endpoint.lastIndexOf(":");
          endpointHost = endpoint.slice(0, lastColon);
          endpointPort = Number(endpoint.slice(lastColon + 1));
        }

        // allowedIps
        const allowedIps = allowedIpsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        // latestHandshakeSecondsAgo
        const latestHandshakeSecondsAgo =
          latestHandshake > 0 ? now - latestHandshake : -1;

        // latestHandshakeISO
        const latestHandshakeISO =
          latestHandshake > 0
            ? new Date(latestHandshake * 1000).toISOString()
            : undefined;

        // isActive
        const isActive =
          latestHandshake > 0 &&
          latestHandshakeSecondsAgo >= 0 &&
          latestHandshakeSecondsAgo < 180;

        // persistentKeepalive
        const persistentKeepalive =
          keepaliveRaw === "off" ? null : Number(keepaliveRaw) || null;

        const username = friendly.byKey[publicKey]?.name || publicKey;

        const device: AmneziaDevice & { username: string } = {
          id: publicKey,
          deviceName: friendly.byKey[publicKey]?.devices?.[0],
          allowedIps,
          endpointHost,
          endpointPort,
          latestHandshakeUnix: latestHandshake,
          latestHandshakeISO,
          latestHandshakeSecondsAgo,
          isActive,
          transferRx,
          transferTx,
          persistentKeepalive,
          username,
        };

        return device;
      }
    );

    // Группируем по username
    const byUser = new Map<string, AmneziaUser>();
    for (const d of devices) {
      const entry = byUser.get(d.username) || {
        username: d.username,
        devices: [],
      };
      entry.devices.push({
        id: d.id,
        deviceName: d.deviceName,
        allowedIps: d.allowedIps,
        endpointHost: d.endpointHost,
        endpointPort: d.endpointPort,
        latestHandshakeUnix: d.latestHandshakeUnix,
        latestHandshakeISO: d.latestHandshakeISO,
        latestHandshakeSecondsAgo: d.latestHandshakeSecondsAgo,
        isActive: d.isActive,
        transferRx: d.transferRx,
        transferTx: d.transferTx,
        persistentKeepalive: d.persistentKeepalive,
      });
      byUser.set(d.username, entry);
    }

    return Array.from(byUser.values());
  }

  /**
   * Создать нового клиента
   */
  async createClient(clientName: string): Promise<{
    clientId: string;
    clientPrivateKey: string;
    assignedIp: string;
    clientConfig: string;
  }> {
    // Получение приватного ключа
    const clientPrivateKey = (
      await this.execInTarget(`wg genkey`, 3000)
    ).trim();

    // Получение публичного ключа
    const clientId = (
      await this.execInTarget(`echo '${clientPrivateKey}' | wg pubkey`, 3000)
    ).trim();

    // Текущий конфиг
    const config = await this.readWgConf();

    // Выбор свободного IP
    const assignedIp = (() => {
      // Используемые IP
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

    // Получение PSK
    const psk = (
      await this.execInTarget(
        `cat /opt/amnezia/awg/wireguard_psk.key 2>/dev/null || true`,
        2000
      )
    ).trim();

    // Добавляем peer в конфиг
    const peerPskLine = psk ? `PresharedKey = ${psk}\n` : "";
    const peerSection = `\n[Peer]\nPublicKey = ${clientId}\n${peerPskLine}AllowedIPs = ${assignedIp}/32\n`;

    // Собираем новый конфиг
    const newConfig =
      (config.endsWith("\n") ? config : config + "\n") + peerSection;

    await this.writeWgConf(newConfig);
    await this.syncWgConf();

    // Добавляем клиента в clientsTable
    const table = await this.readClientsTable();

    // Добавляем дату создания
    const creationDate = new Date().toString();

    // Добавляем клиента в clientsTable
    table.push({ clientId, userData: { clientName, creationDate } });
    await this.writeClientsTable(table);

    // Получаем публичный ключ сервера
    const serverPublicKey = (
      await this.execInTarget(
        `cat /opt/amnezia/awg/wireguard_server_public_key.key 2>/dev/null || true`,
        2000
      )
    ).trim();

    // Получаем порт
    const listenPort =
      config.match(/\[Interface\][\s\S]*?ListenPort\s*=\s*(\d+)/i)?.[1] || "";

    // Получаем хост
    const endpointHost = appConfig.AMNEZIA_PUBLIC_HOST || "";

    // Получаем MTU
    const mtu = "1376";
    const keepAlive = "25";

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
      transport_proto: "udp",
    };

    // JSON для сервера
    const serverJson = {
      containers: [
        {
          awg,
          container: "amnezia-awg",
        },
      ],
      defaultContainer: "amnezia-awg",
      description: "Kyoresuas Server",
      dns1: "1.1.1.1",
      dns2: "1.0.0.1",
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

    return { clientId, clientPrivateKey, assignedIp, clientConfig };
  }

  /**
   * Удалить клиента
   */
  async revokeClient(clientId: string): Promise<void> {
    let table = await this.readClientsTable();

    // Удаляем клиента
    table = table.filter(
      (x) => ((x && (x.clientId || x.publicKey)) || "") !== clientId
    );

    // Записываем обратно
    await this.writeClientsTable(table);

    // Для WG/AWG надо удалить peer из wg0.conf и применить
    const conf = await this.readWgConf();
    if (conf) {
      // Разбиваем на секции
      const sections = conf.split("[Peer]");
      const kept: string[] = [];
      for (const sec of sections) {
        // Если секция пустая, то пропускаем
        if (!sec.trim()) {
          kept.push(sec);
          continue;
        }
        // Если секция не содержит PublicKey или clientId, то пропускаем
        if (!sec.includes("PublicKey") || !sec.includes(clientId)) {
          kept.push(sec);
        }
      }

      // Собираем секции обратно
      const rebuilt = kept.join("[Peer]");
      await this.writeWgConf(rebuilt);

      // Применяем syncconf
      await this.syncWgConf();
    }
  }

  /**
   * Получить имена и устройства пользователей из Amnezia clientsTable
   */
  private async getAmneziaFriendlyNames(): Promise<{
    byKey: Record<string, { name: string; devices: string[] }>;
  }> {
    const result = {
      byKey: {} as Record<string, { name: string; devices: string[] }>,
    };

    // Считываем clientsTable
    const table = await this.readClientsTable();

    // Обрабатываем каждую запись
    for (const item of table) {
      const key: string = (item && (item.clientId || item.publicKey)) || "";
      const clientName: string = item?.userData?.clientName || "";

      if (!key || !clientName) continue;

      // Разбираем всю фигню
      const match = clientName.match(/^\s*(.*?)\s*(?:\[(.*)\])?\s*$/);
      const name = (match?.[1] || clientName).trim();
      const device = (match?.[2] || "").trim();

      // Добавляем в результат
      const entry = result.byKey[key] || { name, devices: [] };

      // Обновляем имя
      entry.name = name;

      // Добавляем устройство
      if (device && !entry.devices.includes(device)) {
        entry.devices.push(device);
      }

      // Обновляем результат
      result.byKey[key] = entry;
    }

    return result;
  }
}
