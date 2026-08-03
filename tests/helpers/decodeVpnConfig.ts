import { inflateSync } from "node:zlib";

/**
 * Декодировать конфигурацию формата vpn://
 */
export const decodeVpnConfig = (config: string): Record<string, unknown> => {
  const payload = Buffer.from(config.replace(/^vpn:\/\//, ""), "base64url");
  const expectedLength = payload.readUInt32BE(0);
  const raw = inflateSync(payload.subarray(4));

  if (raw.length !== expectedLength) {
    throw new Error("Некорректная длина конфигурации vpn://");
  }

  return JSON.parse(raw.toString("utf-8")) as Record<string, unknown>;
};
