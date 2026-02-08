import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { UpdateClientType } from "@/schemas";
import { AppFastifyHandler } from "@/types/shared";
import { ClientsService } from "@/services/clients";

export const updateClientHandler: AppFastifyHandler<UpdateClientType> = async (
  req,
  reply
) => {
  const { clientId, expiresAt, protocol, status } = req.body;

  const clientsService = di.container.resolve<ClientsService>(
    ClientsService.key
  );

  await clientsService.updateClient({
    clientId,
    protocol,
    expiresAt,
    status,
  });

  reply.code(200).send({ message: i18next.t("swagger.messages.SAVED") });
};
