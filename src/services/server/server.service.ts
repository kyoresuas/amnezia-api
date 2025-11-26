import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";
import { XrayService } from "@/services/xray";
import { UsersService } from "@/services/users";
import { appLogger } from "@/config/winstonLogger";
import { AmneziaService } from "@/services/amnezia";
import { ServerBackupPayload } from "@/types/server";
import { ClientErrorCode, Protocol } from "@/types/shared";
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
    const protocols = appConfig.PROTOCOLS_ENABLED?.length
      ? (appConfig.PROTOCOLS_ENABLED as Protocol[])
      : [Protocol.AMNEZIAWG];

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
    const protocols = appConfig.PROTOCOLS_ENABLED?.length
      ? (appConfig.PROTOCOLS_ENABLED as Protocol[])
      : [Protocol.AMNEZIAWG];

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
