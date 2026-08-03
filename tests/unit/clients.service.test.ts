import { Protocol } from "@/types/shared";
import { PeerStatus } from "@/types/clients";
import appConfig from "@/constants/appConfig";
import { createClientRecord } from "../factories";
import { ClientsService } from "@/services/clients";
import { createProtocolServiceMock } from "../mocks";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TEST_SERVER_MAX_PEERS } from "../config/setupTestEnvironment";

const originalAppConfig = {
  SERVER_MAX_PEERS: appConfig.SERVER_MAX_PEERS,
  PROTOCOLS_ENABLED: appConfig.PROTOCOLS_ENABLED,
};

/**
 * Создать субъект тестирования
 */
const createSubject = () => {
  const xray = createProtocolServiceMock(Protocol.XRAY);
  const amneziaWg = createProtocolServiceMock(Protocol.AMNEZIAWG);
  const amneziaWg2 = createProtocolServiceMock(Protocol.AMNEZIAWG2);

  return {
    service: new ClientsService(
      xray.service,
      amneziaWg.service,
      amneziaWg2.service,
    ),
    protocols: { xray, amneziaWg, amneziaWg2 },
  };
};

/**
 * Настроить конфигурацию приложения для тестов клиентов
 */
beforeEach(() => {
  appConfig.SERVER_MAX_PEERS = undefined;
  appConfig.PROTOCOLS_ENABLED = [
    Protocol.XRAY,
    Protocol.AMNEZIAWG,
    Protocol.AMNEZIAWG2,
  ];
});

/**
 * Восстановить конфигурацию приложения
 */
afterEach(() => {
  Object.assign(appConfig, originalAppConfig);
});

/**
 * Тестирование сервиса клиентов
 */
describe("ClientsService", () => {
  // Тестирование объединения пиров одного клиента из разных протоколов
  it("merges peers with the same username across enabled protocols", async () => {
    const xray = createProtocolServiceMock(Protocol.XRAY, [
      createClientRecord({ username: "alice", protocol: Protocol.XRAY }),
    ]);
    const amneziaWg = createProtocolServiceMock(Protocol.AMNEZIAWG, [
      createClientRecord({
        username: "alice",
        protocol: Protocol.AMNEZIAWG,
      }),
    ]);
    const amneziaWg2 = createProtocolServiceMock(Protocol.AMNEZIAWG2, [
      createClientRecord({
        username: "bob",
        protocol: Protocol.AMNEZIAWG2,
      }),
    ]);
    const service = new ClientsService(
      xray.service,
      amneziaWg.service,
      amneziaWg2.service,
    );

    const clients = await service.getClients();

    expect(clients).toHaveLength(2);
    expect(clients.find(({ username }) => username === "alice")?.peers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ protocol: Protocol.XRAY }),
        expect.objectContaining({ protocol: Protocol.AMNEZIAWG }),
      ]),
    );
    expect(clients.find(({ username }) => username === "bob")?.peers).toEqual([
      expect.objectContaining({ protocol: Protocol.AMNEZIAWG2 }),
    ]);
  });

  // Тестирование маршрутизации создания клиента в выбранный протокол
  it("routes client creation to the selected protocol", async () => {
    const { service, protocols } = createSubject();

    await expect(
      service.createClient({
        clientName: "alice",
        protocol: Protocol.AMNEZIAWG,
        expiresAt: 4_102_444_800,
      }),
    ).resolves.toMatchObject({
      protocol: Protocol.AMNEZIAWG,
    });
    expect(protocols.amneziaWg.spies.createClient).toHaveBeenCalledWith(
      "alice",
      { expiresAt: 4_102_444_800 },
    );
    expect(protocols.xray.spies.createClient).not.toHaveBeenCalled();
    expect(protocols.amneziaWg2.spies.createClient).not.toHaveBeenCalled();
  });

  // Тестирование запрета операций для выключенного протокола
  it("rejects client creation for a disabled protocol", async () => {
    const { service, protocols } = createSubject();
    appConfig.PROTOCOLS_ENABLED = [Protocol.XRAY];

    await expect(
      service.createClient({
        clientName: "alice",
        protocol: Protocol.AMNEZIAWG,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(protocols.amneziaWg.spies.createClient).not.toHaveBeenCalled();
  });

  // Тестирование передачи параметров обновления сервису протокола
  it("forwards client updates to the selected protocol", async () => {
    const { service, protocols } = createSubject();

    await expect(
      service.updateClient({
        clientId: "client-id",
        protocol: Protocol.XRAY,
        status: PeerStatus.Disabled,
        expiresAt: 4_102_444_800,
      }),
    ).resolves.toBeUndefined();
    expect(protocols.xray.spies.updateClient).toHaveBeenCalledWith(
      "client-id",
      {
        status: PeerStatus.Disabled,
        expiresAt: 4_102_444_800,
      },
    );
  });

  // Тестирование ошибки при обновлении отсутствующего клиента
  it("returns not found when the protocol cannot update a client", async () => {
    const { service, protocols } = createSubject();
    protocols.xray.spies.updateClient.mockResolvedValue(false);

    await expect(
      service.updateClient({
        clientId: "missing-id",
        protocol: Protocol.XRAY,
        status: PeerStatus.Disabled,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  // Тестирование ошибки при удалении отсутствующего клиента
  it("returns not found when the protocol cannot delete a client", async () => {
    const { service, protocols } = createSubject();
    protocols.amneziaWg.spies.deleteClient.mockResolvedValue(false);

    await expect(
      service.deleteClient({
        clientId: "missing-id",
        protocol: Protocol.AMNEZIAWG,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  // Тестирование изоляции ошибки протокола при отключении просроченных клиентов
  it("continues disabling expired clients when one protocol fails", async () => {
    const { service, protocols } = createSubject();
    protocols.xray.spies.disableExpiredClients.mockResolvedValue(2);
    protocols.amneziaWg.spies.disableExpiredClients.mockRejectedValue(
      new Error("protocol unavailable"),
    );
    protocols.amneziaWg2.spies.disableExpiredClients.mockResolvedValue(1);

    await expect(service.disableExpiredClients()).resolves.toBe(3);
    expect(protocols.xray.spies.disableExpiredClients).toHaveBeenCalledOnce();
    expect(
      protocols.amneziaWg.spies.disableExpiredClients,
    ).toHaveBeenCalledOnce();
    expect(
      protocols.amneziaWg2.spies.disableExpiredClients,
    ).toHaveBeenCalledOnce();
  });

  // Тестирование ограничения количества пиров при создании клиентов в параллельных протоколах
  it("enforces the peer limit across concurrent protocol creates", async () => {
    const xray = createProtocolServiceMock(Protocol.XRAY, [
      createClientRecord({ username: "existing", protocol: Protocol.XRAY }),
    ]);
    const amneziaWg = createProtocolServiceMock(Protocol.AMNEZIAWG);
    const amneziaWg2 = createProtocolServiceMock(Protocol.AMNEZIAWG2);
    const service = new ClientsService(
      xray.service,
      amneziaWg.service,
      amneziaWg2.service,
    );
    appConfig.SERVER_MAX_PEERS = TEST_SERVER_MAX_PEERS;

    const results = await Promise.allSettled([
      service.createClient({
        clientName: "first",
        protocol: Protocol.XRAY,
      }),
      service.createClient({
        clientName: "second",
        protocol: Protocol.AMNEZIAWG,
      }),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(results.find(({ status }) => status === "rejected")).toMatchObject({
      reason: { statusCode: 409 },
    });

    const createCalls =
      xray.spies.createClient.mock.calls.length +
      amneziaWg.spies.createClient.mock.calls.length +
      amneziaWg2.spies.createClient.mock.calls.length;
    expect(createCalls).toBe(1);
  });
});
