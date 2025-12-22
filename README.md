# Amnezia API

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-5.x-000000?logo=fastify&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Русский** · [English](README_EN.md)

API предназначен для удаленного управления Amnezia и упрощения доступа к управлению VPN посредством программирования — для интеграции с приложениями, админ-панелями и ботами.

## Поддерживаемые протоколы

- **AmneziaWG**
- **Xray**

## Быстрый старт

### Установка и запуск

```bash
# Установить Git
apt install git

# Клонировать репозиторий
git clone https://github.com/kyoresuas/amnezia-api.git

# Перейти в репозиторий
cd ./amnezia-api

# Запустить API
bash ./scripts/setup.sh
```

### Конфигурация

Конфигурация генерируется автоматически при запуске `./scripts/setup.sh`.

- **`.env.example`**: пример конфигурации
- **`.env`**: ваша конфигурация

## Документация API

Swagger UI поднимается на маршруте **`/docs`**. Откройте в браузере:

- `http://<ваш_айпи>/docs`

Изучите там схемы, параметры, примеры запросов и ответы.

## Аутентификация

Все маршруты защищены preHandler-ом и требуют заголовок:

- `x-api-key: <FASTIFY_API_KEY>`

Где `FASTIFY_API_KEY` задаётся в `.env`.

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

## Связаться со мной

- **Telegram:** @stercuss
- **Email:** hey@kyoresuas.com

## Лицензия

MIT — см. файл `LICENSE`.
