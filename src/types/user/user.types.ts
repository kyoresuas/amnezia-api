export interface AmneziaUser {
  // Базовые идентификаторы
  id: string; // publicKey
  username: string; // метка (по умолчанию первый allowed IP)

  // Сетевые параметры
  endpointHost?: string;
  endpointPort?: number;
  allowedIps: string[];

  // Сессия/состояние
  latestHandshakeUnix: number;
  latestHandshakeISO?: string;
  latestHandshakeSecondsAgo: number;
  persistentKeepalive: number | null;
  isActive: boolean;

  // Трафик
  transferRx: number; // bytes
  transferTx: number; // bytes
}
