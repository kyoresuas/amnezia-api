import { ITask } from "@/types/cron";
import { cleanupExpiredClientsTask } from "@/tasks";

export namespace CronContract {
  /**
   * Очистка просроченных клиентов (каждые 60 минут)
   */
  export const CleanupExpiredClientsTask: ITask = {
    name: "CleanupExpiredClientsTask",
    interval: 1000 * 60 * 60,
    handler: cleanupExpiredClientsTask,
  };
}
