import { di } from "@/config/DIContainer";
import { GetServerLoadType } from "@/schemas";
import { ServerService } from "@/services/server";
import { AppFastifyHandler } from "@/types/shared";

export const getServerLoadHandler: AppFastifyHandler<
  GetServerLoadType
> = async (req, reply) => {
  const serverService = di.container.resolve<ServerService>(ServerService.key);
  const load = await serverService.getServerLoad();

  reply.code(200).send(load);
};
