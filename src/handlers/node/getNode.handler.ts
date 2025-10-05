import { GetNodeType } from "@/schemas";
import { di } from "@/config/DIContainer";
import appConfig from "@/constants/appConfig";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";

export const getNodeHandler: AppFastifyHandler<GetNodeType> = async (
  req,
  reply
) => {
  const amnezia = di.container.resolve<AmneziaService>(AmneziaService.key);

  const users = await amnezia.getUsers();

  const status = {
    id: appConfig.NODE_ID || "",
    region: appConfig.NODE_REGION || "",
    weight: appConfig.NODE_WEIGHT || 0,
    maxPeers: appConfig.NODE_MAX_PEERS || 0,
    interface: appConfig.AMNEZIA_INTERFACE || "",
    totalPeers: users.reduce((acc, user) => acc + user.devices.length, 0),
  };

  reply.code(200).send(status);
};
