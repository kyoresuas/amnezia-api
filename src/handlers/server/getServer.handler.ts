import { di } from "@/config/DIContainer";
import { GetServerType } from "@/schemas";
import appConfig from "@/constants/appConfig";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";

export const getServerHandler: AppFastifyHandler<GetServerType> = async (
  req,
  reply
) => {
  const amnezia = di.container.resolve<AmneziaService>(AmneziaService.key);

  const users = await amnezia.getUsers();

  const status = {
    id: appConfig.SERVER_ID || "",
    region: appConfig.SERVER_REGION || "",
    weight: appConfig.SERVER_WEIGHT || 0,
    maxPeers: appConfig.SERVER_MAX_PEERS || 0,
    totalPeers: users.reduce((acc, user) => acc + user.devices.length, 0),
  };

  reply.code(200).send(status);
};
