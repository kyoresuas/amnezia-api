import { GetUsersType } from "@/schemas";
import { di } from "@/config/DIContainer";
import { primitive } from "@/utils/primitive";
import { UsersService } from "@/services/users";
import { AppFastifyHandler } from "@/types/shared";

export const getUsersHandler: AppFastifyHandler<GetUsersType> = async (
  req,
  reply
) => {
  const usersService = di.container.resolve<UsersService>(UsersService.key);

  const users = await usersService.getUsers();

  reply.code(200).send({ total: users.length, items: primitive(users) });
};
