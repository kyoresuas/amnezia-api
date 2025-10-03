import { AppJSONSchema } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";

export const clientIdSchema = {
  type: "string",
  description: "Идентификатор (PublicKey)",
  example: SwaggerContract.Base64Example,
} as const satisfies AppJSONSchema;
