# To-Do List Web App

A purple/orange-themed to-do list **web application** where:
- Users log in with their **company webmail**, and must **verify their email** (6-digit code) before their first login is allowed.
- **Face ID / Touch ID / Windows Hello** can unlock sign-in on return visits, via the browser's real **WebAuthn** API.
- Every time a user **adds a task**, and whenever they tap **"Confirm Today's Tasks"**, your **supervisor is emailed automatically** via SMTP.

```
project/
  backend/    Node.js + Express API (SMTP, verification, tasks, WebAuthn)
  frontend/   React web app (Vite)
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `SUPERVISOR_EMAIL` → the **full address**, e.g. `thiyagarajdhilakshan@yourcompany.com` (a name alone won't work as a mail destination).
- `SMTP_USER` / `SMTP_PASS` → a Gmail address + an **App Password** (not your normal password):
  1. Google Account -> Security -> turn on 2-Step Verification.
  2. Google Account -> Security -> App passwords -> generate one for "Mail".
  3. Paste the 16-character password into `SMTP_PASS`.
- `ALLOWED_EMAIL_DOMAIN` -> your company's domain (e.g. `yourcompany.com`) so only that webmail domain can sign up/log in. Leave blank while testing with Gmail addresses.
- `RP_ID` / `ORIGIN` -> for local dev, leave as `localhost` / `http://localhost:5173`. In production, set these to your real domain (see comments in `.env.example`) — WebAuthn is strict about this and Face ID will fail if they don't match what's in the browser's address bar.

Run it:
```bash
npm start
```
Runs on `http://localhost:4000`. Data is stored in `backend/db.json` (swap for a real database later — only `backend/utils/db.js` needs to change).

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```
Opens at `http://localhost:5173`. If your backend isn't on `localhost:4000`, create `frontend/.env` with:
```
VITE_API_URL=https://your-backend-url/api
```

## 3. How the flows work

**Sign up -> verify -> sign in**
1. User signs up with name, company webmail, password.
2. Backend emails a 6-digit code to that address.
3. User enters the code on the Verify page; backend marks the account `verified: true`.
4. Login is **blocked** (`403 requiresVerification`) until the account is verified.

**Face ID / Touch ID (WebAuthn)**
- This is real browser biometric auth, not a simulation — it calls `navigator.credentials` under the hood via `@simplewebauthn/browser` on a device with Face ID/Touch ID/Windows Hello.
- After a user's first password login, they're prompted to enable it (or can do so anytime from Profile).
- On the Sign In page, typing the email and tapping "Sign in with Face ID / Touch ID" skips the password entirely.
- Only works over `https://` in production (and `http://localhost` in dev) — this is a browser security requirement, not something this app can work around.

**Supervisor emails**
- Adding a task (`POST /api/tasks`) emails `SUPERVISOR_EMAIL` with the task's details immediately.
- "Confirm Today's Tasks" on the Home screen (`POST /api/tasks/confirm-today`) emails a summary of everything scheduled for today and whether it's done.

## 4. Before going to production

- Replace `backend/db.json` with a real database (Postgres/MongoDB) — only `utils/db.js` needs rewriting.
- Switch SMTP from Gmail to your company's real mail server (just change the `SMTP_*` values in `.env`).
- Deploy the backend behind HTTPS, set `RP_ID`/`ORIGIN` to the real domain, and move `JWT_SECRET` to a securely generated value.
- Consider rate-limiting `/auth/signup` and `/auth/resend-code` to stop code-spamming.
- `npm run build` in `frontend/` produces a static `dist/` folder you can host anywhere (Netlify, Vercel, S3, your own server, etc.).
