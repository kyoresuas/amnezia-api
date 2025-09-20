import { AppFastifyRoute } from "@/types/shared";
import { getUsersHandler } from "@/handlers/admin";
import { authPreHandler } from "@/middleware/auth";
import { getUsersSchema, GetUsersType } from "@/schemas/admin";

/**
 * Получить всех пользователей
 */
export const getUsersController: AppFastifyRoute<GetUsersType> = {
  url: "/users",
  method: "GET",
  schema: getUsersSchema,
  preHandler: authPreHandler(),
  handler: getUsersHandler,
};
