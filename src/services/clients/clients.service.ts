import {
  ClientRecord,
  CreateClientResult,
  DeleteClientPayload,
  CreateClientPayload,
} from "@/types/clients";
import { Protocol } from "@/types/shared";
import { APIError } from "@/utils/APIError";
import { XrayService } from "@/services/xray";
import appConfig from "@/constants/appConfig";
import { appLogger } from "@/config/winstonLogger";
import { AmneziaService } from "@/services/amnezia";
import { ClientErrorCode, ServerErrorCode } from "@/types/shared";
import { resolveEnabledProtocols } from "@/helpers/resolveEnabledProtocols";

/**
 * Сервис для работы с клиентами
 */
export class ClientsService {
  static key = "clientsService";

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
   * Получить список клиентов
   */
  async getClients(): Promise<ClientRecord[]> {
    const enabled = await this.getEnabledProtocols();
    const clients = new Map<string, ClientRecord>();

    for (const protocol of enabled) {
      const service = this.getServiceByProtocol(protocol);

      const serviceClients = await service.getClients();

      for (const client of serviceClients) {
        const normalizedDevices = client.devices.map((device) => ({
          ...device,
          protocol: device.protocol ?? protocol,
        }));

        const existing = clients.get(client.username);

        if (existing) {
          existing.devices.push(...normalizedDevices);
        } else {
          clients.set(client.username, {
            username: client.username,
            devices: normalizedDevices,
          });
        }
      }
    }

    return Array.from(clients.values());
  }

  /**
   * Создать клиента
   */
  async createClient({
    clientName,
    protocol,
    expiresAt = null,
  }: CreateClientPayload): Promise<CreateClientResult> {
    await this.ensureProtocolEnabled(protocol);

    const service = this.getServiceByProtocol(protocol);

    return service.createClient(clientName, { expiresAt });
  }

  /**
   * Удалить клиента
   */
  async deleteClient({
    clientId,
    protocol,
  }: DeleteClientPayload): Promise<void> {
    await this.ensureProtocolEnabled(protocol);

    const service = this.getServiceByProtocol(protocol);

    const ok = await service.deleteClient(clientId);

    if (!ok) {
      throw new APIError(ClientErrorCode.NOT_FOUND);
    }
  }

  /**
   * Удалить всех клиентов с истекшим сроком действия
   */
  async cleanupExpiredClients(): Promise<number> {
    const enabled = await this.getEnabledProtocols();

    let removed = 0;

    if (enabled.includes(Protocol.AMNEZIAWG)) {
      try {
        removed += await this.amneziaService.cleanupExpiredClients();
      } catch {
        appLogger.warn(
          `AmneziaWG недоступен, пропускаем очистку просроченных клиентов`
        );
      }
    }

    if (enabled.includes(Protocol.XRAY)) {
      try {
        removed += await this.xrayService.cleanupExpiredClients();
      } catch {
        appLogger.warn(
          `Xray недоступен, пропускаем очистку просроченных клиентов`
        );
      }
    }

    return removed;
  }
}

