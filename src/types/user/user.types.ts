export interface AmneziaDevice {
  id: string;
  deviceName?: string;
  allowedIps: string[];
  endpointHost?: string;
  endpointPort?: number;
  latestHandshakeUnix: number;
  latestHandshakeISO?: string;
  latestHandshakeSecondsAgo: number;
  isActive: boolean;
  transferRx: number;
  transferTx: number;
  persistentKeepalive: number | null;
}

export interface AmneziaUser {
  username: string;
  devices: AmneziaDevice[];
}
