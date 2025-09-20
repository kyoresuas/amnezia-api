import { SwaggerContract } from "@/contracts/swagger";
import { AppJSONSchema, CustomFormat } from "@/types/shared";

export const timestampsSample = {
  createdAt: {
    type: "string",
    format: CustomFormat.DATE_TIME,
    description: "Дата создания",
    example: SwaggerContract.DateTimeExample,
  },
  updatedAt: {
    type: "string",
    format: CustomFormat.DATE_TIME,
    description: "Дата обновления",
    example: SwaggerContract.DateTimeExample,
  },
} as const satisfies {
  [x in string]: AppJSONSchema;
};
