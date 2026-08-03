import {
  AppFastifyRoute,
  AppFastifySchema,
  AppFastifyInstance,
} from "@/types/shared";

export interface AppController {
  register(fastify: AppFastifyInstance): void;
}

/**
 * Создать контроллер, сохранив типы его схемы и обработчика
 */
export const defineController = <Schema extends AppFastifySchema>(
  route: AppFastifyRoute<Schema>,
): AppController => ({
  register: (fastify) => fastify.route(route),
});

/**
 * Зарегистрировать упорядоченную коллекцию контроллеров
 */
export const registerControllers = (
  fastify: AppFastifyInstance,
  controllers: readonly AppController[],
): void => {
  for (const controller of controllers) {
    controller.register(fastify);
  }
};
