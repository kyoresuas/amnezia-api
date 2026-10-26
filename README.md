# Amnezia API

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml/badge.svg)](https://github.com/kyoresuas/amnezia-api/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/kyoresuas/amnezia-api?logo=github&logoColor=white)](https://github.com/kyoresuas/amnezia-api/releases/latest)
[![GHCR](https://img.shields.io/badge/GHCR-amnezia--api-2496ED?logo=docker&logoColor=white)](https://github.com/kyoresuas/amnezia-api/pkgs/container/amnezia-api)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?logo=openapiinitiative&logoColor=white)](openapi/openapi.json)
[![License](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)

**English** · [Русский](README_RU.md)

**A self-hosted REST API for automating Amnezia VPN servers.** Manage AmneziaWG, AmneziaWG 3.1, and Xray clients through one authenticated HTTP interface—with typed validation, Swagger UI, metrics, QR configs, expiration, and backups included.

Build an admin panel, Telegram bot, billing system, or multi-server control plane without manually SSH-ing into every VPN server.

[Quick start](#quick-start) · [API reference](#api-reference) · [How it compares](#how-it-compares) · [Security](#security) · [Web panel](https://github.com/slowy19/amnezia-panel)

![Amnezia API demo](docs/assets/amnezia-api-demo.gif)

## Why Amnezia API?

Amnezia is excellent at deploying a private VPN. Amnezia API adds the automation layer needed when you manage more than a few users or servers.

| Capability | What it gives you |
| --- | --- |
| Unified protocol API | The same client workflow for AmneziaWG, AmneziaWG 3.1, and Xray |
| Client lifecycle | Create, list, update, disable, resume, and delete clients |
| Expiration | Automatically disable expired access without invalidating the client config |
| Ready-to-share configs | Return an Amnezia-compatible `vpn://` config and generate multi-part QR codes |
| Live visibility | Per-peer traffic, handshake, online status, endpoint, and allowed IPs |
| Server operations | CPU, RAM, disk, network, load, uptime, Docker stats, backup, restore, and reboot |
| Automation-ready metadata | Server ID, region, weight, and client limit for external routing and balancing |
| Developer experience | JSON Schema validation, localized responses, Swagger UI, and Prometheus metrics |

## How it fits

```text
Admin panel · Telegram bot · Billing · Automation
                       │
                 HTTPS + x-api-key
                       │
             Amnezia API (one per server)
                       │
           Existing Amnezia Docker containers
          AmneziaWG · AmneziaWG 3.1 · Xray
```

Already have a working Amnezia server? You do **not** need to reinstall its VPN protocols. The installer detects the existing `amnezia-awg`, `amnezia-awg2`, and `amnezia-xray` containers and configures the API around them. For Xray it also enables the Stats API together with the routing rule it needs. If the Xray config has to change, the previous one is saved as `server.json.bak` inside the container and `amnezia-xray` is restarted; otherwise the container is left alone. Run the installer again after reconfiguring Xray in the Amnezia app to bring statistics back.

## How it compares

Amnezia API is not another Xray panel. It automates servers that the Amnezia app has already deployed, so your users keep the official Amnezia clients.

| | Amnezia API | Xray-core panels (Marzban, Remnawave, 3x-ui) |
| --- | --- | --- |
| Starting point | A server already set up by the Amnezia app, no reinstall | A server where the panel installs and owns the Xray config |
| Client app | Amnezia app through `vpn://` configs and QR codes | Xray-compatible apps through subscription or share links |
| Protocols | AmneziaWG, AmneziaWG 3.1, Xray with REALITY | Xray-core protocols; 3x-ui also runs its own AmneziaWG |
| Interface | REST API with Swagger and OpenAPI; bring your own UI or bot | Built-in web dashboard |
| Best for | Bots, billing, and panels that must stay inside the Amnezia ecosystem | Full-featured panels with their own client ecosystem |

They solve neighboring problems and can run side by side on different servers. For a ready-made web UI on top of this API, see [amnezia-panel](https://github.com/slowy19/amnezia-panel).

## Supported protocols

| Protocol | API value | Expected container |
| --- | --- | --- |
| AmneziaWG | `amneziawg` | `amnezia-awg` |
| AmneziaWG 3.1 | `amneziawg3` | `amnezia-awg2` |
| Xray | `xray` | `amnezia-xray` |

The `amneziawg3` protocol serves the `amnezia-awg2` container. If that container is still on AmneziaWG 2.0, client configs are built from the 2.0 parameters it actually has — the 3.1 set (`HeaderProtectionKey`, `RekeyAfterTime`, `RandomTrailers` and the rest) is picked up as soon as the server is upgraded.

## Requirements

- A Linux server with at least one supported Amnezia protocol already installed.
- Root or `sudo` access for the guided installer.
- Debian or Ubuntu for automatic dependency installation.
- Docker with Compose for Docker mode, or Node.js 20+ for PM2 mode.

## Quick start

Clone the repository on the VPN server and run the guided installer:

```bash
git clone https://github.com/kyoresuas/amnezia-api.git
cd amnezia-api
bash ./scripts/setup.sh
```

The installer:

1. Detects the installed Amnezia protocols.
2. Generates a random API key and a unique `SERVER_ID`, and prepares `.env`.
3. Lets you choose Docker or PM2 mode.
4. Starts the API and configures Nginx on port `80`, configurable with `NGINX_LISTEN`.
5. Enables Xray statistics when an `amnezia-xray` container is present.

After setup:

```text
API:     http://<server-ip>/
Swagger: http://<server-ip>/docs
Health:  http://<server-ip>/healthz
```

> [!IMPORTANT]
> The guided installer configures plain HTTP. Before exposing the API over the public internet, add TLS and restrict access at the firewall or reverse proxy. See [HTTPS and private access](#https-and-private-access) and [Security](#security).

### HTTPS and private access

The installer creates an nginx site on port `80`. Pick how it should be reachable.

**Private, through an SSH tunnel.** Bind nginx to localhost only. The value is saved to `.env`, and an existing installation is updated in place:

```bash
NGINX_LISTEN=127.0.0.1:80 bash ./scripts/setup.sh
ssh -L 8080:127.0.0.1:80 user@<server-ip>   # the API is now at http://127.0.0.1:8080
```

`NGINX_LISTEN` accepts a port (`8080`) or an address with a port (`127.0.0.1:80`). Changing it later regenerates the nginx site.

**Public, with Let's Encrypt.** Point a DNS record at the server, set that domain in the nginx site, and let certbot add TLS and the redirect:

```bash
sudo sed -i 's/server_name _;/server_name vpn.example.com;/' /etc/nginx/sites-available/amnezia-api
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vpn.example.com
```

Later runs of `setup.sh` leave an existing nginx site untouched, so the certificate setup survives updates.

### Docker Compose

For a manual Docker deployment with the prebuilt GHCR image:

```bash
git clone https://github.com/kyoresuas/amnezia-api.git
cd amnezia-api
cp .env.example .env
```

Generate a strong `FASTIFY_API_KEY` and a unique `SERVER_ID`, place them in `.env`, verify the remaining values, then start the service:

```bash
openssl rand -hex 32               # FASTIFY_API_KEY
cat /proc/sys/kernel/random/uuid   # SERVER_ID
```

```bash
docker compose -f docker-compose.ghcr.yml up -d
docker compose ps
```

Set `AMNEZIA_API_VERSION` to a release such as `2.0.0` to pin the deployment. It defaults to `latest`.

To build the image locally from source instead:

```bash
docker compose up -d --build
```

Docker Compose binds the API to `127.0.0.1:4001`. Put a TLS-enabled reverse proxy in front of it when remote access is required.

### Updating

Run the installer again from the repository directory:

```bash
bash ./scripts/setup.sh
```

It performs a fast-forward update, detects the current Docker/PM2 mode, rebuilds the application, and preserves the existing `.env`. It also repairs the Xray Stats API on servers set up by earlier versions, which enabled it without the routing rule and could exhaust Xray's file descriptors. `amnezia-xray` is restarted only when its config actually changes.

## Releases and container images

Every `vX.Y.Z` release publishes a multi-platform image for `linux/amd64` and `linux/arm64`:

```bash
docker pull ghcr.io/kyoresuas/amnezia-api:latest
docker pull ghcr.io/kyoresuas/amnezia-api:2.0.0
```

Stable releases receive `latest`, major, minor, exact, and `v`-prefixed tags. Each image includes OCI metadata, an SBOM, and a GitHub provenance attestation. The corresponding GitHub Release includes generated release notes and the portable OpenAPI contract.

## Authentication

Protected routes require the API key in the `x-api-key` header:

```http
x-api-key: <FASTIFY_API_KEY>
```

`/healthz`, `/metrics`, and `/docs` are intentionally unauthenticated. Restrict `/metrics` and `/docs` at the reverse proxy if they should not be public.

## API reference

![Swagger UI overview](docs/assets/swagger-overview.png)

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/clients` | List clients with traffic and connection status |
| `POST` | `/clients` | Create a client and return an importable config |
| `PATCH` | `/clients` | Change status or expiration without rotating the config |
| `POST` | `/clients/qr` | Generate one or more Amnezia-compatible QR codes |
| `DELETE` | `/clients` | Delete a client |
| `GET` | `/server` | Return server identity, capacity, and enabled protocols |
| `GET` | `/server/load` | Return CPU, RAM, disk, network, and Docker metrics |
| `GET` | `/server/backup` | Export the server configuration |
| `POST` | `/server/backup` | Import a server configuration backup |
| `POST` | `/server/reboot` | Reboot the server |
| `GET` | `/healthz` | Health check |
| `GET` | `/metrics` | Prometheus metrics |

> [!NOTE]
> Always pass `protocol` explicitly. When it is omitted, `POST /clients` uses `amneziawg3`, while `PATCH /clients` and `DELETE /clients` use `amneziawg`.

Swagger UI is available at `/docs` and contains the full request/response schemas, validation rules, and examples.

The versioned [OpenAPI 3.0 contract](openapi/openapi.json) can be downloaded without a running server and imported into Postman, Insomnia, API clients, or SDK generators. The same file is attached to every GitHub Release.

### Create a client

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

```json
{
  "message": "Client created",
  "client": {
    "id": "<client-id>",
    "config": "vpn://...",
    "protocol": "amneziawg3"
  }
}
```

### List clients

```bash
curl "https://vpn.example.com/clients?skip=0&limit=100" \
  -H "x-api-key: <FASTIFY_API_KEY>"
```

### Disable or resume a client

Disabling a client preserves its keys and config. Set `status` back to `active` to restore access.

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

### Use it from code

<details>
<summary>Node.js and Python examples</summary>

`expiresAt` is a Unix timestamp in seconds, or `null` for no expiration.

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
# Python 3 with requests
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

## Configuration

The installer creates `.env` from `.env.example` and fills the most important values automatically.

| Variable | Description |
| --- | --- |
| `FASTIFY_ROUTES` | Fastify bind address in `host:port` format |
| `FASTIFY_API_KEY` | Secret expected in the `x-api-key` header; minimum 32 characters |
| `CORS_ORIGINS` | Comma-separated browser origins; CORS is disabled when empty |
| `PROTOCOLS_ENABLED` | Comma-separated list: `amneziawg,amneziawg3,xray` |
| `SERVER_ID` | Stable unique server identifier; the installer generates one for new installations |
| `SERVER_NAME` | Human-readable server name |
| `SERVER_REGION` | Region, availability zone, or custom label |
| `SERVER_WEIGHT` | Routing weight; the recommended range is `1..1000` |
| `SERVER_MAX_PEERS` | Maximum number of clients on this server |
| `SERVER_PUBLIC_HOST` | Public host or domain placed into generated endpoints |
| `DOCKER_GID` | Docker socket group ID used by Docker mode |
| `DOCKER_API_VERSION` | Docker Engine API version used by the bundled CLI |
| `AMNEZIA_API_VERSION` | GHCR image tag used by `docker-compose.ghcr.yml`; defaults to `latest` |
| `NGINX_LISTEN` | Installer only: nginx listen port or `address:port`; defaults to `80`, see [HTTPS and private access](#https-and-private-access) |

## Security

Amnezia API can modify VPN configuration and control Amnezia containers. Treat it as privileged infrastructure software.

- Never expose the API key over plain HTTP outside a trusted private network.
- Terminate TLS with Nginx, Caddy, Traefik, or another trusted reverse proxy.
- Restrict inbound access by IP, private network, or VPN whenever possible.
- Rotate `FASTIFY_API_KEY` if it may have been exposed.
- Keep `CORS_ORIGINS` empty for server-to-server use. If a browser client is required, list only its exact `http://` or `https://` origins.
- Docker mode mounts `/var/run/docker.sock`; access to this socket is highly privileged. Run the API only on a trusted host and keep dependencies updated.
- `/docs` and `/metrics` do not require the API key by default. Protect them at the reverse proxy when appropriate.
- Do not publish real API keys, `vpn://` configs, QR codes, backups, or unredacted production responses in issues or screenshots.

The service uses constant-time API-key comparison, rate limiting, request validation, and security headers. These controls do not replace TLS, network isolation, or host hardening.

Report suspected vulnerabilities privately by following the instructions in [SECURITY.md](SECURITY.md). Do not open a public issue for a security report.

## Development

```bash
npm ci
npm run dev
```

Before submitting a change:

```bash
npm run lint
npm test
npm run build
npm run openapi:check
```

When routes or schemas change, regenerate the portable contract with `npm run openapi:generate`. CI runs lint, tests, build, and contract checks on Node.js 20, 22, and 24. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution workflow.

## Ecosystem

- [amnezia-panel](https://github.com/slowy19/amnezia-panel) — a web administration panel built on top of Amnezia API.
- [amnezia-vpn-cli](https://github.com/eaglexer/amnezia-vpn-cli) — the `amz` terminal client that creates, lists, and revokes keys through an SSH tunnel to Amnezia API.
- [amnezia-protocols](https://github.com/kyoresuas/amnezia-protocols) — command-line installers for AmneziaWG 3.1, AmneziaWG 1.5, and Xray REALITY with the same container layout as the Amnezia app, so Amnezia API works on top of them.
- [ru-direct](https://github.com/kyoresuas/ru-direct) — daily-updated lists of Russian subnets and domains for split tunneling in AmneziaVPN, WireGuard, Xray, and more.

If you build an integration, bot, SDK, or panel using this API, open an issue or pull request to add it here.

## Support the project

A star on GitHub helps other Amnezia operators find the project. If Amnezia API is useful to you, you can also support its development:

- **TON:** `kyoresuas.ton`
- **TON wallet address:** `UQATzyMcVoZudjaA5Rc9w5TV_lIqxh9DPk0gSnjkLVvwEVqz`
- **USDT on TRON (TRC-20):** `TJSLjDo4yRgHr9JqqEcrkbC51bP9DCiBC7`

Please verify the network before transferring cryptocurrency.

## Project status and support

Bug reports and feature requests are welcome in [GitHub Issues](https://github.com/kyoresuas/amnezia-api/issues).

- Telegram: [@stercuss](https://t.me/stercuss)
- Email: [hey@kyoresuas.com](mailto:hey@kyoresuas.com)

## Disclaimer

This is an independent community project. It is not affiliated with, sponsored by, or officially endorsed by the Amnezia project.

## License

[MIT](LICENSE)
