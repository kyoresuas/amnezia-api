import { Protocol } from "@/types/shared";
import { PeerStatus } from "@/types/clients";
import { decodeVpnConfig } from "../helpers";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { XrayService } from "@/services/xray";
import { XrayBackupData } from "@/types/server";
import { createXrayConnectionMock } from "../mocks";
import { createXrayServerConfigFixture } from "../fixtures";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const originalServerName = appConfig.SERVER_NAME;

/**
 * Настроить название сервера для тестов Xray
 */
beforeEach(() => {
  appConfig.SERVER_NAME = undefined;
});

/**
 * Восстановить название сервера
 */
afterEach(() => {
  appConfig.SERVER_NAME = originalServerName;
});

/**
 * Создать субъект тестирования
 */
const createSubject = (
  connection = createXrayConnectionMock(createXrayServerConfigFixture()),
) => ({
  service: new XrayService(connection.connection),
  connection,
});

/**
 * Тестирование сервиса Xray
 */
describe("XrayService", () => {
  // Тестирование получения активных и отключенных клиентов со статистикой
  it("maps clients and their traffic statistics", async () => {
    const connection = createXrayConnectionMock(
      createXrayServerConfigFixture(),
      {
        trafficStats: {
          stat: [
            {
              name: "user>>>active-id>>>traffic>>>uplink",
              value: "128",
            },
            {
              name: "user>>>active-id>>>traffic>>>downlink",
              value: "256",
            },
          ],
        },
      },
    );
    const { service } = createSubject(connection);

    const clients = await service.getClients();

    expect(clients).toHaveLength(2);
    expect(clients[0]).toMatchObject({
      username: "active",
      peers: [
        {
          id: "active-id",
          status: PeerStatus.Active,
          traffic: { received: 256, sent: 128 },
          protocol: Protocol.XRAY,
        },
      ],
    });
    expect(clients[1]).toMatchObject({
      username: "disabled",
      peers: [
        {
          id: "disabled-id",
          status: PeerStatus.Disabled,
          traffic: { received: 0, sent: 0 },
          protocol: Protocol.XRAY,
        },
      ],
    });
  });

  // Тестирование создания клиента и конфигурации vpn://
  it("creates a client and returns an importable VPN config", async () => {
    const connection = createXrayConnectionMock(
      createXrayServerConfigFixture({ clients: [], clientsDisabled: [] }),
    );
    const { service } = createSubject(connection);

    const result = await service.createClient("alice", {
      expiresAt: 4_102_444_800,
    });

    expect(result.protocol).toBe(Protocol.XRAY);
    expect(result.config).toMatch(/^vpn:\/\//);
    expect(
      connection.getWrittenConfig()?.inbounds?.[0]?.settings?.clients,
    ).toEqual([
      {
        id: result.id,
        flow: "xtls-rprx-vision",
        username: "alice",
        expiresAt: 4_102_444_800,
      },
    ]);
    expect(decodeVpnConfig(result.config)).toMatchObject({
      defaultContainer: AppContract.Xray.DOCKER_CONTAINER,
      hostName: "127.0.0.1",
      description: "alice | Xray",
    });
    expect(connection.spies.restartContainer).toHaveBeenCalledOnce();
  });

  // Тестирование отключения и повторного включения клиента
  it("moves a client between active and disabled collections", async () => {
    const { service, connection } = createSubject();

    await expect(
      service.updateClient("active-id", { status: PeerStatus.Disabled }),
    ).resolves.toBe(true);
    expect(
      connection.getWrittenConfig()?.inbounds?.[0]?.settings,
    ).toMatchObject({
      clients: [],
      clientsDisabled: [
        { id: "disabled-id" },
        { id: "active-id", username: "active" },
      ],
    });

    await expect(
      service.updateClient("active-id", { status: PeerStatus.Active }),
    ).resolves.toBe(true);
    expect(
      connection.getWrittenConfig()?.inbounds?.[0]?.settings,
    ).toMatchObject({
      clients: [{ id: "active-id", username: "active" }],
      clientsDisabled: [{ id: "disabled-id" }],
    });
    expect(connection.spies.restartContainer).toHaveBeenCalledTimes(2);
  });

  // Тестирование отключения клиентов с истекшим сроком действия
  it("moves expired clients to the disabled collection", async () => {
    const connection = createXrayConnectionMock(
      createXrayServerConfigFixture({
        clients: [
          { id: "expired-id", username: "expired", expiresAt: 1_700_000_000 },
          { id: "future-id", username: "future", expiresAt: 4_102_444_800 },
        ],
        clientsDisabled: [{ id: "disabled-id", username: "disabled" }],
      }),
    );
    const { service } = createSubject(connection);

    await expect(service.disableExpiredClients()).resolves.toBe(1);

    expect(
      connection.getWrittenConfig()?.inbounds?.[0]?.settings,
    ).toMatchObject({
      clients: [{ id: "future-id" }],
      clientsDisabled: [{ id: "disabled-id" }, { id: "expired-id" }],
    });
    expect(connection.spies.restartContainer).toHaveBeenCalledOnce();
  });

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

  // Тестирование экспорта и импорта резервной копии
  it("exports and imports all Xray backup files", async () => {
    const { service, connection } = createSubject();

    const exported = await service.exportBackup();

    expect(exported).toMatchObject({
      uuid: "server-uuid",
      publicKey: "xray-public-key",
      privateKey: "xray-private-key",
      shortId: "short-id",
    });
    expect(JSON.parse(exported.serverConfig)).toEqual(
      createXrayServerConfigFixture(),
    );

    const backup: XrayBackupData = {
      serverConfig: JSON.stringify(
        createXrayServerConfigFixture({ clients: [], clientsDisabled: [] }),
      ),
      uuid: " imported-uuid ",
      publicKey: " imported-public-key ",
      privateKey: " imported-private-key ",
      shortId: " imported-short-id ",
    };

    await service.importBackup(backup);

    expect(connection.state.serverConfig).toBe(backup.serverConfig);
    expect(connection.state.files[AppContract.Xray.PATHS.UUID]).toBe(
      "imported-uuid\n",
    );
    expect(connection.state.files[AppContract.Xray.PATHS.PUBLIC_KEY]).toBe(
      "imported-public-key\n",
    );
    expect(connection.state.files[AppContract.Xray.PATHS.PRIVATE_KEY]).toBe(
      "imported-private-key\n",
    );
    expect(connection.state.files[AppContract.Xray.PATHS.SHORT_ID]).toBe(
      "imported-short-id\n",
    );
    expect(connection.spies.restartContainer).toHaveBeenCalledOnce();
  });

  // Тестирование отклонения поврежденной конфигурации сервера
  it("rejects an invalid server config without persisting changes", async () => {
    const connection = createXrayConnectionMock({});
    connection.state.serverConfig = "{invalid-json";
    const { service } = createSubject(connection);

    await expect(service.getClients()).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(connection.spies.writeServerConfig).not.toHaveBeenCalled();
    expect(connection.spies.restartContainer).not.toHaveBeenCalled();
  });
});
