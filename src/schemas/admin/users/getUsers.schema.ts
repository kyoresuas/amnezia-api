import { clientIdSchema } from "./common.schema";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getUsersSchema = {
  tags: [SwaggerContract.AdminTag.USERS],
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
            required: ["clientId", "username", "devices"],
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
                    "clientId",
                    "allowedIps",
                    "latestHandshakeUnix",
                    "latestHandshakeSecondsAgo",
                    "isActive",
                    "transferRx",
                    "transferTx",
                  ],
                  properties: {
                    clientId: clientIdSchema,
                    deviceName: {
                      type: "string",
                      nullable: true,
                      description: "Название устройства",
                      example: "macOS 26.0",
                    },
                    endpointHost: {
                      type: "string",
                      nullable: true,
                      description: "Хост удаленной точки",
                      example: "192.168.1.1",
                    },
                    endpointPort: {
                      type: "number",
                      nullable: true,
                      description: "Порт удаленной точки",
                      example: 12345,
                    },
                    allowedIps: {
                      type: "array",
                      description: "Список разрешенных IP/подсетей",
                      items: { type: "string", example: "10.8.1.1/32" },
                    },
                    latestHandshakeUnix: {
                      type: "number",
                      description: "UNIX-время последнего рукопожатия",
                      example: 1759477747,
                    },
                    latestHandshakeISO: {
                      type: "string",
                      nullable: true,
                      description: "ISO-время последнего рукопожатия",
                      example: SwaggerContract.DateTimeExample,
                    },
                    latestHandshakeSecondsAgo: {
                      type: "number",
                      description: "Сколько секунд назад было рукопожатие",
                      example: 180,
                    },
                    isActive: {
                      type: "boolean",
                      description: "Активно ли устройство",
                      example: true,
                    },
                    transferRx: {
                      type: "number",
                      description: "Получено байт",
                      example: 4490348984,
                    },
                    transferTx: {
                      type: "number",
                      description: "Отправлено байт",
                      example: 66372801657,
                    },
                    persistentKeepalive: {
                      type: "number",
                      nullable: true,
                      description: "Интервал keepalive в секундах",
                      example: 25,
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
