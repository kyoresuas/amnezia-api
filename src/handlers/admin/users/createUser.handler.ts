import { di } from "@/config/DIContainer";
import { UserService } from "@/services/user";
import { CreateUserType } from "@/schemas/admin";
import { AppFastifyHandler } from "@/types/shared";

export const createUserHandler: AppFastifyHandler<CreateUserType> = async (
  req,
  reply
) => {
  const { clientId, clientName } = req.body;

  const userService = di.container.resolve<UserService>(UserService.key);

  await userService.appendClient(clientId, clientName);

  reply.code(200).send({ message: "swagger.messages.SAVED" });
};
