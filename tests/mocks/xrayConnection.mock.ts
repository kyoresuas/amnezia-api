import { vi } from "vitest";
import { IXrayConnection, XrayServerConfig } from "@/types/xray";

/**
 * Создать мок соединения Xray
 */
export const createXrayConnectionMock = (initialConfig: XrayServerConfig) => {
  let writtenConfig: string | null = null;

  // Записать конфигурацию сервера Xray
  const writeServerConfig = vi.fn<IXrayConnection["writeServerConfig"]>(
    async (content) => {
      writtenConfig = content;
    },
  );

  // Перезапустить контейнер Xray
  const restartContainer = vi.fn<IXrayConnection["restartContainer"]>(
    async () => undefined,
  );

  // Создать мок соединения Xray
  const connection: IXrayConnection = {
    run: vi.fn(async () => ({ stdout: "", stderr: "" })),
    readFile: vi.fn(async () => ""),
    writeFile: vi.fn(async () => undefined),
    readServerConfig: vi.fn(async () => JSON.stringify(initialConfig)),
    writeServerConfig,
    restartContainer,
  };

  // Получить записанную конфигурацию сервера Xray
  const getWrittenConfig = (): XrayServerConfig | null =>
    writtenConfig ? (JSON.parse(writtenConfig) as XrayServerConfig) : null;

  return {
    connection,
    getWrittenConfig,
    spies: { writeServerConfig, restartContainer },
  };
};
