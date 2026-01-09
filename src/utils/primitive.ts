import { Primitive } from "@/types/shared";

/**
 * Приведение типов (Date, Mongoose ID) перед отправкой
 */
export const primitive = <Type>(value: Type) => {
  return value as Primitive<Type>;
};

/**
 * Исключить null/undefined из массива
 */
export const isNotNull = <T>(x: T | null | undefined): x is T => x != null;
