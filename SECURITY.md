# Security Policy

Amnezia API manages VPN credentials, configuration, containers, and host-level operations. Please treat suspected vulnerabilities as sensitive.

## Supported versions

Security fixes are applied to the latest code on the `main` branch. Until versioned releases are published, older commits are not maintained separately.

## Reporting a vulnerability

Do not open a public GitHub issue.

Email [hey@kyoresuas.com](mailto:hey@kyoresuas.com) with:

- a clear description of the vulnerability and its impact;
- affected routes, protocols, deployment modes, and versions or commit SHA;
- minimal reproduction steps or a proof of concept;
- any suggested mitigation;
- whether the report may be credited publicly after a fix.

Remove real API keys, VPN configs, QR codes, backups, client identifiers, IP addresses, and other sensitive production data. Use disposable test credentials whenever possible.

The report will be reviewed before details are made public. Please allow time for investigation and remediation, and coordinate disclosure with the maintainer.

## Deployment responsibility

This project controls privileged VPN infrastructure. Operators are responsible for TLS termination, network restrictions, API-key rotation, Docker socket protection, dependency updates, and host security. See the security section in [README.md](README.md#security).
