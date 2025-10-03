import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { DeleteUserType } from "@/schemas";
import { UserService } from "@/services/user";
import { AppFastifyHandler } from "@/types/shared";

export const deleteUserHandler: AppFastifyHandler<DeleteUserType> = async (
  req,
  reply
) => {
  const { clientId } = req.body;

  const userService = di.container.resolve<UserService>(UserService.key);

  const ok = await userService.deleteUser(clientId);

  if (!ok) {
    reply.code(404).send({ message: i18next.t("swagger.codes.404") });
    return;
  }

  reply.code(200).send({ message: i18next.t("swagger.messages.DELETED") });
};
