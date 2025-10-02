import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const createUserSchema = {
  tags: [SwaggerContract.AdminTag.USERS],
  summary: "Создать нового клиента",
  security: [{ ApiKey: [] }],
  body: {
    type: "object",
    required: ["clientName"],
    properties: {
      clientName: { type: "string", description: "Имя клиента" },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["message", "clientId", "clientPrivateKey", "assignedIp"],
      properties: {
        message: { type: "string" },
        clientId: { type: "string", description: "PublicKey" },
        clientPrivateKey: {
          type: "string",
          description: "Приватный ключ клиента",
        },
        assignedIp: { type: "string", description: "Назначенный /32 IP" },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type CreateUserType = typeof createUserSchema;
