import {
  GetUsersType,
  CreateUserType,
  DeleteUserType,
  getUsersSchema,
  deleteUserSchema,
  createUserSchema,
} from "@/schemas";
import {
  getUsersHandler,
  createUserHandler,
  deleteUserHandler,
} from "@/handlers/users";
import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";

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

/**
 * Добавить или изменить имя клиента
 */
export const createUserController: AppFastifyRoute<CreateUserType> = {
  url: "/users",
  method: "POST",
  schema: createUserSchema,
  preHandler: authPreHandler(),
  handler: createUserHandler,
};

/**
 * Удалить клиента
 */
export const deleteUserController: AppFastifyRoute<DeleteUserType> = {
  url: "/users",
  method: "DELETE",
  schema: deleteUserSchema,
  preHandler: authPreHandler(),
  handler: deleteUserHandler,
};
