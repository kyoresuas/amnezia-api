/**
 * Парсеры вывода docker stats
 */

// Множители единиц измерения для перевода в байты
const BYTE_UNITS: Record<string, number> = {
  b: 1,
  bytes: 1,
  kb: 1000,
  k: 1000,
  kib: 1024,
  mb: 1000 ** 2,
  mib: 1024 ** 2,
  gb: 1000 ** 3,
  gib: 1024 ** 3,
  tb: 1000 ** 4,
  tib: 1024 ** 4,
};

/**
 * Привести строку вида 12.5MiB к числу байт
 */
export const parseBytes = (value: string): number | null => {
  const match = (value || "").trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) return null;

  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;

  const unit = (match[2] || "B").toLowerCase();
  const multiplier = BYTE_UNITS[unit];
  if (!multiplier) return null;

  return Math.round(number * multiplier);
};

/**
 * Привести строку вида 12.34% к числу процентов
 */
export const parseCpuPercent = (value: string): number | null => {
  const parsed = Number((value || "").trim().replace("%", ""));

  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Разобрать поле MemUsage вида 12MiB / 2GiB
 */
export const parseMemUsage = (
  value: string,
): { usage: number | null; limit: number | null } => {
  const [left, right] = (value || "").split("/").map((part) => part.trim());

  return {
    usage: left ? parseBytes(left) : null,
    limit: right ? parseBytes(right) : null,
  };
};

/**
 * Разобрать поле NetIO вида 1.2kB / 3.4kB
 */
export const parseNetIo = (
  value: string,
): { rx: number | null; tx: number | null } => {
  const [left, right] = (value || "").split("/").map((part) => part.trim());

  return {
    rx: left ? parseBytes(left) : null,
    tx: right ? parseBytes(right) : null,
  };
};
