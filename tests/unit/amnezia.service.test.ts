import {
  AMNEZIA_WG_CONFIG_FIXTURE,
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
 * AmneziaWg2Service: wg0.conf — источник истины для peer'ов и AllowedIPs,
 * dump используется только для runtime статистики.
 */
describe("AmneziaWg2Service — config-driven getClients", () => {
  const createSubject = (
    options: Parameters<typeof createAmneziaConnectionMock>[0] = {},
  ) => {
    const connection = createAmneziaConnectionMock(options);
    return {
      service: new AmneziaWg2Service(connection.connection),
      connection,
    };
  };

  it("reports a config-blocked peer even when the live dump shows no allowed IPs", async () => {
    const wgConfig = `[Interface]
Address = 10.8.1.1/24
ListenPort = 51820

[Peer]
PublicKey = blocked-config-id
AllowedIPs = 0.0.0.0/32
`;
    const wgDump = [
      "blocked-config-id\tpsk\t(none)\t(none)\t0\t0\t0\toff",
      "stale-id\tpsk\t198.51.100.10:51820\t10.8.1.5/32\t0\t100\t200\t25",
    ].join("\n");
    const { service } = createSubject({
      wgConfig,
      wgDump,
      clientsTable: [
        {
          clientId: "blocked-config-id",
          userData: { clientName: "blocked-user", allowedIp: "10.8.1.4" },
        },
      ],
    });

    const clients = await service.getClients();

    expect(clients).toHaveLength(1);
    expect(clients[0]?.peers[0]).toMatchObject({
      username: "blocked-user",
      id: "blocked-config-id",
      status: PeerStatus.Disabled,
      allowedIps: ["0.0.0.0/32"],
      endpoint: null,
      traffic: { received: 0, sent: 0 },
      online: false,
    });
  });

  it("reports a config-disabled peer that has no entry in the live dump", async () => {
    const wgConfig = `[Interface]
Address = 10.8.1.1/24

[Peer]
PublicKey = disabled-only-config
AllowedIPs = 0.0.0.0/32
`;
    const { service } = createSubject({
      wgConfig,
      wgDump: "",
      clientsTable: [
        {
          clientId: "disabled-only-config",
          userData: { clientName: "ghost" },
        },
      ],
    });

    const clients = await service.getClients();

    expect(clients).toEqual([
      {
        username: "ghost",
        peers: [
          expect.objectContaining({
            id: "disabled-only-config",
            status: PeerStatus.Disabled,
            allowedIps: ["0.0.0.0/32"],
            endpoint: null,
            online: false,
            traffic: { received: 0, sent: 0 },
            expiresAt: null,
            protocol: Protocol.AMNEZIAWG2,
          }),
        ],
      },
    ]);
  });

  it("uses config AllowedIPs when the dump shows (none)", async () => {
    const wgConfig = `[Interface]
Address = 10.8.1.1/24

[Peer]
PublicKey = active-with-confused-dump
AllowedIPs = 10.8.1.7/32
`;
    const wgDump =
      "active-with-confused-dump\tpsk\t198.51.100.10:51820\t(none)\t0\t100\t200\t25";
    const { service } = createSubject({
      wgConfig,
      wgDump,
      clientsTable: [
        {
          clientId: "active-with-confused-dump",
          userData: { clientName: "alive" },
        },
      ],
    });

    const clients = await service.getClients();

    expect(clients[0]?.peers[0]).toMatchObject({
      id: "active-with-confused-dump",
      status: PeerStatus.Active,
      allowedIps: ["10.8.1.7/32"],
      traffic: { received: 100, sent: 200 },
    });
  });

  it("ignores dump-only peers that are absent from wg0.conf", async () => {
    const wgConfig = `[Interface]
Address = 10.8.1.1/24

[Peer]
PublicKey = in-config
AllowedIPs = 10.8.1.2/32
`;
    const wgDump = [
      "in-config\tpsk\t198.51.100.10:51820\t10.8.1.2/32\t0\t1\t2\t25",
      "stale-only-in-dump\tpsk\t198.51.100.10:51820\t10.8.1.9/32\t0\t3\t4\t25",
    ].join("\n");
    const { service } = createSubject({
      wgConfig,
      wgDump,
      clientsTable: [
        {
          clientId: "in-config",
          userData: { clientName: "kept" },
        },
      ],
    });

    const clients = await service.getClients();

    expect(clients).toHaveLength(1);
    expect(clients[0]?.peers).toHaveLength(1);
    expect(clients[0]?.peers[0]?.id).toBe("in-config");
  });
});
