# Amnezia API

Удобный API для управления Amnezia VPN в ваших проектах.

## Поддерживаемые протоколы

API реализует поддержку двух протоколов — AmneziaWG и Xray.

## Быстрый старт

```bash
# Установить GIT
apt install git

# Клонировать репозиторий
git clone https://github.com/kyoresuas/amnezia-api.git

# Перейти в репозиторий
cd ./amnezia-api

# Запустить API
bash ./scripts/setup.sh
```

## Аутентификация

Все маршруты защищены прехендлером и требуют заголовок:

- `x-api-key: <FASTIFY_API_KEY>`

## Документация API

Поднимается Swagger UI на маршруте `/docs`.

## Маршруты

Все ответы и тела запросов валидируются через JSON Schema и документируются в Swagger. Ниже краткая выжимка.

### Server

- GET `/server`
  - Описание: статус текущей ноды
  - Заголовки: `x-api-key`
  - 200: `{ id, region, weight, maxPeers, interface, totalPeers }`

### Users

- GET `/users`

  - Описание: получить всех пользователей
  - Заголовки: `x-api-key`
  - 200: `{ total, items: [...] }`

- POST `/users`

  - Описание: создать нового клиента
  - Заголовки: `x-api-key`
  - Body: `{ clientName: string, expiresAt?: number|null }`
  - 200: `{ message, client: { id, config } }`
  - 409: `{ message }` если имя занято

- DELETE `/users`
  - Описание: удалить клиента
  - Заголовки: `x-api-key`
  - Body: `{ clientId: base64 }`
  - 200: `{ message }`
  - 404: `{ message }` если клиент не найден

## Примеры запросов

```bash
# Получить статус ноды
curl -s \
  -H "x-api-key: $FASTIFY_API_KEY" \
  http://localhost:8080/server

# Получить пользователей
curl -s \
  -H "x-api-key: $FASTIFY_API_KEY" \
  "http://localhost:8080/users?skip=0&limit=100"

# Создать пользователя
curl -s \
  -H "Content-Type: application/json" \
  -H "x-api-key: $FASTIFY_API_KEY" \
  -d '{"clientName":"Kyoresuas","expiresAt":1735689600}' \
  http://localhost:8080/users

# Удалить пользователя
curl -s \
  -X DELETE \
  -H "Content-Type: application/json" \
  -H "x-api-key: $FASTIFY_API_KEY" \
  -d '{"clientId":"PF77ZXRl1yAkFzhBq/zQNlDPD73XXTq+Zs2PgtjLKVA="}' \
  http://localhost:8080/users
```

## Структура проекта

Для работы над проектом необходимо понимать его структуру.

```
├─ /scripts [скрипты]
├─ /src [корень]
│  ├─ /config [инициализация проекта]
│  ├─ /constants [константы]
│  ├─ /contracts [настройки сервисов]
│  ├─ /controllers [контроллеры для маршрутов API]
│  ├─ /handlers [обработчики запросов API]
│  ├─ /helpers [специализированные помощники]
│  ├─ /locales [файлы перевода]
│  ├─ /middleware [промежуточное ПО для маршрутов API]
│  ├─ /schemas [схемы маршрутов API для сваггера и валидации]
│  ├─ /services [сервисы]
│  ├─ /tasks [отложенные задачи]
│  ├─ /types [типизация]
│  ├─ /utils [вспомогательные функции]
│  └─ main.ts [файл запуска]
├─ .env.example [пример конфигурации]
└─ .env [конфигурация разработчика]
```

## TODO

- Реализовать сбор и отображение статистики по пользователям Xray
- Исправить отображение и сохранение clientName для пользователей Xray
- Добавить поддержку срока действия (expiresAt) и автоматического удаления клиентов Xray по истечении времени

## Лицензия

MIT — см. файл `LICENSE`.
