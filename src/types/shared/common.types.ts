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

export enum Protocol {
  AMNEZIAWG = "amneziawg",
  XRAY = "xray",
}

export interface IAppConfig {
  ENV: "development" | "preproduction" | "production";
  FASTIFY_ROUTES?: {
    host: string;
    port: number;
  };
  FASTIFY_API_KEY?: string;
  SERVER_ID?: string;
  SERVER_NAME?: string;
  SERVER_REGION?: string;
  SERVER_WEIGHT?: number;
  SERVER_MAX_PEERS?: number;
  SERVER_PUBLIC_HOST?: string;
  PROTOCOLS_ENABLED?: Protocol[];
}

export interface IPagination {
  skip: number;
  limit: number;
}
