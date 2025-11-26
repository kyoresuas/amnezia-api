import { SwaggerContract } from "@/contracts/swagger";
import { AppFastifySchema, Protocol } from "@/types/shared";

export const getServerBackupSchema = {
  tags: [SwaggerContract.Tags.SERVER],
  summary: "Резервная копия конфигурации сервера",
  security: [{ ApiKey: [] }],
  response: {
    200: {
      type: "object",
      description:
        "Полный набор данных для развёртывания идентичной конфигурации",
      required: ["generatedAt", "serverId", "protocols"],
      properties: {
        generatedAt: {
          type: "string",
          format: "date-time",
          description: "Время формирования выгрузки",
          example: "2025-01-15T12:34:56.789Z",
        },
        serverId: {
          type: "string",
          nullable: true,
          description: "Идентификатор сервера из конфигурации",
          example: SwaggerContract.UUIDExample,
        },
        protocols: {
          type: "array",
          description: "Список экспортированных протоколов",
          items: {
            type: "string",
            enum: Object.values(Protocol),
          },
          example: [Protocol.AMNEZIAWG, Protocol.XRAY],
        },
        amnezia: {
          type: "object",
          required: ["wgConfig", "presharedKey", "serverPublicKey", "clients"],
          properties: {
            wgConfig: {
              type: "string",
              description: "Содержимое файла wg0.conf",
            },
            presharedKey: {
              type: "string",
              description: "Содержимое файла wireguard_psk.key",
            },
            serverPublicKey: {
              type: "string",
              description: "Публичный ключ сервера WireGuard",
            },
            clients: {
              type: "array",
              description: "Содержимое таблицы клиентов AmneziaWG",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  clientId: {
                    type: "string",
                    description: "Публичный ключ клиента",
                  },
                  publicKey: {
                    type: "string",
                    description: "Дополнительный публичный ключ",
                  },
                  userData: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      clientName: {
                        type: "string",
                      },
                      creationDate: {
                        type: "string",
                      },
                      expiresAt: {
                        type: "number",
                      },
                    },
                  },
                },
              },
            },
          },
          example: {
            wgConfig:
              "[Interface]\\nAddress = 10.8.1.2/32\\nPrivateKey = <client-private-key>\\n\\n[Peer]\\nPublicKey = <server-public-key>\\nAllowedIPs = 0.0.0.0/0",
            presharedKey: "y8PpvlM2QEqLPTbV5X3QfUuRiK6sR3yIYB4u6Fvxtn4=",
            serverPublicKey: "aDrz0wS1C8VZK7arx2n3dE0Bf2c5LQdYpO7h4g9l8m0=",
            clients: [
              {
                clientId: "YjYxMzNhZjY2YzE4MjJmN2M0OTViYzQwYmVhZTM0NjY=",
                publicKey: "YjYxMzNhZjY2YzE4MjJmN2M0OTViYzQwYmVhZTM0NjY=",
                userData: {
                  clientName: "john.doe [iphone]",
                  creationDate: "Mon, 06 Nov 2023 10:12:45 GMT",
                  expiresAt: 1736200000,
                },
              },
            ],
          },
        },
        xray: {
          type: "object",
          required: [
            "serverConfig",
            "uuid",
            "publicKey",
            "privateKey",
            "shortId",
          ],
          properties: {
            serverConfig: {
              type: "string",
              description: "Содержимое server.json",
            },
            uuid: {
              type: "string",
              description: "UUID сервера",
            },
            publicKey: {
              type: "string",
              description: "Публичный ключ Xray",
            },
            privateKey: {
              type: "string",
              description: "Приватный ключ Xray",
            },
            shortId: {
              type: "string",
              description: "Short ID Xray",
            },
          },
          example: {
            serverConfig:
              '{ "inbounds": [{ "settings": { "clients": [{ "id": "0ce3c1f2-3ba7-4c75-8b0c-7d6a5e4f3d2c" }] } }] }',
            uuid: "0ce3c1f2-3ba7-4c75-8b0c-7d6a5e4f3d2c",
            publicKey: "l5TbmY0Bf9hQ2w3e7r1t5y8u0i2o4p6s8a3d5f7g9h1=",
            privateKey: "B4nG7k9m2p5s8v1y3b6n8m2p4s6v8y1z3x5c7v9b1n3=",
            shortId: "a1b2c3d4",
          },
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetServerBackupType = typeof getServerBackupSchema;
