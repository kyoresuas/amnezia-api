# Amnezia API

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-5.x-000000?logo=fastify&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript&logoColor=white)
[![CI](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml/badge.svg)](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Русский** · [English](README_EN.md)

REST API для удалённого управления VPN-сервером на базе **Amnezia**. Превращает CLI-управление Amnezia (AmneziaWG, AmneziaWG 2.0, Xray) в удобный HTTP-интерфейс с типизированными схемами и Swagger из коробки.

Подходит для того, чтобы построить поверх Amnezia свою инфраструктуру: админ-панель, Telegram-бота, биллинг или балансировку по нескольким серверам — без ручного захода на сервер.

## Возможности

- **Три протокола в одном API** — AmneziaWG, AmneziaWG 2.0 и Xray через единый набор маршрутов.
- **Управление клиентами** — создание, список, обновление и удаление пиров; готовый конфиг для импорта в приложение.
- **Пауза пользователей** — можно временно отключить доступ (`status: disabled`), не удаляя ключ, а затем возобновить (`status: active`). Пользователю не придется заново генерировать конфиг.
- **QR-коды конфигов** — генерация серии QR (`POST /clients/qr`) в том же формате, что и клиент Amnezia: большие конфиги разбиваются на несколько кодов, приложение Amnezia их сканирует и импортирует.
- **Срок действия доступа** — поле `expiresAt` у клиента и фоновая задача, автоматически отключающая истёкших клиентов по cron.
- **Статистика по каждому пиру** — трафик (отдано/принято), последнее рукопожатие, online-статус, endpoint и разрешенные IP.
- **Метрики сервера** — CPU, RAM, диск, сеть, load average, uptime и статистика Docker-контейнеров VPN.
- **Бэкап и восстановление** — выгрузка и импорт конфигурации сервера через API.
- **Балансировка** — вес сервера, регион и лимит клиентов в ответе `/server` для маршрутизации между нодами.
- **Swagger UI** на `/docs` со схемами, примерами и валидацией запросов.
- **Локализация** ответов (ru/en) и аутентификация по API-ключу.

## Поддерживаемые протоколы

| Протокол      | Значение `protocol` |
| ------------- | ------------------- |
| AmneziaWG     | `amneziawg`         |
| AmneziaWG 2.0 | `amneziawg2`        |
| Xray          | `xray`              |

## Быстрый старт

```bash
# Клонировать репозиторий
git clone https://github.com/kyoresuas/amnezia-api.git

# Перейти в репозиторий
cd ./amnezia-api

# Запустить установку (предложит режим pm2 или docker)
bash ./scripts/setup.sh
```

Скрипт сам поставит зависимости, сгенерирует `.env`, поднимет API и настроит nginx. После установки API доступен на `http://<ваш_сервер>`.

### Запуск через Docker

```bash
docker compose up -d --build
```

`docker-compose.yml` пробрасывает `docker.sock`, чтобы API мог управлять контейнерами Amnezia на хосте. Конфигурация читается из `.env`.

## Конфигурация

Файл `.env` генерируется автоматически из `.env.example` при первом запуске `setup.sh`.

| Переменная           | Описание                                                |
| -------------------- | ------------------------------------------------------- |
| `FASTIFY_ROUTES`     | Хост и порт API, например `localhost:4001`              |
| `FASTIFY_API_KEY`    | Ключ доступа к API (заголовок `x-api-key`)              |
| `PROTOCOLS_ENABLED`  | Включенные протоколы: `amneziawg,amneziawg2,xray`       |
| `SERVER_ID`          | Уникальный идентификатор сервера                        |
| `SERVER_NAME`        | Название сервера (отображается в клиенте)               |
| `SERVER_REGION`      | Регион/зона/лейбл сервера                               |
| `SERVER_WEIGHT`      | Вес сервера для балансировки (рекомендуется `1..1000`)  |
| `SERVER_MAX_PEERS`   | Максимальное число клиентов на сервере                  |
| `SERVER_PUBLIC_HOST` | Внешний хост/домен для `Endpoint`                       |

## Аутентификация

Все маршруты (кроме `/healthz`, `/metrics`, `/docs`) защищены preHandler-ом и требуют заголовок:

```
x-api-key: <FASTIFY_API_KEY>
```

## Эндпоинты

| Метод    | Маршрут          | Назначение                               |
| -------- | ---------------- | ---------------------------------------- |
| `GET`    | `/clients`       | Список клиентов с трафиком и статусами    |
| `POST`   | `/clients`       | Создать клиента и получить конфиг         |
| `PATCH`  | `/clients`       | Обновить клиента (статус, срок действия)  |
| `POST`   | `/clients/qr`    | QR-коды конфига (формат клиента Amnezia)   |
| `DELETE` | `/clients`       | Удалить клиента                           |
| `GET`    | `/server`        | Информация о сервере и протоколах         |
| `GET`    | `/server/load`   | Метрики нагрузки (CPU/RAM/диск/сеть)       |
| `GET`    | `/server/backup` | Выгрузить бэкап конфигурации              |
| `POST`   | `/server/backup` | Импортировать бэкап конфигурации          |
| `POST`   | `/server/reboot` | Перезагрузить сервер                      |
| `GET`    | `/healthz`       | Healthcheck                               |
| `GET`    | `/metrics`       | Метрики Prometheus                        |

## Примеры запросов

Базовый адрес ниже — `http://<ваш_сервер>`. Подставьте свой ключ в `x-api-key`.

### Создать клиента

```bash
curl -X POST http://<ваш_сервер>/clients \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Kyoresuas",
    "protocol": "amneziawg2",
    "expiresAt": null
  }'
```

```json
{
  "message": "Клиент создан",
  "client": {
    "id": "PF77ZXRl1yAkFzhBq/zQNlDPD73XXTq+Zs2PgtjLKVA=",
    "config": "vpn://3fa85f64-5717-4562-b3fc-2c963f66afa6...",
    "protocol": "amneziawg2"
  }
}
```

### Получить список клиентов

```bash
curl "http://<ваш_сервер>/clients?skip=0&limit=100" \
  -H "x-api-key: <FASTIFY_API_KEY>"
```

### Поставить на паузу / возобновить / задать срок

`status: disabled` отключает доступ, не удаляя ключ; `status: active` возвращает доступ — конфиг у пользователя остаётся прежним.

```bash
curl -X PATCH http://<ваш_сервер>/clients \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "PF77ZXRl1yAkFzhBq/zQNlDPD73XXTq+Zs2PgtjLKVA=",
    "protocol": "amneziawg2",
    "status": "disabled",
    "expiresAt": 1735689600
  }'
```

### Сгенерировать QR-коды конфига

Передайте `config`, полученный при создании клиента. В ответе — массив QR (PNG data URI); для длинных конфигов их несколько, сканируйте по очереди в приложении Amnezia.

```bash
curl -X POST http://<ваш_сервер>/clients/qr \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": "vpn://3fa85f64-5717-4562-b3fc-2c963f66afa6..."
  }'
```

```json
{
  "total": 1,
  "items": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."]
}
```

### Удалить клиента

```bash
curl -X DELETE http://<ваш_сервер>/clients \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "PF77ZXRl1yAkFzhBq/zQNlDPD73XXTq+Zs2PgtjLKVA=",
    "protocol": "amneziawg2"
  }'
```

### Информация о сервере

```bash
curl http://<ваш_сервер>/server \
  -H "x-api-key: <FASTIFY_API_KEY>"
```

## Документация API

Swagger UI доступен на маршруте **`/docs`**:

- `http://<ваш_сервер>/docs`

Там — все схемы, параметры, примеры запросов и ответов.

## Структура проекта

<details>
<summary>Показать структуру</summary>

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
│  ├─ /schemas [схемы маршрутов API для Swagger и валидации]
│  ├─ /services [сервисы]
│  ├─ /tasks [отложенные задачи]
│  ├─ /types [типизация]
│  ├─ /utils [вспомогательные функции]
│  └─ main.ts [файл запуска]
├─ .env.example [пример конфигурации]
└─ .env [конфигурация разработчика]
```

</details>

## Экосистема

- [amnezia-panel](https://github.com/slowy19/amnezia-panel) — веб-панель управления поверх Amnezia API.

## Связаться со мной

- **Telegram:** @stercuss
- **Email:** hey@kyoresuas.com

## Лицензия

MIT — см. файл `LICENSE`.
