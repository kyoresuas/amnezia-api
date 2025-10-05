import { testTask } from "@/tasks";
import { ITask } from "@/types/cron";

export namespace CronContract {
  /**
   * Тестовая задача (каждую 1 секунду)
   */
  export const TestTask: ITask = {
    name: "TestTask",
    interval: 1000,
    handler: testTask,
  };
}
