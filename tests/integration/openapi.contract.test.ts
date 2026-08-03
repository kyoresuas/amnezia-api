import "@/config/setupMultilingualism";
import { readFile } from "node:fs/promises";
import { createFastify } from "@/config/fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { AppFastifyInstance } from "@/types/shared";

const contractUrl = new URL("../../openapi/openapi.json", import.meta.url);
let fastify: AppFastifyInstance | undefined;

/**
 * Закрыть тестовое приложение
 */
afterEach(async () => {
  await fastify?.close();
  fastify = undefined;
});

/**
 * Тестирование переносимого OpenAPI-контракта
 */
describe("OpenAPI contract", () => {
  // Тестирование соответствия контракта зарегистрированным маршрутам
  it("matches the current Fastify routes and schemas", async () => {
    const savedContract = JSON.parse(await readFile(contractUrl, "utf8"));
    fastify = await createFastify();
    await fastify.ready();

    const currentContract = JSON.parse(JSON.stringify(fastify.swagger()));

    expect(currentContract).toEqual(savedContract);
  });
});
