import { di } from "@/config/DIContainer";
import { ExtendedUser } from "@/types/user";
import { primitive } from "@/utils/primitive";
import { UserService } from "@/services/user";
import { GetUserType } from "@/schemas/admin";
import { AppFastifyHandler } from "@/types/shared";

export const getUserHandler: AppFastifyHandler<GetUserType> = async (
  req,
  reply
) => {
  const userService = di.container.resolve<UserService>(UserService.key);

  const user = await userService.getUser<ExtendedUser>({
    userId: req.params.userId,
    extended: true,
  });

  reply.code(200).send(primitive(user));
};
