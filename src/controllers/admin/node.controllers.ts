import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";
import { GetNodeType } from "@/schemas/admin/node";
import { getNodeSchema } from "@/schemas/admin/node";
import { getNodeHandler } from "@/handlers/admin/node";

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
