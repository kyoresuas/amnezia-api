import { asClass } from "awilix";
import { di } from "./awilixManager";
import { appLogger } from "../winstonLogger";
import { AmneziaService } from "@/services/amnezia";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  di.container.register({
    [AmneziaService.key]: asClass(AmneziaService).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
