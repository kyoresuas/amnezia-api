import { di } from "@/config/DIContainer";
import { TaskHandler } from "@/types/cron";
import { appLogger } from "@/config/winstonLogger";
import { AmneziaService } from "@/services/amnezia";

export const cleanupExpiredClientsTask: TaskHandler = async () => {
  const amnezia = di.container.resolve<AmneziaService>(AmneziaService.key);

  const removed = await amnezia.cleanupExpiredClients();

  if (removed === 0) {
    appLogger.info("Просроченных клиентов не найдено");
  } else {
    appLogger.info(`Было удалено ${removed} просроченных клиентов`);
  }
};
