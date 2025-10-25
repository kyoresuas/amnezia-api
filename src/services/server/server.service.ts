import { appLogger } from "@/config/winstonLogger";
import { ServerConnection } from "@/helpers/serverConnection";

/**
 * Сервис управления сервером
 */
export class ServerService {
  static key = "serverService";

  private readonly server: ServerConnection;

  constructor() {
    this.server = new ServerConnection();
  }

  /**
   * Перезагрузить сервер
   */
  async restartServer(): Promise<void> {
    try {
      await this.server.run("sudo reboot", { timeout: 1500 });
    } catch (err) {
      appLogger.warn(`При перезагрузке сервера произошла ошибка: ${err}`);
    }
  }
}
