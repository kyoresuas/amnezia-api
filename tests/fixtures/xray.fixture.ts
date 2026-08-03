import { XrayServerConfig } from "@/types/xray";

/**
 * Создать фикстуру конфигурации сервера Xray
 */
export const createXrayServerConfigFixture = (): XrayServerConfig => ({
  inbounds: [
    {
      settings: {
        clients: [{ id: "active-id", username: "active" }],
        clientsDisabled: [{ id: "disabled-id", username: "disabled" }],
      },
    },
  ],
});
