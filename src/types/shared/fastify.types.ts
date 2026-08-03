import {
  RouteOptions,
  FastifySchema,
  FastifyInstance,
  RawServerDefault,
  FastifyBaseLogger,
  RouteHandlerMethod,
  preHandlerHookHandler,
  RouteGenericInterface,
} from "fastify";
import { StatusCodes } from "@/types/shared";
import { SwaggerTag } from "@/contracts/swagger";
import { ServerResponse, IncomingMessage } from "http";
import { JSONSchema, FromSchemaDefaultOptions } from "json-schema-to-ts";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

export type AppFastifyInstance = FastifyInstance<
  RawServerDefault,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  JsonSchemaToTsProvider
>;

export type AppJSONSchema = JSONSchema &
  Readonly<{
    items?: AppJSONSchema | readonly AppJSONSchema[];
    additionalItems?: AppJSONSchema;
    contains?: AppJSONSchema;
    properties?: Readonly<Record<string, AppJSONSchema>>;
    patternProperties?: Readonly<Record<string, AppJSONSchema>>;
    additionalProperties?: AppJSONSchema;
    unevaluatedProperties?: AppJSONSchema;
    dependencies?: Readonly<Record<string, AppJSONSchema | readonly string[]>>;
    propertyNames?: AppJSONSchema;
    if?: AppJSONSchema;
    then?: AppJSONSchema;
    else?: AppJSONSchema;
    allOf?: readonly AppJSONSchema[];
    anyOf?: readonly AppJSONSchema[];
    oneOf?: readonly AppJSONSchema[];
    not?: AppJSONSchema;
    definitions?: Readonly<Record<string, AppJSONSchema>>;
    example?: unknown;
  }>;

export interface AppFastifySchema extends FastifySchema {
  tags?: SwaggerTag[];
  summary?: string;
  body?: AppJSONSchema;
  querystring?: AppJSONSchema;
  params?: AppJSONSchema;
  headers?: AppJSONSchema;
  response?: {
    [x in StatusCodes]?: AppJSONSchema;
  };
}

export type AppFastifyRoute<SchemaType extends AppFastifySchema> = RouteOptions<
  RawServerDefault,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  RouteGenericInterface,
  unknown,
  SchemaType,
  JsonSchemaToTsProvider<FromSchemaDefaultOptions>,
  FastifyBaseLogger
>;

export type AppFastifyPreHandler<SchemaType extends AppFastifySchema> =
  preHandlerHookHandler<
    RawServerDefault,
    IncomingMessage,
    ServerResponse<IncomingMessage>,
    RouteGenericInterface,
    unknown,
    SchemaType,
    JsonSchemaToTsProvider<FromSchemaDefaultOptions>,
    FastifyBaseLogger
  >;

export type AppFastifyHandler<SchemaType extends AppFastifySchema> =
  RouteHandlerMethod<
    RawServerDefault,
    IncomingMessage,
    ServerResponse<IncomingMessage>,
    RouteGenericInterface,
    unknown,
    SchemaType,
    JsonSchemaToTsProvider<FromSchemaDefaultOptions>,
    FastifyBaseLogger
  >;

export type EnablePaginationType = {
  type: "object";
  properties: {
    skip: {
      type: "integer";
      minimum: number;
      default: number;
      description: string;
      example: number;
    };
    limit: {
      type: "integer";
      minimum: number;
      maximum: 100;
      default: number;
      description: string;
      example: number;
    };
    [x: string]: AppJSONSchema;
  };
};

export type ActionResponseType = {
  type: "object";
  required: readonly ["message", ...string[]];
  description: string;
  properties: {
    message: {
      type: "string";
      description: string;
      example: string;
    };
    [x: string]: AppJSONSchema;
  };
};

export type PaginatedResponseType = {
  type: "object";
  required: readonly ["total", "items", ...string[]];
  description: string;
  properties: {
    total: {
      type: "integer";
      description: string;
      example: number;
    };
    items: {
      type: "array";
      description: string;
      items: AppJSONSchema;
    };
    [x: string]: AppJSONSchema;
  };
};

export interface UiOperation {
  get(key: "operation"): {
    get(key: string): number | undefined;
  };
}
