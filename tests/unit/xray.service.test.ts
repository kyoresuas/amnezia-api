import { describe, expect, it } from "vitest";
import { XrayService } from "@/services/xray";
import { createXrayConnectionMock } from "../mocks";
import { createXrayServerConfigFixture } from "../fixtures";

/**
 * Создать субъект тестирования
 */
const createSubject = () => {
  const connection = createXrayConnectionMock(createXrayServerConfigFixture());

  return {
    service: new XrayService(connection.connection),
    connection,
  };
};

/**
 * Тестирование сервиса Xray
 */
describe("XrayService.deleteClient", () => {
  // Тестирование удаления отключенного клиента и сохранения активных клиентов
  it("deletes a disabled client and keeps active clients", async () => {
    const { service, connection } = createSubject();

    await expect(service.deleteClient("disabled-id")).resolves.toBe(true);

    const savedConfig = connection.getWrittenConfig();
    expect(savedConfig?.inbounds?.[0]?.settings?.clients).toEqual([
      { id: "active-id", username: "active" },
    ]);
    expect(savedConfig?.inbounds?.[0]?.settings?.clientsDisabled).toEqual([]);
    expect(connection.spies.writeServerConfig).toHaveBeenCalledOnce();
    expect(connection.spies.restartContainer).toHaveBeenCalledOnce();
  });

  // Тестирование отсутствия сохранения изменений при отсутствии клиента
  it("does not persist changes when the client is missing", async () => {
    const { service, connection } = createSubject();

    await expect(service.deleteClient("missing-id")).resolves.toBe(false);
    expect(connection.spies.writeServerConfig).not.toHaveBeenCalled();
    expect(connection.spies.restartContainer).not.toHaveBeenCalled();
  });
});
