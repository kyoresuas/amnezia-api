import { ITask } from "@/types/cron";
import { cleanupExpiredClientsTask } from "@/tasks";

export namespace CronContract {
  /**
   * Очистка просроченных клиентов (каждые 10 секунд)
   */
  export const CleanupExpiredClientsTask: ITask = {
    name: "CleanupExpiredClientsTask",
    interval: 10000,
    handler: cleanupExpiredClientsTask,
  };
}
