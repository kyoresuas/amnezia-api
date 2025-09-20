import { di } from "@/config/DIContainer";
import { LoginType } from "@/schemas/client";
import { AuthService } from "@/services/auth";
import { AppFastifyHandler } from "@/types/shared";

export const loginHandler: AppFastifyHandler<LoginType> = async (
  req,
  reply
) => {
  const authService = di.container.resolve<AuthService>(AuthService.key);

  const userId = await authService.login(req.body);
  const token = await authService.newSession({ userId });

  reply.code(200).send({
    message: req.i18n.t("swagger.messages.LOGGED"),
    token,
  });
};
