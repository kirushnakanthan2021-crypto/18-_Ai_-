# Dating Website Starter (subfolder)

This starter is being added alongside the existing project files; it does not replace the existing AI-video website.

## Planned stack
- Next.js + TypeScript for the website
- Supabase Auth, Postgres, Storage, and Realtime
- WebRTC for browser-to-browser video calls (signaling and STUN/TURN still need setup)
- A payment provider with supported merchant-country onboarding; payment state must be confirmed by a server-side webhook
- Admin-only moderation tools protected by server-side role checks

## Build order
1. Create a Supabase project at https://database.new.
2. In Supabase SQL Editor, run `schema.sql`.
3. Create a Next.js app using the official Supabase template:
   `npx create-next-app@latest dating-web -e with-supabase`
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in local `.env.local`.
5. Implement sign-up/login and profile onboarding (the SQL requires users to be 18+).
6. Add private photo upload and moderation; use Supabase Storage policies and validate file type/size.
7. Add discovery and likes; mutual likes create a match using the SQL trigger.
8. Add realtime chat. Check match participation on every message operation.
9. Add report/block, admin moderation, and audit logs before public launch.
10. Add video calls with explicit accept/decline, call timeouts, and a STUN/TURN service.
11. Add premium checkout only after choosing a payment provider that supports your merchant country. Never trust client-side payment status; update subscriptions from verified webhooks.
12. Deploy to a host whose plan permits your intended commercial use; configure a custom domain, HTTPS, privacy policy, terms, deletion flow, and backups.

## Important
- This SQL is a database foundation, not a complete production website.
- Before launch, review all Row Level Security policies and add automated tests.
- Do not commit API secrets, service-role keys, payment secrets, or TURN credentials.
- A worldwide dating service should have 18+ eligibility, block/report tools, consent and privacy controls, anti-spam/rate limits, and a clear process for urgent safety reports.
