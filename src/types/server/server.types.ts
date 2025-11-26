import { Protocol } from "@/types/shared";
import { ClientTableEntry } from "@/types/amnezia";

export type AmneziaBackupData = {
  wgConfig: string;
  presharedKey: string;
  serverPublicKey: string;
  clients: ClientTableEntry[];
};

export type XrayBackupData = {
  serverConfig: string;
  uuid: string;
  publicKey: string;
  privateKey: string;
  shortId: string;
};

export type ServerBackupPayload = {
  generatedAt: string;
  serverId: string | null;
  protocols: Protocol[];
  amnezia?: AmneziaBackupData;
  xray?: XrayBackupData;
};
