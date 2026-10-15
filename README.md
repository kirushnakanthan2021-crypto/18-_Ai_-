# Velora AI — AI Video Studio Starter

Free-to-start starter for an adults-only AI video studio. The current version includes a prompt-studio UI and a basic Express authentication backend. **Actual AI video generation is not connected yet**; the prompt button is preview-only.

## Current features
- Responsive dark UI, prompt box, aspect-ratio and duration choices
- Basic age-confirmation gate (not legal-grade age verification)
- Email/password registration and login
- Password hashing with bcryptjs
- Server-side sessions stored in SQLite; HttpOnly/SameSite cookie, Secure in production
- Basic login/register rate limiting, Helmet security headers
- Health endpoint at `/api/health`

## Run locally
1. Install Node.js 20 or newer.
2. Clone this repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set a long random `SESSION_SECRET`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Important deployment notes
- Use HTTPS in production and set `NODE_ENV=production`.
- Set `SESSION_SECRET` to a unique random secret in your host's secret/environment settings. Never commit `.env`.
- SQLite files need persistent storage. If your host has ephemeral storage, move to a managed database and a production session store before launch.
- Add CSRF protection and review cookie/proxy configuration before exposing state-changing endpoints publicly.
- The age checkbox is only a basic UI gate. Before launch, implement legally appropriate age assurance, privacy notices, moderation, reporting, retention/deletion policies, and jurisdiction-specific compliance.
- Only allow lawful content featuring consenting adults. Block minors, non-consensual intimate imagery/deepfakes, and content that violates provider rules.
- Never put AI provider API keys in frontend code. Add provider integration only in server-side code after selecting a provider that permits your intended use.

## Planned next steps
1. Add CSRF protection and production database/session-store setup.
2. Select a provider with a suitable free tier and policies compatible with the site's intended lawful adult use.
3. Add a server-side generation job endpoint, queue, quotas, and usage tracking.
4. Add upload validation, secure file storage, moderation, deletion controls, and deployment instructions.

This is a starter implementation, not a production-ready adult platform. Review and test security, privacy, legal, and provider requirements before public launch.
