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
}
