# Amnezia API

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-5.x-000000?style=flat-square&logo=fastify&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

[Русский](README.md) · **English**

This API is designed for remote management of Amnezia and to simplify programmatic access to VPN management — for integration with apps, admin panels, and bots.

## Supported protocols

- **AmneziaWG**
- **Xray**

## Quick start

### Install & run

```bash
# Install Git
apt install git

# Clone repository
git clone https://github.com/kyoresuas/amnezia-api.git

# Go to repo
cd ./amnezia-api

# Run API
bash ./scripts/setup.sh
```

### Configuration

Configuration is generated automatically when running `./scripts/setup.sh`.

- **`.env.example`**: configuration example
- **`.env`**: your configuration

## API documentation

Swagger UI is available at **`/docs`**. Open in the browser:

- `http://<your_server_ip>/docs`

There you can review schemas, parameters, request examples, and responses.

## Authentication

All routes are protected by a preHandler and require the header:

- `x-api-key: <FASTIFY_API_KEY>`

Where `FASTIFY_API_KEY` is defined in `.env`.

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
