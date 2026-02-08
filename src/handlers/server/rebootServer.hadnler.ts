import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { RebootServerType } from "@/schemas";
import { ServerService } from "@/services/server";
import { AppFastifyHandler } from "@/types/shared";

export const rebootServerHandler: AppFastifyHandler<RebootServerType> = async (
  req,
  reply
) => {
  const serverService = di.container.resolve<ServerService>(ServerService.key);

  await serverService.rebootServer();

  reply.code(200).send({ message: i18next.t("services.server.REBOOTING") });
};
