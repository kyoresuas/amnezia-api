import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { DeleteUserType } from "@/schemas";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";

export const deleteUserHandler: AppFastifyHandler<DeleteUserType> = async (
  req,
  reply
) => {
  const { clientId } = req.body;

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
