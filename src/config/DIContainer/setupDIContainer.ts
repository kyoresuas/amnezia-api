import { asClass } from "awilix";
import { di } from "./awilixManager";
import { appLogger } from "../winstonLogger";
import { CronService } from "@/services/cron";
import { XrayService } from "@/services/xray";
import { ServerService } from "@/services/server";
import { ClientsService } from "@/services/clients";
import { AmneziaWgService } from "@/services/amneziaWg";
import { AmneziaWg2Service } from "@/services/amneziaWg2";
import { XrayConnection } from "@/helpers/xrayConnection";
import { AmneziaWgConnection } from "@/helpers/amneziaWgConnection";
import { AmneziaWg2Connection } from "@/helpers/amneziaWg2Connection";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  di.container.register({
    // Подключения
    [XrayConnection.key]: asClass(XrayConnection).singleton(),
    [AmneziaWgConnection.key]: asClass(AmneziaWgConnection).singleton(),
    [AmneziaWg2Connection.key]: asClass(AmneziaWg2Connection).singleton(),

    // Сервисы
    [CronService.key]: asClass(CronService).singleton(),
    [XrayService.key]: asClass(XrayService).singleton(),
    [ServerService.key]: asClass(ServerService).singleton(),
    [ClientsService.key]: asClass(ClientsService).singleton(),
    [AmneziaWgService.key]: asClass(AmneziaWgService).singleton(),
    [AmneziaWg2Service.key]: asClass(AmneziaWg2Service).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
