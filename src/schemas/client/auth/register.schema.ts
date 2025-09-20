import i18next from "i18next";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";
import { authSchema, tokenSample } from "./common.schemas";

export const registerSchema = {
  tags: [SwaggerContract.ClientTag.AUTH],
  summary: "Зарегистрировать аккаунт",
  body: authSchema,
  response: {
    201: {
      type: "object",
      description: SwaggerContract.ActionResponseSchema.description,
      required: ["message", "token"],
      properties: {
        message: {
          type: "string",
          description:
            SwaggerContract.ActionResponseSchema.properties.message.description,
          example: i18next.t("swagger.messages.REGISTERED"),
        },
        ...tokenSample,
      },
    } as const satisfies SwaggerContract.ActionResponseType,
    400: SwaggerContract.ClientErrorResponseFactory(400),
  },
} as const satisfies AppFastifySchema;

export type RegisterType = typeof registerSchema;
