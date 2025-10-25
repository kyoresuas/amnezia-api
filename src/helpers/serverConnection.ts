import { exec } from "child_process";
import { RunOptions } from "@/types/amnezia";

/**
 * Создать соединение с сервером
 */
export class ServerConnection {
  /**
   * Выполнить системную команду на хосте
   */
  run(
    cmd: string,
    options?: RunOptions
  ): Promise<{ stdout: string; stderr: string }> {
    const timeout = options?.timeout ?? 2000;
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
}
