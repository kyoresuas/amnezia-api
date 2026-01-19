import { SwaggerContract } from "@/contracts/swagger";
import { AppJSONSchema, Protocol } from "@/types/shared";

export const clientIdSchema = {
  type: "string",
  description: "Идентификатор (PublicKey)",
  example: SwaggerContract.Base64Example,
} as const satisfies AppJSONSchema;

export const protocolSchema = {
  type: "string",
  description: "Протокол подключения",
  enum: Object.values(Protocol),
  example: Protocol.AMNEZIAWG,
} as const satisfies AppJSONSchema;

