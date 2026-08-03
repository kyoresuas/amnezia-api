import { Protocol } from "@/types/shared";
import { PeerStatus, ClientPeer, ClientRecord } from "@/types/clients";

type ClientPeerOptions = Pick<ClientPeer, "id" | "protocol"> &
  Partial<Omit<ClientPeer, "id" | "protocol">>;

type ClientRecordOptions = {
  username: string;
  protocol: Protocol;
  clientId?: string;
  peers?: ClientPeer[];
};

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
