import { deflateSync } from "zlib";

/**
 * Закодировать серверный JSON в строку формата vpn://<base64url>,
 * совместимую с клиентом amnezia
 */
export const encodeVpnConfig = (serverJson: unknown): string => {
  const rawData = Buffer.from(JSON.stringify(serverJson), "utf-8");

  const header = Buffer.alloc(4);
  header.writeUInt32BE(rawData.length, 0);

  const compressed = deflateSync(rawData, { level: 8 });

  const base64url = Buffer.concat([header, compressed])
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `vpn://${base64url}`;
};
