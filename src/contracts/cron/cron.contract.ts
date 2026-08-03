import { ITask } from "@/types/cron";
import { TimeContract } from "@/contracts/time";
import { cleanupExpiredClientsTask } from "@/tasks";

export const CronContract = {
  /**
   * Очистка просроченных клиентов (каждые 60 минут)
   */
  CleanupExpiredClientsTask: {
    name: "CleanupExpiredClientsTask",
    interval: TimeContract.HOUR,
    handler: cleanupExpiredClientsTask,
  } satisfies ITask,
} as const;
