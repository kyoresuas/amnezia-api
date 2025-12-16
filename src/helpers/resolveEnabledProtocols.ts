import { Protocol } from "@/types/shared";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import { isDockerContainerRunning } from "@/helpers/docker";

/**
 * Определить список включенных протоколов
 */
export async function resolveEnabledProtocols(): Promise<Protocol[]> {
  // Если задано в env, то используем его
  if (appConfig.PROTOCOLS_ENABLED?.length) {
    return appConfig.PROTOCOLS_ENABLED;
  }

  // Иначе пробуем авто-детект по наличию запущенных Docker-контейнеров
  const enabled: Protocol[] = [];

  if (await isDockerContainerRunning(AppContract.Amnezia.DOCKER_CONTAINER)) {
    enabled.push(Protocol.AMNEZIAWG);
  }

  if (await isDockerContainerRunning(AppContract.Xray.DOCKER_CONTAINER)) {
    enabled.push(Protocol.XRAY);
  }

  return enabled;
}
