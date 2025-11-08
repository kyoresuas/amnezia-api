import { Protocol } from "@/types/shared";

export type CreateUserPayload = {
  clientName: string;
  protocol: Protocol;
  expiresAt?: number | null;
};

export type DeleteUserPayload = {
  clientId: string;
  protocol: Protocol;
};

export type CreateUserResult = {
  id: string;
  config: string;
  protocol: Protocol;
};

export interface UserDevice {
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
  expiresAt: number | null;
  protocol: Protocol;
}

export interface UserRecord {
  username: string;
  devices: UserDevice[];
}
