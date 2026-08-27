import { AppContract } from "@/contracts/app";
import { AwgParams, AwgVersion } from "@/types/amnezia";

// Базовые параметры обфускации, общие для всех версий AmneziaWG
const BASE_KEYS: readonly string[] = ["Jc", "Jmin", "Jmax", "S1", "S2"];

// Magic-заголовки пакетов
const MAGIC_HEADER_KEYS: readonly string[] = ["H1", "H2", "H3", "H4"];

// Размеры мусора, добавленные в AmneziaWG 2.0
const AWG2_KEYS: readonly string[] = ["S3", "S4"];

// Специальный мусор, добавленный в AmneziaWG 1.5
export const AWG_SPECIAL_JUNK_KEYS: readonly string[] = [
  "I1",
  "I2",
  "I3",
  "I4",
  "I5",
];

// Параметры, добавленные в AmneziaWG 3.1
export const AWG3_KEYS: readonly string[] = [
  "HeaderProtectionKey",
  "ContentPaddingAddition",
  "RekeyAfterTime",
  "RekeyTimeout",
  "RejectAfterTime",
  "KeepaliveTimeout",
  "MaxHandshakeAttempts",
];

// Переключатели, добавленные в AmneziaWG 3.1
export const AWG3_TOGGLE_KEYS: readonly string[] = [
  "RandomTrailers",
  "DisableCookies",
];

/**
 * Прочитать активное значение параметра из конфига
 */
const readActiveParam = (config: string, key: string): string =>
  config.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*?)\\s*$`, "mi"))?.[1] || "";

/**
 * Прочитать закомментированное значение параметра из конфига
 */
const readCommentedParam = (config: string, key: string): string =>
  config
    .match(new RegExp(`^\\s*#\\s*${key}\\s*=\\s*(.*?)\\s*$`, "mi"))?.[1]
    ?.trim() || "";

/**
 * Проверить, что значение специального мусора пригодно для клиентского конфига
 */
const isValidSpecialJunk = (value: string): boolean =>
  Boolean(value) && !value.includes("#") && !value.includes("[Peer]");

/**
 * Проверить, что переключатель AmneziaWG 3.1 включен
 */
export const isAwgToggleEnabled = (value: string): boolean => {
  const trimmed = value.trim();

  return (
    Boolean(trimmed) && trimmed.toLowerCase() !== AppContract.WG.TOGGLE_OFF
  );
};

/**
 * Прочитать параметр AmneziaWG из серверного конфига
 */
export const readAwgParam = (config: string, key: string): string =>
  readActiveParam(config, key) || readCommentedParam(config, key);

/**
 * Разобрать параметры AmneziaWG из серверного конфига
 */
export const parseAwgParams = (config: string): AwgParams => {
  const params: AwgParams = {};

  for (const key of [...BASE_KEYS, ...AWG2_KEYS, ...MAGIC_HEADER_KEYS]) {
    params[key] = readAwgParam(config, key);
  }

  for (const key of AWG_SPECIAL_JUNK_KEYS) {
    const value = readAwgParam(config, key);

    // I2–I5 могут содержать остатки разметки конфига, такие значения не переносим
    params[key] = key === "I1" || isValidSpecialJunk(value) ? value : "";
  }

  // Параметры 3.1 определяют версию протокола, поэтому закомментированные не учитываем
  for (const key of AWG3_KEYS) {
    params[key] = readActiveParam(config, key);
  }

  for (const key of AWG3_TOGGLE_KEYS) {
    const value = readActiveParam(config, key);

    params[key] = isAwgToggleEnabled(value) ? value : "";
  }

  return params;
};

/**
 * Определить версию протокола AmneziaWG по набору параметров
 */
export const resolveAwgVersion = (params: AwgParams): AwgVersion | null => {
  const hasValue = (key: string) => Boolean(params[key]?.trim());

  // 3.1: защита заголовков, рандомизация таймингов и трейлеры
  if (AWG3_KEYS.some(hasValue) || AWG3_TOGGLE_KEYS.some(hasValue)) {
    return AwgVersion.V3_1;
  }

  // 2.0: размеры мусора S3/S4 и диапазоны magic-заголовков
  if (
    AWG2_KEYS.some(hasValue) ||
    MAGIC_HEADER_KEYS.some((key) => params[key]?.includes("-"))
  ) {
    return AwgVersion.V2;
  }

  // 1.5: специальный мусор I1–I5
  if (AWG_SPECIAL_JUNK_KEYS.some(hasValue)) {
    return AwgVersion.V1_5;
  }

  return null;
};

/**
 * Убрать из конфига строки с пустыми значениями
 */
export const dropEmptyConfigLines = (config: string): string =>
  config
    .split("\n")
    .filter((line) => !/^\s*\S+\s*=\s*$/.test(line))
    .join("\n");
