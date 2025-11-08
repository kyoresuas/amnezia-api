import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { DeleteUserType } from "@/schemas";
import { UsersService } from "@/services/users";
import { AppFastifyHandler, Protocol } from "@/types/shared";

export const deleteUserHandler: AppFastifyHandler<DeleteUserType> = async (
  req,
  reply
) => {
  const { clientId, protocol = Protocol.AMNEZIAWG } = req.body;

  const usersService = di.container.resolve<UsersService>(UsersService.key);

  await usersService.deleteUser({ clientId, protocol });

  reply.code(200).send({ message: i18next.t("swagger.messages.DELETED") });
};
