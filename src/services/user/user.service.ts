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
    return await this.amneziaService.getUsers();
  }

  /**
   * Создать нового пользователя
   */
  async createUser(clientName: string): Promise<{
    clientId: string;
    clientPrivateKey: string;
    assignedIp: string;
    clientConfig: string;
  }> {
    return await this.amneziaService.createClient(clientName);
  }

  /**
   * Удалить пользователя
   */
  async deleteUser(clientId: string): Promise<boolean> {
    return this.amneziaService.deleteClient(clientId);
  }
}
