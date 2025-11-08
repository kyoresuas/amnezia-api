import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { CreateUserType } from "@/schemas";
import appConfig from "@/constants/appConfig";
import { AmneziaService } from "@/services/amnezia";
import { AppFastifyHandler, Protocol } from "@/types/shared";

export const createUserHandler: AppFastifyHandler<CreateUserType> = async (
  req,
  reply
) => {
  const { clientName, expiresAt, protocol = Protocol.AMNEZIAWG } = req.body;

  const enabledProtocols = appConfig.PROTOCOLS_ENABLED ?? [Protocol.AMNEZIAWG];

  if (!enabledProtocols.includes(protocol)) {
    reply.code(400).send({ message: i18next.t("swagger.codes.400") });
    return;
  }

  if (protocol !== Protocol.AMNEZIAWG) {
    reply.code(400).send({ message: i18next.t("swagger.codes.400") });
    return;
  }

  const amneziaService = di.container.resolve<AmneziaService>(
    AmneziaService.key
  );

  // Проверка на дубликат имени
  const existing = await amneziaService.getUsers();

  if (existing.some((u) => u.username === clientName)) {
    reply.code(409).send({ message: i18next.t("swagger.codes.409") });
    return;
  }

  const {
    id,
    config,
    protocol: createdProtocol,
  } = await amneziaService.createClient(clientName, {
    expiresAt: expiresAt ?? null,
  });

  reply.code(200).send({
    message: i18next.t("swagger.messages.SAVED"),
    client: {
      id,
      config,
      protocol: createdProtocol,
    },
  });
};
