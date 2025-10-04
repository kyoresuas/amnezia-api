import {
  GetUserType,
  GetUsersType,
  getUserSchema,
  CreateUserType,
  DeleteUserType,
  getUsersSchema,
  deleteUserSchema,
  createUserSchema,
} from "@/schemas";
import {
  getUserHandler,
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
 * Получить пользователя и его конфиг
 */
export const getUserController: AppFastifyRoute<GetUserType> = {
  url: "/users/:username",
  method: "GET",
  schema: getUserSchema,
  preHandler: authPreHandler(),
  handler: getUserHandler,
};

/**
 * Добавить пользователя
 */
export const createUserController: AppFastifyRoute<CreateUserType> = {
  url: "/users",
  method: "POST",
  schema: createUserSchema,
  preHandler: authPreHandler(),
  handler: createUserHandler,
};

/**
 * Удалить пользователя
 */
export const deleteUserController: AppFastifyRoute<DeleteUserType> = {
  url: "/users",
  method: "DELETE",
  schema: deleteUserSchema,
  preHandler: authPreHandler(),
  handler: deleteUserHandler,
};
