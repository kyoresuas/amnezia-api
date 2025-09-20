import { SwaggerContract } from "@/contracts/swagger";
import { I18n, I18nArgs, StatusCodes } from "@/types/shared";

/**
 * Ошибка API
 */
export class APIError extends Error {
  public name = "APIError";
  public statusCode!: StatusCodes;
  public message!: I18n;
  public args!: I18nArgs;

  constructor(
    statusCode: StatusCodes,
    { msg, args }: { msg?: I18n; args?: I18nArgs } = {}
  ) {
    super(msg || SwaggerContract.CodeDescriptions[statusCode]);

    this.statusCode = statusCode;
    this.args = args || {};
  }
}
