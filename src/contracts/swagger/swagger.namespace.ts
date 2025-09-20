import {
  I18n,
  StatusCodes,
  SuccessCode,
  AppJSONSchema,
  FastifyRoutes,
  RedirectionCode,
  ClientErrorCode,
  ServerErrorCode,
  InformationalCode,
} from "@/types/shared";
import i18next from "i18next";
import { FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import { FastifyDynamicSwaggerOptions } from "@fastify/swagger";

export namespace SwaggerContract {
  /**
   * Тег для документации Client API
   */
  export enum ClientTag {
    AUTH = "Auth",
    USER = "User",
    TASKS = "Tasks",
  }

  /**
   * Тег для документации Admin API
   */
  export enum AdminTag {
    USERS = "Users",
  }

  /**
   * Описания для кодов ответа REST API
   */
  export const CodeDescriptions = {
    [InformationalCode.CONTINUE]: "swagger.codes.100",
    [InformationalCode.SWITCHING_PROTOCOLS]: "swagger.codes.101",
    [InformationalCode.PROCESSING]: "swagger.codes.102",
    [InformationalCode.EARLY_HINTS]: "swagger.codes.103",

    [SuccessCode.OK]: "swagger.codes.200",
    [SuccessCode.CREATED]: "swagger.codes.201",
    [SuccessCode.ACCEPTED]: "swagger.codes.202",
    [SuccessCode.NON_AUTHORITATIVE_INFORMATION]: "swagger.codes.203",
    [SuccessCode.NO_CONTENT]: "swagger.codes.204",
    [SuccessCode.RESET_CONTENT]: "swagger.codes.205",
    [SuccessCode.PARTIAL_CONTENT]: "swagger.codes.206",
    [SuccessCode.MULTI_STATUS]: "swagger.codes.207",
    [SuccessCode.ALREADY_REPORTED]: "swagger.codes.208",
    [SuccessCode.IM_USED]: "swagger.codes.226",

    [RedirectionCode.MULTIPLE_CHOISES]: "swagger.codes.300",
    [RedirectionCode.MOVED_PERMANENTLY]: "swagger.codes.301",
    [RedirectionCode.FOUND]: "swagger.codes.302",
    [RedirectionCode.SEE_OTHER]: "swagger.codes.303",
    [RedirectionCode.NOT_MODIFIED]: "swagger.codes.304",
    [RedirectionCode.USE_PROXY]: "swagger.codes.305",
    [RedirectionCode.TEMPORARY_REDIRECT]: "swagger.codes.307",
    [RedirectionCode.PERMANENT_REDIRECT]: "swagger.codes.308",

    [ClientErrorCode.BAD_REQUEST]: "swagger.codes.400",
    [ClientErrorCode.UNAUTHORIZED]: "swagger.codes.401",
    [ClientErrorCode.FORBIDDEN]: "swagger.codes.403",
    [ClientErrorCode.NOT_FOUND]: "swagger.codes.404",
    [ClientErrorCode.METHOD_NOT_ALLOWED]: "swagger.codes.405",
    [ClientErrorCode.NOT_ACCEPTABLE]: "swagger.codes.406",
    [ClientErrorCode.PROXY_AUTHENTIFICATION_REQUIRED]: "swagger.codes.407",
    [ClientErrorCode.REQUEST_TIMEOUT]: "swagger.codes.408",
    [ClientErrorCode.CONFLICT]: "swagger.codes.409",
    [ClientErrorCode.GONE]: "swagger.codes.410",
    [ClientErrorCode.LENGTH_REQUIRED]: "swagger.codes.411",
    [ClientErrorCode.PRECONDITION_FAILED]: "swagger.codes.412",
    [ClientErrorCode.PAYLOAD_TOO_LARGE]: "swagger.codes.413",
    [ClientErrorCode.URI_TOO_LONG]: "swagger.codes.414",
    [ClientErrorCode.UNSUPPORTED_MEDIA_TYPE]: "swagger.codes.415",
    [ClientErrorCode.RANGE_NOT_SATISFIABLE]: "swagger.codes.416",
    [ClientErrorCode.EXPECTATION_FAILED]: "swagger.codes.417",
    [ClientErrorCode.I_AM_A_TEAPOT]: "swagger.codes.418",
    [ClientErrorCode.MISDIRECTED_REQUEST]: "swagger.codes.421",
    [ClientErrorCode.UNPROCESSABLE_ENTITY]: "swagger.codes.422",
    [ClientErrorCode.LOCKED]: "swagger.codes.423",
    [ClientErrorCode.FAILED_DEPENDENCY]: "swagger.codes.424",
    [ClientErrorCode.TOO_EARLY]: "swagger.codes.425",
    [ClientErrorCode.UPGRADE_REQUIRED]: "swagger.codes.426",
    [ClientErrorCode.PRECONDITION_REQUIRED]: "swagger.codes.428",
    [ClientErrorCode.TOO_MANY_REQUESTS]: "swagger.codes.429",
    [ClientErrorCode.REQUEST_HEADER_FIELDS_TOO_LARGE]: "swagger.codes.431",
    [ClientErrorCode.RETRY_WITH]: "swagger.codes.449",
    [ClientErrorCode.UNAVAILABLE_FOR_LEGAL_REASONS]: "swagger.codes.451",
    [ClientErrorCode.CLIENT_CLOSED_REQUEST]: "swagger.codes.499",

    [ServerErrorCode.INTERNAL_SERVER_ERROR]: "swagger.codes.500",
    [ServerErrorCode.NOT_IMPLEMENTED]: "swagger.codes.501",
    [ServerErrorCode.BAD_GATEWAY]: "swagger.codes.502",
    [ServerErrorCode.SERVICE_UNAVAILABLE]: "swagger.codes.503",
    [ServerErrorCode.GATEWAY_TIMEOUT]: "swagger.codes.504",
    [ServerErrorCode.HTTP_VERSION_NOT_SUPPORTED]: "swagger.codes.505",
    [ServerErrorCode.VARIANT_ALSO_NEGOTIATES]: "swagger.codes.506",
    [ServerErrorCode.INSUFFICIENT_STORAGE]: "swagger.codes.507",
    [ServerErrorCode.LOOP_DETECTED]: "swagger.codes.508",
    [ServerErrorCode.BANDWIDTH_LIMIT_EXCEEDED]: "swagger.codes.509",
    [ServerErrorCode.NOT_EXTENDED]: "swagger.codes.510",
    [ServerErrorCode.NETWORK_AUTHENTIFICATION_REQUIRED]: "swagger.codes.511",
    [ServerErrorCode.UNKNOWN_ERROR]: "swagger.codes.520",
    [ServerErrorCode.WEB_SERVER_IS_DOWN]: "swagger.codes.521",
    [ServerErrorCode.CONNECTION_TIMED_OUT]: "swagger.codes.522",
    [ServerErrorCode.ORIGIN_IS_UNREACHABLE]: "swagger.codes.523",
    [ServerErrorCode.A_TIMEOUT_OCCURRED]: "swagger.codes.524",
    [ServerErrorCode.SSL_HANDSHAKE_FAILED]: "swagger.codes.525",
    [ServerErrorCode.INVALID_SSL_CERTIFICATE]: "swagger.codes.526",
  } as const satisfies {
    [x in StatusCodes]: I18n;
  };

  export const UUIDExample = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
  export const MongooseIDExample = "66f271c7e1ab2c1ef584e7ec";
  export const DateTimeExample = "2024-12-16T10:51:47.087Z";

  /**
   * Схема запроса со включённой пагинацией
   */
  export const EnablePaginationSchema = {
    type: "object",
    properties: {
      skip: {
        type: "integer",
        minimum: 0,
        default: 0,
        description: "Сколько элементов необходимо пропустить",
        example: 0,
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 100,
        description: "Максимальное количество элементов",
        example: 100,
      },
    },
  } as const satisfies AppJSONSchema;

  /**
   * Тип схемы для запроса со включённой пагинацией
   */
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

  /**
   * Схема для ответа на запрос с действием
   */
  export const ActionResponseSchema = {
    type: "object",
    required: ["message"],
    description: "Ответ на действие",
    properties: {
      message: {
        type: "string",
        description: "Сообщение для уведомления",
        example: i18next.t("swagger.messages.SAVED"),
      },
    },
  } as const satisfies AppJSONSchema;

  /**
   * Тип схемы для ответа на запрос с действием
   */
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

  /**
   * Схема для ответа на запрос с пагинацией
   */
  export const PaginatedResponseSchema = {
    type: "object",
    required: ["totalSize", "items"],
    description: "Ответ на запрос",
    properties: {
      totalSize: {
        type: "integer",
        description: "Количество всех элементов",
        example: 128,
      },
      items: {
        type: "array",
        description: "Список элементов",
        // "items" заполняет разработчик
      },
    },
  } as const satisfies AppJSONSchema;

  /**
   * Тип схемы для ответа на запрос с пагинацией
   */
  export type PaginatedResponseType = {
    type: "object";
    required: readonly ["totalSize", "items", ...string[]];
    description: string;
    properties: {
      totalSize: {
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

  /**
   * Получить схему для ответа с ошибкой
   */
  export const ClientErrorResponseFactory = (
    clientErrorCode: ClientErrorCode
  ) => {
    return {
      type: ActionResponseSchema.type,
      required: ActionResponseSchema.required,
      description: "Ответ на запрос с ошибкой",
      properties: {
        message: {
          type: ActionResponseSchema.properties.message.type,
          description: "Описание ошибки",
          example: i18next.t(CodeDescriptions[clientErrorCode]),
        },
      },
    } as const satisfies ActionResponseType;
  };

  export const GetConfig = (
    routes: FastifyRoutes
  ): FastifyDynamicSwaggerOptions => {
    const openapi: FastifyDynamicSwaggerOptions["openapi"] = {
      openapi: "3.0.0",
      tags: [],
      components: {
        securitySchemes: {
          Bearer: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    };

    switch (routes) {
      case "admin":
        openapi.info = {
          title: "Admin API",
          version: "1.0.0",
        };

        openapi.tags!.push({
          name: SwaggerContract.AdminTag.USERS,
          description: "Маршруты для управления пользователями",
        });
        break;

      case "client":
        openapi.info = {
          title: "Client API",
          version: "1.0.0",
        };

        openapi.tags!.push(
          {
            name: SwaggerContract.ClientTag.AUTH,
            description: "Маршруты для авторизации",
          },
          {
            name: SwaggerContract.ClientTag.USER,
            description: "Маршруты для пользователя",
          },
          {
            name: SwaggerContract.ClientTag.TASKS,
            description: "Маршруты для работы с задачами",
          }
        );
        break;
    }

    return {
      swagger: {
        consumes: ["application/json", "text/xml"],
        produces: ["application/json", "text/xml"],
      },
      openapi,
    };
  };

  export const ConfigUi: FastifySwaggerUiOptions = {
    routePrefix: "docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  };
}
