import {
  GetServerType,
  getServerSchema,
  RebootServerType,
  rebootServerSchema,
} from "@/schemas";
import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";
import { getServerHandler, rebootServerHandler } from "@/handlers/server";

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
export const rebootServerController: AppFastifyRoute<RebootServerType> = {
  url: "/server/reboot",
  method: "POST",
  schema: rebootServerSchema,
  preHandler: authPreHandler(),
  handler: rebootServerHandler,
};
