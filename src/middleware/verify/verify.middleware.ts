import { FastifyRequest } from "fastify";
import { UserRole } from "@/entities/user";
import { APIError } from "@/utils/APIError";

export const verifyPreHandler =
  (roles: UserRole[] = []) =>
  async (req: FastifyRequest): Promise<void> => {
    if (!req.user?.role || roles.includes(req.user.role)) return;

    throw new APIError(403);
  };
