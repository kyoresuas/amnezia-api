import { asValue } from "awilix";
import "@/config/setupMultilingualism";
import { di } from "@/config/DIContainer";
import { createFastify } from "@/config/fastify";
import type { ClientsServiceStub } from "../types";
import { AppFastifyInstance } from "@/types/shared";
import { ClientsService } from "@/services/clients";

/**
 * Создать тестовое приложение для клиентов
 */
export const createClientsTestApp = async (
  clientsService: ClientsServiceStub,
): Promise<AppFastifyInstance> => {
  di.container.register({
    [ClientsService.key]: asValue(clientsService),
  });

  return createFastify();
};

/**
 * Закрыть тестовое приложение
 */
export const closeTestApp = async (app: AppFastifyInstance): Promise<void> => {
  await app.close();
  await di.container.dispose();
};
