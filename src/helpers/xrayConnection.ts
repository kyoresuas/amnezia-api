import {
  isDockerDaemonUnavailableError,
  isDockerContainerUnavailableError,
} from "@/helpers/dockerErrors";
import { exec } from "child_process";
import { APIError } from "@/utils/APIError";
import { RunOptions } from "@/types/amnezia";
import { AppContract } from "@/contracts/app";
import { ServerErrorCode } from "@/types/shared";

/**
 * Создать соединение с Xray
 */
export class XrayConnection {
  static key = "xray";

  /**
   * Построить команду
   */
  private buildCommand(cmd: string): string {
    if (!AppContract.Xray.DOCKER_CONTAINER) return cmd;

    return `docker exec ${
      AppContract.Xray.DOCKER_CONTAINER
    } sh -lc '${cmd.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Выполнить команду внутри контейнера
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
   * Выполнить команду на хосте (вне контейнера)
   */
  runOnHost(
    cmd: string,
    options?: RunOptions
  ): Promise<{ stdout: string; stderr: string }> {
    const timeout = options?.timeout ?? 5000;
    const maxBuffer = options?.maxBufferBytes ?? 10 * 1024 * 1024;

    return new Promise((resolve, reject) => {
      exec(cmd, { timeout, maxBuffer }, (error, stdout, stderr) => {
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
   * Прочитать конфигурацию сервера
   */
  async readServerConfig(): Promise<string> {
    return this.readFile(AppContract.Xray.PATHS.SERVER_CONFIG);
  }

  /**
   * Записать конфигурацию сервера
   */
  async writeServerConfig(content: string): Promise<void> {
    await this.writeFile(AppContract.Xray.PATHS.SERVER_CONFIG, content);
  }

  /**
   * Перезапустить контейнер Xray
   */
  async restartContainer(): Promise<void> {
    if (!AppContract.Xray.DOCKER_CONTAINER) return;

    await this.runOnHost(`docker restart ${AppContract.Xray.DOCKER_CONTAINER}`);
  }
}
