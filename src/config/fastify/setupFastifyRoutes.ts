import * as controllers from "@/controllers";
import { authPreHandler } from "@/middleware/auth";
import { AppFastifyInstance } from "@/types/shared";
import { registerControllers } from "@/helpers/registerControllers";

/**
 * Регистрация маршрутов Fastify
 */
export const setupFastifyRoutes = (fastify: AppFastifyInstance): void => {
  // Healthcheck endpoint
  fastify.get("/healthz", async () => {
    return { ok: true };
  });

  registerControllers(fastify, controllers, [authPreHandler()]);
};
