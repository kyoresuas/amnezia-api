import { di } from "@/config/DIContainer";
import appConfig from "@/constants/appConfig";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";
import { GetNodeStatusType } from "@/schemas/admin/node";

export const getNodeStatusHandler: AppFastifyHandler<
  GetNodeStatusType
> = async (req, reply) => {
  const amnezia = di.container.resolve<AmneziaService>(AmneziaService.key);

  const dump = await amnezia.getUsers();

  const status = {
    id: appConfig.NODE_ID || "",
    region: appConfig.NODE_REGION,
    weight: appConfig.NODE_WEIGHT || 0,
    maxPeers: appConfig.NODE_MAX_PEERS || 0,
    interface: appConfig.AMNEZIA_INTERFACE || "",
    peers: dump.reduce((acc, u) => acc + u.devices.length, 0),
  };

  reply.code(200).send(status);
};
