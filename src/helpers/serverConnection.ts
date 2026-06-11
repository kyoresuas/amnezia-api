import { exec } from "child_process";
import { RunOptions } from "@/types/amnezia";
import { CommandResult } from "@/types/shared";
import { TimeContract } from "@/contracts/time";

/**
 * Создать соединение с сервером
 */
export class ServerConnection {
  /**
   * Выполнить системную команду на хосте
   */
  run(cmd: string, options?: RunOptions): Promise<CommandResult> {
    const timeout = options?.timeout ?? 2 * TimeContract.SECOND;
    const maxBuffer = options?.maxBufferBytes ?? 10 * 1024 * 1024;

    return new Promise((resolve, reject) => {
      exec(cmd, { timeout, maxBuffer }, (error, stdout, stderr) => {
        if (error) {
          return reject(
            new Error(`Ошибка выполнения команды ${cmd}: ${error}`),
          );
        }

        resolve({ stdout, stderr });
      });
    });
  }
}
