import {
  GetServerType,
  getServerSchema,
  GetServerLoadType,
  getServerLoadSchema,
  RebootServerType,
  rebootServerSchema,
  GetServerBackupType,
  getServerBackupSchema,
  ImportServerBackupType,
  importServerBackupSchema,
} from "@/schemas";
import {
  getServerHandler,
  getServerLoadHandler,
  rebootServerHandler,
  getServerBackupHandler,
  importServerBackupHandler,
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
 * Получить метрики нагрузки сервера
 */
export const getServerLoadController: AppFastifyRoute<GetServerLoadType> = {
  url: "/server/load",
  method: "GET",
  schema: getServerLoadSchema,
  preHandler: authPreHandler(),
  handler: getServerLoadHandler,
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
 * Импорт резервной копии конфигурации сервера
 */
export const importServerBackupController: AppFastifyRoute<ImportServerBackupType> =
  {
    url: "/server/backup",
    method: "POST",
    schema: importServerBackupSchema,
    preHandler: authPreHandler(),
    handler: importServerBackupHandler,
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
