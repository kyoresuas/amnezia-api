import { AppJSONSchema } from "@/types/shared";

export const authSample = {
  name: {
    type: "string",
    minLength: 1,
    description: "Имя пользователя",
    example: "admin",
  },
  password: {
    type: "string",
    minLength: 1,
    description: "Пароль пользователя",
    example: "admin",
  },
} as const satisfies { [x in string]: AppJSONSchema };

export const tokenSample = {
  token: {
    type: "string",
    description: "JWT",
    example:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI1NjFkZGFmZC03M2M2LTQ4YTgtYmY4Yy1kODg0ZjAyZDQ4MzQiLCJpYXQiOjE3MzQzMzQyMDUsImV4cCI6MTc2NTg3MDIwNX0.xCRfQTO80DrA0Jgkssz7y1S4-dhX_jo9bd0Afeefg6g",
  },
} as const satisfies { [x in string]: AppJSONSchema };

export const authSchema = {
  type: "object",
  description: "Данные пользователя",
  required: ["name", "password"],
  properties: authSample,
} as const satisfies AppJSONSchema;
