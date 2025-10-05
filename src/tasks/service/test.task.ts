import { TaskHandler } from "@/types/cron";

export const testTask: TaskHandler = async () => {
  console.log("testTask");
};
