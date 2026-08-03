import type { Protocol } from "@/types/shared";
import type { ClientPeer } from "@/types/clients";
import type { ClientsService } from "@/services/clients";

export type ClientPeerOptions = Pick<ClientPeer, "id" | "protocol"> &
  Partial<Omit<ClientPeer, "id" | "protocol">>;

export type ClientRecordOptions = {
  username: string;
  protocol: Protocol;
  clientId?: string;
  peers?: ClientPeer[];
};

export type ClientsServiceStub = Pick<
  ClientsService,
  "getClients" | "updateClient"
>;
