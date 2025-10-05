import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getServerSchema = {
  tags: [SwaggerContract.Tags.NODE],
  summary: "Статус текущей ноды",
  security: [{ ApiKey: [] }],
  response: {
    200: {
      type: "object",
      description: "Информация о текущем сервере",
      required: [
        "id",
        "region",
        "weight",
        "maxPeers",
        "interface",
        "totalPeers",
      ],
      properties: {
        id: {
          type: "string",
          description: "Уникальный идентификатор ноды",
          example: SwaggerContract.UUIDExample,
        },
        region: {
          type: "string",
          description: "Регион/зона/лейбл ноды",
          example: "NLs-1",
        },
        weight: {
          type: "number",
          description: "Вес ноды для балансировки",
          example: 100,
        },
        maxPeers: {
          type: "number",
          description: "Максимально допустимое число клиентов",
          example: 200,
        },
        interface: {
          type: "string",
          description: "Имя интерфейса WireGuard/AmneziaWG",
          example: "wg0",
        },
        totalPeers: {
          type: "number",
          description: "Текущее число клиентов",
          example: 8,
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetServerType = typeof getServerSchema;
