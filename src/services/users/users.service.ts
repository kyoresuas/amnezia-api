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
  private getEnabledProtocols(): Protocol[] {
    return appConfig.PROTOCOLS_ENABLED ?? [Protocol.AMNEZIAWG];
  }

  /**
   * Проверить, что протокол включен
   */
  private ensureProtocolEnabled(protocol: Protocol): void {
    const enabled = this.getEnabledProtocols();

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
    const enabled = this.getEnabledProtocols();
    const users: UserRecord[] = [];

    for (const protocol of enabled) {
      const service = this.getServiceByProtocol(protocol);

      const serviceUsers = await service.getUsers();

      users.push(
        ...serviceUsers.map((user) => ({
          ...user,
          devices: user.devices.map((device) => ({
            ...device,
            protocol: device.protocol ?? protocol,
          })),
        }))
      );
    }

    return users;
  }

  /**
   * Создать пользователя
   */
  async createUser({
    clientName,
    protocol,
    expiresAt = null,
  }: CreateUserPayload): Promise<CreateUserResult> {
    this.ensureProtocolEnabled(protocol);

    const service = this.getServiceByProtocol(protocol);

    return service.createClient(clientName, { expiresAt });
  }

  /**
   * Удалить пользователя
   */
  async deleteUser({ clientId, protocol }: DeleteUserPayload): Promise<void> {
    this.ensureProtocolEnabled(protocol);

    const service = this.getServiceByProtocol(protocol);

    const ok = await service.deleteClient(clientId);

    if (!ok) {
      throw new APIError(ClientErrorCode.NOT_FOUND);
    }
  }
}
