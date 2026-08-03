import { XrayServerConfig } from "@/types/xray";
import type { XrayServerConfigFixtureOptions } from "../types";

/**
 * Создать фикстуру конфигурации сервера Xray
 */
export const createXrayServerConfigFixture = ({
  clients = [{ id: "active-id", username: "active" }],
  clientsDisabled = [{ id: "disabled-id", username: "disabled" }],
  port = 443,
  serverNames = ["example.com"],
}: XrayServerConfigFixtureOptions = {}): XrayServerConfig => ({
  inbounds: [
    {
      port,
      settings: {
        clients,
        clientsDisabled,
      },
      streamSettings: {
        realitySettings: {
          serverNames,
        },
      },
    },
  ],
});
