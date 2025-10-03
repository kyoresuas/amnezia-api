import { Types } from "mongoose";

export type ArgumentsType<F extends () => any> = F extends (
  ...args: infer A
) => any
  ? A
  : never;

export type Primitive<T> = {
  [k in keyof T]: T[k] extends
    | bigint
    | Date
    | Types.ObjectId
    | (bigint | null)
    | (Date | null)
    | (Types.ObjectId | null)
    | (bigint | undefined)
    | (Date | undefined)
    | (Types.ObjectId | undefined)
    ? never
    : T[k] extends object | (object | null) | (object | undefined)
    ? Primitive<T[k]>
    : T[k];
};

export enum CustomFormat {
  UUID = "uuid",
  MONGOOSE_ID = "objectId",
  DATE_TIME = "dateTime",
}

export interface IAppConfig {
  ENV: "development" | "preproduction" | "production";
  FASTIFY_ROUTES?: {
    host: string;
    port: number;
  };
  FASTIFY_API_KEY?: string;
  NODE_ID?: string;
  NODE_REGION?: string;
  NODE_WEIGHT?: number;
  NODE_MAX_PEERS?: number;
  AMNEZIA_INTERFACE?: string;
  AMNEZIA_DOCKER_CONTAINER?: string;
  AMNEZIA_PUBLIC_HOST?: string;
  AMNEZIA_CLIENTS_TABLE_PATH?: string;
  AMNEZIA_WG_CONF_PATH?: string;
  AMNEZIA_DESCRIPTION?: string;
  AMNEZIA_SERVER_PUBLIC_KEY_PATH?: string;
}

export interface IPagination {
  skip: number;
  limit: number;
}
