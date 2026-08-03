import type { ClientPeerOptions, ClientRecordOptions } from "../types";
import { PeerStatus, ClientPeer, ClientRecord } from "@/types/clients";

/**
 * Создать клиентского пира
 */
export const createClientPeer = ({
  id,
  protocol,
  ...overrides
}: ClientPeerOptions): ClientPeer => ({
  id,
  protocol,
  name: null,
  status: PeerStatus.Active,
  allowedIps: [],
  lastHandshake: 0,
  traffic: { received: 0, sent: 0 },
  endpoint: null,
  online: false,
  expiresAt: null,
  ...overrides,
});

/**
 * Создать запись клиента
 */
export const createClientRecord = ({
  username,
  protocol,
  clientId = `${username}-id`,
  peers,
}: ClientRecordOptions): ClientRecord => ({
  username,
  peers: peers ?? [createClientPeer({ id: clientId, protocol })],
});
