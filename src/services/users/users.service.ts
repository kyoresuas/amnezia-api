import {
  UserRecord,
  CreateUserResult,
  DeleteUserPayload,
  CreateUserPayload,
} from "@/types/users";
import { Protocol } from "@/types/shared";
import { APIError } from "@/utils/APIError";
import { XrayService } from "@/services/xray";
import appConfig from "@/constants/appConfig";
import { AmneziaService } from "@/services/amnezia";
import { ClientErrorCode, ServerErrorCode } from "@/types/shared";
import { resolveEnabledProtocols } from "@/helpers/resolveEnabledProtocols";

/**
 * Сервис для работы с пользователями
 */
export class UsersService {
  static key = "usersService";

  constructor(
    private amneziaService: AmneziaService,
    private xrayService: XrayService
  ) {}

  /**
   * Получить список включенных протоколов
   */
  private async getEnabledProtocols(): Promise<Protocol[]> {
    if (appConfig.PROTOCOLS_ENABLED?.length) {
      return appConfig.PROTOCOLS_ENABLED;
    }

    const enabled = await resolveEnabledProtocols();

    if (!enabled.length) {
      throw new APIError(ServerErrorCode.SERVICE_UNAVAILABLE, {
        msg: "swagger.errors.NO_PROTOCOLS_AVAILABLE",
      });
    }

    return enabled;
  }

  /**
   * Проверить, что протокол включен
   */
  private async ensureProtocolEnabled(protocol: Protocol): Promise<void> {
    const enabled = await this.getEnabledProtocols();

    if (!enabled.includes(protocol)) {
      throw new APIError(ClientErrorCode.BAD_REQUEST);
    }
  }

  /**
   * Получить сервис по протоколу
   */
  private getServiceByProtocol(
    protocol: Protocol
  ): AmneziaService | XrayService {
    switch (protocol) {
      case Protocol.AMNEZIAWG:
        return this.amneziaService;
      case Protocol.XRAY:
        return this.xrayService;
      default:
        throw new APIError(ServerErrorCode.NOT_IMPLEMENTED);
    }
  }

  /**
   * Получить список пользователей
   */
  async getUsers(): Promise<UserRecord[]> {
    const enabled = await this.getEnabledProtocols();
    const users = new Map<string, UserRecord>();

    for (const protocol of enabled) {
      const service = this.getServiceByProtocol(protocol);

      const serviceUsers = await service.getUsers();

      for (const user of serviceUsers) {
        const normalizedDevices = user.devices.map((device) => ({
          ...device,
          protocol: device.protocol ?? protocol,
        }));

        const existing = users.get(user.username);

        if (existing) {
          existing.devices.push(...normalizedDevices);
        } else {
          users.set(user.username, {
            username: user.username,
            devices: normalizedDevices,
          });
        }
      }
    }

    return Array.from(users.values());
  }

  /**
   * Создать пользователя
   */
  async createUser({
    clientName,
    protocol,
    expiresAt = null,
  }: CreateUserPayload): Promise<CreateUserResult> {
    await this.ensureProtocolEnabled(protocol);

    const service = this.getServiceByProtocol(protocol);

    return service.createClient(clientName, { expiresAt });
  }

  /**
   * Удалить пользователя
   */
  async deleteUser({ clientId, protocol }: DeleteUserPayload): Promise<void> {
    await this.ensureProtocolEnabled(protocol);

    const service = this.getServiceByProtocol(protocol);

    const ok = await service.deleteClient(clientId);

    if (!ok) {
      throw new APIError(ClientErrorCode.NOT_FOUND);
    }
  }
}
