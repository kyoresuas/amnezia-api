export type XrayClientEntry = {
  id?: string;
  flow?: string;
  username?: string;
};

export type XrayInbound = {
  port?: number;
  settings?: {
    clients?: XrayClientEntry[];
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
