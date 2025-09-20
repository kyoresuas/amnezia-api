import { di } from "@/config/DIContainer";
import { UserService } from "@/services/user";
import { DeleteUserType } from "@/schemas/admin";
import { AppFastifyHandler } from "@/types/shared";

export const deleteUserHandler: AppFastifyHandler<DeleteUserType> = async (
  req,
  reply
) => {
  const { clientId } = req.body;

  const userService = di.container.resolve<UserService>(UserService.key);

  await userService.revokeClient(clientId);

  reply.code(200).send({ message: "swagger.messages.SAVED" });
};
