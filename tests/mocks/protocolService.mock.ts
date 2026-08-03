import { vi } from "vitest";
import { Protocol } from "@/types/shared";
import { createClientRecord } from "../factories";
import { ClientRecord, IProtocolService } from "@/types/clients";

/**
 * Создать мок сервиса протокола
 */
export const createProtocolServiceMock = (
  protocol: Protocol,
  initialClients: ClientRecord[] = [],
) => {
  const clients = [...initialClients];

  // Создать мок функции получения клиентов
  const getClients = vi.fn<IProtocolService["getClients"]>(async () => clients);

  // Создать мок функции создания клиента
  const createClient = vi.fn<IProtocolService["createClient"]>(
    async (clientName) => {
      const id = `${protocol}-${clients.length + 1}`;
      clients.push(
        createClientRecord({ username: clientName, clientId: id, protocol }),
      );

      return { id, config: "vpn://test", protocol };
    },
  );

  // Создать мок функции обновления клиента
  const updateClient = vi.fn<IProtocolService["updateClient"]>(
    async () => true,
  );

  // Создать мок функции удаления клиента
  const deleteClient = vi.fn<IProtocolService["deleteClient"]>(
    async () => true,
  );

  // Создать мок функции отключения просроченных клиентов
  const disableExpiredClients = vi.fn<
    IProtocolService["disableExpiredClients"]
  >(async () => 0);

  // Создать мок сервиса протокола
  const service: IProtocolService = {
    getClients,
    createClient,
    updateClient,
    deleteClient,
    disableExpiredClients,
  };

  return {
    service,
    state: { clients },
    spies: {
      getClients,
      createClient,
      updateClient,
      deleteClient,
      disableExpiredClients,
    },
  };
};
