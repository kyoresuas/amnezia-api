import { di } from "@/config/DIContainer";
import { GetServerBackupType } from "@/schemas";
import { ServerService } from "@/services/server";
import { AppFastifyHandler } from "@/types/shared";

export const getServerBackupHandler: AppFastifyHandler<
  GetServerBackupType
> = async (req, reply) => {
  const serverService = di.container.resolve<ServerService>(ServerService.key);
  const payload = await serverService.exportBackup();

  reply.code(200).send(payload);
};
