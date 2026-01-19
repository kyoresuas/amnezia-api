import { SwaggerContract } from "@/contracts/swagger";
import { AppFastifySchema, Protocol } from "@/types/shared";

export const getServerSchema = {
  tags: [SwaggerContract.Tags.SERVER],
  summary: "Информация о текущем сервере",
  response: {
    200: {
      type: "object",
      description: "Информация о текущем сервере",
      required: [
        "id",
        "region",
        "weight",
        "maxPeers",
        "totalPeers",
        "protocols",
      ],
      properties: {
        id: {
          type: "string",
          description: "Уникальный идентификатор сервера",
          example: SwaggerContract.UUIDExample,
        },
        region: {
          type: "string",
          description: "Регион/зона/лейбл сервера",
          example: "NLs-1",
        },
        weight: {
          type: "number",
          description: "Вес сервера для балансировки",
          example: 100,
        },
        maxPeers: {
          type: "number",
          description: "Максимально допустимое число клиентов",
          example: 200,
        },
        totalPeers: {
          type: "number",
          description: "Текущее число клиентов",
          example: 8,
        },
        protocols: {
          type: "array",
          description: "Список поддерживаемых протоколов",
          items: {
            type: "string",
            enum: Object.values(Protocol),
          },
          example: [Protocol.AMNEZIAWG, Protocol.XRAY],
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetServerType = typeof getServerSchema;
