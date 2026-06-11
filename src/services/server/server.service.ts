import os from "os";
import {
  ServerLoadPayload,
  ServerBackupPayload,
  ServerStatusPayload,
  ServerLoadDockerContainerStats,
} from "@/types/server";
import fs from "fs/promises";
import {
  parseNetIo,
  parseMemUsage,
  parseCpuPercent,
} from "@/helpers/dockerStats";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { XrayService } from "@/services/xray";
import { AppContract } from "@/contracts/app";
import { isNotNull } from "@/utils/primitive";
import { appLogger } from "@/config/winstonLogger";
import { ClientsService } from "@/services/clients";
import { AmneziaWgService } from "@/services/amneziaWg";
import { AmneziaWg2Service } from "@/services/amneziaWg2";
import { ServerConnection } from "@/helpers/serverConnection";
import { listRunningDockerContainers } from "@/helpers/docker";
import { resolveEnabledProtocols } from "@/helpers/resolveEnabledProtocols";
import { Protocol, ClientErrorCode, ServerErrorCode } from "@/types/shared";

/**
 * Сервис управления сервером
 */
export class ServerService {
  static key = "serverService";

  private readonly server: ServerConnection;

  constructor(
    private readonly xrayService: XrayService,
    private readonly clientsService: ClientsService,
    private readonly amneziaWgService: AmneziaWgService,
    private readonly amneziaWg2Service: AmneziaWg2Service,
  ) {
    this.server = new ServerConnection();
  }

  /**
   * Получить агрегированную информацию о сервере
   */
  async getServerStatus(): Promise<ServerStatusPayload> {
    const clients = await this.clientsService.getClients();
    const protocols = await resolveEnabledProtocols();

    return {
      id: appConfig.SERVER_ID || "",
      region: appConfig.SERVER_REGION || "",
      weight: appConfig.SERVER_WEIGHT || 0,
      maxPeers: appConfig.SERVER_MAX_PEERS || 0,
      totalPeers: clients.reduce((acc, client) => acc + client.peers.length, 0),
      protocols,
    };
  }

  /**
   * Сформировать резервную копию конфигурации сервера
   */
  async exportBackup(): Promise<ServerBackupPayload> {
    const protocols = await resolveEnabledProtocols();

    if (!protocols.length) {
      throw new APIError(ServerErrorCode.SERVICE_UNAVAILABLE, {
        msg: "swagger.errors.NO_PROTOCOLS_AVAILABLE",
      });
    }

    const payload: ServerBackupPayload = {
      generatedAt: new Date().toISOString(),
      serverId: appConfig.SERVER_ID ?? null,
      protocols,
    };

    if (protocols.includes(Protocol.AMNEZIAWG)) {
      payload.amnezia = await this.amneziaWgService.exportBackup();
    }

    if (protocols.includes(Protocol.AMNEZIAWG2)) {
      payload.amneziaWg2 = await this.amneziaWg2Service.exportBackup();
    }

    if (protocols.includes(Protocol.XRAY)) {
      payload.xray = await this.xrayService.exportBackup();
    }

    return payload;
  }

  /**
   * Получить метрики нагрузки сервера
   */
  async getServerLoad(): Promise<ServerLoadPayload> {
    const timestamp = new Date().toISOString();

    // CPU / Load
    const cores = Math.max(1, os.cpus()?.length ?? 1);
    const loadavg = os.loadavg() as [number, number, number];

    // RAM
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = Math.max(0, totalBytes - freeBytes);

    // Disk (df -kP /)
    const disk = await (async () => {
      try {
        const { stdout } = await this.server.run("df -kP /", { timeout: 1500 });
        const lines = stdout
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        if (lines.length < 2) return null;

        // Filesystem 1024-blocks Used Available Capacity Mounted on
        const cols = lines[1].split(/\s+/);
        if (cols.length < 6) return null;

        const totalKb = Number(cols[1]);
        const usedKb = Number(cols[2]);
        const availKb = Number(cols[3]);
        const percentRaw = String(cols[4] || "").trim();
        const usedPercent = Number(percentRaw.replace("%", "")) || 0;

        if (![totalKb, usedKb, availKb].every((n) => Number.isFinite(n))) {
          return null;
        }

        return {
          totalBytes: totalKb * 1024,
          usedBytes: usedKb * 1024,
          availableBytes: availKb * 1024,
          usedPercent,
        };
      } catch {
        return null;
      }
    })();

    // Network totals (/proc/net/dev)
    const network = await (async () => {
      try {
        const raw = await fs.readFile("/proc/net/dev", "utf-8");
        const lines = raw
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(2); // пропускаем заголовки

        let rxBytes = 0;
        let txBytes = 0;

        for (const line of lines) {
          const [ifaceRaw, restRaw] = line.split(":");
          const iface = (ifaceRaw || "").trim();
          const rest = (restRaw || "").trim();
          if (!iface || !rest || iface === "lo") continue;

          const parts = rest.split(/\s+/);

          // rx bytes = parts[0], tx bytes = parts[8]
          const rx = Number(parts[0] || 0);
          const tx = Number(parts[8] || 0);
          if (Number.isFinite(rx)) rxBytes += rx;
          if (Number.isFinite(tx)) txBytes += tx;
        }

        return { rxBytes, txBytes };
      } catch {
        return null;
      }
    })();

    // Docker (опционально)
    const docker = await (async () => {
      const containers = [
        AppContract.AmneziaWG.DOCKER_CONTAINER,
        AppContract.AmneziaWG2.DOCKER_CONTAINER,
        AppContract.Xray.DOCKER_CONTAINER,
      ].filter(Boolean);

      if (!containers.length) return null;

      try {
        const running = await listRunningDockerContainers();

        const targets = containers.filter((name) => running.has(name));
        if (!targets.length) return null;

        // Один вызов на все контейнеры
        const cmd = `docker stats --no-stream --format "{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.PIDs}}" ${targets.join(" ")}`;
        const { stdout } = await this.server.run(cmd, {
          timeout: 10000,
          maxBufferBytes: 1024 * 1024,
        });

        // Разбираем строку статистики одного контейнера
        const parseLine = (
          line: string,
        ): ServerLoadDockerContainerStats | null => {
          const parts = line.split("\t");
          if (parts.length < 5) return null;

          const name = (parts[0] || "").trim();
          if (!name) return null;

          const memParsed = parseMemUsage(parts[2] || "");
          const netParsed = parseNetIo(parts[3] || "");
          const pidsNumber = Number((parts[4] || "").trim());

          return {
            name,
            cpuPercent: parseCpuPercent(parts[1] || ""),
            memUsageBytes: memParsed.usage,
            memLimitBytes: memParsed.limit,
            netRxBytes: netParsed.rx,
            netTxBytes: netParsed.tx,
            pids: Number.isFinite(pidsNumber) ? pidsNumber : null,
          };
        };

        const stats = stdout
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
          .map(parseLine)
          .filter(isNotNull);

        if (!stats.length) return null;

        return { containers: stats };
      } catch (err) {
        appLogger.warn(`Не удалось получить статистику Docker: ${err}`);
        return null;
      }
    })();

    const payload: ServerLoadPayload = {
      timestamp,
      uptimeSec: os.uptime(),
      loadavg,
      cpu: { cores },
      memory: { totalBytes, freeBytes, usedBytes },
      disk,
      network,
      docker,
    };

    return payload;
  }

  /**
   * Импортировать данные резервной копии сервера
   */
  async importBackup(payload: ServerBackupPayload): Promise<void> {
    const protocols = payload.protocols ?? [];

    if (!protocols.length) {
      throw new APIError(ClientErrorCode.BAD_REQUEST);
    }

    if (protocols.includes(Protocol.AMNEZIAWG)) {
      if (!payload.amnezia) {
        throw new APIError(ClientErrorCode.BAD_REQUEST);
      }

      await this.amneziaWgService.importBackup(payload.amnezia);
    }

    if (protocols.includes(Protocol.AMNEZIAWG2)) {
      if (!payload.amneziaWg2) {
        throw new APIError(ClientErrorCode.BAD_REQUEST);
      }

      await this.amneziaWg2Service.importBackup(payload.amneziaWg2);
    }

    if (protocols.includes(Protocol.XRAY)) {
      if (!payload.xray) {
        throw new APIError(ClientErrorCode.BAD_REQUEST);
      }

      await this.xrayService.importBackup(payload.xray);
    }
  }

  /**
   * Перезагрузить сервер
   */
  async rebootServer(): Promise<void> {
    try {
      appLogger.info("Перезагрузка сервера...");
      await this.server.run("sudo reboot", { timeout: 1500 });
    } catch (err) {
      appLogger.warn(`При перезагрузке сервера произошла ошибка: ${err}`);
    }
  }
}
