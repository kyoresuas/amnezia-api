import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getClientQrSchema = {
  tags: [SwaggerContract.Tags.CLIENTS],
  summary: "Сгенерировать QR-коды для конфига клиента",
  description:
    "Возвращает серию QR-кодов (PNG data URI) в формате клиента Amnezia. " +
    "Большие конфиги разбиваются на несколько QR.",
  body: {
    type: "object",
    required: ["config"],
    properties: {
      config: {
        type: "string",
        description:
          "Конфиг клиента (строка вида vpn://...), полученный при создании",
        example: "vpn://...",
      },
    },
  },
  response: {
    200: {
      type: "object",
      description: "Серия QR-кодов",
      required: ["total", "items"],
      properties: {
        total: {
          type: "integer",
          description: "Количество QR-кодов в серии",
          example: 1,
        },
        items: {
          type: "array",
          description: "QR-коды в виде PNG data URI",
          items: {
            type: "string",
            example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
          },
        },
      },
    },
    400: SwaggerContract.ClientErrorResponseFactory(400),
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetClientQrType = typeof getClientQrSchema;
