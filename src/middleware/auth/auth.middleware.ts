import { FastifyRequest } from "fastify";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";

/**
 * Авторизация
 */
export const authPreHandler =
  ({ required = true }: { required?: boolean } = {}) =>
  async (req: FastifyRequest): Promise<void> => {
    try {
      const apiKey = req.headers["x-api-key"];

      if (!apiKey || apiKey !== appConfig.API_KEY) throw new APIError(401);
    } catch {
      if (required) throw new APIError(401);
    }
  };
