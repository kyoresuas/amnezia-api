# Contributing to Amnezia API

Thanks for helping improve Amnezia API. Bug fixes, protocol compatibility improvements, documentation, tests, and integrations are welcome.

## Before you start

- Search existing issues before opening a new one.
- Use a GitHub issue for substantial features or behavior changes so the approach can be discussed first.
- Do not publish API keys, `vpn://` configs, QR codes, backups, server addresses, or other production secrets.
- Report security vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## Local development

Requirements:

- Node.js 20 or newer
- npm
- Docker only when testing integration with Amnezia containers

Install dependencies and start the development server:

```bash
npm ci
cp .env.example .env
npm run dev
```

Use test credentials and disposable containers. Do not point development builds at a production VPN server.

## Project checks

Run all required checks before opening a pull request:

```bash
npm run lint
npm test
npm run build
```

Use `npm run test:watch` while developing and `npm run test:coverage` when changing service behavior.

## Pull requests

1. Keep each pull request focused on one problem.
2. Explain the user-visible behavior and the reason for the change.
3. Add or update Vitest tests for behavior changes and bug fixes.
4. Update both `README.md` and `README_RU.md` when public behavior or setup changes.
5. Call out breaking API, configuration, deployment, or backup-format changes explicitly.
6. Never commit `.env`, generated configs, real server data, or build and coverage artifacts.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE).
