import type { CommandResult } from "@/types/shared";

export type RunOptions = {
  timeout?: number;
  maxBufferBytes?: number;
};

export type ClientTableEntry = {
  clientId?: string;
  publicKey?: string;
  userData?: {
    clientName?: string;
    creationDate?: string;
    expiresAt?: number;
    allowedIp?: string;
  };
};

export interface IAmneziaConnection {
  run(cmd: string, options?: RunOptions): Promise<CommandResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readWgConfig(): Promise<string>;
  writeWgConfig(content: string): Promise<void>;
  getWgDump(): Promise<string>;
  syncWgConfig(): Promise<void>;
  getServerPublicKey(): Promise<string>;
  readClientsTable(): Promise<ClientTableEntry[]>;
  writeClientsTable(table: ClientTableEntry[]): Promise<void>;
}
