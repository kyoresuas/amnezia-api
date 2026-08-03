import type { Protocol } from "@/types/shared";
import type { IProtocolService } from "@/types/clients";
import type { AmneziaWgService } from "@/services/amneziaWg";
import type { AmneziaWgConnection } from "@/helpers/amneziaWgConnection";
import type { AmneziaWg2Connection } from "@/helpers/amneziaWg2Connection";
import type { ClientTableEntry, IAmneziaConnection } from "@/types/amnezia";

export type AmneziaConnectionMockOptions = {
  wgConfig?: string;
  wgDump?: string;
  clientsTable?: ClientTableEntry[];
  files?: Record<string, string>;
};

export type AmneziaServiceSubject = IProtocolService &
  Pick<AmneziaWgService, "exportBackup" | "importBackup">;

export type ProtocolFixture = {
  name: string;
  protocolName: string;
  protocol: Protocol;
  container: string;
  createService(connection: IAmneziaConnection): AmneziaServiceSubject;
};

export type AmneziaConnection = AmneziaWgConnection | AmneziaWg2Connection;

export type AmneziaConnectionFixture = {
  name: string;
  clientsTablePath: string;
  createConnection(): AmneziaConnection;
};
