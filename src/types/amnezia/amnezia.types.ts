export type RunOptions = {
  timeout?: number;
  maxBufferBytes?: number;
};

export type ClientTableEntry = {
  clientId?: string;
  publicKey?: string;
  userData?: { clientName?: string; creationDate?: string; expiresAt?: number };
};
