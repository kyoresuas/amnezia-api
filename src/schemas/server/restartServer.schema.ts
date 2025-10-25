import i18next from "i18next";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const restartServerSchema = {
  tags: [SwaggerContract.Tags.SERVER],
  summary: "Перезагрузить сервер",
  security: [{ ApiKey: [] }],
  response: {
    200: {
      type: "object",
      required: ["message"],
      properties: {
        message: {
          type: "string",
          example: i18next.t("services.server.RESTARTING"),
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type RestartServerType = typeof restartServerSchema;
