import { Protocol } from "@/types/shared";
import appConfig from "@/constants/appConfig";
import { XrayService } from "@/services/xray";
import { UsersService } from "@/services/users";
import { appLogger } from "@/config/winstonLogger";
import { AmneziaService } from "@/services/amnezia";
import { ServerBackupPayload } from "@/types/server";
import { ServerConnection } from "@/helpers/serverConnection";

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

    return {
      id: appConfig.SERVER_ID || "",
      region: appConfig.SERVER_REGION || "",
      weight: appConfig.SERVER_WEIGHT || 0,
      maxPeers: appConfig.SERVER_MAX_PEERS || 0,
      totalPeers: users.reduce((acc, user) => acc + user.devices.length, 0),
      protocols: appConfig.PROTOCOLS_ENABLED as Protocol[],
    };
  }

  /**
   * Сформировать резервную копию конфигурации сервера
   */
  async exportBackup(): Promise<ServerBackupPayload> {
    const protocols = appConfig.PROTOCOLS_ENABLED as Protocol[];

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
