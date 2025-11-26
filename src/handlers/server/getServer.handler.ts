import { di } from "@/config/DIContainer";
import { GetServerType } from "@/schemas";
import { ServerService } from "@/services/server";
import { AppFastifyHandler } from "@/types/shared";

export const getServerHandler: AppFastifyHandler<GetServerType> = async (
  req,
  reply
) => {
  const serverService = di.container.resolve<ServerService>(ServerService.key);
  const status = await serverService.getServerStatus();

  reply.code(200).send(status);
};
