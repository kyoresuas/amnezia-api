import { GetClientQrType } from "@/schemas";
import { AppFastifyHandler } from "@/types/shared";
import { generateConfigQrSeries } from "@/helpers/amneziaQr";

export const getClientQrHandler: AppFastifyHandler<GetClientQrType> = async (
  req,
  reply,
) => {
  const { config } = req.body;

  const items = await generateConfigQrSeries(config);

  reply.code(200).send({
    total: items.length,
    items,
  });
};
