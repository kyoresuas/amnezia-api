import { timingSafeEqual } from "crypto";
import { FastifyRequest } from "fastify";
import { APIError } from "@/utils/APIError";
import appConfig from "@/constants/appConfig";

/**
 * Сравнить строки за константное время
 */
const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  // timingSafeEqual выбрасывает при разной длине, сравниваем длину отдельно
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
};

/**
 * Авторизация
 */
export const authPreHandler =
  () =>
  async (req: FastifyRequest): Promise<void> => {
    const apiKey = req.headers["x-api-key"];
    const expected = appConfig.FASTIFY_API_KEY;

    if (
      typeof apiKey !== "string" ||
      !expected ||
      !safeEqual(apiKey, expected)
    ) {
      throw new APIError(401);
    }
  };
