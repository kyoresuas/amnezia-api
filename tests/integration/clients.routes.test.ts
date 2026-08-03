import { Protocol } from "@/types/shared";
import { createClientRecord } from "../factories";
import { AppFastifyInstance } from "@/types/shared";
import { ClientsService } from "@/services/clients";
import { TEST_API_KEY } from "../config/setupTestEnvironment";
import { closeTestApp, createClientsTestApp } from "../helpers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const AUTH_HEADERS = { "x-api-key": TEST_API_KEY } as const;

/**
 * Создать фикстуру клиентов
 */
const clients = [
  createClientRecord({ username: "alice", protocol: Protocol.AMNEZIAWG }),
  createClientRecord({ username: "bob", protocol: Protocol.AMNEZIAWG2 }),
  createClientRecord({ username: "carol", protocol: Protocol.XRAY }),
];

/**
 * Создать фикстуру функции получения клиентов
 */
const getClients = vi.fn<ClientsService["getClients"]>(async () => clients);

/**
 * Создать фикстуру функции обновления клиента
 */
const updateClient = vi.fn<ClientsService["updateClient"]>(
  async () => undefined,
);

/**
 * Тестирование маршрутов клиентов
 */
describe("clients routes", () => {
  let app: AppFastifyInstance;

  // Создать тестовое приложение
  beforeAll(async () => {
    app = await createClientsTestApp({ getClients, updateClient });
  });

  // Закрыть тестовое приложение
  afterAll(async () => {
    await closeTestApp(app);
  });

  // Тестирование применения пагинации и сохранения общего количества
  it("applies pagination and preserves the total count", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/clients?skip=1&limit=1",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ total: 3, items: [clients[1]] });
    expect(getClients).toHaveBeenCalledOnce();
  });

  // Тестирование отклонения PATCH запросов без мутации
  it("rejects PATCH requests without a mutation", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/clients",
      headers: AUTH_HEADERS,
      payload: {
        clientId: "existing-client",
        protocol: Protocol.AMNEZIAWG,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(updateClient).not.toHaveBeenCalled();
  });

  // Тестирование отклонения неверной пагинации перед вызовом сервиса
  it("rejects invalid pagination before calling the service", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/clients?limit=101",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(400);
    expect(getClients).not.toHaveBeenCalled();
  });

  // Тестирование отклонения неверного API ключа
  it("rejects an invalid API key", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/clients",
      headers: { "x-api-key": "wrong-key" },
    });

    expect(response.statusCode).toBe(401);
    expect(getClients).not.toHaveBeenCalled();
  });
});
