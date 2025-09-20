import { AppJSONSchema } from "@/types/shared";
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
            required: [
              "id",
              "username",
              "allowedIps",
              "latestHandshakeUnix",
              "latestHandshakeSecondsAgo",
              "isActive",
              "transferRx",
              "transferTx",
            ],
            properties: {
              id: { type: "string", description: "Идентификатор пользователя" },
              username: { type: "string", description: "Имя пользователя" },
              endpointHost: {
                type: "string",
                nullable: true,
                description: "Хост удалённой точки",
              },
              endpointPort: {
                type: "number",
                nullable: true,
                description: "Порт удалённой точки",
              },
              allowedIps: {
                type: "array",
                description: "Список разрешённых IP/подсетей",
                items: { type: "string" },
              },
              latestHandshakeUnix: {
                type: "number",
                description: "UNIX-время последнего рукопожатия (сек)",
              },
              latestHandshakeISO: {
                type: "string",
                nullable: true,
                description: "ISO-время последнего рукопожатия",
              },
              latestHandshakeSecondsAgo: {
                type: "number",
                description: "Сколько секунд назад было рукопожатие",
              },
              isActive: {
                type: "boolean",
                description: "Активен ли пир (<180 сек)",
              },
              transferRx: {
                type: "number",
                description: "Получено байт",
              },
              transferTx: {
                type: "number",
                description: "Отправлено байт",
              },
              persistentKeepalive: {
                type: "number",
                nullable: true,
                description: "Интервал keepalive в секундах или null",
              },
            },
          } as const satisfies AppJSONSchema,
        },
      },
    } as const satisfies SwaggerContract.PaginatedResponseType,
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetUsersType = typeof getUsersSchema;
