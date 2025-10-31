import { exec } from "child_process";
import { RunOptions } from "@/types/amnezia";
import { AppContract } from "@/contracts/app";
import { ClientTableEntry } from "@/types/amnezia";

/**
 * Создать соединение с AmneziaVPN
 */
export class AmneziaConnection {
  /**
   * Построить команду
   */
  private buildCommand(cmd: string): string {
    if (!AppContract.AMNEZIA_DOCKER_CONTAINER) return cmd;

    return `docker exec ${
      AppContract.AMNEZIA_DOCKER_CONTAINER
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
      `cat ${AppContract.AMNEZIA_WG_CONF_PATH} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Записать wg0.conf
   */
  async writeWgConfig(content: string): Promise<void> {
    const heredoc = `cat > ${AppContract.AMNEZIA_WG_CONF_PATH} <<"EOF"\n${content}\nEOF`;

    await this.run(heredoc);
  }

  /**
   * Получить dump wg
   */
  async getWgDump(): Promise<string> {
    if (!AppContract.AMNEZIA_INTERFACE) return "";

    const { stdout } = await this.run(
      `wg show ${AppContract.AMNEZIA_INTERFACE} dump`
    );

    return stdout;
  }

  /**
   * Применить конфигурацию wg
   */
  async syncWgConfig(): Promise<void> {
    if (!AppContract.AMNEZIA_INTERFACE) return;

    await this.run(
      `wg syncconf ${AppContract.AMNEZIA_INTERFACE} <(wg-quick strip ${AppContract.AMNEZIA_WG_CONF_PATH})`
    );
  }

  /**
   * Получить публичный ключ сервера
   */
  async getServerPublicKey(): Promise<string> {
    const { stdout } = await this.run(
      `cat ${AppContract.AMNEZIA_SERVER_PUBLIC_KEY_PATH} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Получить порт
   */
  async getListenPort(): Promise<string> {
    const { stdout } = await this.run(
      `cat ${AppContract.AMNEZIA_WG_CONF_PATH} 2>/dev/null || true`
    );

    return stdout;
  }

  /**
   * Получить clientsTable
   */
  async readClientsTable(): Promise<ClientTableEntry[]> {
    const raw = await this.readFile(
      AppContract.AMNEZIA_CLIENTS_TABLE_PATH || ""
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

    await this.writeFile(AppContract.AMNEZIA_CLIENTS_TABLE_PATH || "", payload);
  }
}
