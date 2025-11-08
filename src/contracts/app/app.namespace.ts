export const AppContract = {
  // Константы для AmneziaWG
  Amnezia: {
    // Имя Docker-контейнера с AmneziaWG
    DOCKER_CONTAINER: "amnezia-awg",

    // Имя интерфейса AmneziaWG
    INTERFACE: "wg0",

    // Пути к файлам внутри контейнера
    PATHS: {
      CLIENTS_TABLE: "/opt/amnezia/awg/clientsTable",
      WG_CONF: "/opt/amnezia/awg/wg0.conf",
      SERVER_PUBLIC_KEY: "/opt/amnezia/awg/wireguard_server_public_key.key",
      WG_PSK: "/opt/amnezia/awg/wireguard_psk.key",
    } as const,

    // Значения по умолчанию для AmneziaWG
    DEFAULTS: {
      MTU: "1376",
      KEEPALIVE: "25",
      TRANSPORT: "udp",
    } as const,
  },

  // Константы для Xray
  Xray: {
    // Имя Docker-контейнера с Xray
    DOCKER_CONTAINER: "amnezia-xray",

    // Пути к файлам внутри контейнера
    PATHS: {
      CONFIG_DIR: "/opt/amnezia/xray",
      SERVER_CONFIG: "/opt/amnezia/xray/server.json",
      UUID: "/opt/amnezia/xray/xray_uuid.key",
      PUBLIC_KEY: "/opt/amnezia/xray/xray_public.key",
      PRIVATE_KEY: "/opt/amnezia/xray/xray_private.key",
      SHORT_ID: "/opt/amnezia/xray/xray_short_id.key",
    } as const,

    // Значения по умолчанию для Xray
    DEFAULTS: {
      PORT: "443",
      SITE: "max.ru",
    } as const,
  },
} as const;
