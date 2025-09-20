import { di } from "./awilixManager";
import { Task } from "@/entities/task";
import { asClass, asValue } from "awilix";
import { appLogger } from "../winstonLogger";
import { AuthService } from "@/services/auth";
import { CronService } from "@/services/cron";
import { UserService } from "@/services/user";
import { TaskService } from "@/services/task";
import { RedisClient } from "../cacheDatabase";
import { Session, User } from "@/entities/user";
import { CacheService } from "@/services/cache";
import appDataSource from "@/constants/appDataSource";
import { AnalyticalService } from "@/services/analytical";

/**
 * Внедрить зависимости в DI-контейнер
 */
export const setupDIContainer = (): void => {
  appLogger.info("Внедрение зависимостей...");

  // Таблицы операционной базы данных
  const taskRepository = appDataSource.getRepository(Task);
  const userRepository = appDataSource.getRepository(User);
  const sessionRepository = appDataSource.getRepository(Session);

  // Клиент для кэширующей базы данных
  const redisClient = RedisClient.getInstance();

  di.container.register({
    taskRepository: asValue(taskRepository),
    userRepository: asValue(userRepository),
    sessionRepository: asValue(sessionRepository),

    redisClient: asValue(redisClient),

    [AuthService.key]: asClass(AuthService).singleton(),
    [CronService.key]: asClass(CronService).singleton(),
    [TaskService.key]: asClass(TaskService).singleton(),
    [UserService.key]: asClass(UserService).singleton(),
    [CacheService.key]: asClass(CacheService).singleton(),
    [AnalyticalService.key]: asClass(AnalyticalService).singleton(),
  });

  appLogger.verbose("Зависимости внедрены");
};
