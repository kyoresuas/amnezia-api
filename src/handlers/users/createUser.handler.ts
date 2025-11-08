import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { CreateUserType } from "@/schemas";
import { UsersService } from "@/services/users";
import { AppFastifyHandler, Protocol } from "@/types/shared";

export const createUserHandler: AppFastifyHandler<CreateUserType> = async (
  req,
  reply
) => {
  const { clientName, expiresAt, protocol = Protocol.AMNEZIAWG } = req.body;

  const usersService = di.container.resolve<UsersService>(UsersService.key);

  const {
    id,
    config,
    protocol: createdProtocol,
  } = await usersService.createUser({
    clientName,
    expiresAt: expiresAt ?? null,
    protocol,
  });

  reply.code(200).send({
    message: i18next.t("swagger.messages.SAVED"),
    client: {
      id,
      config,
      protocol: createdProtocol,
    },
  });
};
