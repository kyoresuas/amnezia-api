import {
  ClientRecord,
  IProtocolService,
  CreateClientResult,
  CreateClientPayload,
  DeleteClientPayload,
  UpdateClientPayload,
} from "@/types/clients";
import { Mutex } from "@/utils/mutex";
import { Protocol } from "@/types/shared";
import { APIError } from "@/utils/APIError";
import { XrayService } from "@/services/xray";
import appConfig from "@/constants/appConfig";
import { appLogger } from "@/config/winstonLogger";
import { AmneziaWgService } from "@/services/amneziaWg";
import { AmneziaWg2Service } from "@/services/amneziaWg2";
import { ClientErrorCode, ServerErrorCode } from "@/types/shared";
import { resolveEnabledProtocols } from "@/helpers/resolveEnabledProtocols";

/**
 * Сервис для работы с клиентами
 */
export class ClientsService {
  static key = "clientsService";

  // Маршрутизация протокол -> сервис
  private readonly servicesByProtocol: Record<Protocol, IProtocolService>;

  constructor(
    private xrayService: XrayService,
    private amneziaWgService: AmneziaWgService,
    private amneziaWg2Service: AmneziaWg2Service,
  ) {
    this.servicesByProtocol = {
      [Protocol.XRAY]: this.xrayService,
      [Protocol.AMNEZIAWG]: this.amneziaWgService,
      [Protocol.AMNEZIAWG2]: this.amneziaWg2Service,
    };
  }

  // Мьютексы на запись по протоколам. сериализуют read-modify-write
  // над wg0.conf / clientsTable / server.json, чтобы параллельные
  // create/update/delete/disable не затирали друг друга и не выбирали один IP
  private readonly writeLocks = new Map<Protocol, Mutex>();

  /**
   * Получить мьютекс записи для протокола
   */
  private lockFor(protocol: Protocol): Mutex {
    let mutex = this.writeLocks.get(protocol);

    if (!mutex) {
      mutex = new Mutex();
      this.writeLocks.set(protocol, mutex);
    }

    return mutex;
  }

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
  private getServiceByProtocol(protocol: Protocol): IProtocolService {
    const service = this.servicesByProtocol[protocol];

    if (!service) {
      throw new APIError(ServerErrorCode.NOT_IMPLEMENTED);
    }

    return service;
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
        const normalizedPeers = client.peers.map((peer) => ({
          ...peer,
          protocol: peer.protocol ?? protocol,
        }));

        const existing = clients.get(client.username);

        if (existing) {
          existing.peers.push(...normalizedPeers);
        } else {
          clients.set(client.username, {
            username: client.username,
            peers: normalizedPeers,
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

    return this.lockFor(protocol).runExclusive(() =>
      service.createClient(clientName, { expiresAt }),
    );
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

    const ok = await this.lockFor(protocol).runExclusive(() =>
      service.deleteClient(clientId),
    );

    if (!ok) {
      throw new APIError(ClientErrorCode.NOT_FOUND);
    }
  }

  /**
   * Обновить expiresAt клиента
   */
  async updateClient({
    clientId,
    protocol,
    expiresAt,
    status,
  }: UpdateClientPayload): Promise<void> {
    await this.ensureProtocolEnabled(protocol);

    const service = this.getServiceByProtocol(protocol);

    const ok = await this.lockFor(protocol).runExclusive(() =>
      service.updateClient(clientId, {
        expiresAt,
        status,
      }),
    );

    if (!ok) {
      throw new APIError(ClientErrorCode.NOT_FOUND);
    }
  }

  /**
   * Заблокировать (отключить) всех клиентов с истекшим сроком действия
   * Записи не удаляются, клиентам блокируется доступ
   */
  async disableExpiredClients(): Promise<number> {
    const enabled = await this.getEnabledProtocols();

    let disabled = 0;

    for (const protocol of enabled) {
      const service = this.servicesByProtocol[protocol];
      if (!service) continue;

      try {
        disabled += await this.lockFor(protocol).runExclusive(() =>
          service.disableExpiredClients(),
        );
      } catch {
        appLogger.warn(
          `${protocol}: сервис недоступен, пропускаем блокировку просроченных клиентов`,
        );
      }
    }

    return disabled;
  }
}
