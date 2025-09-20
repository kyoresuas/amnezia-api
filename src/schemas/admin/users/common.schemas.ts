import { AppJSONSchema } from "@/types/shared";
import { userIdSchema } from "@/schemas/client";

export const paramsWithUserId = {
  type: "object",
  required: ["userId"],
  properties: {
    userId: userIdSchema,
  },
} as const satisfies AppJSONSchema;
