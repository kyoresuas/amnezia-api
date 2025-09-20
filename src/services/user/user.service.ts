import { Repository } from "typeorm";
import { APIError } from "@/utils/APIError";
import { IPagination } from "@/types/shared";
import { User, UserRole } from "@/entities/user";
import { ExtendedUser, RegularUser } from "@/types/user";

/**
 * Сервис для управления пользователями
 */
export class UserService {
  static key = "userService";

  constructor(private userRepository: Repository<User>) {}

  private regularAttributes: (keyof User)[] = [
    "id",
    "name",
    "role",
    "lastVisitAt",
    "createdAt",
    "updatedAt",
  ];

  /**
   * Получить список пользователей
   */
  async getUsers({ pagination }: { pagination: IPagination }): Promise<{
    totalSize: number;
    users: RegularUser[];
  }> {
    const [users, totalSize] = await this.userRepository.findAndCount({
      skip: pagination.skip,
      take: pagination.limit,
      select: this.regularAttributes,
    });

    return {
      totalSize,
      users,
    };
  }

  /**
   * Получить пользователя
   */
  async getUser<UserType extends RegularUser | ExtendedUser = RegularUser>({
    userId,
    extended = false,
  }: {
    userId: string;
    extended?: boolean;
  }): Promise<UserType> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: extended
        ? Object.fromEntries([
            ...this.regularAttributes.map((attribute) => [attribute, true]),
            [
              "sessions",
              {
                id: true,
                lastVisitAt: true,
                createdAt: true,
                updatedAt: true,
              },
            ],
            [
              "tasks",
              {
                id: true,
                name: true,
                description: true,
                deadline: true,
                status: true,
                priority: true,
                createdAt: true,
                updatedAt: true,
              },
            ],
          ])
        : this.regularAttributes,
      relations: extended ? ["sessions", "tasks"] : [],
    });

    if (!user) throw new APIError(404);

    return user as RegularUser | ExtendedUser as UserType;
  }

  /**
   * Отредактировать пользователя
   */
  async editUser({
    userId,
    name,
    role,
  }: {
    userId: string;
    name?: string;
    role?: UserRole | null;
  }): Promise<RegularUser> {
    const result = await this.userRepository
      .createQueryBuilder()
      .update()
      .set({ name, role })
      .where({ id: userId })
      .returning(this.regularAttributes)
      .execute();

    if (!result.affected) throw new APIError(404);

    return result.raw[0];
  }

  /**
   * Получить топ пользователей по созданным задачам
   */
  async getUsersTop(): Promise<(RegularUser & Pick<User, "tasksCount">)[]> {
    return this.userRepository.find({
      select: [...this.regularAttributes, "tasksCount"],
      order: { tasksCount: "DESC" },
    });
  }
}
