import type { RunOptions } from "@/types/amnezia";
import type { CommandResult } from "@/types/shared";

export interface IXrayConnection {
  run(cmd: string, options?: RunOptions): Promise<CommandResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readServerConfig(): Promise<string>;
  writeServerConfig(content: string): Promise<void>;
  restartContainer(): Promise<void>;
}

export type XrayClientEntry = {
  id?: string;
  flow?: string;
  username?: string;
  expiresAt?: number | null;
};

export type XrayInbound = {
  port?: number;
  settings?: {
    clients?: XrayClientEntry[];
    clientsDisabled?: XrayClientEntry[];
  };
  streamSettings?: {
    realitySettings?: {
      serverName?: string;
      serverNames?: string[];
    };
  };
};

export type XrayServerConfig = {
  inbounds?: XrayInbound[];
};
