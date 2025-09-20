import { di } from "@/config/DIContainer";
import { AuthService } from "@/services/auth";
import { RegisterType } from "@/schemas/client";
import { AppFastifyHandler } from "@/types/shared";

export const registerHandler: AppFastifyHandler<RegisterType> = async (
  req,
  reply
) => {
  const authService = di.container.resolve<AuthService>(AuthService.key);

  const userId = await authService.register(req.body);
  const token = await authService.newSession({ userId });

  reply.code(201).send({
    message: req.i18n.t("swagger.messages.REGISTERED"),
    token,
  });
};
