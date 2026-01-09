import os from "os";
import fs from "fs/promises";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { XrayService } from "@/services/xray";
import { AppContract } from "@/contracts/app";
import { isNotNull } from "@/utils/primitive";
import { UsersService } from "@/services/users";
import { appLogger } from "@/config/winstonLogger";
import { AmneziaService } from "@/services/amnezia";
import { isDockerContainerRunning } from "@/helpers/docker";
import { ServerConnection } from "@/helpers/serverConnection";
import { ServerLoadDockerContainerStats } from "@/types/server";
import { ServerBackupPayload, ServerLoadPayload } from "@/types/server";
import { resolveEnabledProtocols } from "@/helpers/resolveEnabledProtocols";
import { ClientErrorCode, Protocol, ServerErrorCode } from "@/types/shared";

/**
 * Сервис управления сервером
 */
export class ServerService {
  static key = "serverService";

  private readonly server: ServerConnection;

  constructor(
    private readonly xrayService: XrayService,
    private readonly usersService: UsersService,
    private readonly amneziaService: AmneziaService
  ) {
    this.server = new ServerConnection();
  }

  /**
   * Получить агрегированную информацию о сервере
   */
  async getServerStatus(): Promise<{
    id: string;
    region: string;
    weight: number;
    maxPeers: number;
    totalPeers: number;
    protocols: Protocol[];
  }> {
    const users = await this.usersService.getUsers();
    const protocols = await resolveEnabledProtocols();

    return {
      id: appConfig.SERVER_ID || "",
      region: appConfig.SERVER_REGION || "",
      weight: appConfig.SERVER_WEIGHT || 0,
      maxPeers: appConfig.SERVER_MAX_PEERS || 0,
      totalPeers: users.reduce((acc, user) => acc + user.devices.length, 0),
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
      payload.amnezia = await this.amneziaService.exportBackup();
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
        AppContract.Amnezia.DOCKER_CONTAINER,
        AppContract.Xray.DOCKER_CONTAINER,
      ].filter(Boolean);

      if (!containers.length) return null;

      const running = await Promise.all(
        containers.map(async (name) => ({
          name,
          running: await isDockerContainerRunning(name),
        }))
      );

      const targets = running.filter((x) => x.running).map((x) => x.name);
      if (!targets.length) return null;

      const parseBytes = (value: string): number | null => {
        const valueTrimmed = (value || "").trim();
        const match = valueTrimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
        if (!match) return null;

        const number = Number(match[1]);
        if (!Number.isFinite(number)) return null;

        const unit = (match[2] || "B").toLowerCase();
        const map: Record<string, number> = {
          b: 1,
          bytes: 1,
          kb: 1000,
          k: 1000,
          kib: 1024,
          mb: 1000 ** 2,
          mib: 1024 ** 2,
          gb: 1000 ** 3,
          gib: 1024 ** 3,
          tb: 1000 ** 4,
          tib: 1024 ** 4,
        };

        const mult = map[unit];
        if (!mult) return null;

        return Math.round(number * mult);
      };

      // Парсим процент CPU
      const parseCpuPercent = (cpu: string): number | null => {
        const v = (cpu || "").trim().replace("%", "");
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      // Парсим использование памяти
      const parseMemUsage = (
        mem: string
      ): { usage: number | null; limit: number | null } => {
        const [left, right] = (mem || "").split("/").map((x) => x.trim());
        return {
          usage: left ? parseBytes(left) : null,
          limit: right ? parseBytes(right) : null,
        };
      };

      // Парсим сетевой ввод-вывод
      const parseNetIo = (
        net: string
      ): { rx: number | null; tx: number | null } => {
        const [left, right] = (net || "").split("/").map((x) => x.trim());
        return {
          rx: left ? parseBytes(left) : null,
          tx: right ? parseBytes(right) : null,
        };
      };

      // Читаем статистику контейнера
      const readStats = async (
        name: string
      ): Promise<ServerLoadDockerContainerStats | null> => {
        // табулированные: Name, CPUPerc, MemUsage, NetIO, PIDs
        const cmd = `docker stats --no-stream --format "{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.PIDs}}" ${name}`;
        const { stdout } = await this.server.run(cmd, {
          timeout: 1500,
          maxBufferBytes: 1024 * 1024,
        });

        const line = stdout
          .split("\n")
          .map((x) => x.trim())
          .find(Boolean);
        if (!line) return null;

        const parts = line.split("\t");
        if (parts.length < 5) return null;

        const cpuString = parts[1] || "";
        const memString = parts[2] || "";
        const netString = parts[3] || "";
        const pidsString = parts[4] || "";

        const cpuPercent = parseCpuPercent(cpuString);
        const memParsed = parseMemUsage(memString);
        const netParsed = parseNetIo(netString);
        const pids = (() => {
          const number = Number((pidsString || "").trim());
          return Number.isFinite(number) ? number : null;
        })();

        return {
          name,
          cpuPercent,
          memUsageBytes: memParsed.usage,
          memLimitBytes: memParsed.limit,
          netRxBytes: netParsed.rx,
          netTxBytes: netParsed.tx,
          pids,
        };
      };

      const stats = (
        await Promise.all(
          targets.map(async (name) => {
            try {
              return await readStats(name);
            } catch {
              return null;
            }
          })
        )
      ).filter(isNotNull);

      if (!stats.length) return null;

      return { containers: stats };
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

      await this.amneziaService.importBackup(payload.amnezia);
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
