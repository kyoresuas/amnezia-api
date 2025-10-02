import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getNodeStatusSchema = {
  tags: [SwaggerContract.AdminTag.NODE],
  summary: "Статус текущей ноды",
  security: [{ ApiKey: [] }],
  response: {
    200: {
      type: "object",
      required: ["id", "peers"],
      properties: {
        id: { type: "string" },
        region: { type: "string" },
        weight: { type: "number" },
        maxPeers: { type: "number" },
        interface: { type: "string" },
        peers: { type: "number" },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetNodeStatusType = typeof getNodeStatusSchema;
