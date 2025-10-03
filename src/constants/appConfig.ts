import "dotenv/config";
import { IAppConfig } from "@/types/shared";

const {
  ENV,
  FASTIFY_ROUTES,
  FASTIFY_API_KEY,
  NODE_ID,
  NODE_REGION,
  NODE_WEIGHT,
  NODE_MAX_PEERS,
  AMNEZIA_INTERFACE,
  AMNEZIA_DOCKER_CONTAINER,
  AMNEZIA_PUBLIC_HOST,
  AMNEZIA_CLIENTS_TABLE_PATH,
  AMNEZIA_WG_CONF_PATH,
  AMNEZIA_DESCRIPTION,
  AMNEZIA_SERVER_PUBLIC_KEY_PATH,
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
  NODE_ID,
  NODE_REGION,
  NODE_WEIGHT: Number(NODE_WEIGHT),
  NODE_MAX_PEERS: Number(NODE_MAX_PEERS),
  AMNEZIA_INTERFACE,
  AMNEZIA_DOCKER_CONTAINER,
  AMNEZIA_PUBLIC_HOST,
  AMNEZIA_CLIENTS_TABLE_PATH,
  AMNEZIA_WG_CONF_PATH,
  AMNEZIA_DESCRIPTION,
  AMNEZIA_SERVER_PUBLIC_KEY_PATH,
};

export default appConfig;
