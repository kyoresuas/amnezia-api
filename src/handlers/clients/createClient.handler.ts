import i18next from "i18next";
import { di } from "@/config/DIContainer";
import { CreateClientType } from "@/schemas";
import { ClientsService } from "@/services/clients";
import { AppFastifyHandler, Protocol } from "@/types/shared";

export const createClientHandler: AppFastifyHandler<CreateClientType> = async (
  req,
  reply
) => {
  const { clientName, expiresAt, protocol = Protocol.AMNEZIAWG } = req.body;

  const clientsService = di.container.resolve<ClientsService>(
    ClientsService.key
  );

  const {
    id,
    config,
    protocol: createdProtocol,
  } = await clientsService.createClient({
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
