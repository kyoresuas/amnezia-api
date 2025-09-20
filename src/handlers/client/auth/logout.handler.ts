import { di } from "@/config/DIContainer";
import { AuthService } from "@/services/auth";
import { LogoutType } from "@/schemas/client";
import { AppFastifyHandler } from "@/types/shared";

export const logoutHandler: AppFastifyHandler<LogoutType> = async (
  req,
  reply
) => {
  const authService = di.container.resolve<AuthService>(AuthService.key);

  await authService.destroySession({ sessionId: req.session!.id });

  reply.code(200).send({
    message: req.i18n.t("swagger.messages.LOGGED_OUT"),
  });
};
