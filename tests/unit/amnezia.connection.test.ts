import { vi } from "vitest";
import { AppContract } from "@/contracts/app";
import { describe, expect, it } from "vitest";
import { ClientTableEntry } from "@/types/amnezia";
import type { AmneziaConnectionFixture } from "../types";
import { AmneziaWgConnection } from "@/helpers/amneziaWgConnection";
import { AmneziaWg2Connection } from "@/helpers/amneziaWg2Connection";

/**
 * Создать фикстуры соединений AmneziaWG
 */
const connectionFixtures: AmneziaConnectionFixture[] = [
  {
    name: "AmneziaWgConnection",
    clientsTablePath: AppContract.AmneziaWG.PATHS.CLIENTS_TABLE,
    createConnection: () => new AmneziaWgConnection(),
  },
  {
    name: "AmneziaWg2Connection",
    clientsTablePath: AppContract.AmneziaWG2.PATHS.CLIENTS_TABLE,
    createConnection: () => new AmneziaWg2Connection(),
  },
];

/**
 * Тестирование соединений AmneziaWG
 */
describe.each(connectionFixtures)("$name", (fixture) => {
  // Тестирование чтения текущего формата таблицы клиентов
  it("reads the current clients table format", async () => {
    const connection = fixture.createConnection();
    const table: ClientTableEntry[] = [
      {
        clientId: "client-id",
        userData: { clientName: "alice", allowedIp: "10.8.1.2" },
      },
    ];
    const readFile = vi
      .spyOn(connection, "readFile")
      .mockResolvedValue(JSON.stringify(table));

    await expect(connection.readClientsTable()).resolves.toEqual(table);
    expect(readFile).toHaveBeenCalledWith(fixture.clientsTablePath);
  });

  // Тестирование преобразования старого формата таблицы клиентов
  it("converts the legacy clients table format", async () => {
    const connection = fixture.createConnection();
    vi.spyOn(connection, "readFile").mockResolvedValue(
      JSON.stringify({
        "legacy-id": {
          clientName: "legacy-client",
          allowedIp: "10.8.1.3",
        },
      }),
    );

    await expect(connection.readClientsTable()).resolves.toEqual([
      {
        clientId: "legacy-id",
        userData: {
          clientName: "legacy-client",
          allowedIp: "10.8.1.3",
        },
      },
    ]);
  });

  // Тестирование безопасной обработки поврежденной таблицы клиентов
  it("returns an empty table for invalid JSON", async () => {
    const connection = fixture.createConnection();
    vi.spyOn(connection, "readFile").mockResolvedValue("{invalid-json");

    await expect(connection.readClientsTable()).resolves.toEqual([]);
  });

  // Тестирование записи таблицы клиентов в путь текущего протокола
  it("writes the clients table to the protocol path", async () => {
    const connection = fixture.createConnection();
    const table: ClientTableEntry[] = [
      {
        clientId: "client-id",
        userData: { clientName: "alice" },
      },
    ];
    const writeFile = vi
      .spyOn(connection, "writeFile")
      .mockResolvedValue(undefined);

    await connection.writeClientsTable(table);

    expect(writeFile).toHaveBeenCalledWith(
      fixture.clientsTablePath,
      JSON.stringify(table),
    );
  });
});
