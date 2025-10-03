import { clientIdSchema } from "./common.schema";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const createUserSchema = {
  tags: [SwaggerContract.Tags.USERS],
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
    },
  },
  response: {
    200: {
      type: "object",
      required: [
        "message",
        "clientId",
        "clientPrivateKey",
        "assignedIp",
        "clientConfig",
      ],
      properties: {
        message: SwaggerContract.ActionResponseSchema.properties.message,
        clientId: clientIdSchema,
        clientPrivateKey: {
          type: "string",
          description: "Приватный ключ клиента",
          example: SwaggerContract.Base64Example,
        },
        assignedIp: {
          type: "string",
          description: "Назначенный /32 IP",
          example: "10.8.1.9/32",
        },
        clientConfig: {
          type: "string",
          description: "Конфиг WireGuard для импорта в приложение",
          example: "vpn://3fa85f64-5717-4562-b3fc-2c963f66afa6...",
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
    404: SwaggerContract.ClientErrorResponseFactory(404),
    409: SwaggerContract.ClientErrorResponseFactory(409),
  },
} as const satisfies AppFastifySchema;

export type CreateUserType = typeof createUserSchema;
