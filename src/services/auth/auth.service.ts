import { hash } from "@/utils/hash";
import { Repository } from "typeorm";
import { compareSync } from "bcrypt";
import { APIError } from "@/utils/APIError";
import { AppContract } from "@/contracts/app";
import appConfig from "@/constants/appConfig";
import { Session, User } from "@/entities/user";
import { JwtPayload, sign, verify } from "jsonwebtoken";

/**
 * Сервис для авторизации пользователей
 */
export class AuthService {
  static key = "authService";

  constructor(
    private userRepository: Repository<User>,
    private sessionRepository: Repository<Session>
  ) {}

  /**
   * Получить подписанный JWT
   */
  signJWT({ sessionId }: { sessionId: string }): string {
    return sign({ sessionId }, appConfig.JWT_SECRET_KEY!, {
      algorithm: "HS256",
      expiresIn: "365d",
    });
  }

  /**
   * Раскодировать JWT
   */
  verifyJWT({ token }: { token: string }): string | JwtPayload {
    return verify(token, appConfig.JWT_SECRET_KEY!);
  }

  /**
   * Создать новую сессию и получить JWT
   */
  async newSession({ userId }: { userId: string }): Promise<string> {
    const session = this.sessionRepository.create({
      userId,
    });

    await this.sessionRepository.insert(session);

    return this.signJWT({ sessionId: session.id });
  }

  /**
   * Войти в сессию
   */
  async enterSession({
    sessionId,
    extended = false,
  }: {
    sessionId: string;
    extended?: boolean;
  }): Promise<Session> {
    // Получить сессию, обновив последнее время визита
    const firstResult = await this.sessionRepository
      .createQueryBuilder()
      .update()
      .set({ lastVisitAt: new Date() })
      .where({ id: sessionId })
      .returning("*")
      .execute();

    if (!firstResult.affected) throw new APIError(404);

    const session: Session = firstResult.raw[0];

    // Получить пользователя сессии, если нужно
    if (extended) {
      const user = await this.userRepository.findOne({
        where: { id: session.userId },
      });

      if (user) {
        session.user = user;
      }
    }

    return session;
  }

  /**
   * Уничтожить сессию по ID
   */
  async destroySession({ sessionId }: { sessionId: string }): Promise<void> {
    await this.sessionRepository.delete({ id: sessionId });
  }

  /**
   * Регистрация нового пользователя
   */
  async register({
    name,
    password,
  }: {
    name: string;
    password: string;
  }): Promise<string> {
    try {
      const user = this.userRepository.create({
        name,
        password: hash(password),
      });

      await this.userRepository.insert(user);

      return user.id;
    } catch (err) {
      if ((err as Error).message.includes("UQ_065d4d8f3b5adb4a08841eae3c8")) {
        throw new APIError(400, { msg: "services.auth.NOT_UNIQUE_NAME" });
      }

      throw err;
    }
  }

  /**
   * Аутентификация пользователя в системе
   */
  async login({
    name,
    password,
  }: {
    name: string;
    password: string;
  }): Promise<string> {
    const user: { id: string; password: string } | null =
      await this.userRepository
        .createQueryBuilder("u")
        .select(["u.id", "u.password"])
        .where("LOWER(u.name) = :name", { name: name.toLowerCase() })
        .getOne();

    if (!user || !compareSync(password, user.password)) {
      throw new APIError(400, { msg: "services.auth.AUTH_FAILED" });
    }

    return user.id;
  }

  /**
   * Очистить неактивные сессии
   */
  async clearInactiveSessions(): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where("lastVisitAt < :timestamp", {
        timestamp: new Date(Date.now() - AppContract.INACTIVE_SESSION_LIFETIME),
      })
      .execute();
  }
}
