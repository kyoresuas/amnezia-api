import { clientIdSchema } from "./common.schema";
import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getUserSchema = {
  tags: [SwaggerContract.Tags.USERS],
  summary: "Получить пользователя и его конфиг",
  security: [{ ApiKey: [] }],
  body: {
    type: "object",
    required: ["clientId"],
    properties: {
      clientId: clientIdSchema,
    },
  },
  response: {
    200: {
      type: "object",
      required: ["client", "config"],
      properties: {
        client: {
          type: "object",
          required: ["username", "devices"],
          properties: {
            username: { type: "string" },
            devices: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "id",
                  "name",
                  "allowedIps",
                  "lastHandshake",
                  "traffic",
                  "online",
                  "endpoint",
                ],
                properties: {
                  id: clientIdSchema,
                  name: { type: "string", nullable: true },
                  allowedIps: {
                    type: "array",
                    items: { type: "string" },
                  },
                  lastHandshake: { type: "number" },
                  traffic: {
                    type: "object",
                    required: ["received", "sent"],
                    properties: {
                      received: { type: "number" },
                      sent: { type: "number" },
                    },
                  },
                  endpoint: { type: "string", nullable: true },
                  online: { type: "boolean" },
                },
              },
            },
          },
        },
        config: {
          type: "string",
          description: "Конфиг для импорта в приложение",
          example: "vpn://3fa85f64-5717-4562-b3fc-2c963f66afa6...",
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
    404: SwaggerContract.ClientErrorResponseFactory(404),
  },
} as const satisfies AppFastifySchema;

export type GetUserType = typeof getUserSchema;
