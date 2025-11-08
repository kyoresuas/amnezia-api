import { Protocol } from "@/types/shared";
import { UserRecord } from "@/types/users";
import { APIError } from "@/utils/APIError";
import { ServerErrorCode } from "@/types/shared";

/**
 * Сервис для работы с Xray
 */
export class XrayService {
  static key = "xrayService";

  /**
   * Получить список пользователей
   */
  async getUsers(): Promise<UserRecord[]> {
    return [];
  }

  /**
   * Создать пользователя
   */
  async createClient(
    clientName: string,
    options?: { expiresAt?: number | null }
  ): Promise<{
    id: string;
    config: string;
    protocol: Protocol;
  }> {
    void clientName;
    void options;

    throw new APIError(ServerErrorCode.NOT_IMPLEMENTED);
  }

  /**
   * Удалить пользователя
   */
  async deleteClient(clientId: string): Promise<boolean> {
    void clientId;
    throw new APIError(ServerErrorCode.NOT_IMPLEMENTED);
  }
}
