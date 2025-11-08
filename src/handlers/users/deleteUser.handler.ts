import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { DeleteUserType } from "@/schemas";
import appConfig from "@/constants/appConfig";
import { AmneziaService } from "@/services/amnezia";
import { AppFastifyHandler, Protocol } from "@/types/shared";

export const deleteUserHandler: AppFastifyHandler<DeleteUserType> = async (
  req,
  reply
) => {
  const { clientId, protocol = Protocol.AMNEZIAWG } = req.body;

  const enabledProtocols = appConfig.PROTOCOLS_ENABLED ?? [Protocol.AMNEZIAWG];

  if (!enabledProtocols.includes(protocol) || protocol !== Protocol.AMNEZIAWG) {
    reply.code(400).send({ message: i18next.t("swagger.codes.400") });
    return;
  }

  const amneziaService = di.container.resolve<AmneziaService>(
    AmneziaService.key
  );

  const ok = await amneziaService.deleteClient(clientId);

  if (!ok) {
    reply.code(404).send({ message: i18next.t("swagger.codes.404") });
    return;
  }

  reply.code(200).send({ message: i18next.t("swagger.messages.DELETED") });
};
