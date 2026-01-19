import i18next from "i18next";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const rebootServerSchema = {
  tags: [SwaggerContract.Tags.SERVER],
  summary: "Перезагрузить сервер",
  response: {
    200: {
      type: "object",
      required: ["message"],
      properties: {
        message: {
          type: "string",
          example: i18next.t("services.server.REBOOTING"),
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type RebootServerType = typeof rebootServerSchema;
