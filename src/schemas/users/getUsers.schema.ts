import { clientIdSchema } from "./common.schema";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getUsersSchema = {
  tags: [SwaggerContract.Tags.USERS],
  summary: "Получить всех пользователей",
  security: [{ ApiKey: [] }],
  querystring: SwaggerContract.EnablePaginationSchema,
  response: {
    200: {
      type: "object",
      description: "Ответ на запрос",
      required: ["total", "items"],
      properties: {
        total: SwaggerContract.PaginatedResponseSchema.properties.total,
        items: {
          type: "array",
          description: "Пользователи",
          items: {
            type: "object",
            required: ["username", "devices"],
            properties: {
              username: {
                type: "string",
                description: "Имя пользователя",
                example: "Kyoresuas",
              },
              devices: {
                type: "array",
                description: "Список устройств пользователя",
                items: {
                  type: "object",
                  required: [
                    "id",
                    "name",
                    "allowedIps",
                    "lastHandshake",
                    "traffic",
                    "online",
                    "endpoint",
                    "expiresAt",
                  ],
                  properties: {
                    id: clientIdSchema,
                    name: {
                      type: "string",
                      nullable: true,
                      description: "Название устройства",
                      example: "macOS 26.0",
                    },
                    allowedIps: {
                      type: "array",
                      description: "Список разрешенных IP/подсетей",
                      items: { type: "string", example: "10.8.1.1/32" },
                    },
                    lastHandshake: {
                      type: "number",
                      description: "Время последнего рукопожатия",
                      example: 1759477747,
                    },
                    traffic: {
                      type: "object",
                      required: ["received", "sent"],
                      properties: {
                        received: { type: "number", example: 4490348984 },
                        sent: { type: "number", example: 66372801657 },
                      },
                    },
                    endpoint: {
                      type: "string",
                      nullable: true,
                      description: "Адрес и порт подключения",
                      example: "192.168.1.1:12345",
                    },
                    online: {
                      type: "boolean",
                      example: true,
                    },
                    expiresAt: {
                      type: "number",
                      nullable: true,
                      description: "Дата удаления клиента",
                      example: 1735689600,
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as const satisfies SwaggerContract.PaginatedResponseType,
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetUsersType = typeof getUsersSchema;
