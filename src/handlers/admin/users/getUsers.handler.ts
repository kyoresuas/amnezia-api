import { di } from "@/config/DIContainer";
import { primitive } from "@/utils/primitive";
import { UserService } from "@/services/user";
import { GetUsersType } from "@/schemas/admin";
import { AppFastifyHandler } from "@/types/shared";

export const getUsersHandler: AppFastifyHandler<GetUsersType> = async (
  req,
  reply
) => {
  const userService = di.container.resolve<UserService>(UserService.key);

  const { totalSize, users } = await userService.getUsers({
    pagination: req.query,
  });

  reply.code(200).send({ totalSize, items: primitive(users) });
};
