import { SwaggerContract } from "@/contracts/swagger";
import { AppFastifySchema, Protocol } from "@/types/shared";
import { clientIdSchema, protocolSchema } from "./common.schema";

export const createClientSchema = {
  tags: [SwaggerContract.Tags.CLIENTS],
  summary: "Создать нового клиента",
  security: [{ ApiKey: [] }],
  body: {
    type: "object",
    required: ["clientName"],
    properties: {
      clientName: {
        type: "string",
        description: "Имя клиента",
        example: "Kyoresuas",
      },
      protocol: {
        ...protocolSchema,
        default: Protocol.AMNEZIAWG,
      },
      expiresAt: {
        type: "integer",
        nullable: true,
        description: "Дата удаления клиента",
        example: 1735689600,
      },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["message", "client"],
      properties: {
        message: SwaggerContract.ActionResponseSchema.properties.message,
        client: {
          type: "object",
          required: ["id", "config", "protocol"],
          properties: {
            id: clientIdSchema,
            config: {
              type: "string",
              description: "Конфиг для импорта в приложение",
              example: "vpn://3fa85f64-5717-4562-b3fc-2c963f66afa6...",
            },
            protocol: protocolSchema,
          },
        },
      },
    },
    400: SwaggerContract.ClientErrorResponseFactory(400),
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
    404: SwaggerContract.ClientErrorResponseFactory(404),
    409: SwaggerContract.ClientErrorResponseFactory(409),
  },
} as const satisfies AppFastifySchema;

export type CreateClientType = typeof createClientSchema;

