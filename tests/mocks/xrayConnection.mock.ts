import { vi } from "vitest";
import { AppContract } from "@/contracts/app";
import type { XrayConnectionMockOptions } from "../types";
import { IXrayConnection, XrayServerConfig } from "@/types/xray";

/**
 * Создать мок соединения Xray
 */
export const createXrayConnectionMock = (
  initialConfig: XrayServerConfig,
  { files = {}, trafficStats = {} }: XrayConnectionMockOptions = {},
) => {
  let writtenConfig: string | null = null;
  const state: {
    serverConfig: string;
    files: Record<string, string>;
  } = {
    serverConfig: JSON.stringify(initialConfig),
    files: {
      [AppContract.Xray.PATHS.UUID]: "server-uuid\n",
      [AppContract.Xray.PATHS.PUBLIC_KEY]: "xray-public-key\n",
      [AppContract.Xray.PATHS.PRIVATE_KEY]: "xray-private-key\n",
      [AppContract.Xray.PATHS.SHORT_ID]: "short-id\n",
      ...files,
    },
  };

  // Записать конфигурацию сервера Xray
  const writeServerConfig = vi.fn<IXrayConnection["writeServerConfig"]>(
    async (content) => {
      writtenConfig = content;
      state.serverConfig = content;
    },
  );

  // Перезапустить контейнер Xray
  const restartContainer = vi.fn<IXrayConnection["restartContainer"]>(
    async () => undefined,
  );

  // Выполнить команду внутри контейнера Xray
  const run = vi.fn<IXrayConnection["run"]>(async () => ({
    stdout: JSON.stringify(trafficStats),
    stderr: "",
  }));

  // Прочитать файл внутри контейнера Xray
  const readFile = vi.fn<IXrayConnection["readFile"]>(
    async (path) => state.files[path] ?? "",
  );

  // Записать файл внутри контейнера Xray
  const writeFile = vi.fn<IXrayConnection["writeFile"]>(
    async (path, content) => {
      state.files[path] = content;
    },
  );

  // Прочитать конфигурацию сервера Xray
  const readServerConfig = vi.fn<IXrayConnection["readServerConfig"]>(
    async () => state.serverConfig,
  );

  // Создать мок соединения Xray
  const connection: IXrayConnection = {
    run,
    readFile,
    writeFile,
    readServerConfig,
    writeServerConfig,
    restartContainer,
  };

  // Получить записанную конфигурацию сервера Xray
  const getWrittenConfig = (): XrayServerConfig | null =>
    writtenConfig ? (JSON.parse(writtenConfig) as XrayServerConfig) : null;

  return {
    connection,
    state,
    getWrittenConfig,
    spies: {
      run,
      readFile,
      writeFile,
      readServerConfig,
      writeServerConfig,
      restartContainer,
    },
  };
};
