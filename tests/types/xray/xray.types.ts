import type { XrayClientEntry } from "@/types/xray";

export type XrayServerConfigFixtureOptions = {
  clients?: XrayClientEntry[];
  clientsDisabled?: XrayClientEntry[];
  port?: number;
  serverNames?: string[];
};

export type XrayConnectionMockOptions = {
  files?: Record<string, string>;
  trafficStats?: unknown;
};
