import {
  GetClientsType,
  CreateClientType,
  DeleteClientType,
  UpdateClientType,
  getClientsSchema,
  deleteClientSchema,
  createClientSchema,
  updateClientSchema,
} from "@/schemas";
import {
  getClientsHandler,
  createClientHandler,
  deleteClientHandler,
  updateClientHandler,
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
 * Обновить данные клиента
 */
export const updateClientController: AppFastifyRoute<UpdateClientType> = {
  url: "/clients",
  method: "PATCH",
  schema: updateClientSchema,
  preHandler: authPreHandler(),
  handler: updateClientHandler,
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
