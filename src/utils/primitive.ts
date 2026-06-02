import { Primitive } from "@/types/shared";

/**
 * Приведение типов (Date) перед отправкой
 */
export const primitive = <Type>(value: Type) => {
  return value as Primitive<Type>;
};

/**
 * Исключить null/undefined из массива
 */
export const isNotNull = <T>(x: T | null | undefined): x is T => x != null;

/**
 * Привести строку к целому числу
 */
export const toInt = (value?: string): number | undefined => {
  if (!value?.trim()) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};
