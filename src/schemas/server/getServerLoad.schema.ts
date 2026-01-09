import { AppFastifySchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const getServerLoadSchema = {
  tags: [SwaggerContract.Tags.SERVER],
  summary: "Получить метрики нагрузки сервера",
  security: [{ ApiKey: [] }],
  response: {
    200: {
      type: "object",
      description: "Метрики нагрузки сервера",
      required: ["timestamp", "uptimeSec", "cpu", "memory", "loadavg"],
      properties: {
        timestamp: {
          type: "string",
          description: "Время формирования ответа (ISO)",
          example: SwaggerContract.DateTimeExample,
        },
        uptimeSec: {
          type: "number",
          description: "Uptime сервера в секундах",
          example: 86400,
        },
        loadavg: {
          type: "array",
          description: "Load average за 1/5/15 минут",
          items: { type: "number" },
          example: [0.12, 0.18, 0.22],
        },
        cpu: {
          type: "object",
          description: "CPU",
          required: ["cores"],
          properties: {
            cores: {
              type: "number",
              description: "Количество ядер CPU",
              example: 2,
            },
          },
        },
        memory: {
          type: "object",
          description: "RAM",
          required: ["totalBytes", "freeBytes", "usedBytes"],
          properties: {
            totalBytes: {
              type: "number",
              description: "Всего RAM (bytes)",
              example: 2147483648,
            },
            freeBytes: {
              type: "number",
              description: "Свободно RAM (bytes)",
              example: 734003200,
            },
            usedBytes: {
              type: "number",
              description: "Занято RAM (bytes)",
              example: 1413480448,
            },
          },
        },
        disk: {
          type: "object",
          nullable: true,
          description:
            "Диск (корень /). Может быть null, если метрики недоступны",
          required: [
            "totalBytes",
            "usedBytes",
            "availableBytes",
            "usedPercent",
          ],
          properties: {
            totalBytes: {
              type: "number",
              description: "Всего (bytes)",
              example: 32212254720,
            },
            usedBytes: {
              type: "number",
              description: "Использовано (bytes)",
              example: 10737418240,
            },
            availableBytes: {
              type: "number",
              description: "Доступно (bytes)",
              example: 21474836480,
            },
            usedPercent: {
              type: "number",
              description: "Заполненность (0..100)",
              example: 33.3,
            },
          },
        },
        network: {
          type: "object",
          nullable: true,
          description:
            "Суммарные сетевые счётчики (bytes). Может быть null, если /proc недоступен",
          required: ["rxBytes", "txBytes"],
          properties: {
            rxBytes: {
              type: "number",
              description: "Принято (bytes)",
              example: 123456789,
            },
            txBytes: {
              type: "number",
              description: "Отправлено (bytes)",
              example: 987654321,
            },
          },
        },
        docker: {
          type: "object",
          nullable: true,
          description:
            "Docker-метрики контейнеров VPN (если Docker доступен и контейнеры запущены)",
          required: ["containers"],
          properties: {
            containers: {
              type: "array",
              description: "Список контейнеров и их метрик",
              items: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    description: "Имя контейнера",
                    example: "amnezia-awg",
                  },
                  cpuPercent: {
                    type: "number",
                    nullable: true,
                    description: "CPU (в процентах), если удалось распарсить",
                    example: 0.15,
                  },
                  memUsageBytes: {
                    type: "number",
                    nullable: true,
                    description:
                      "Использование памяти (bytes), если удалось распарсить",
                    example: 12582912,
                  },
                  memLimitBytes: {
                    type: "number",
                    nullable: true,
                    description:
                      "Лимит памяти (bytes), если удалось распарсить",
                    example: 2147483648,
                  },
                  netRxBytes: {
                    type: "number",
                    nullable: true,
                    description: "Сеть RX (bytes), если удалось распарсить",
                    example: 1048576,
                  },
                  netTxBytes: {
                    type: "number",
                    nullable: true,
                    description: "Сеть TX (bytes), если удалось распарсить",
                    example: 2097152,
                  },
                  pids: {
                    type: "number",
                    nullable: true,
                    description:
                      "Количество процессов, если удалось распарсить",
                    example: 12,
                  },
                },
              },
            },
          },
        },
      },
    },
    401: SwaggerContract.ClientErrorResponseFactory(401),
    403: SwaggerContract.ClientErrorResponseFactory(403),
  },
} as const satisfies AppFastifySchema;

export type GetServerLoadType = typeof getServerLoadSchema;
