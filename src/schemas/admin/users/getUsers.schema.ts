import { userSchema } from "@/schemas/client";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getUsersSchema = {
  tags: [SwaggerContract.AdminTag.USERS],
  summary: "Получить всех пользователей",
  security: [{ Bearer: [] }],
  querystring: SwaggerContract.EnablePaginationSchema,
  response: {
    200: {
      type: "object",
      description: "Ответ на запрос",
      required: ["totalSize", "items"],
      properties: {
        totalSize: SwaggerContract.PaginatedResponseSchema.properties.totalSize,
        items: {
          type: "array",
          description: "Пользователи",
          items: userSchema,
        },
      },
    } as const satisfies SwaggerContract.PaginatedResponseType,
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetUsersType = typeof getUsersSchema;
