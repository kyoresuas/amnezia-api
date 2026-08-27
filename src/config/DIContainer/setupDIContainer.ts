import { asClass } from "awilix";
import { di } from "./awilixManager";
import { appLogger } from "../winstonLogger";
import { CronService } from "@/services/cron";
import { XrayService } from "@/services/xray";
import { ServerService } from "@/services/server";
import { ClientsService } from "@/services/clients";
import { AmneziaWgService } from "@/services/amneziaWg";
import { AmneziaWg3Service } from "@/services/amneziaWg3";
import { XrayConnection } from "@/helpers/xrayConnection";
import { AmneziaWgConnection } from "@/helpers/amneziaWgConnection";
import { AmneziaWg3Connection } from "@/helpers/amneziaWg3Connection";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  di.container.register({
    // Подключения
    [XrayConnection.key]: asClass(XrayConnection).singleton(),
    [AmneziaWgConnection.key]: asClass(AmneziaWgConnection).singleton(),
    [AmneziaWg3Connection.key]: asClass(AmneziaWg3Connection).singleton(),

    // Сервисы
    [CronService.key]: asClass(CronService).singleton(),
    [XrayService.key]: asClass(XrayService).singleton(),
    [ServerService.key]: asClass(ServerService).singleton(),
    [ClientsService.key]: asClass(ClientsService).singleton(),
    [AmneziaWgService.key]: asClass(AmneziaWgService).singleton(),
    [AmneziaWg3Service.key]: asClass(AmneziaWg3Service).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
