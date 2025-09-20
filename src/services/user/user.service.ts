import { exec } from "child_process";
import { AmneziaUser } from "@/types/user";
import appConfig from "@/constants/appConfig";

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

    // Базовая команда
    const base = `wg show ${iface} dump`;

    // Команда с контейнером
    const cmd = container ? `docker exec ${container} sh -lc '${base}'` : base;

    // Выполняем команду
    const raw = await new Promise<string>((resolve, reject) => {
      exec(cmd, { timeout: 5000 }, (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout);
      });
    }).catch(() => "");

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

    // Преобразование строк в объекты
    return lines.map((line, idx) => {
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

      // Если endpoint содержит :, то разбиваем на host и port
      if (endpoint && endpoint.includes(":")) {
        const lastColon = endpoint.lastIndexOf(":");
        endpointHost = endpoint.slice(0, lastColon);
        const port = Number(endpoint.slice(lastColon + 1));
        endpointPort = Number.isFinite(port) ? port : undefined;
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

      // username
      const username = allowedIps[0] || publicKey;

      // user
      const user: AmneziaUser = {
        id: publicKey,
        username,
        endpointHost,
        endpointPort,
        allowedIps,
        latestHandshakeUnix: latestHandshake,
        latestHandshakeISO,
        latestHandshakeSecondsAgo,
        isActive,
        transferRx,
        transferTx,
        persistentKeepalive,
      };

      return user;
    });
  }
}
