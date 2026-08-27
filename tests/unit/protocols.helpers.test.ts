import { Protocol } from "@/types/shared";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { isDockerContainerRunning } from "@/helpers/docker";
import { resolveEnabledProtocols } from "@/helpers/resolveEnabledProtocols";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/helpers/docker", () => ({
  isDockerContainerRunning: vi.fn(),
}));

const originalAppConfig = {
  PROTOCOLS_ENABLED: appConfig.PROTOCOLS_ENABLED,
};

/**
 * Настроить окружение для авто-детекта протоколов
 */
beforeEach(() => {
  appConfig.PROTOCOLS_ENABLED = undefined;
});

/**
 * Восстановить конфигурацию приложения
 */
afterEach(() => {
  Object.assign(appConfig, originalAppConfig);
});

/**
 * Тестирование определения включенных протоколов
 */
describe("resolveEnabledProtocols", () => {
  // Тестирование приоритета списка протоколов из env
  it("prefers the protocols from the environment", async () => {
    appConfig.PROTOCOLS_ENABLED = [Protocol.XRAY];

    await expect(resolveEnabledProtocols()).resolves.toEqual([Protocol.XRAY]);
    expect(isDockerContainerRunning).not.toHaveBeenCalled();
  });

  // Тестирование сопоставления контейнеров и протоколов
  it("maps running containers to protocols", async () => {
    vi.mocked(isDockerContainerRunning).mockImplementation(
      async (container) => container !== AppContract.AmneziaWG.DOCKER_CONTAINER,
    );

    await expect(resolveEnabledProtocols()).resolves.toEqual([
      Protocol.AMNEZIAWG3,
      Protocol.XRAY,
    ]);
  });

  // Тестирование пустого списка при остановленных контейнерах
  it("returns an empty list when no container is running", async () => {
    vi.mocked(isDockerContainerRunning).mockResolvedValue(false);

    await expect(resolveEnabledProtocols()).resolves.toEqual([]);
  });
});
