import { getNodeHandler } from "@/handlers/node";
import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";
import { getNodeSchema, GetNodeType } from "@/schemas";

/**
 * Получить информацию о ноде
 */
export const getNodeController: AppFastifyRoute<GetNodeType> = {
  url: "/node",
  method: "GET",
  schema: getNodeSchema,
  preHandler: authPreHandler(),
  handler: getNodeHandler,
};
