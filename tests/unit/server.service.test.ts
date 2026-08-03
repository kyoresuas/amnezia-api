import {
  createXrayConnectionMock,
  createAmneziaConnectionMock,
} from "../mocks";
import {
  createAmneziaBackupFixture,
  createXrayServerConfigFixture,
} from "../fixtures";
import { Protocol } from "@/types/shared";
import appConfig from "@/constants/appConfig";
import { XrayService } from "@/services/xray";
import { ServerService } from "@/services/server";
import { ClientsService } from "@/services/clients";
import { ServerBackupPayload } from "@/types/server";
import { AmneziaWgService } from "@/services/amneziaWg";
import { AmneziaWg2Service } from "@/services/amneziaWg2";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const originalAppConfig = {
  SERVER_ID: appConfig.SERVER_ID,
  SERVER_REGION: appConfig.SERVER_REGION,
  SERVER_WEIGHT: appConfig.SERVER_WEIGHT,
  SERVER_MAX_PEERS: appConfig.SERVER_MAX_PEERS,
  PROTOCOLS_ENABLED: appConfig.PROTOCOLS_ENABLED,
};

/**
 * Создать субъект тестирования
 */
const createSubject = () => {
  const amneziaWgConnection = createAmneziaConnectionMock();
  const amneziaWg2Connection = createAmneziaConnectionMock();
  const xrayConnection = createXrayConnectionMock(
    createXrayServerConfigFixture(),
  );

  const amneziaWgService = new AmneziaWgService(amneziaWgConnection.connection);
  const amneziaWg2Service = new AmneziaWg2Service(
    amneziaWg2Connection.connection,
  );
  const xrayService = new XrayService(xrayConnection.connection);
  const clientsService = new ClientsService(
    xrayService,
    amneziaWgService,
    amneziaWg2Service,
  );

  return {
    service: new ServerService(
      xrayService,
      clientsService,
      amneziaWgService,
      amneziaWg2Service,
    ),
    connections: {
      amneziaWg: amneziaWgConnection,
      amneziaWg2: amneziaWg2Connection,
      xray: xrayConnection,
    },
  };
};

/**
 * Настроить метаданные тестового сервера
 */
beforeEach(() => {
  appConfig.SERVER_ID = "test-server-id";
  appConfig.SERVER_REGION = "test-region";
  appConfig.SERVER_WEIGHT = 150;
  appConfig.SERVER_MAX_PEERS = 200;
  appConfig.PROTOCOLS_ENABLED = [
    Protocol.AMNEZIAWG,
    Protocol.AMNEZIAWG2,
    Protocol.XRAY,
  ];
});

/**
 * Восстановить конфигурацию приложения
 */
afterEach(() => {
  Object.assign(appConfig, originalAppConfig);
});

/**
 * Тестирование сервиса управления сервером
 */
describe("ServerService", () => {
  // Тестирование агрегированной информации о сервере
  it("returns server metadata and total peer count", async () => {
    const { service } = createSubject();

    await expect(service.getServerStatus()).resolves.toEqual({
      id: "test-server-id",
      region: "test-region",
      weight: 150,
      maxPeers: 200,
      totalPeers: 6,
      protocols: [Protocol.AMNEZIAWG, Protocol.AMNEZIAWG2, Protocol.XRAY],
    });
  });

  // Тестирование экспорта резервной копии всех протоколов
  it("exports a complete multi-protocol backup", async () => {
    const { service } = createSubject();

    const backup = await service.exportBackup();

    expect(backup.generatedAt).toEqual(expect.any(String));
    expect(backup.serverId).toBe("test-server-id");
    expect(backup.protocols).toEqual([
      Protocol.AMNEZIAWG,
      Protocol.AMNEZIAWG2,
      Protocol.XRAY,
    ]);
    expect(backup.amnezia).toEqual(createAmneziaBackupFixture());
    expect(backup.amneziaWg2).toEqual(createAmneziaBackupFixture());
    expect(backup.xray).toMatchObject({
      uuid: "server-uuid",
      publicKey: "xray-public-key",
      privateKey: "xray-private-key",
      shortId: "short-id",
    });
  });

  // Тестирование импорта резервной копии всех протоколов
  it("imports a complete multi-protocol backup", async () => {
    const { service, connections } = createSubject();
    const xrayConfig = JSON.stringify(
      createXrayServerConfigFixture({ clients: [], clientsDisabled: [] }),
    );
    const backup: ServerBackupPayload = {
      generatedAt: "2026-08-04T00:00:00.000Z",
      serverId: "backup-server-id",
      protocols: [Protocol.AMNEZIAWG, Protocol.AMNEZIAWG2, Protocol.XRAY],
      amnezia: createAmneziaBackupFixture(),
      amneziaWg2: createAmneziaBackupFixture(),
      xray: {
        serverConfig: xrayConfig,
        uuid: "backup-uuid",
        publicKey: "backup-public-key",
        privateKey: "backup-private-key",
        shortId: "backup-short-id",
      },
    };

    await service.importBackup(backup);

    expect(connections.amneziaWg.spies.writeWgConfig).toHaveBeenCalledOnce();
    expect(connections.amneziaWg2.spies.writeWgConfig).toHaveBeenCalledOnce();
    expect(connections.xray.state.serverConfig).toBe(xrayConfig);
    expect(connections.amneziaWg.spies.syncWgConfig).toHaveBeenCalledOnce();
    expect(connections.amneziaWg2.spies.syncWgConfig).toHaveBeenCalledOnce();
    expect(connections.xray.spies.restartContainer).toHaveBeenCalledOnce();
  });

  // Тестирование отклонения неполной резервной копии
  it("rejects a backup without data for an enabled protocol", async () => {
    const { service, connections } = createSubject();
    const backup: ServerBackupPayload = {
      generatedAt: "2026-08-04T00:00:00.000Z",
      serverId: null,
      protocols: [Protocol.XRAY],
    };

    await expect(service.importBackup(backup)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(connections.xray.spies.writeServerConfig).not.toHaveBeenCalled();
    expect(connections.xray.spies.restartContainer).not.toHaveBeenCalled();
  });
});
