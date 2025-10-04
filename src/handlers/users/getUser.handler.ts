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
  const { clientId: rawClientId } = req.params;

  // Поддержка base64url
  const clientId = (() => {
    if (/[-_]/.test(rawClientId) && !/[+/]/.test(rawClientId)) {
      let base64 = rawClientId.replace(/-/g, "+").replace(/_/g, "/");
      const padding = base64.length % 4;
      if (padding) base64 += "=".repeat(4 - padding);
      return base64;
    }
    return rawClientId;
  })();

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
