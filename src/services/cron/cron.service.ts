import chalk from "chalk";
import cron from "node-cron";
import { APIError } from "@/utils/APIError";
import { appLogger } from "@/config/winstonLogger";
import { ITask, ITaskInQueue, TaskContext } from "@/types/cron";

/**
 * Сервис для управления отложенными задачами
 */
export class CronService {
  static key = "cronService";

  private queue: ITaskInQueue[] = [];
  private activeTaskNames = new Set<string>();
  private configuredTaskNames = new Set<string>();

  /**
   * Обработать очередь задач
   */
  private async processQueue(): Promise<void> {
    // Взять первую задачу из очереди и удалить её
    const taskInQueue = this.queue.shift();
    if (!taskInQueue) return;

    const taskName = taskInQueue.task.name;
    const coloredTaskName = chalk.bold(taskName);

    const taskIsProcessing = this.activeTaskNames.has(taskName);
    if (taskIsProcessing) {
      return appLogger.warn(`Задача ${coloredTaskName} уже выполняется`);
    }

    // Добавить задачу в список активных
    this.activeTaskNames.add(taskName);

    (taskInQueue.task.handler(taskInQueue.ctx) as Promise<void>)
      // Задача завершена успешно
      .then(() => {
        appLogger.info(`Задача ${coloredTaskName} успешно выполнена`);
      })

      // Задача завершена с ошибкой
      .catch((err: Error) => {
        console.error(err);

        appLogger.fatal(`Задача ${coloredTaskName} прервана с ошибкой`);
      })

      // Действия после любого завершения
      .finally(() => {
        this.activeTaskNames.delete(taskName);
      });

    // Рекурсивный вызов до полной обработки очереди
    this.processQueue();
  }

  /**
   * Добавить задачу
   */
  addTask(task: ITask): void {
    if (this.configuredTaskNames.has(task.name)) return;

    this.configuredTaskNames.add(task.name);

    const ctx: TaskContext = {
      updateProgress: async (progress) => {
        appLogger.taskInfo(task.name, progress);
      },
    };

    const equipmentTask: ITaskInQueue = { task, ctx };

    if (task.schedule && task.interval) {
      throw new APIError(400, { msg: "services.cron.INCOMPATIBLE" });
    }

    if (task.schedule) {
      if (!cron.validate(task.schedule)) {
        throw new APIError(400, { msg: "services.cron.INVALID_SCHEDULE" });
      }

      cron.schedule(task.schedule, () => {
        this.queue.push(equipmentTask);
        this.processQueue();
      });

      return;
    }

    if (task.interval) {
      if (task.interval <= 0) {
        throw new APIError(400, { msg: "services.cron.INVALID_INTERVAL" });
      }

      setInterval(() => {
        this.queue.push(equipmentTask);
        this.processQueue();
      }, task.interval);

      return;
    }

    this.queue.push(equipmentTask);
    this.processQueue();
  }
}
