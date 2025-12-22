import { di } from "@/config/DIContainer";
import { TaskHandler } from "@/types/cron";
import { appLogger } from "@/config/winstonLogger";
import { UsersService } from "@/services/users";

export const cleanupExpiredClientsTask: TaskHandler = async () => {
  const users = di.container.resolve<UsersService>(UsersService.key);

  const removed = await users.cleanupExpiredClients();

  if (removed === 0) {
    appLogger.info("Просроченных клиентов не найдено");
  } else {
    appLogger.info(`Было удалено ${removed} просроченных клиентов`);
  }
};
