# Amnezia API

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml/badge.svg)](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml)
[![GHCR](https://img.shields.io/badge/GHCR-amnezia--api-2496ED?logo=docker&logoColor=white)](https://github.com/kyoresuas/amnezia-api/pkgs/container/amnezia-api)
[![License](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)

[English](README.md) · **Русский**

**Self-hosted REST API для автоматизации VPN-серверов Amnezia.** Управляйте клиентами AmneziaWG, AmneziaWG 2.0 и Xray через единый защищённый HTTP-интерфейс с валидацией, Swagger UI, метриками, QR-конфигами, сроками доступа и резервными копиями.

Подходит для админ-панелей, Telegram-ботов, биллинга и управления несколькими серверами без ручного подключения по SSH.

[Быстрый старт](#быстрый-старт) · [Маршруты API](#маршруты-api) · [Безопасность](#безопасность) · [Веб-панель](https://github.com/slowy19/amnezia-panel)

![Демонстрация Amnezia API](docs/assets/amnezia-api-demo.gif)

## Возможности

| Возможность | Что она даёт |
| --- | --- |
| Единый API протоколов | Одинаковая работа с AmneziaWG, AmneziaWG 2.0 и Xray |
| Жизненный цикл клиента | Создание, список, изменение, пауза, возобновление и удаление |
| Срок доступа | Автоматическое отключение истёкших клиентов без смены конфига |
| Готовые конфиги | Строка `vpn://` и серия совместимых с Amnezia QR-кодов |
| Статистика | Трафик, последнее рукопожатие, online-статус, endpoint и IP |
| Управление сервером | CPU, RAM, диск, сеть, Docker, бэкап, восстановление и перезагрузка |
| Данные для балансировки | ID, регион, вес сервера и максимальное число клиентов |
| Инструменты разработчика | JSON Schema, Swagger UI, локализация и Prometheus-метрики |

## Как это работает

```text
Админ-панель · Telegram-бот · Биллинг · Автоматизация
                          │
                    HTTPS + x-api-key
                          │
               Amnezia API на каждом сервере
                          │
             Существующие контейнеры Amnezia
             AmneziaWG · AmneziaWG 2.0 · Xray
```

Если Amnezia уже работает, переустанавливать VPN-протоколы не нужно. Установщик обнаруживает контейнеры `amnezia-awg`, `amnezia-awg2` и `amnezia-xray` и настраивает API поверх них. При первой настройке поддержка статистики Xray может изменить конфиг Xray и перезапустить контейнер.

## Поддерживаемые протоколы

| Протокол | Значение API | Контейнер |
| --- | --- | --- |
| AmneziaWG | `amneziawg` | `amnezia-awg` |
| AmneziaWG 2.0 | `amneziawg2` | `amnezia-awg2` |
| Xray | `xray` | `amnezia-xray` |

## Требования

- Linux-сервер хотя бы с одним установленным протоколом Amnezia.
- Root или `sudo` для автоматической установки.
- Debian или Ubuntu для автоматической установки зависимостей.
- Docker с Compose для Docker-режима или Node.js 20+ для PM2.

## Быстрый старт

Запустите на VPN-сервере:

```bash
git clone https://github.com/kyoresuas/amnezia-api.git
cd amnezia-api
bash ./scripts/setup.sh
```

Установщик:

1. Определит установленные протоколы Amnezia.
2. Создаст случайный API-ключ и подготовит `.env`.
3. Предложит Docker- или PM2-режим.
4. Запустит API и настроит Nginx на порту `80`.
5. Включит статистику Xray, если найден `amnezia-xray`.

После установки:

```text
API:     http://<ip-сервера>/
Swagger: http://<ip-сервера>/docs
Health:  http://<ip-сервера>/healthz
```

> [!IMPORTANT]
> Установщик настраивает обычный HTTP. Перед публикацией API в интернете добавьте TLS и ограничьте доступ на firewall или reverse proxy.

### Docker Compose

```bash
git clone https://github.com/kyoresuas/amnezia-api.git
cd amnezia-api
cp .env.example .env
```

Сгенерируйте случайный `FASTIFY_API_KEY`, запишите его в `.env`, проверьте остальные значения и запустите сервис:

```bash
openssl rand -hex 32
```

```bash
docker compose -f docker-compose.ghcr.yml up -d
docker compose ps
```

Чтобы закрепить конкретный релиз, задайте `AMNEZIA_API_VERSION`, например `1.0.0`. По умолчанию используется `latest`.

Для локальной сборки образа из исходников используйте:

```bash
docker compose up -d --build
```

Docker Compose публикует API только на `127.0.0.1:4001`. Для удалённого доступа используйте reverse proxy с TLS.

### Обновление

```bash
bash ./scripts/setup.sh
```

Скрипт обновит репозиторий, определит текущий режим запуска, пересоберёт приложение и сохранит существующий `.env`.

## Релизы и Docker-образы

Каждый релиз `vX.Y.Z` публикует multi-platform образ для `linux/amd64` и `linux/arm64`:

```bash
docker pull ghcr.io/kyoresuas/amnezia-api:latest
docker pull ghcr.io/kyoresuas/amnezia-api:1.0.0
```

Стабильные релизы получают теги `latest`, major, minor, точную версию и версию с префиксом `v`. Образы содержат OCI-метаданные, SBOM и GitHub provenance attestation. В GitHub Release автоматически добавляются release notes и переносимый OpenAPI-контракт.

## Аутентификация

Защищённые маршруты требуют заголовок:

```http
x-api-key: <FASTIFY_API_KEY>
```

Маршруты `/healthz`, `/metrics` и `/docs` доступны без API-ключа. При необходимости закройте `/metrics` и `/docs` на reverse proxy.

## Маршруты API

![Обзор Swagger UI](docs/assets/swagger-overview.png)

| Метод | Маршрут | Назначение |
| --- | --- | --- |
| `GET` | `/clients` | Клиенты, трафик и статусы подключения |
| `POST` | `/clients` | Создание клиента и получение конфига |
| `PATCH` | `/clients` | Изменение статуса или срока доступа |
| `POST` | `/clients/qr` | Генерация одного или нескольких QR-кодов |
| `DELETE` | `/clients` | Удаление клиента |
| `GET` | `/server` | Сервер, лимиты и доступные протоколы |
| `GET` | `/server/load` | CPU, RAM, диск, сеть и Docker-метрики |
| `GET` | `/server/backup` | Экспорт конфигурации сервера |
| `POST` | `/server/backup` | Импорт резервной копии |
| `POST` | `/server/reboot` | Перезагрузка сервера |
| `GET` | `/healthz` | Проверка доступности |
| `GET` | `/metrics` | Prometheus-метрики |

Полные схемы запросов и ответов доступны в Swagger UI на `/docs`.

Версионируемый [контракт OpenAPI 3.0](openapi/openapi.json) доступен без запущенного сервера. Его можно импортировать в Postman, Insomnia, API-клиенты и генераторы SDK. Этот же файл прикладывается к каждому GitHub Release.

### Создать клиента

```bash
curl -X POST "https://vpn.example.com/clients" \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "demo-client",
    "protocol": "amneziawg2",
    "expiresAt": null
  }'
```

### Получить список клиентов

```bash
curl "https://vpn.example.com/clients?skip=0&limit=100" \
  -H "x-api-key: <FASTIFY_API_KEY>"
```

### Отключить клиента без удаления конфига

```bash
curl -X PATCH "https://vpn.example.com/clients" \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "<client-id>",
    "protocol": "amneziawg2",
    "status": "disabled",
    "expiresAt": null
  }'
```

## Конфигурация

| Переменная | Описание |
| --- | --- |
| `FASTIFY_ROUTES` | Адрес Fastify в формате `host:port` |
| `FASTIFY_API_KEY` | Секрет для заголовка `x-api-key`, минимум 32 символа |
| `CORS_ORIGINS` | Browser origin через запятую; пустое значение отключает CORS |
| `PROTOCOLS_ENABLED` | `amneziawg,amneziawg2,xray` |
| `SERVER_ID` | Постоянный уникальный ID сервера |
| `SERVER_NAME` | Понятное название сервера |
| `SERVER_REGION` | Регион, зона или произвольная метка |
| `SERVER_WEIGHT` | Вес для маршрутизации; рекомендуется `1..1000` |
| `SERVER_MAX_PEERS` | Максимальное число клиентов |
| `SERVER_PUBLIC_HOST` | Публичный хост для сгенерированных endpoint |
| `DOCKER_GID` | ID группы Docker socket в Docker-режиме |
| `DOCKER_API_VERSION` | Версия Docker Engine API |
| `AMNEZIA_API_VERSION` | Тег GHCR-образа для `docker-compose.ghcr.yml`; по умолчанию `latest` |

## Безопасность

Amnezia API изменяет VPN-конфигурацию и управляет контейнерами. Считайте его привилегированным инфраструктурным сервисом.

- Не передавайте API-ключ по обычному HTTP вне доверенной сети.
- Используйте TLS и ограничивайте доступ по IP, private network или VPN.
- Меняйте `FASTIFY_API_KEY`, если он мог попасть к посторонним.
- Оставляйте `CORS_ORIGINS` пустым для server-to-server запросов. Для браузерного клиента перечислите только его точные `http://` или `https://` origin.
- Docker-режим монтирует `/var/run/docker.sock`, доступ к которому даёт высокие привилегии на хосте.
- При необходимости закройте `/docs` и `/metrics` на reverse proxy.
- Не публикуйте реальные ключи, `vpn://`-конфиги, QR-коды, бэкапы и production-ответы в issues или скриншотах.

В API используются constant-time сравнение ключа, rate limiting, валидация запросов и security headers. Они не заменяют TLS, сетевую изоляцию и защиту сервера.

Сообщайте об уязвимостях приватно по инструкции из [SECURITY.md](SECURITY.md). Не создавайте для них публичные issues.

## Разработка

```bash
npm ci
npm run dev
```

Проверка изменений:

```bash
npm run lint
npm test
npm run build
npm run openapi:check
```

После изменения маршрутов или схем обновите переносимый контракт командой `npm run openapi:generate`. CI запускает lint, тесты, сборку и проверку контракта на Node.js 20, 22 и 24. Полный порядок подготовки изменений описан в [CONTRIBUTING.md](CONTRIBUTING.md).

## Экосистема

- [amnezia-panel](https://github.com/slowy19/amnezia-panel) — веб-панель управления на базе Amnezia API.

Если вы создали интеграцию, бота, SDK или панель, откройте issue или pull request, чтобы добавить проект в этот список.

## Поддержка

- [GitHub Issues](https://github.com/kyoresuas/amnezia-api/issues)
- Telegram: [@stercuss](https://t.me/stercuss)
- Email: [hey@kyoresuas.com](mailto:hey@kyoresuas.com)

## Дисклеймер

Это независимый community-проект. Он не связан с Amnezia, не спонсируется и официально не поддерживается командой Amnezia.

## Лицензия

[MIT](LICENSE)
