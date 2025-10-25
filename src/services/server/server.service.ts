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
  async rebootServer(): Promise<void> {
    try {
      appLogger.info("Перезагрузка сервера...");
      await this.server.run("sudo reboot", { timeout: 1500 });
    } catch (err) {
      appLogger.warn(`При перезагрузке сервера произошла ошибка: ${err}`);
    }
  }
}
