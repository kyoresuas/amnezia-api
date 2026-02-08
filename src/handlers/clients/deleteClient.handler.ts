import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { DeleteClientType } from "@/schemas";
import { ClientsService } from "@/services/clients";
import { AppFastifyHandler, Protocol } from "@/types/shared";

export const deleteClientHandler: AppFastifyHandler<DeleteClientType> = async (
  req,
  reply
) => {
  const { clientId, protocol = Protocol.AMNEZIAWG } = req.body;

  const clientsService = di.container.resolve<ClientsService>(
    ClientsService.key
  );

  await clientsService.deleteClient({ clientId, protocol });

  reply.code(200).send({ message: i18next.t("swagger.messages.DELETED") });
};
