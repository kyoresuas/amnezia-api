import { Protocol } from "@/types/shared";
import appConfig from "@/constants/appConfig";
import { createClientRecord } from "../factories";
import { ClientsService } from "@/services/clients";
import { createProtocolServiceMock } from "../mocks";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_SERVER_MAX_PEERS } from "../config/setupTestEnvironment";

const originalMaxPeers = appConfig.SERVER_MAX_PEERS;

/**
 * Закрыть тестовое приложение
 */
afterEach(() => {
  appConfig.SERVER_MAX_PEERS = originalMaxPeers;
});

/**
 * Тестирование сервиса клиентов
 */
describe("ClientsService", () => {
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
