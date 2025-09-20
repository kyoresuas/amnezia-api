import { FastifyInstance } from "fastify";

/**
 * Получить список маршрутов для вывода в консоль
 */
export const getFastifyRoutes = (fastify: FastifyInstance): string => {
  return fastify.printRoutes({ commonPrefix: false });
};
