import i18next from "i18next";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const logoutSchema = {
  tags: [SwaggerContract.ClientTag.AUTH],
  summary: "Выйти из аккаунта",
  security: [{ Bearer: [] }],
  response: {
    200: {
      type: "object",
      description: SwaggerContract.ActionResponseSchema.description,
      required: ["message"],
      properties: {
        message: {
          type: "string",
          description:
            SwaggerContract.ActionResponseSchema.properties.message.description,
          example: i18next.t("swagger.messages.LOGGED_OUT"),
        },
      },
    } as const satisfies SwaggerContract.ActionResponseType,
    401: SwaggerContract.ClientErrorResponseFactory(401),
  },
} as const satisfies AppFastifySchema;

export type LogoutType = typeof logoutSchema;
