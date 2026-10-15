# Android-only setup guide

You can work on this project from an Android phone using a browser-based development environment. You do not need to install Node.js on your phone.

## Option A: GitHub Codespaces (best if available on your account)

1. Open this repository: https://github.com/kirushnakanthan2021-crypto/18-_Ai_-
2. Tap the green **Code** button, then **Codespaces**.
3. Choose **Create codespace on main** if that option is available.
4. Wait for the browser editor to open. Open the terminal from the menu.
5. Run:
   ```bash
   npm install
   cp .env.example .env
   ```
6. Edit `.env` and replace `SESSION_SECRET` with a long random value. Do not commit `.env`.
7. Start the app:
   ```bash
   npm run dev
   ```
8. When Codespaces detects port 3000, open its forwarded URL in the browser. Keep the Codespace running while testing.

Codespaces availability and free usage depend on your GitHub account's current quota and plan. If the Codespaces menu is unavailable, use Option B.

## Option B: GitHub web editor for code changes

1. Open a file in this repository and tap the pencil icon to edit it.
2. Save changes by committing them to a branch.
3. This edits code but does not run the Node.js backend by itself. To test the app, use a Node.js environment such as Codespaces or a compatible cloud IDE.

## Test checklist

- Open the forwarded app URL.
- Confirm the 18+ checkbox and continue.
- Register using a test email and a unique password (10+ characters).
- Refresh the page and confirm the session is still recognized.
- Log out and log in again.
- Test a wrong password.
- Confirm the prompt button only prepares a prompt; it does not yet generate a video.

## Important

- Do not paste API keys or passwords into chat or commit them to GitHub.
- The app is a development starter, not ready for a public launch.
- The current SQLite files live on the app's local filesystem. Some cloud environments erase local files when they restart or redeploy. Before public launch, choose persistent managed database/session storage.
- A free deployment may sleep, impose quotas, or have limited storage. Check the host's current terms before choosing it.
- Actual AI video generation is not connected yet. Choose a provider only after confirming its current pricing, content policy, and support for lawful adult-oriented use.
