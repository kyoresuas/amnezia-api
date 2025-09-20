import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";
import { extendedUserSchema } from "./common.schemas";

export const getUserSchema = {
  tags: [SwaggerContract.ClientTag.USER],
  summary: "Получить данные пользователя",
  security: [{ Bearer: [] }],
  response: {
    200: {
      description: "Пользователь",
      ...extendedUserSchema,
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
  },
} as const satisfies AppFastifySchema;

export type GetUserType = typeof getUserSchema;
