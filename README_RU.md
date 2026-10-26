# Amnezia API

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml/badge.svg)](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/kyoresuas/amnezia-api?logo=github&logoColor=white)](https://github.com/kyoresuas/amnezia-api/releases/latest)
[![GHCR](https://img.shields.io/badge/GHCR-amnezia--api-2496ED?logo=docker&logoColor=white)](https://github.com/kyoresuas/amnezia-api/pkgs/container/amnezia-api)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?logo=openapiinitiative&logoColor=white)](openapi/openapi.json)
[![License](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)

[English](README.md) · **Русский**

**Self-hosted REST API для автоматизации VPN-серверов Amnezia.** Управляйте клиентами AmneziaWG, AmneziaWG 3.1 и Xray через единый защищённый HTTP-интерфейс с валидацией, Swagger UI, метриками, QR-конфигами, сроками доступа и резервными копиями.

Подходит для админ-панелей, Telegram-ботов, биллинга и управления несколькими серверами без ручного подключения по SSH.

[Быстрый старт](#быстрый-старт) · [Маршруты API](#маршруты-api) · [Сравнение](#сравнение-с-другими-инструментами) · [Безопасность](#безопасность) · [Веб-панель](https://github.com/slowy19/amnezia-panel)

![Демонстрация Amnezia API](docs/assets/amnezia-api-demo.gif)

## Возможности

| Возможность | Что она даёт |
| --- | --- |
| Единый API протоколов | Одинаковая работа с AmneziaWG, AmneziaWG 3.1 и Xray |
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
             AmneziaWG · AmneziaWG 3.1 · Xray
```

Если Amnezia уже работает, переустанавливать VPN-протоколы не нужно. Установщик обнаруживает контейнеры `amnezia-awg`, `amnezia-awg2` и `amnezia-xray` и настраивает API поверх них. Для Xray он также включает Stats API вместе с нужным ему правилом routing. Если конфиг Xray приходится менять, прежняя версия сохраняется как `server.json.bak` внутри контейнера, а `amnezia-xray` перезапускается; иначе контейнер не трогается. После перенастройки Xray в приложении Amnezia запустите установщик снова, чтобы вернуть статистику.

## Сравнение с другими инструментами

Amnezia API — не очередная панель для Xray. Он автоматизирует серверы, которые уже развернуло приложение Amnezia, поэтому пользователи остаются на официальных клиентах Amnezia.

| | Amnezia API | Панели на Xray-core (Marzban, Remnawave, 3x-ui) |
| --- | --- | --- |
| Отправная точка | Сервер, уже настроенный приложением Amnezia, без переустановки | Сервер, где панель сама ставит Xray и владеет его конфигом |
| Клиентское приложение | Приложение Amnezia через `vpn://`-конфиги и QR-коды | Xray-совместимые приложения через подписки и ссылки |
| Протоколы | AmneziaWG, AmneziaWG 3.1, Xray с REALITY | Протоколы Xray-core; 3x-ui дополнительно запускает собственный AmneziaWG |
| Интерфейс | REST API со Swagger и OpenAPI, интерфейс или бота подключаете вы | Встроенная веб-панель |
| Подходит для | Ботов, биллинга и панелей, которым нужна экосистема Amnezia | Полноценных панелей со своей клиентской экосистемой |

Они решают соседние задачи и могут работать рядом на разных серверах. Готовый веб-интерфейс поверх этого API — [amnezia-panel](https://github.com/slowy19/amnezia-panel).

## Поддерживаемые протоколы

| Протокол | Значение API | Контейнер |
| --- | --- | --- |
| AmneziaWG | `amneziawg` | `amnezia-awg` |
| AmneziaWG 3.1 | `amneziawg3` | `amnezia-awg2` |
| Xray | `xray` | `amnezia-xray` |

Протокол `amneziawg3` обслуживает контейнер `amnezia-awg2`. Если контейнер ещё на AmneziaWG 2.0, клиентские конфиги собираются по тем параметрам, которые в нём есть, а набор 3.1 (`HeaderProtectionKey`, `RekeyAfterTime`, `RandomTrailers` и остальные) подхватывается сразу после обновления сервера.

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
2. Создаст случайный API-ключ и уникальный `SERVER_ID`, подготовит `.env`.
3. Предложит Docker- или PM2-режим.
4. Запустит API и настроит Nginx на порту `80`, порт меняется через `NGINX_LISTEN`.
5. Включит статистику Xray, если найден `amnezia-xray`.

После установки:

```text
API:     http://<ip-сервера>/
Swagger: http://<ip-сервера>/docs
Health:  http://<ip-сервера>/healthz
```

> [!IMPORTANT]
> Установщик настраивает обычный HTTP. Перед публикацией API в интернете добавьте TLS и ограничьте доступ на firewall или reverse proxy. См. [HTTPS и закрытый доступ](#https-и-закрытый-доступ) и [Безопасность](#безопасность).

### HTTPS и закрытый доступ

Установщик создаёт сайт nginx на порту `80`. Выберите, как он должен быть доступен.

**Закрыто, через SSH-туннель.** Привяжите nginx только к localhost. Значение сохранится в `.env`, а существующая установка обновится на месте:

```bash
NGINX_LISTEN=127.0.0.1:80 bash ./scripts/setup.sh
ssh -L 8080:127.0.0.1:80 user@<ip-сервера>   # теперь API на http://127.0.0.1:8080
```

`NGINX_LISTEN` принимает порт (`8080`) или адрес с портом (`127.0.0.1:80`). Если изменить значение позже, сайт nginx будет создан заново.

**Открыто, с Let's Encrypt.** Направьте DNS-запись на сервер, укажите этот домен в сайте nginx и дайте certbot добавить TLS и редирект:

```bash
sudo sed -i 's/server_name _;/server_name vpn.example.com;/' /etc/nginx/sites-available/amnezia-api
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vpn.example.com
```

Следующие запуски `setup.sh` не трогают существующий сайт nginx, поэтому настройка сертификата переживает обновления.

### Docker Compose

```bash
git clone https://github.com/kyoresuas/amnezia-api.git
cd amnezia-api
cp .env.example .env
```

Сгенерируйте случайный `FASTIFY_API_KEY` и уникальный `SERVER_ID`, запишите их в `.env`, проверьте остальные значения и запустите сервис:

```bash
openssl rand -hex 32               # FASTIFY_API_KEY
cat /proc/sys/kernel/random/uuid   # SERVER_ID
```

```bash
docker compose -f docker-compose.ghcr.yml up -d
docker compose ps
```

Чтобы закрепить конкретный релиз, задайте `AMNEZIA_API_VERSION`, например `2.0.0`. По умолчанию используется `latest`.

Для локальной сборки образа из исходников используйте:

```bash
docker compose up -d --build
```

Docker Compose публикует API только на `127.0.0.1:4001`. Для удалённого доступа используйте reverse proxy с TLS.

### Обновление

```bash
bash ./scripts/setup.sh
```

Скрипт обновит репозиторий, определит текущий режим запуска, пересоберёт приложение и сохранит существующий `.env`. Он также чинит Stats API Xray на серверах, настроенных прежними версиями: те включали его без правила routing, и Xray мог исчерпать файловые дескрипторы. `amnezia-xray` перезапускается, только если конфиг действительно меняется.

## Релизы и Docker-образы

Каждый релиз `vX.Y.Z` публикует multi-platform образ для `linux/amd64` и `linux/arm64`:

```bash
docker pull ghcr.io/kyoresuas/amnezia-api:latest
docker pull ghcr.io/kyoresuas/amnezia-api:2.0.0
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

> [!NOTE]
> Всегда передавайте `protocol` явно. Если его не указать, `POST /clients` использует `amneziawg3`, а `PATCH /clients` и `DELETE /clients` — `amneziawg`.

Полные схемы запросов и ответов доступны в Swagger UI на `/docs`.

Версионируемый [контракт OpenAPI 3.0](openapi/openapi.json) доступен без запущенного сервера. Его можно импортировать в Postman, Insomnia, API-клиенты и генераторы SDK. Этот же файл прикладывается к каждому GitHub Release.

### Создать клиента

```bash
curl -X POST "https://vpn.example.com/clients" \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "demo-client",
    "protocol": "amneziawg3",
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
    "protocol": "amneziawg3",
    "status": "disabled",
    "expiresAt": null
  }'
```

### Использование из кода

<details>
<summary>Примеры на Node.js и Python</summary>

`expiresAt` — Unix-время в секундах или `null`, если срока нет.

```js
// Node.js 20+
const res = await fetch("https://vpn.example.com/clients", {
  method: "POST",
  headers: {
    "x-api-key": process.env.AMNEZIA_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    clientName: "demo-client",
    protocol: "amneziawg3",
    expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
  }),
});

const { client } = await res.json();
console.log(client.config); // vpn://...
```

```python
# Python 3 с requests
import os
import time
import requests

res = requests.post(
    "https://vpn.example.com/clients",
    headers={"x-api-key": os.environ["AMNEZIA_API_KEY"]},
    json={
        "clientName": "demo-client",
        "protocol": "amneziawg3",
        "expiresAt": int(time.time()) + 30 * 24 * 3600,
    },
    timeout=30,
)
res.raise_for_status()
print(res.json()["client"]["config"])  # vpn://...
```

</details>

## Конфигурация

| Переменная | Описание |
| --- | --- |
| `FASTIFY_ROUTES` | Адрес Fastify в формате `host:port` |
| `FASTIFY_API_KEY` | Секрет для заголовка `x-api-key`, минимум 32 символа |
| `CORS_ORIGINS` | Browser origin через запятую; пустое значение отключает CORS |
| `PROTOCOLS_ENABLED` | `amneziawg,amneziawg3,xray` |
| `SERVER_ID` | Постоянный уникальный ID сервера; для новых установок его создаёт установщик |
| `SERVER_NAME` | Понятное название сервера |
| `SERVER_REGION` | Регион, зона или произвольная метка |
| `SERVER_WEIGHT` | Вес для маршрутизации; рекомендуется `1..1000` |
| `SERVER_MAX_PEERS` | Максимальное число клиентов |
| `SERVER_PUBLIC_HOST` | Публичный хост для сгенерированных endpoint |
| `DOCKER_GID` | ID группы Docker socket в Docker-режиме |
| `DOCKER_API_VERSION` | Версия Docker Engine API |
| `AMNEZIA_API_VERSION` | Тег GHCR-образа для `docker-compose.ghcr.yml`; по умолчанию `latest` |
| `NGINX_LISTEN` | Только для установщика: порт или `адрес:порт` для nginx, по умолчанию `80`, см. [HTTPS и закрытый доступ](#https-и-закрытый-доступ) |

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
- [amnezia-vpn-cli](https://github.com/eaglexer/amnezia-vpn-cli) — терминальный клиент `amz`: создаёт, показывает и отзывает ключи через SSH-туннель к Amnezia API.
- [amnezia-protocols](https://github.com/kyoresuas/amnezia-protocols) — консольные установщики AmneziaWG 3.1, AmneziaWG 1.5 и Xray REALITY с той же раскладкой контейнеров, что у приложения Amnezia, поэтому Amnezia API работает поверх них.
- [ru-direct](https://github.com/kyoresuas/ru-direct) — ежедневно обновляемые списки российских подсетей и доменов для раздельного туннелирования в AmneziaVPN, WireGuard, Xray и других клиентах.

Если вы создали интеграцию, бота, SDK или панель, откройте issue или pull request, чтобы добавить проект в этот список.

## Поддержать проект

Звезда на GitHub помогает другим владельцам серверов Amnezia найти проект. Если Amnezia API оказался полезен, вы также можете поддержать его развитие:

- **TON:** `kyoresuas.ton`
- **Адрес кошелька TON:** `UQATzyMcVoZudjaA5Rc9w5TV_lIqxh9DPk0gSnjkLVvwEVqz`
- **USDT в сети TRON (TRC-20):** `TJSLjDo4yRgHr9JqqEcrkbC51bP9DCiBC7`

Перед переводом криптовалюты убедитесь, что выбрана правильная сеть.

## Поддержка

- [GitHub Issues](https://github.com/kyoresuas/amnezia-api/issues)
- Telegram: [@stercuss](https://t.me/stercuss)
- Email: [hey@kyoresuas.com](mailto:hey@kyoresuas.com)

## Дисклеймер

Это независимый community-проект. Он не связан с Amnezia, не спонсируется и официально не поддерживается командой Amnezia.

## Лицензия

[MIT](LICENSE)
