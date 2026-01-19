import {
  GetClientsType,
  CreateClientType,
  DeleteClientType,
  getClientsSchema,
  deleteClientSchema,
  createClientSchema,
} from "@/schemas";
import {
  getClientsHandler,
  createClientHandler,
  deleteClientHandler,
} from "@/handlers/clients";
import { AppFastifyRoute } from "@/types/shared";
import { authPreHandler } from "@/middleware/auth";

/**
 * Получить всех клиентов
 */
export const getClientsController: AppFastifyRoute<GetClientsType> = {
  url: "/clients",
  method: "GET",
  schema: getClientsSchema,
  preHandler: authPreHandler(),
  handler: getClientsHandler,
};

/**
 * Добавить клиента
 */
export const createClientController: AppFastifyRoute<CreateClientType> = {
  url: "/clients",
  method: "POST",
  schema: createClientSchema,
  preHandler: authPreHandler(),
  handler: createClientHandler,
};

/**
 * Удалить клиента
 */
export const deleteClientController: AppFastifyRoute<DeleteClientType> = {
  url: "/clients",
  method: "DELETE",
  schema: deleteClientSchema,
  preHandler: authPreHandler(),
  handler: deleteClientHandler,
};

