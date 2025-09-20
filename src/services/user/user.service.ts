import { exec } from "child_process";
import appConfig from "@/constants/appConfig";
import { AmneziaUser, AmneziaDevice } from "@/types/user";

/**
 * Сервис получения пользователей AmneziaVPN
 */
export class UserService {
  static key = "userService";

  /**
   * Получить список пользователей из wg dump
   */
  async getUsers(): Promise<AmneziaUser[]> {
    const iface = appConfig.AMNEZIA_INTERFACE;
    const container = appConfig.AMNEZIA_DOCKER_CONTAINER;

    // Команда для получения wg dump
    const cmd = container
      ? `docker exec ${container} sh -lc 'wg show ${iface} dump'`
      : `wg show ${iface} dump`;

    // Выполняем команду
    const raw = await new Promise<string>((resolve) => {
      exec(cmd, { timeout: 5000 }, (_err, stdout) => resolve(stdout || ""));
    });

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
   * Добавить клиента
   */
  async appendClient(clientId: string, clientName: string): Promise<void> {
    const container = appConfig.AMNEZIA_DOCKER_CONTAINER;

    // Считать текущий clientsTable
    const readCmd = `docker exec ${container} sh -lc 'cat /opt/amnezia/awg/clientsTable 2>/dev/null || echo []'`;
    const raw = await new Promise<string>((resolve) => {
      exec(readCmd, { timeout: 3000 }, (_e, out) => resolve(out || "[]"));
    });

    // Разбираем JSON
    let table: Array<{
      clientId?: string;
      publicKey?: string;
      userData?: { clientName?: string; creationDate?: string };
    }>; // minimal shape

    // Если не JSON, то пропускаем
    table = [];
    try {
      table = JSON.parse(raw);

      // Если не массив, то пропускаем
      if (!Array.isArray(table)) table = [];
    } catch {
      // Если не JSON, то пропускаем
      table = [];
    }

    // Найти клиента по clientId
    const idx = table.findIndex(
      (x) => ((x && (x.clientId || x.publicKey)) || "") === clientId
    );

    // Дата создания
    const nowStr = new Date().toString();

    if (idx >= 0) {
      // обновить имя
      table[idx] = table[idx] || {};

      // Обновить clientId
      table[idx].clientId = clientId;

      // Обновить userData
      table[idx].userData = table[idx].userData || {};

      // Обновить clientName
      table[idx].userData.clientName = clientName;

      // Обновить creationDate
      if (!table[idx].userData.creationDate)
        table[idx].userData.creationDate = nowStr;
    } else {
      // добавить новую запись
      table.push({
        // Обновить clientId
        clientId,
        userData: { clientName, creationDate: nowStr },
      });
    }

    // Записать обратно
    const payload = JSON.stringify(table);
    const writeCmd = `docker exec ${container} sh -lc 'cat > /opt/amnezia/awg/clientsTable <<"EOF"\n${payload}\nEOF'`;
    await new Promise<void>((resolve) => {
      exec(writeCmd, { timeout: 3000 }, () => resolve());
    });
  }

  /**
   * Удалить клиента
   */
  async revokeClient(clientId: string): Promise<void> {
    const container = appConfig.AMNEZIA_DOCKER_CONTAINER;
    const iface = appConfig.AMNEZIA_INTERFACE;

    // Удалить из clientsTable
    const readCmd = `docker exec ${container} sh -lc 'cat /opt/amnezia/awg/clientsTable 2>/dev/null || echo []'`;
    const raw = await new Promise<string>((resolve) => {
      exec(readCmd, { timeout: 3000 }, (_e, out) => resolve(out || "[]"));
    });

    // Разбираем JSON
    let table: Array<{
      clientId?: string;
      publicKey?: string;
      userData?: { clientName?: string; creationDate?: string };
    }>; // minimal shape

    // Если не JSON, то пропускаем
    table = [];
    try {
      table = JSON.parse(raw);

      // Если не массив, то пропускаем
      if (!Array.isArray(table)) table = [];
    } catch {
      table = [];
    }

    // Удаляем клиента
    table = table.filter(
      (x) => ((x && (x.clientId || x.publicKey)) || "") !== clientId
    );

    // Записываем обратно
    const payload = JSON.stringify(table);
    const writeCmd = `docker exec ${container} sh -lc 'cat > /opt/amnezia/awg/clientsTable <<"EOF"\n${payload}\nEOF'`;
    await new Promise<void>((resolve) => {
      exec(writeCmd, { timeout: 3000 }, () => resolve());
    });

    // Для WG/AWG: удалить peer из wg0.conf и применить
    const wgConfPath = `/opt/amnezia/awg/wg0.conf`;
    const readWg = `docker exec ${container} sh -lc 'cat ${wgConfPath} 2>/dev/null || true'`;
    const conf = await new Promise<string>((resolve) => {
      exec(readWg, { timeout: 3000 }, (_e, out) => resolve(out || ""));
    });
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
      const writeWg = `docker exec ${container} sh -lc 'cat > ${wgConfPath} <<"EOF"\n${rebuilt}\nEOF'`;
      await new Promise<void>((resolve) =>
        exec(writeWg, { timeout: 3000 }, () => resolve())
      );

      // Применяем syncconf
      const syncCmd = `docker exec ${container} sh -lc 'wg syncconf ${iface} <(wg-quick strip ${wgConfPath})'`;
      await new Promise<void>((resolve) =>
        exec(syncCmd, { timeout: 5000 }, () => resolve())
      );
    }
  }

  /**
   * Получить имена и устройства пользователей из Amnezia clientsTable
   */
  private async getAmneziaFriendlyNames(): Promise<{
    byKey: Record<string, { name: string; devices: string[] }>;
  }> {
    const container = appConfig.AMNEZIA_DOCKER_CONTAINER;
    const result = {
      byKey: {} as Record<string, { name: string; devices: string[] }>,
    };

    if (!container) return result;

    const cmd = `docker exec ${container} sh -lc 'cat /opt/amnezia/awg/clientsTable 2>/dev/null || true'`;
    const raw = await new Promise<string>((resolve) => {
      exec(cmd, { timeout: 2000 }, (_err, stdout) => resolve(stdout || ""));
    });

    if (!raw) return result;

    // Ожидаемый формат Amnezia:
    // [ { "clientId": "<publicKey>", "userData": { "clientName": "<name>", ... } }, ... ]
    try {
      const parsed = JSON.parse(raw);

      // Если массив, то парсим каждый элемент
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          // clientId или publicKey
          const key: string = item.clientId || item.publicKey || "";

          // userData.clientName
          const rawName: string = item.userData?.clientName || "";

          // Если нет ключа или имени, то пропускаем
          if (!key || !rawName) continue;

          // "Admin [macOS 26.0]" -> name=Admin, device=macOS 26.0
          const match = rawName.match(/^\s*(.*?)\s*(?:\[(.*)\])?\s*$/);

          // name
          const name = (match?.[1] || rawName).trim();

          // device
          const device = (match?.[2] || "").trim();
          const entry = result.byKey[key] || { name, devices: [] as string[] };
          entry.name = name;

          // Если устройство не в списке, то добавляем
          if (device && !entry.devices.includes(device))
            entry.devices.push(device);
          result.byKey[key] = entry;
        }
        return result;
      }
    } catch {
      // Хрень.
    }

    return result;
  }
}
