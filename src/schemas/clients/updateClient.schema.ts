import { PeerStatus } from "@/types/clients";
import { SwaggerContract } from "@/contracts/swagger";
import { AppFastifySchema, Protocol } from "@/types/shared";
import { clientIdSchema, protocolSchema } from "./common.schema";

export const updateClientSchema = {
  tags: [SwaggerContract.Tags.CLIENTS],
  summary: "Обновить данные клиента",
  body: {
    type: "object",
    required: ["clientId"],
    properties: {
      clientId: clientIdSchema,
      protocol: {
        ...protocolSchema,
        default: Protocol.AMNEZIAWG,
      },
      expiresAt: {
        type: "integer",
        nullable: true,
        description: "Дата окончания доступа",
        example: 1735689600,
      },
      status: {
        type: "string",
        description: "Статус ключа",
        enum: Object.values(PeerStatus),
        example: PeerStatus.Active,
      },
    },
  },
  response: {
    200: SwaggerContract.ActionResponseSchema,
    400: SwaggerContract.ClientErrorResponseFactory(400),
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
    404: SwaggerContract.ClientErrorResponseFactory(404),
  },
} as const satisfies AppFastifySchema;

export type UpdateClientType = typeof updateClientSchema;
