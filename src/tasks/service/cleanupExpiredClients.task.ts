import { di } from "@/config/DIContainer";
import { TaskHandler } from "@/types/cron";
import { appLogger } from "@/config/winstonLogger";
import { ClientsService } from "@/services/clients";

export const cleanupExpiredClientsTask: TaskHandler = async () => {
  const clientsService = di.container.resolve<ClientsService>(
    ClientsService.key,
  );

  const disabled = await clientsService.disableExpiredClients();

  if (disabled === 0) {
    appLogger.info("Просроченных клиентов не найдено");
  } else {
    appLogger.info(`Было заблокировано ${disabled} просроченных клиентов`);
  }
};
