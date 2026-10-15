# Velora AI — AI Video Studio Starter

Free-to-start starter for an adults-only AI video studio. This repository includes a prompt-studio UI, a basic Express authentication backend, and a server-side Replicate image-to-video integration. Actual generation requires a valid `REPLICATE_API_TOKEN` and provider credits.

## Current features
- Responsive dark UI, prompt box, aspect-ratio and duration choices
- Basic age-confirmation gate (not legal-grade age verification)
- Email/password registration and login
- Password hashing with bcryptjs
- Server-side sessions stored in SQLite; HttpOnly/SameSite cookie, Secure in production
- Basic login/register rate limiting and Helmet security headers
- Health endpoint at `/api/health`
- Image upload and server-side image-to-video job creation/status polling via Replicate

## Android setup
Follow [ANDROID_SETUP.md](ANDROID_SETUP.md) to open and test the project from an Android phone using a browser-based development environment.

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`, set a long random `SESSION_SECRET`, and add `REPLICATE_API_TOKEN` from https://replicate.com/account/api-tokens.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Important deployment notes
- Use HTTPS in production and set `NODE_ENV=production`.
- Set `SESSION_SECRET` to a unique random secret in the host's secret/environment settings. Never commit `.env`.
- SQLite files need persistent storage. If your host has ephemeral storage, move to a managed database and a production session store before launch.
- Add CSRF protection and review cookie/proxy configuration before exposing state-changing endpoints publicly.
- The age checkbox is only a basic UI gate. Before launch, implement legally appropriate age assurance, privacy notices, moderation, reporting, retention/deletion policies, and jurisdiction-specific compliance.
- Only allow lawful content featuring consenting adults. Block minors, non-consensual intimate imagery/deepfakes, and content that violates provider rules.
- Never put AI provider API keys in frontend code. Add provider integration only in server-side code after selecting a provider that permits your intended use.

## Planned next steps
1. Add CSRF protection and production database/session-store setup.
2. Review the selected Replicate model's current pricing and content rules before using it. The integration uses `prunaai/p-video-2`; it is not a guarantee that explicit sexual content is permitted.
3. Add a persistent job store, per-user quotas, usage tracking, moderation, and secure output storage before public launch.
4. Add CSRF protection, robust age assurance, deletion controls, and deployment-specific security checks.

This is a starter implementation, not a production-ready adult platform. Review and test security, privacy, legal, and provider requirements before public launch.
