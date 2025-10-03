export type RunOptions = {
  timeout?: number;
  maxBufferBytes?: number;
};

export interface AmneziaDevice {
  id: string;
  name: string | null;
  allowedIps: string[];
  lastHandshake: number;
  traffic: {
    received: number;
    sent: number;
  };
  endpoint: string | null;
  online: boolean;
}

export interface AmneziaUser {
  username: string;
  devices: AmneziaDevice[];
}

export type ClientTableEntry = {
  clientId?: string;
  publicKey?: string;
  userData?: { clientName?: string; creationDate?: string };
};
