import i18next from "i18next";
import { APIError } from "@/utils/APIError";
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

/**
 * Обработчик ошибок в запросах
 */
export const fastifyErrorHandler = (
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply
): void => {
  const i18n = req.i18n || i18next;

  // Ошибка валидации
  if (error.code === "FST_ERR_VALIDATION") {
    reply.code(400).send({
      message: i18n.t("swagger.errors.VALIDATION"),
      errors: error.validation?.map((error) => error.message),
    });

    return;
  }

  // Ошибка загрузки слишком большого файла
  if (error.code === "FST_REQ_FILE_TOO_LARGE") {
    reply.code(400).send({
      message: i18n.t("swagger.errors.FILE_TOO_LARGE"),
    });

    return;
  }

  // Ошибка неверного формата контента
  if (error.code == "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
    reply.code(415).send({
      message: i18n.t("swagger.errors.INVALID_MEDIA_TYPE"),
    });

    return;
  }

  // Ошибка, выброшенная нашим сервисом
  if (error instanceof APIError) {
    reply.code(error.statusCode).send({
      message: i18n.t(error.message),
    });

    return;
  }

  // Неизвестная ошибка
  reply.code(500).send({
    message: i18n.t("swagger.errors.UNKNOWN"),
  });
};
