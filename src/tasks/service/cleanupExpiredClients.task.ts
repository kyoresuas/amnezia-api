import { di } from "@/config/DIContainer";
import { TaskHandler } from "@/types/cron";
import { appLogger } from "@/config/winstonLogger";
import { AmneziaService } from "@/services/amnezia";

export const cleanupExpiredClientsTask: TaskHandler = async () => {
  const amnezia = di.container.resolve<AmneziaService>(AmneziaService.key);

  const removed = await amnezia.cleanupExpiredClients();

  appLogger.info(`Было удалено ${removed} просроченных клиентов`);
};
