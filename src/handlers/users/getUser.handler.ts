import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { GetUserType } from "@/schemas";
import { primitive } from "@/utils/primitive";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";

export const getUserHandler: AppFastifyHandler<GetUserType> = async (
  req,
  reply
) => {
  const { clientId } = req.body;

  const amneziaService = di.container.resolve<AmneziaService>(
    AmneziaService.key
  );

  // Найти клиента
  const users = await amneziaService.getUsers();
  const user = users.find((u) => u.devices.some((d) => d.id === clientId));

  if (!user) {
    reply.code(404).send({ message: i18next.t("swagger.codes.404") });
    return;
  }

  // Сгенерировать конфиг vpn://
  const config = await amneziaService.getClientConfig(clientId);

  reply.code(200).send({ client: primitive(user), config });
};
