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
