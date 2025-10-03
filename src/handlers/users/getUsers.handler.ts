import { GetUsersType } from "@/schemas";
import { di } from "@/config/DIContainer";
import { primitive } from "@/utils/primitive";
import { AppFastifyHandler } from "@/types/shared";
import { AmneziaService } from "@/services/amnezia";

export const getUsersHandler: AppFastifyHandler<GetUsersType> = async (
  req,
  reply
) => {
  const amneziaService = di.container.resolve<AmneziaService>(
    AmneziaService.key
  );

  const users = await amneziaService.getUsers();

  reply.code(200).send({ total: users.length, items: primitive(users) });
};
