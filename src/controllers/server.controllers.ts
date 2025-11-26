import {
  GetServerType,
  getServerSchema,
  RebootServerType,
  rebootServerSchema,
  GetServerBackupType,
  getServerBackupSchema,
} from "@/schemas";
import {
  getServerHandler,
  rebootServerHandler,
  getServerBackupHandler,
} from "@/handlers/server";
import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";

/**
 * Получить информацию о сервере
 */
export const getServerController: AppFastifyRoute<GetServerType> = {
  url: "/server",
  method: "GET",
  schema: getServerSchema,
  preHandler: authPreHandler(),
  handler: getServerHandler,
};

/**
 * Резервная копия конфигурации сервера
 */
export const getServerBackupController: AppFastifyRoute<GetServerBackupType> = {
  url: "/server/backup",
  method: "GET",
  schema: getServerBackupSchema,
  preHandler: authPreHandler(),
  handler: getServerBackupHandler,
};

/**
 * Перезагрузить сервер
 */
export const rebootServerController: AppFastifyRoute<RebootServerType> = {
  url: "/server/reboot",
  method: "POST",
  schema: rebootServerSchema,
  preHandler: authPreHandler(),
  handler: rebootServerHandler,
};
