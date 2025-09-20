import {
  RouteOptions,
  FastifySchema,
  FastifyInstance,
  RawServerDefault,
  FastifyBaseLogger,
  RouteHandlerMethod,
  RouteGenericInterface,
  preHandlerHookHandler,
} from "fastify";
import { StatusCodes } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";
import { IncomingMessage, ServerResponse } from "http";
import { FromSchemaDefaultOptions, JSONSchema } from "json-schema-to-ts";
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
  tags?: SwaggerContract.AdminTag[] | SwaggerContract.ClientTag[];
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

export type FastifyRoutes = "admin" | "client";
