import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { RestartServerType } from "@/schemas";
import { ServerService } from "@/services/server";
import { AppFastifyHandler } from "@/types/shared";

export const restartServerHandler: AppFastifyHandler<
  RestartServerType
> = async (req, reply) => {
  const serverService = di.container.resolve<ServerService>(ServerService.key);

  await serverService.restartServer();

  reply.code(200).send({ message: i18next.t("services.server.RESTARTING") });
};
