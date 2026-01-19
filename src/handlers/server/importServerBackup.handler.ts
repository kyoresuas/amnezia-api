import { di } from "@/config/DIContainer";
import { ServerService } from "@/services/server";
import { AppFastifyHandler } from "@/types/shared";
import { ImportServerBackupType } from "@/schemas";

export const importServerBackupHandler: AppFastifyHandler<
  ImportServerBackupType
> = async (req, reply) => {
  const serverService = di.container.resolve<ServerService>(ServerService.key);

  await serverService.importBackup(req.body);

  const status = await serverService.getServerStatus();

  reply.code(200).send(status);
};
