import { authPreHandler } from "@/middleware/auth";
import * as adminControllers from "@/controllers/admin";
import * as clientControllers from "@/controllers/client";
import { AppFastifyInstance, FastifyRoutes } from "@/types/shared";
import { registerControllers } from "@/helpers/registerControllers";

/**
 * Регистрация маршрутов Fastify
 */
export const setupFastifyRoutes = (
  fastify: AppFastifyInstance,
  routes: FastifyRoutes
): void => {
  switch (routes) {
    case "admin":
      return registerControllers(fastify, adminControllers, [
        authPreHandler({ extended: true }),
      ]);

    case "client":
      return registerControllers(fastify, clientControllers);
  }
};
