import { FastifyRequest } from "fastify";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";

/**
 * Авторизация
 */
export const authPreHandler =
  ({ required = true }: { required?: boolean } = {}) =>
  async (req: FastifyRequest): Promise<void> => {
    const apiKey = req.headers["x-api-key"];

    if (apiKey !== appConfig.API_KEY && required) {
      throw new APIError(401);
    }
  };
