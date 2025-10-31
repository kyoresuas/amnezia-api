import "dotenv/config";
import { IAppConfig } from "@/types/shared";

const {
  ENV,
  FASTIFY_ROUTES,
  FASTIFY_API_KEY,
  SERVER_ID,
  SERVER_NAME,
  SERVER_REGION,
  SERVER_WEIGHT,
  SERVER_MAX_PEERS,
  SERVER_PUBLIC_HOST,
} = process.env;

/**
 * Главная конфигурация проекта
 */
const appConfig: IAppConfig = {
  ENV: ENV as "development" | "preproduction" | "production",
  FASTIFY_ROUTES: FASTIFY_ROUTES
    ? (() => {
        const [host, port] = FASTIFY_ROUTES.split(":");
        return { host, port: Number(port) };
      })()
    : undefined,
  FASTIFY_API_KEY,
  SERVER_ID,
  SERVER_NAME,
  SERVER_REGION,
  SERVER_WEIGHT: Number(SERVER_WEIGHT),
  SERVER_MAX_PEERS: Number(SERVER_MAX_PEERS),
  SERVER_PUBLIC_HOST,
};

export default appConfig;
