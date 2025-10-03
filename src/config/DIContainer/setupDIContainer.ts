import { asClass } from "awilix";
import { di } from "./awilixManager";
import { appLogger } from "../winstonLogger";
import { UserService } from "@/services/user";
import { AmneziaService } from "@/services/amnezia";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  di.container.register({
    [UserService.key]: asClass(UserService).singleton(),
    [AmneziaService.key]: asClass(AmneziaService).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
