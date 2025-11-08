import { asClass } from "awilix";
import { di } from "./awilixManager";
import { appLogger } from "../winstonLogger";
import { CronService } from "@/services/cron";
import { XrayService } from "@/services/xray";
import { UsersService } from "@/services/users";
import { ServerService } from "@/services/server";
import { AmneziaService } from "@/services/amnezia";
import { XrayConnection } from "@/helpers/xrayConnection";
import { AmneziaConnection } from "@/helpers/amneziaConnection";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  di.container.register({
    // Подключения
    [XrayConnection.key]: asClass(XrayConnection).singleton(),
    [AmneziaConnection.key]: asClass(AmneziaConnection).singleton(),

    // Сервисы
    [CronService.key]: asClass(CronService).singleton(),
    [XrayService.key]: asClass(XrayService).singleton(),
    [UsersService.key]: asClass(UsersService).singleton(),
    [ServerService.key]: asClass(ServerService).singleton(),
    [AmneziaService.key]: asClass(AmneziaService).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
