import { ITask } from "@/types/cron";
import { TimeContract } from "@/contracts/time";
import { cleanupExpiredClientsTask } from "@/tasks";

export namespace CronContract {
  /**
   * Очистка просроченных клиентов (каждые 60 минут)
   */
  export const CleanupExpiredClientsTask: ITask = {
    name: "CleanupExpiredClientsTask",
    interval: TimeContract.HOUR,
    handler: cleanupExpiredClientsTask,
  };
}
