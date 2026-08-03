import {
  AMNEZIA_WG_DUMP_FIXTURE,
  AMNEZIA_WG_CONFIG_FIXTURE,
  createAmneziaClientsTableFixture,
} from "../fixtures";
import { vi } from "vitest";
import { AppContract } from "@/contracts/app";
import type { AmneziaConnectionMockOptions } from "../types";
import { ClientTableEntry, IAmneziaConnection } from "@/types/amnezia";

/**
 * Создать мок соединения AmneziaWG
 */
export const createAmneziaConnectionMock = ({
  wgConfig = AMNEZIA_WG_CONFIG_FIXTURE,
  wgDump = AMNEZIA_WG_DUMP_FIXTURE,
  clientsTable = createAmneziaClientsTableFixture(),
  files = {},
}: AmneziaConnectionMockOptions = {}) => {
  const state: {
    wgConfig: string;
    wgDump: string;
    clientsTable: ClientTableEntry[];
    files: Record<string, string>;
  } = {
    wgConfig,
    wgDump,
    clientsTable: structuredClone(clientsTable),
    files: {
      [AppContract.AmneziaWG.PATHS.SERVER_PUBLIC_KEY]: "server-public-key\n",
      [AppContract.AmneziaWG.PATHS.WG_PSK]: "preshared-key\n",
      ...files,
    },
  };

  // Выполнить команду внутри контейнера
  const run = vi.fn<IAmneziaConnection["run"]>(async (command) => {
    if (/^(?:a?wg) genkey$/.test(command)) {
      return { stdout: "client-private-key\n", stderr: "" };
    }

    if (/\| (?:a?wg) pubkey$/.test(command)) {
      return { stdout: "generated-client-id\n", stderr: "" };
    }

    if (command.includes("wireguard_psk.key")) {
      return { stdout: "preshared-key\n", stderr: "" };
    }

    if (command.includes("server_public_key.key")) {
      return { stdout: "server-public-key\n", stderr: "" };
    }

    return { stdout: "", stderr: "" };
  });

  // Прочитать файл внутри контейнера
  const readFile = vi.fn<IAmneziaConnection["readFile"]>(
    async (path) => state.files[path] ?? "",
  );

  // Записать файл внутри контейнера
  const writeFile = vi.fn<IAmneziaConnection["writeFile"]>(
    async (path, content) => {
      state.files[path] = content;
    },
  );

  // Прочитать конфигурацию WireGuard
  const readWgConfig = vi.fn<IAmneziaConnection["readWgConfig"]>(
    async () => state.wgConfig,
  );

  // Записать конфигурацию WireGuard
  const writeWgConfig = vi.fn<IAmneziaConnection["writeWgConfig"]>(
    async (content) => {
      state.wgConfig = content;
    },
  );

  // Получить дамп WireGuard
  const getWgDump = vi.fn<IAmneziaConnection["getWgDump"]>(
    async () => state.wgDump,
  );

  // Применить конфигурацию WireGuard
  const syncWgConfig = vi.fn<IAmneziaConnection["syncWgConfig"]>(
    async () => undefined,
  );

  // Получить публичный ключ сервера
  const getServerPublicKey = vi.fn<IAmneziaConnection["getServerPublicKey"]>(
    async () => "server-public-key\n",
  );

  // Прочитать таблицу клиентов
  const readClientsTable = vi.fn<IAmneziaConnection["readClientsTable"]>(
    async () => state.clientsTable,
  );

  // Записать таблицу клиентов
  const writeClientsTable = vi.fn<IAmneziaConnection["writeClientsTable"]>(
    async (table) => {
      state.clientsTable = structuredClone(table);
    },
  );

  const connection: IAmneziaConnection = {
    run,
    readFile,
    writeFile,
    readWgConfig,
    writeWgConfig,
    getWgDump,
    syncWgConfig,
    getServerPublicKey,
    readClientsTable,
    writeClientsTable,
  };

  return {
    connection,
    state,
    spies: {
      run,
      readFile,
      writeFile,
      readWgConfig,
      writeWgConfig,
      getWgDump,
      syncWgConfig,
      getServerPublicKey,
      readClientsTable,
      writeClientsTable,
    },
  };
};
