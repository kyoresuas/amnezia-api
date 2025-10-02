import { asClass } from "awilix";
import { di } from "./awilixManager";
import { appLogger } from "../winstonLogger";
import { CronService } from "@/services/cron";
import { UserService } from "@/services/user";
import { AmneziaService } from "@/services/amnezia";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  di.container.register({
    [CronService.key]: asClass(CronService).singleton(),
    [UserService.key]: asClass(UserService).singleton(),
    [AmneziaService.key]: asClass(AmneziaService).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
