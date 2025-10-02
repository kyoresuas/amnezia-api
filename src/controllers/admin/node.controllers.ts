import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";
import { GetNodeStatusType } from "@/schemas/admin/node";
import { getNodeStatusSchema } from "@/schemas/admin/node";
import { getNodeStatusHandler } from "@/handlers/admin/node";

/**
 * Получить статус ноды
 */
export const getNodeStatusController: AppFastifyRoute<GetNodeStatusType> = {
  url: "/node/status",
  method: "GET",
  schema: getNodeStatusSchema,
  preHandler: authPreHandler(),
  handler: getNodeStatusHandler,
};
