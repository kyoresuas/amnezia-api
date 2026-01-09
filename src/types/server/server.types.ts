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

export type ServerLoadDiskStats = {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
};

export type ServerLoadNetworkStats = {
  rxBytes: number;
  txBytes: number;
};

export type ServerLoadDockerContainerStats = {
  name: string;
  cpuPercent: number | null;
  memUsageBytes: number | null;
  memLimitBytes: number | null;
  netRxBytes: number | null;
  netTxBytes: number | null;
  pids: number | null;
};

export type ServerLoadDockerStats = {
  containers: ServerLoadDockerContainerStats[];
};

export type ServerLoadPayload = {
  timestamp: string;
  uptimeSec: number;
  loadavg: [number, number, number];
  cpu: { cores: number };
  memory: { totalBytes: number; freeBytes: number; usedBytes: number };
  disk: ServerLoadDiskStats | null;
  network: ServerLoadNetworkStats | null;
  docker: ServerLoadDockerStats | null;
};

export type ServerBackupPayload = {
  generatedAt: string;
  serverId: string | null;
  protocols: Protocol[];
  amnezia?: AmneziaBackupData;
  xray?: XrayBackupData;
};
