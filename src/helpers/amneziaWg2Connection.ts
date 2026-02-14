import {
  isDockerDaemonUnavailableError,
  isDockerContainerUnavailableError,
} from "@/utils/dockerErrors";
import { exec } from "child_process";
import { APIError } from "@/utils/APIError";
import { RunOptions } from "@/types/amnezia";
import { AppContract } from "@/contracts/app";
import { CommandResult } from "@/types/shared";
import { ServerErrorCode } from "@/types/shared";
import { ClientTableEntry } from "@/types/amnezia";

/**
 * Создать соединение с AmneziaWG 2.0
 */
export class AmneziaWg2Connection {
  static key = "amneziaWg2";

  /**
   * Построить команду
   */
  private buildCommand(cmd: string): string {
    if (!AppContract.AmneziaWG2.DOCKER_CONTAINER) return cmd;

    return `docker exec ${
      AppContract.AmneziaWG2.DOCKER_CONTAINER
    } sh -lc '${cmd.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Выполнить команду
   */
  run(cmd: string, options?: RunOptions): Promise<CommandResult> {
    const finalCmd = this.buildCommand(cmd);
    const timeout = options?.timeout ?? 5000;
    const maxBuffer = options?.maxBufferBytes ?? 10 * 1024 * 1024;

    return new Promise((resolve, reject) => {
      exec(finalCmd, { timeout, maxBuffer }, (error, stdout, stderr) => {
        if (error) {
          if (isDockerDaemonUnavailableError(error)) {
            return reject(
              new APIError(ServerErrorCode.SERVICE_UNAVAILABLE, {
                msg: "swagger.errors.DOCKER_NOT_AVAILABLE",
              })
            );
          }

          if (isDockerContainerUnavailableError(error)) {
            return reject(
              new APIError(ServerErrorCode.SERVICE_UNAVAILABLE, {
                msg: "swagger.errors.CONTAINER_NOT_AVAILABLE",
              })
            );
          }

          return reject(
            new Error(`Ошибка выполнения команды ${cmd}: ${error}`)
          );
        }

        resolve({ stdout, stderr });
      });
    });
  }

  /**
   * Прочитать файл
   */
  async readFile(path: string): Promise<string> {
    const { stdout } = await this.run(`cat ${path} 2>/dev/null || true`);

    return stdout;
  }

  /**
   * Записать файл
   */
  async writeFile(path: string, content: string): Promise<void> {
    const heredoc = `cat > ${path} <<"EOF"\n${content}\nEOF`;

    await this.run(heredoc);
  }

  /**
   * Прочитать wg0.conf
   */
  async readWgConfig(): Promise<string> {
    const { stdout } = await this.run(
      `cat ${AppContract.AmneziaWG2.PATHS.WG_CONF} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Записать wg0.conf
   */
  async writeWgConfig(content: string): Promise<void> {
    const heredoc = `cat > ${AppContract.AmneziaWG2.PATHS.WG_CONF} <<"EOF"\n${content}\nEOF`;

    await this.run(heredoc);
  }

  /**
   * Получить dump wg
   */
  async getWgDump(): Promise<string> {
    if (!AppContract.AmneziaWG2.INTERFACE) return "";

    const { stdout } = await this.run(
      `awg show ${AppContract.AmneziaWG2.INTERFACE} dump`
    );

    return stdout;
  }

  /**
   * Применить конфигурацию wg
   */
  async syncWgConfig(): Promise<void> {
    if (!AppContract.AmneziaWG2.INTERFACE) return;

    await this.run(
      `awg syncconf ${AppContract.AmneziaWG2.INTERFACE} <(awg-quick strip ${AppContract.AmneziaWG2.PATHS.WG_CONF})`
    );
  }

  /**
   * Получить публичный ключ сервера
   */
  async getServerPublicKey(): Promise<string> {
    const { stdout } = await this.run(
      `cat ${AppContract.AmneziaWG2.PATHS.SERVER_PUBLIC_KEY} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Получить порт
   */
  async getListenPort(): Promise<string> {
    const { stdout } = await this.run(
      `cat ${AppContract.AmneziaWG2.PATHS.WG_CONF} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Получить clientsTable
   */
  async readClientsTable(): Promise<ClientTableEntry[]> {
    const raw = await this.readFile(
      AppContract.AmneziaWG2.PATHS.CLIENTS_TABLE || ""
    );

    try {
      const parsed = JSON.parse(raw || "[]") as unknown;

      // Текущий формат
      if (Array.isArray(parsed)) {
        return parsed as ClientTableEntry[];
      }

      // Старый формат
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        return Object.keys(obj).map((clientId) => ({
          clientId,
          userData:
            obj?.[clientId] && typeof obj[clientId] === "object"
              ? (obj[clientId] as ClientTableEntry["userData"])
              : undefined,
        }));
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Записать clientsTable
   */
  async writeClientsTable(table: ClientTableEntry[]): Promise<void> {
    const payload = JSON.stringify(table);

    await this.writeFile(
      AppContract.AmneziaWG2.PATHS.CLIENTS_TABLE || "",
      payload
    );
  }
}
