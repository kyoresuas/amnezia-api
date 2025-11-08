export namespace AppContract {
  // Имя Docker-контейнера с AmneziaWG
  export const AMNEZIA_DOCKER_CONTAINER = "amnezia-awg";

  // Имя интерфейса AmneziaWG
  export const AMNEZIA_INTERFACE = "wg0";

  // Путь к таблице клиентов внутри контейнер
  export const AMNEZIA_CLIENTS_TABLE_PATH = "/opt/amnezia/awg/clientsTable";

  // Путь к конфигурации wg внутри контейнера
  export const AMNEZIA_WG_CONF_PATH = "/opt/amnezia/awg/wg0.conf";

  // Путь к public key сервера внутри контейнера
  export const AMNEZIA_SERVER_PUBLIC_KEY_PATH =
    "/opt/amnezia/awg/wireguard_server_public_key.key";

  // Путь к общему PSK файлу AmneziaWG
  export const AMNEZIA_WG_PSK_PATH = "/opt/amnezia/awg/wireguard_psk.key";

  // Значение MTU по умолчанию для AmneziaWG
  export const AMNEZIA_WG_DEFAULT_MTU = "1376";

  // Значение KeepAlive по умолчанию для AmneziaWG
  export const AMNEZIA_WG_DEFAULT_KEEPALIVE = "25";

  // Транспорт по умолчанию для AmneziaWG
  export const AMNEZIA_WG_DEFAULT_TRANSPORT = "udp";

  // Имя Docker-контейнера с Xray
  export const XRAY_DOCKER_CONTAINER = "amnezia-xray";

  // Каталог конфигурации Xray внутри контейнера
  export const XRAY_CONFIG_DIR = "/opt/amnezia/xray";

  // Путь к конфигурации Xray внутри контейнера
  export const XRAY_SERVER_CONFIG_PATH = "/opt/amnezia/xray/server.json";

  // Путь к файлу UUID по умолчанию
  export const XRAY_UUID_PATH = "/opt/amnezia/xray/xray_uuid.key";

  // Путь к публичному ключу Xray
  export const XRAY_PUBLIC_KEY_PATH = "/opt/amnezia/xray/xray_public.key";

  // Путь к приватному ключу Xray
  export const XRAY_PRIVATE_KEY_PATH = "/opt/amnezia/xray/xray_private.key";

  // Путь к short id Xray
  export const XRAY_SHORT_ID_PATH = "/opt/amnezia/xray/xray_short_id.key";

  // Порт Xray по умолчанию
  export const XRAY_DEFAULT_PORT = "443";

  // Локальный порт прокси Xray по умолчанию
  export const XRAY_DEFAULT_LOCAL_PROXY_PORT = "10808";

  // Локальный адрес туннеля Xray по умолчанию
  export const XRAY_DEFAULT_LOCAL_ADDR = "10.33.0.2";

  // Домен по умолчанию для REALITY
  export const XRAY_DEFAULT_SITE = "www.googletagmanager.com";
}
