# Security policy

This repository is an early development starter, not a production-ready adult platform.

## Responsible use
- Only lawful content featuring consenting adults.
- Do not create, upload, or distribute sexual content involving minors.
- Do not create or distribute non-consensual intimate imagery or sexual deepfakes.
- Respect the AI provider's terms, applicable law, privacy, and copyright.

## Before public launch
- Replace development secrets with long, unique secrets stored in the host's secret manager.
- Enforce HTTPS and configure secure cookies correctly behind the selected hosting proxy.
- Add CSRF protections and verify authorization on every private API route.
- Move users and sessions to persistent managed storage with backups and deletion procedures.
- Add robust age assurance appropriate to the jurisdictions served, moderation, abuse reporting, and privacy/retention controls.
- Rate-limit authentication and generation endpoints; apply per-user quotas and cost limits.
- Keep AI provider API keys server-side only.
- Test dependency vulnerabilities and run security tests before accepting real users.
