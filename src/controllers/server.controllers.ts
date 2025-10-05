import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";
import { getServerHandler } from "@/handlers/server";
import { GetServerType, getServerSchema } from "@/schemas";

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
