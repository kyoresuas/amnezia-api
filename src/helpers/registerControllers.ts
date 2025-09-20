import {
  AppFastifyRoute,
  AppFastifyInstance,
  AppFastifyPreHandler,
} from "@/types/shared";

/**
 * Регистрация группы маршрутов
 */
export const registerControllers = (
  fastify: AppFastifyInstance,
  controllers: { [x: string]: AppFastifyRoute<any> },
  commonPreHandlers: AppFastifyPreHandler<any>[] = []
): void => {
  for (const key in controllers) {
    if (!controllers[key].preHandler) {
      controllers[key].preHandler = [];
    } else if (!Array.isArray(controllers[key].preHandler)) {
      controllers[key].preHandler = [controllers[key].preHandler];
    }

    controllers[key].preHandler.unshift(...commonPreHandlers);

    fastify.route(controllers[key]);
  }
};
