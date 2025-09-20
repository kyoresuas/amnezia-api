import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const deleteUserSchema = {
  tags: [SwaggerContract.AdminTag.USERS],
  summary: "Удалить клиента",
  security: [{ ApiKey: [] }],
  body: {
    type: "object",
    required: ["clientId"],
    properties: {
      clientId: { type: "string", description: "Идентификатор (PublicKey)" },
    },
  },
  response: {
    200: SwaggerContract.ActionResponseSchema,
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type DeleteUserType = typeof deleteUserSchema;
