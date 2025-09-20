import { di } from "@/config/DIContainer";
import { primitive } from "@/utils/primitive";
import { UserService } from "@/services/user";
import { EditUserType } from "@/schemas/admin";
import { AppFastifyHandler } from "@/types/shared";

export const editUserHandler: AppFastifyHandler<EditUserType> = async (
  req,
  reply
) => {
  const userService = di.container.resolve<UserService>(UserService.key);

  const updatedUser = await userService.editUser({
    userId: req.params.userId,
    ...req.body,
  });

  reply.code(200).send({
    message: req.i18n.t("swagger.messages.SAVED"),
    user: primitive(updatedUser),
  });
};
