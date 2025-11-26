import { di } from "@/config/DIContainer";
import { ImportServerBackupType } from "@/schemas";
import { ServerService } from "@/services/server";
import { AppFastifyHandler } from "@/types/shared";

export const importServerBackupHandler: AppFastifyHandler<
  ImportServerBackupType
> = async (req, reply) => {
  const serverService = di.container.resolve<ServerService>(ServerService.key);

  await serverService.importBackup(req.body);

  const status = await serverService.getServerStatus();

  reply.code(200).send(status);
};
