import Ajv from "ajv";
import ajvErrors from "ajv-errors";
import { isValidObjectId } from "mongoose";
import { validate as isValidUUID } from "uuid";
import { AppFastifyInstance, CustomFormat } from "@/types/shared";

/**
 * Валидатор данных для Fastify
 */
export const setupAjvValidator = (fastify: AppFastifyInstance): void => {
  const ajv = new Ajv({
    removeAdditional: true,
    coerceTypes: true,
    strict: "log",
    keywords: ["kind", "modifier", "example"],
    useDefaults: true,
    allErrors: true,
    strictRequired: false,
    strictNumbers: false,
  });

  ajvErrors(ajv);

  // Формат для UUID
  ajv.addFormat(CustomFormat.UUID, {
    type: "string",
    validate: (value) => isValidUUID(value),
  });

  // Формат для Mongoose ID
  ajv.addFormat(CustomFormat.MONGOOSE_ID, {
    type: "string",
    validate: (value) => isValidObjectId(value),
  });

  // Формат для даты и времени
  ajv.addFormat(CustomFormat.DATE_TIME, {
    type: "string",
    validate: (value) => !isNaN(Date.parse(value)),
  });

  fastify.setValidatorCompiler(({ schema }) => {
    return ajv.compile(schema);
  });
};
