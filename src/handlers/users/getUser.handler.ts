import i18next from "i18next";
import { GetUserType } from "@/schemas";
import { di } from "@/config/DIContainer";
import { primitive } from "@/utils/primitive";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";

export const getUserHandler: AppFastifyHandler<GetUserType> = async (
  req,
  reply
) => {
  const { username } = req.params;

  const amneziaService = di.container.resolve<AmneziaService>(
    AmneziaService.key
  );

  // Найти клиента по имени
  const users = await amneziaService.getUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    reply.code(404).send({ message: i18next.t("swagger.codes.404") });
    return;
  }

  // Сгенерировать конфиг vpn://
  const config = await amneziaService.getClientConfig(user.devices[0]?.id);

  reply.code(200).send({ client: primitive(user), config });
};
