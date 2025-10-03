import { AmneziaUser } from "@/types/amnezia";
import { AmneziaService } from "@/services/amnezia";

/**
 * Сервис получения пользователей AmneziaVPN
 */
export class UserService {
  static key = "userService";

  constructor(private amneziaService: AmneziaService) {}

  /**
   * Получить список пользователей из wg dump
   */
  async getUsers(): Promise<AmneziaUser[]> {
    const users = await this.amneziaService.getUsers();

    return users;
  }

  /**
   * Создать нового клиента
   */
  async createClient(clientName: string): Promise<{
    clientId: string;
    clientPrivateKey: string;
    assignedIp: string;
    clientConfig: string;
  }> {
    const { clientId, clientPrivateKey, assignedIp, clientConfig } =
      await this.amneziaService.createClient(clientName);

    return { clientId, clientPrivateKey, assignedIp, clientConfig };
  }

  /**
   * Удалить клиента
   */
  async revokeClient(clientId: string): Promise<void> {
    await this.amneziaService.revokeClient(clientId);
  }
}
