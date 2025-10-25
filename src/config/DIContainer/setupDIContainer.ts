import { asClass } from "awilix";
import { di } from "./awilixManager";
import { appLogger } from "../winstonLogger";
import { CronService } from "@/services/cron";
import { ServerService } from "@/services/server";
import { AmneziaService } from "@/services/amnezia";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  di.container.register({
    [CronService.key]: asClass(CronService).singleton(),
    [ServerService.key]: asClass(ServerService).singleton(),
    [AmneziaService.key]: asClass(AmneziaService).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
