import { Primitive } from "@/types/shared";

/**
 * Приведение типов (Date, Mongoose ID) перед отправкой
 */
export const primitive = <Type>(value: Type) => {
  return value as Primitive<Type>;
};
