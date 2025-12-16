import {
  isDockerDaemonUnavailableError,
  isDockerContainerUnavailableError,
} from "@/helpers/dockerErrors";
import { exec } from "child_process";
import { APIError } from "@/utils/APIError";
import { RunOptions } from "@/types/amnezia";
import { AppContract } from "@/contracts/app";
import { ServerErrorCode } from "@/types/shared";
import { ClientTableEntry } from "@/types/amnezia";

/**
 * Создать соединение с AmneziaVPN
 */
export class AmneziaConnection {
  static key = "amnezia";

  /**
   * Построить команду
   */
  private buildCommand(cmd: string): string {
    if (!AppContract.Amnezia.DOCKER_CONTAINER) return cmd;

    return `docker exec ${
      AppContract.Amnezia.DOCKER_CONTAINER
    } sh -lc '${cmd.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Выполнить команду
   */
  run(
    cmd: string,
    options?: RunOptions
  ): Promise<{ stdout: string; stderr: string }> {
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
      `cat ${AppContract.Amnezia.PATHS.WG_CONF} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Записать wg0.conf
   */
  async writeWgConfig(content: string): Promise<void> {
    const heredoc = `cat > ${AppContract.Amnezia.PATHS.WG_CONF} <<"EOF"\n${content}\nEOF`;

    await this.run(heredoc);
  }

  /**
   * Получить dump wg
   */
  async getWgDump(): Promise<string> {
    if (!AppContract.Amnezia.INTERFACE) return "";

    const { stdout } = await this.run(
      `wg show ${AppContract.Amnezia.INTERFACE} dump`
    );

    return stdout;
  }

  /**
   * Применить конфигурацию wg
   */
  async syncWgConfig(): Promise<void> {
    if (!AppContract.Amnezia.INTERFACE) return;

    await this.run(
      `wg syncconf ${AppContract.Amnezia.INTERFACE} <(wg-quick strip ${AppContract.Amnezia.PATHS.WG_CONF})`
    );
  }

  /**
   * Получить публичный ключ сервера
   */
  async getServerPublicKey(): Promise<string> {
    const { stdout } = await this.run(
      `cat ${AppContract.Amnezia.PATHS.SERVER_PUBLIC_KEY} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Получить порт
   */
  async getListenPort(): Promise<string> {
    const { stdout } = await this.run(
      `cat ${AppContract.Amnezia.PATHS.WG_CONF} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Получить clientsTable
   */
  async readClientsTable(): Promise<ClientTableEntry[]> {
    const raw = await this.readFile(
      AppContract.Amnezia.PATHS.CLIENTS_TABLE || ""
    );

    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? (parsed as ClientTableEntry[]) : [];
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
      AppContract.Amnezia.PATHS.CLIENTS_TABLE || "",
      payload
    );
  }
}
