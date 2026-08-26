import {
  AMNEZIA_WG_CONFIG_FIXTURE,
  AMNEZIA_AWG3_CONFIG_FIXTURE,
  AMNEZIA_AWG31_CONFIG_FIXTURE,
  createAmneziaBackupFixture,
} from "../fixtures";
import { Protocol } from "@/types/shared";
import { PeerStatus } from "@/types/clients";
import { decodeVpnConfig } from "../helpers";
import { AppContract } from "@/contracts/app";
import appConfig from "@/constants/appConfig";
import type { ProtocolFixture } from "../types";
import { createAmneziaConnectionMock } from "../mocks";
import { AmneziaWgService } from "@/services/amneziaWg";
import { AmneziaWg2Service } from "@/services/amneziaWg2";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const originalAppConfig = {
  SERVER_MAX_PEERS: appConfig.SERVER_MAX_PEERS,
  SERVER_NAME: appConfig.SERVER_NAME,
  SERVER_PUBLIC_HOST: appConfig.SERVER_PUBLIC_HOST,
};

/**
 * Создать фикстуры сервисов AmneziaWG
 */
const protocolFixtures: ProtocolFixture[] = [
  {
    name: "AmneziaWgService",
    protocolName: "AmneziaWG",
    protocol: Protocol.AMNEZIAWG,
    container: AppContract.AmneziaWG.DOCKER_CONTAINER,
    createService: (connection) => new AmneziaWgService(connection),
  },
  {
    name: "AmneziaWg2Service",
    protocolName: "AmneziaWG2",
    protocol: Protocol.AMNEZIAWG2,
    container: AppContract.AmneziaWG2.DOCKER_CONTAINER,
    createService: (connection) => new AmneziaWg2Service(connection),
  },
];

/**
 * Настроить конфигурацию приложения для тестов протоколов
 */
beforeEach(() => {
  appConfig.SERVER_MAX_PEERS = 100;
  appConfig.SERVER_NAME = "{username} via {protocol}";
  appConfig.SERVER_PUBLIC_HOST = "vpn.example.com";
});

/**
 * Восстановить конфигурацию приложения
 */
afterEach(() => {
  Object.assign(appConfig, originalAppConfig);
});

/**
 * Тестирование сервисов AmneziaWG
 */
describe.each(protocolFixtures)("$name", (fixture) => {
  /**
   * Создать субъект тестирования
   */
  const createSubject = (connection = createAmneziaConnectionMock()) => ({
    service: fixture.createService(connection.connection),
    connection,
  });

  // Тестирование преобразования dump в записи клиентов
  it("maps active and disabled peers from the WireGuard dump", async () => {
    const { service } = createSubject();

    const clients = await service.getClients();

    expect(clients).toHaveLength(2);
    expect(clients[0]).toMatchObject({
      username: "alice",
      peers: [
        {
          id: "active-id",
          name: "macbook",
          status: PeerStatus.Active,
          traffic: { received: 100, sent: 200 },
          protocol: fixture.protocol,
        },
      ],
    });
    expect(clients[1]).toMatchObject({
      username: "bob",
      peers: [
        {
          id: "disabled-id",
          status: PeerStatus.Disabled,
          protocol: fixture.protocol,
        },
      ],
    });
  });

  // Тестирование создания клиента и конфигурации vpn://
  it("creates a client and returns an importable VPN config", async () => {
    const { service, connection } = createSubject();

    const result = await service.createClient("charlie", {
      expiresAt: 4_102_444_800,
    });

    expect(result).toMatchObject({
      id: "generated-client-id",
      protocol: fixture.protocol,
    });
    expect(result.config).toMatch(/^vpn:\/\//);
    expect(connection.state.wgConfig).toContain(
      "PublicKey = generated-client-id",
    );
    expect(connection.state.clientsTable.at(-1)).toMatchObject({
      clientId: "generated-client-id",
      userData: {
        clientName: "charlie",
        expiresAt: 4_102_444_800,
      },
    });
    expect(decodeVpnConfig(result.config)).toMatchObject({
      defaultContainer: fixture.container,
      description: `charlie via ${fixture.protocolName}`,
      hostName: "vpn.example.com",
    });
    expect(connection.spies.syncWgConfig).toHaveBeenCalledOnce();
  });

  // Тестирование отключения и повторного включения клиента
  it("disables a client and restores its original allowed IP", async () => {
    const { service, connection } = createSubject();

    await expect(
      service.updateClient("active-id", { status: PeerStatus.Disabled }),
    ).resolves.toBe(true);
    expect(connection.state.wgConfig).toMatch(
      /PublicKey = active-id\nAllowedIPs = 0\.0\.0\.0\/32/,
    );

    await expect(
      service.updateClient("active-id", { status: PeerStatus.Active }),
    ).resolves.toBe(true);
    expect(connection.state.wgConfig).toMatch(
      /PublicKey = active-id\nAllowedIPs = 10\.8\.1\.2\/32/,
    );
    expect(connection.spies.syncWgConfig).toHaveBeenCalledTimes(2);
  });

  // Тестирование удаления клиента из таблицы и конфигурации
  it("deletes a client without removing other peers", async () => {
    const { service, connection } = createSubject();

    await expect(service.deleteClient("active-id")).resolves.toBe(true);

    expect(connection.state.clientsTable).toHaveLength(1);
    expect(connection.state.clientsTable[0]?.clientId).toBe("disabled-id");
    expect(connection.state.wgConfig).not.toContain("PublicKey = active-id");
    expect(connection.state.wgConfig).toContain("PublicKey = disabled-id");
    expect(connection.spies.syncWgConfig).toHaveBeenCalledOnce();

    await expect(service.deleteClient("missing-id")).resolves.toBe(false);
  });

  // Тестирование отключения клиентов с истекшим сроком действия
  it("disables expired clients and preserves their original IP", async () => {
    const connection = createAmneziaConnectionMock({
      wgConfig: AMNEZIA_WG_CONFIG_FIXTURE,
      clientsTable: [
        {
          clientId: "active-id",
          userData: {
            clientName: "expired",
            expiresAt: 1_700_000_000,
          },
        },
      ],
    });
    const { service } = createSubject(connection);

    await expect(service.disableExpiredClients()).resolves.toBe(1);

    expect(connection.state.clientsTable[0]?.userData?.allowedIp).toBe(
      "10.8.1.2",
    );
    expect(connection.state.wgConfig).toMatch(
      /PublicKey = active-id\nAllowedIPs = 0\.0\.0\.0\/32/,
    );
    expect(connection.spies.syncWgConfig).toHaveBeenCalledOnce();
  });

  // Тестирование экспорта и импорта резервной копии
  it("exports and imports all protocol backup files", async () => {
    const { service, connection } = createSubject();

    await expect(service.exportBackup()).resolves.toEqual(
      createAmneziaBackupFixture(),
    );

    const backup = {
      ...createAmneziaBackupFixture(),
      wgConfig: "[Interface]\nAddress = 10.9.0.1/24\n",
      serverPublicKey: " imported-public-key ",
      presharedKey: " imported-preshared-key ",
      clients: [],
    };

    await service.importBackup(backup);

    expect(connection.state.wgConfig).toBe(backup.wgConfig);
    expect(connection.state.clientsTable).toEqual([]);
    expect(Object.values(connection.state.files)).toContain(
      "imported-public-key\n",
    );
    expect(Object.values(connection.state.files)).toContain(
      "imported-preshared-key\n",
    );
    expect(connection.spies.syncWgConfig).toHaveBeenCalledOnce();
  });
});

/**
 * Тестирование определения версии протокола AmneziaWG.
 */
describe("AmneziaWg2Service protocol version", () => {
  /**
   * Создать клиента и вернуть контейнер awg из конфигурации vpn://
   */
  const createAwgContainer = async (wgConfig: string) => {
    const connection = createAmneziaConnectionMock({ wgConfig });
    const service = new AmneziaWg2Service(connection.connection);

    const { config } = await service.createClient("charlie");

    const decoded = decodeVpnConfig(config) as unknown as {
      description: string;
      containers: { awg: Record<string, string> }[];
    };

    const awg = decoded.containers[0].awg;

    return {
      awg,
      description: decoded.description,
      text: JSON.parse(awg.last_config).config as string,
      connection,
    };
  };

  // Тестирование конфигурации сервера версии 2.0
  it("keeps special junk packets and reports version 2", async () => {
    const { awg, description } = await createAwgContainer(
      AMNEZIA_WG_CONFIG_FIXTURE,
    );

    expect(awg.protocol_version).toBe("2");
    expect(awg).toMatchObject({ I1: "<r 2>", I5: "test-5" });
    expect(awg).not.toHaveProperty("HeaderProtectionKey");
    expect(awg.last_config).toContain("PersistentKeepalive = 25");
    expect(description).toBe("charlie via AmneziaWG2");
  });

  // Тестирование конфигурации сервера версии 3.0
  it("reports version 3.1 for a server without the toggles", async () => {
    const { awg, description } = await createAwgContainer(
      AMNEZIA_AWG3_CONFIG_FIXTURE,
    );

    expect(awg.protocol_version).toBe("3.1");
    expect(awg).toMatchObject({
      HeaderProtectionKey: "header-protection-key",
      ContentPaddingAddition: "10-100",
      RekeyAfterTime: "100-120",
      MaxHandshakeAttempts: "15-20",
    });
    expect(awg).not.toHaveProperty("RandomTrailers");
    expect(awg).not.toHaveProperty("DisableCookies");
    expect(awg).not.toHaveProperty("I1");
    expect(awg.last_config).toContain("PersistentKeepalive = 25-35");
    expect(description).toBe("charlie via AmneziaWG3.1");
  });

  // Тестирование конфигурации сервера версии 3.1
  it("passes the 3.1 toggles through", async () => {
    const { awg } = await createAwgContainer(AMNEZIA_AWG31_CONFIG_FIXTURE);

    expect(awg.protocol_version).toBe("3.1");
    expect(awg).toMatchObject({ RandomTrailers: "on", DisableCookies: "on" });
  });

  it("ignores toggles that are switched off", async () => {
    const wgConfig = AMNEZIA_WG_CONFIG_FIXTURE.replace(
      "\n\n[Peer]",
      "\nRandomTrailers = off\nDisableCookies = off\n\n[Peer]",
    );

    const { awg } = await createAwgContainer(wgConfig);

    expect(awg.protocol_version).toBe("2");
  });

  // Текстовый конфиг 2.0 не должен измениться
  it("renders the 2.0 client config exactly as before", async () => {
    const { text } = await createAwgContainer(AMNEZIA_WG_CONFIG_FIXTURE);

    expect(text).toBe(
      `[Interface]\n` +
        `Address = 10.8.1.1/32\n` +
        `DNS = 1.1.1.1, 1.0.0.1\n` +
        `PrivateKey = client-private-key\n` +
        `Jc = 4\nJmin = 40\nJmax = 70\n` +
        `S1 = 15\nS2 = 20\nS3 = 20\nS4 = 23\n` +
        `H1 = 1\nH2 = 2\nH3 = 3\nH4 = 4\n\n` +
        `I1 = <r 2>\nI2 = test-2\nI3 = test-3\nI4 = test-4\nI5 = test-5\n\n` +
        `[Peer]\n` +
        `PublicKey = server-public-key\n` +
        `PresharedKey = preshared-key\n` +
        `AllowedIPs = 0.0.0.0/0, ::/0\n` +
        `Endpoint = vpn.example.com:51820\n` +
        `PersistentKeepalive = 25\n`,
    );
  });

  // Правки peerов не должны затрагивать секцию [Interface] с параметрами 3.x
  it("preserves the 3.x interface parameters when peers change", async () => {
    const connection = createAmneziaConnectionMock({
      wgConfig: AMNEZIA_AWG31_CONFIG_FIXTURE,
      clientsTable: [
        { clientId: "active-id", userData: { clientName: "alice" } },
      ],
    });
    const service = new AmneziaWg2Service(connection.connection);

    await service.updateClient("active-id", { status: PeerStatus.Disabled });
    await service.createClient("charlie");
    await service.deleteClient("active-id");

    const interfaceSection = connection.state.wgConfig.split("[Peer]")[0];

    for (const key of [
      "HeaderProtectionKey",
      "ContentPaddingAddition",
      "RekeyAfterTime",
      "RekeyTimeout",
      "RejectAfterTime",
      "KeepaliveTimeout",
      "MaxHandshakeAttempts",
      "RandomTrailers",
      "DisableCookies",
    ]) {
      expect(interfaceSection).toContain(`${key} = `);
    }

    expect(connection.state.wgConfig).not.toContain("PublicKey = active-id");
    expect(connection.state.wgConfig).toContain(
      "PublicKey = generated-client-id",
    );
  });
});
