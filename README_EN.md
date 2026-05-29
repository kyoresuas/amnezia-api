# Amnezia API

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-5.x-000000?logo=fastify&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript&logoColor=white)
[![CI](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml/badge.svg)](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-green.svg)

[Русский](README.md) · **English**

REST API for remote management of an **Amnezia**-based VPN server. It turns Amnezia's CLI management (AmneziaWG, AmneziaWG 2.0, Xray) into a convenient HTTP interface with typed schemas and Swagger out of the box.

Great for building your own infrastructure on top of Amnezia: an admin panel, a Telegram bot, billing, or balancing across multiple servers — without SSH-ing into the box.

## Features

- **Three protocols, one API** — AmneziaWG, AmneziaWG 2.0 and Xray via a single set of routes.
- **Client management** — create, list, update and delete peers; ready-to-import config string.
- **Access expiration** — `expiresAt` field per client and a background cron task that auto-disables expired clients.
- **Per-peer stats** — traffic (sent/received), last handshake, online status, endpoint and allowed IPs.
- **Server metrics** — CPU, RAM, disk, network, load average, uptime and Docker container stats for the VPN.
- **Backup & restore** — export and import the server configuration via API.
- **Balancing** — server weight, region and client limit in the `/server` response for routing across nodes.
- **Swagger UI** at `/docs` with schemas, examples and request validation.
- **Localized** responses (en/ru) and API-key authentication.

## Supported protocols

| Protocol      | `protocol` value |
| ------------- | ---------------- |
| AmneziaWG     | `amneziawg`      |
| AmneziaWG 2.0 | `amneziawg2`     |
| Xray          | `xray`           |

## Quick start

```bash
# Clone repository
git clone https://github.com/kyoresuas/amnezia-api.git

# Go to repo
cd ./amnezia-api

# Run installer (asks for pm2 or docker mode)
bash ./scripts/setup.sh
```

The script installs dependencies, generates `.env`, starts the API and configures nginx. After install the API is available at `http://<your_server>`.

### Run with Docker

```bash
docker compose up -d --build
```

`docker-compose.yml` mounts `docker.sock` so the API can manage Amnezia containers on the host. Configuration is read from `.env`.

## Configuration

The `.env` file is generated automatically from `.env.example` on the first `setup.sh` run.

| Variable             | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `FASTIFY_ROUTES`     | API host and port, e.g. `localhost:4001`                 |
| `FASTIFY_API_KEY`    | API access key (the `x-api-key` header)                  |
| `PROTOCOLS_ENABLED`  | Enabled protocols: `amneziawg,amneziawg2,xray`           |
| `SERVER_ID`          | Unique server identifier                                 |
| `SERVER_NAME`        | Server name (shown in the client)                        |
| `SERVER_REGION`      | Server region/zone/label                                 |
| `SERVER_WEIGHT`      | Server weight for balancing (recommended `1..1000`)      |
| `SERVER_MAX_PEERS`   | Maximum number of clients per server                     |
| `SERVER_PUBLIC_HOST` | External host/domain for the `Endpoint`                  |

## Authentication

All routes (except `/healthz`, `/metrics`, `/docs`) are protected by a preHandler and require the header:

```
x-api-key: <FASTIFY_API_KEY>
```

## Endpoints

| Method   | Route            | Purpose                                |
| -------- | ---------------- | -------------------------------------- |
| `GET`    | `/clients`       | List clients with traffic and statuses |
| `POST`   | `/clients`       | Create a client and get its config     |
| `PATCH`  | `/clients`       | Update a client (status, expiration)   |
| `DELETE` | `/clients`       | Delete a client                        |
| `GET`    | `/server`        | Server info and protocols              |
| `GET`    | `/server/load`   | Load metrics (CPU/RAM/disk/network)    |
| `GET`    | `/server/backup` | Export configuration backup            |
| `POST`   | `/server/backup` | Import configuration backup            |
| `POST`   | `/server/reboot` | Reboot the server                      |
| `GET`    | `/healthz`       | Healthcheck                            |
| `GET`    | `/metrics`       | Prometheus metrics                     |

## Request examples

The base URL below is `http://<your_server>`. Put your key into `x-api-key`.

### Create a client

```bash
curl -X POST http://<your_server>/clients \
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
  "message": "Client created",
  "client": {
    "id": "PF77ZXRl1yAkFzhBq/zQNlDPD73XXTq+Zs2PgtjLKVA=",
    "config": "vpn://3fa85f64-5717-4562-b3fc-2c963f66afa6...",
    "protocol": "amneziawg2"
  }
}
```

### List clients

```bash
curl "http://<your_server>/clients?skip=0&limit=100" \
  -H "x-api-key: <FASTIFY_API_KEY>"
```

### Update a client (disable / set expiration)

```bash
curl -X PATCH http://<your_server>/clients \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "PF77ZXRl1yAkFzhBq/zQNlDPD73XXTq+Zs2PgtjLKVA=",
    "protocol": "amneziawg2",
    "status": "disabled",
    "expiresAt": 1735689600
  }'
```

### Delete a client

```bash
curl -X DELETE http://<your_server>/clients \
  -H "x-api-key: <FASTIFY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "PF77ZXRl1yAkFzhBq/zQNlDPD73XXTq+Zs2PgtjLKVA=",
    "protocol": "amneziawg2"
  }'
```

### Server info

```bash
curl http://<your_server>/server \
  -H "x-api-key: <FASTIFY_API_KEY>"
```

## API documentation

Swagger UI is available at **`/docs`**:

- `http://<your_server>/docs`

There you can review all schemas, parameters, request examples and responses.

## Project structure

<details>
<summary>Show structure</summary>

```
├─ /scripts [scripts]
├─ /src [root]
│  ├─ /config [project initialization]
│  ├─ /constants [constants]
│  ├─ /contracts [services config]
│  ├─ /controllers [API route controllers]
│  ├─ /handlers [API request handlers]
│  ├─ /helpers [specialized helpers]
│  ├─ /locales [translations]
│  ├─ /middleware [API middleware]
│  ├─ /schemas [Swagger/validation schemas]
│  ├─ /services [services]
│  ├─ /tasks [background tasks]
│  ├─ /types [types]
│  ├─ /utils [utilities]
│  └─ main.ts [entrypoint]
├─ .env.example [config example]
└─ .env [developer config]
```

</details>

## Contact

- **Telegram:** @stercuss
- **Email:** hey@kyoresuas.com

## License

MIT — see `LICENSE`.
