import { Protocol } from "@/types/shared";

export type TrafficStats = {
  received: number;
  sent: number;
};

export enum PeerStatus {
  Active = "active",
  Disabled = "disabled",
}

export type CreateClientPayload = {
  clientName: string;
  protocol: Protocol;
  expiresAt?: number | null;
};

export type DeleteClientPayload = {
  clientId: string;
  protocol: Protocol;
};

export type UpdateClientPayload = {
  clientId: string;
  protocol: Protocol;
  status?: PeerStatus;
  expiresAt?: number | null;
};

export type CreateClientResult = {
  id: string;
  config: string;
  protocol: Protocol;
};

export interface ClientPeer {
  id: string;
  name: string | null;
  allowedIps: string[];
  lastHandshake: number;
  traffic: TrafficStats;
  endpoint: string | null;
  online: boolean;
  expiresAt: number | null;
  status: PeerStatus;
  protocol: Protocol;
}

export interface ClientRecord {
  username: string;
  peers: ClientPeer[];
}
