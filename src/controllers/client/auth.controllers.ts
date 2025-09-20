import {
  LoginType,
  LogoutType,
  loginSchema,
  logoutSchema,
  RegisterType,
  registerSchema,
} from "@/schemas/client";
import {
  loginHandler,
  logoutHandler,
  registerHandler,
} from "@/handlers/client";
import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";

/**
 * Войти в аккаунт
 */
export const loginController: AppFastifyRoute<LoginType> = {
  url: "/login",
  method: "POST",
  schema: loginSchema,
  handler: loginHandler,
};

/**
 * Зарегистрировать аккаунт
 */
export const registerController: AppFastifyRoute<RegisterType> = {
  url: "/register",
  method: "POST",
  schema: registerSchema,
  handler: registerHandler,
};

/**
 * Выйти из аккаунта
 */
export const logoutController: AppFastifyRoute<LogoutType> = {
  url: "/logout",
  method: "POST",
  schema: logoutSchema,
  preHandler: authPreHandler(),
  handler: logoutHandler,
};
