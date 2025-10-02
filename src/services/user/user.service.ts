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
  }> {
    // Генерация приватного ключа
    const clientPrivateKey = (
      await this.execInTarget(`wg genkey`, 3000)
    ).trim();
    // Получение публичного ключа
    const clientId = (
      await this.execInTarget(`echo '${clientPrivateKey}' | wg pubkey`, 3000)
    ).trim();

    // Текущий конфиг для определения свободного IP
    const confRaw = await this.readWgConf();
    const conf = confRaw || "";

    const pickNextIp = (content: string): string => {
      const allowedRegex =
        /AllowedIPs\s*=\s*([0-9]+\.[0-9]+\.[0-9]+)\.([0-9]+)\s*\/32/gi;
      const addressRegex =
        /Address\s*=\s*([0-9]+\.[0-9]+\.[0-9]+)\.\d+\s*\/\d+/i;
      const usedHosts = new Set<number>();
      let prefix: string | undefined;

      let m: RegExpExecArray | null;
      while ((m = allowedRegex.exec(content)) !== null) {
        const pfx = m[1];
        const host = Number(m[2]);
        if (!prefix) prefix = pfx;
        usedHosts.add(host);
      }

      if (!prefix) {
        const a = addressRegex.exec(content);
        if (a && a[1]) prefix = a[1];
      }

      if (!prefix) prefix = "10.8.1";

      let host = 1;
      if (usedHosts.size > 0) {
        const max = Math.max(...Array.from(usedHosts.values()));
        host = Math.min(254, max + 1);
        if (usedHosts.has(host)) {
          for (let i = 1; i <= 254; i++) {
            if (!usedHosts.has(i)) {
              host = i;
              break;
            }
          }
        }
      }

      return `${prefix}.${host}`;
    };

    const assignedIp = pickNextIp(conf);

    const psk = (
      await this.execInTarget(
        `cat /opt/amnezia/awg/wireguard_psk.key 2>/dev/null || true`,
        2000
      )
    ).trim();

    const pskLine = psk ? `PresharedKey = ${psk}\n` : "";
    const peerSection = `\n[Peer]\nPublicKey = ${clientId}\n${pskLine}AllowedIPs = ${assignedIp}/32\n`;
    const newConf = (conf.endsWith("\n") ? conf : conf + "\n") + peerSection;
    await this.writeWgConf(newConf);

    await this.syncWgConf();

    const table = await this.readClientsTable();
    const nowStr = new Date().toString();
    table.push({ clientId, userData: { clientName, creationDate: nowStr } });
    await this.writeClientsTable(table);

    return { clientId, clientPrivateKey, assignedIp };
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
