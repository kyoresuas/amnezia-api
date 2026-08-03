import { di } from "@/config/DIContainer";
import { GetClientsType } from "@/schemas";
import { primitive } from "@/utils/primitive";
import { AppFastifyHandler } from "@/types/shared";
import { ClientsService } from "@/services/clients";

export const getClientsHandler: AppFastifyHandler<GetClientsType> = async (
  req,
  reply,
) => {
  const { skip = 0, limit = 100 } = req.query;

  const clientsService = di.container.resolve<ClientsService>(
    ClientsService.key,
  );

  const clients = await clientsService.getClients();
  const items = clients.slice(skip, skip + limit);

  reply.code(200).send({ total: clients.length, items: primitive(items) });
};
