import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { CreateUserType } from "@/schemas";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";

export const createUserHandler: AppFastifyHandler<CreateUserType> = async (
  req,
  reply
) => {
  const { clientName } = req.body;

  const amneziaService = di.container.resolve<AmneziaService>(
    AmneziaService.key
  );

  // Проверка на дубликат имени
  const existing = await amneziaService.getUsers();

  if (existing.some((u) => u.username === clientName)) {
    reply.code(409).send({ message: i18next.t("swagger.codes.409") });
    return;
  }

  const { id, config } = await amneziaService.createClient(clientName);

  reply.code(200).send({
    message: i18next.t("swagger.messages.SAVED"),
    client: {
      id,
      config,
    },
  });
};
