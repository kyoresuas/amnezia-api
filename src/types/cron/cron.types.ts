export type TaskType = "cache" | "service" | "business";

export type TaskContext = {
  updateProgress: (progress: number) => Promise<void>;
};

export type TaskHandler = (ctx: TaskContext) => Promise<void> | void;

export interface ITask {
  name: string;
  handler: (ctx: TaskContext) => Promise<void> | void;
  schedule?: string; // Расписание (CRON-шаблон)
  interval?: number; // Каждые N миллисекунд
}

export interface ITaskInQueue {
  task: ITask;
  ctx: TaskContext;
}
