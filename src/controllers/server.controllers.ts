import {
  GetServerType,
  getServerSchema,
  RestartServerType,
  restartServerSchema,
} from "@/schemas";
import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";
import { getServerHandler, restartServerHandler } from "@/handlers/server";

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
 * Перезагрузить сервер
 */
export const restartServerController: AppFastifyRoute<RestartServerType> = {
  url: "/server/restart",
  method: "POST",
  schema: restartServerSchema,
  preHandler: authPreHandler(),
  handler: restartServerHandler,
};
