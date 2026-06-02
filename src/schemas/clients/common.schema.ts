import { SwaggerContract } from "@/contracts/swagger";
import { Protocol, AppJSONSchema } from "@/types/shared";

export const clientIdSchema = {
  type: "string",
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9+/=_-]+$",
  description: "Идентификатор (PublicKey)",
  example: SwaggerContract.Base64Example,
} as const satisfies AppJSONSchema;

export const protocolSchema = {
  type: "string",
  description: "Протокол подключения",
  enum: Object.values(Protocol),
  example: Protocol.AMNEZIAWG,
} as const satisfies AppJSONSchema;
