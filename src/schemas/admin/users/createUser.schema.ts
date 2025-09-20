import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const createUserSchema = {
  tags: [SwaggerContract.AdminTag.USERS],
  summary: "Добавить или изменить имя клиента",
  security: [{ ApiKey: [] }],
  body: {
    type: "object",
    required: ["clientId", "clientName"],
    properties: {
      clientId: { type: "string", description: "Идентификатор (PublicKey)" },
      clientName: { type: "string", description: "Имя клиента" },
    },
  },
  response: {
    200: SwaggerContract.ActionResponseSchema,
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type CreateUserType = typeof createUserSchema;
