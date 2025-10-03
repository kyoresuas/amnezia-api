import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { CreateUserType } from "@/schemas";
import { UserService } from "@/services/user";
import { AppFastifyHandler } from "@/types/shared";

export const createUserHandler: AppFastifyHandler<CreateUserType> = async (
  req,
  reply
) => {
  const { clientName } = req.body;

  const userService = di.container.resolve<UserService>(UserService.key);

  // Проверка на дубликат имени
  const existing = await userService.getUsers();

  if (existing.some((u) => u.username === clientName)) {
    reply.code(409).send({ message: i18next.t("swagger.codes.409") });
    return;
  }

  const { clientId, clientPrivateKey, assignedIp, clientConfig } =
    await userService.createUser(clientName);

  reply.code(200).send({
    message: i18next.t("swagger.messages.SAVED"),
    clientId,
    clientPrivateKey,
    assignedIp,
    clientConfig,
  });
};
