export const AppContract = {
  // Константы для AmneziaWG
  AmneziaWG: {
    // Имя Docker-контейнера
    DOCKER_CONTAINER: "amnezia-awg",

    // Имя интерфейса
    INTERFACE: "wg0",

    // Пути к файлам внутри контейнера
    PATHS: {
      CLIENTS_TABLE: "/opt/amnezia/awg/clientsTable",
      WG_CONF: "/opt/amnezia/awg/wg0.conf",
      SERVER_PUBLIC_KEY: "/opt/amnezia/awg/wireguard_server_public_key.key",
      WG_PSK: "/opt/amnezia/awg/wireguard_psk.key",
    } as const,

    // Значения по умолчанию
    DEFAULTS: {
      MTU: "1376",
      KEEPALIVE: "25",
      TRANSPORT: "udp",
    } as const,
  },

  // Константы для AmneziaWG 2.0
  AmneziaWG2: {
    // Имя Docker-контейнера
    DOCKER_CONTAINER: "amnezia-awg2",

    // Имя интерфейса
    INTERFACE: "awg0",

    // Пути к файлам внутри контейнера
    PATHS: {
      CLIENTS_TABLE: "/opt/amnezia/awg/clientsTable",
      WG_CONF: "/opt/amnezia/awg/awg0.conf",
      SERVER_PUBLIC_KEY: "/opt/amnezia/awg/wireguard_server_public_key.key",
      WG_PSK: "/opt/amnezia/awg/wireguard_psk.key",
    } as const,

    // Значения по умолчанию
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
      API_PORT: "10085",
    } as const,
  },

  // DNS-серверы по умолчанию для клиентских конфигов
  DNS: {
    PRIMARY: "1.1.1.1",
    SECONDARY: "1.0.0.1",
  } as const,

  // Ограничение частоты запросов
  RATE_LIMIT: {
    // Максимум запросов с одного IP за окно
    MAX: 100,

    // Длительность окна в миллисекундах
    WINDOW_MS: 60000,
  } as const,

  // Константы для генерации QR
  QR: {
    // Магическое число для чанков QR
    MAGIC_CODE: 1984,

    // Максимальный размер полезных данных в одном чанке (байты)
    CHUNK_SIZE: 850,

    // Уровень коррекции ошибок QR
    ERROR_CORRECTION_LEVEL: "L",
  } as const,
} as const;
