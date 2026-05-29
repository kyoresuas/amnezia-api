import QRCode from "qrcode";
import { APIError } from "@/utils/APIError";
import { AppContract } from "@/contracts/app";
import { ClientErrorCode } from "@/types/shared";

/**
 * Преобразует Buffer в строку base64url без хвостовых символов
 */
const toBase64Url = (buffer: Buffer): string =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

/**
 * Декодирует строку конфига вида "vpn://<base64url>" в исходный буфер
 */
const decodeVpnConfig = (config: string): Buffer => {
  const payload = config.trim().replace(/^vpn:\/\//i, "");

  if (!payload) {
    throw new APIError(ClientErrorCode.BAD_REQUEST, {
      msg: "swagger.errors.INVALID_CONFIG",
    });
  }

  // base64url -> base64
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const data = Buffer.from(normalized, "base64");

  if (!data.length) {
    throw new APIError(ClientErrorCode.BAD_REQUEST, {
      msg: "swagger.errors.INVALID_CONFIG",
    });
  }

  return data;
};

/**
 * Сериализует один чанк в бинарный формат QDataStream (big-endian)
 */
const serializeChunk = (
  chunksCount: number,
  chunkIndex: number,
  chunk: Buffer,
): Buffer => {
  const header = Buffer.alloc(8);
  header.writeInt16BE(AppContract.QR.MAGIC_CODE, 0);
  header.writeUInt8(chunksCount, 2);
  header.writeUInt8(chunkIndex, 3);
  header.writeUInt32BE(chunk.length, 4);

  return Buffer.concat([header, chunk]);
};

/**
 * Генерирует серию QR-кодов (PNG data URI) для конфига Amnezia
 */
export const generateConfigQrSeries = async (
  config: string,
): Promise<string[]> => {
  const data = decodeVpnConfig(config);

  const chunkSize = AppContract.QR.CHUNK_SIZE;
  const chunksCount = Math.ceil(data.length / chunkSize);
  const codes: string[] = [];

  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunkIndex = Math.round(offset / chunkSize);
    const chunk = data.subarray(offset, offset + chunkSize);
    const frame = serializeChunk(chunksCount, chunkIndex, chunk);

    const dataUri = await QRCode.toDataURL(toBase64Url(frame), {
      errorCorrectionLevel: AppContract.QR.ERROR_CORRECTION_LEVEL,
      type: "image/png",
      margin: 1,
    });

    codes.push(dataUri);
  }

  return codes;
};
