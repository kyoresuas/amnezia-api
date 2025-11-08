import { SwaggerContract } from "@/contracts/swagger";
import { AppFastifySchema, Protocol } from "@/types/shared";
import { clientIdSchema, protocolSchema } from "./common.schema";

export const deleteUserSchema = {
  tags: [SwaggerContract.Tags.USERS],
  summary: "Удалить клиента",
  security: [{ ApiKey: [] }],
  body: {
    type: "object",
    required: ["clientId"],
    properties: {
      clientId: clientIdSchema,
      protocol: {
        ...protocolSchema,
        default: Protocol.AMNEZIAWG,
      },
    },
  },
  response: {
    200: SwaggerContract.ActionResponseSchema,
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
    404: SwaggerContract.ClientErrorResponseFactory(404),
  },
} as const satisfies AppFastifySchema;

export type DeleteUserType = typeof deleteUserSchema;
