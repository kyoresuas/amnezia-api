import "dotenv/config";
import { TaskType } from "@/types/cron";
import { FastifyRoutes, IAppConfig, Module } from "@/types/shared";

const {
  ENV,
  ENABLED_MODULES,
  ENABLED_FASTIFY_ROUTES,
  ENABLED_TASK_TYPES,
  ENABLED_TASKS,
  API_KEY,
  AMNEZIA_INTERFACE,
  AMNEZIA_DOCKER_CONTAINER,
  AMNEZIA_PUBLIC_HOST,
  AMNEZIA_CLIENTS_TABLE_PATH,
  AMNEZIA_WG_CONF_PATH,
  AMNEZIA_DESCRIPTION,
  AMNEZIA_SERVER_PUBLIC_KEY_PATH,
} = process.env;

const enabledFastifyRoutes: IAppConfig["ENABLED_FASTIFY_ROUTES"] = {};

if (ENABLED_FASTIFY_ROUTES) {
  ENABLED_FASTIFY_ROUTES.split(",").forEach((group) => {
    const [name, value] = group.split("=");
    const [host, port] = value.split(":");

    enabledFastifyRoutes[name as FastifyRoutes] = {
      host,
      port: Number(port),
    };
  });
}

/**
 * Главная конфигурация проекта
 */
const appConfig: IAppConfig = {
  ENV: ENV as "development" | "preproduction" | "production",
  ENABLED_MODULES: ENABLED_MODULES
    ? (ENABLED_MODULES.split(",") as Module[])
    : [],
  ENABLED_FASTIFY_ROUTES: enabledFastifyRoutes,
  ENABLED_TASK_TYPES: ENABLED_TASK_TYPES
    ? (ENABLED_TASK_TYPES.split(",") as TaskType[])
    : [],
  ENABLED_TASKS: ENABLED_TASKS ? ENABLED_TASKS.split(",") : [],
  API_KEY,
  AMNEZIA_INTERFACE,
  AMNEZIA_DOCKER_CONTAINER,
  AMNEZIA_PUBLIC_HOST,
  AMNEZIA_CLIENTS_TABLE_PATH,
  AMNEZIA_WG_CONF_PATH,
  AMNEZIA_DESCRIPTION,
  AMNEZIA_SERVER_PUBLIC_KEY_PATH,
};

export default appConfig;
