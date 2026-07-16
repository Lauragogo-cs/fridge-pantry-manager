# Fridge Pantry Manager

A web app that helps households track the food stored in the fridge, freezer, and pantry so nothing gets forgotten and wasted past its expiry date.

## Features

- **Item tracking & expiry alerts** — record name, category, quantity, storage location, purchase date, and expiry date. The dashboard groups items into "Expired / Expiring soon (within 3 days) / Fresh" with color-coded highlights. Loose items that are hard to count precisely (half a cabbage, a handful of greens) can instead be tracked with a lightweight "plenty / running low / gone" state.
- **Push notifications** — opt in on the Household page to get a browser push notification (via Web Push, works even when the app is closed) when items are expiring soon or have expired.
- **Barcode scanning** — scan a product barcode with the camera and auto-fill the product name via the Open Food Facts open database (manual barcode entry is also supported).
- **Receipt OCR with batch add** — photograph or upload a grocery receipt; Tesseract.js runs in the browser to extract text. Every recognized line is pre-checked so a whole receipt can be added in one tap, with expiry dates auto-suggested from a built-in shelf-life table (results should be reviewed/edited afterward).
- **Recipe suggestions** — a "What to cook" page suggests recipes from a small built-in recipe database, prioritizing ones that use up ingredients that are about to expire.
- **Consumption stats framed in money** — if you fill in an optional per-item price, the stats page shows how much money you've actually saved vs. lost to waste, not just an abstract percentage. Also tracks most frequently bought items and items most often wasted over the last 90 days.
- **Household sharing** — create a new household or join an existing one with an invite code at sign-up; members of the same household share one inventory.
- **Mobile-friendly gestures** — swipe an item card right to mark it eaten, left to discard, in addition to the tap targets.

## Tech stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + react-router-dom. Barcode scanning via html5-qrcode, receipt OCR via tesseract.js, expiry push notifications via the Web Push API + a small service worker (`client/public/sw.js`).
- **Backend**: Node.js + Express + TypeScript, JWT-based auth, `web-push` for sending notifications, and an in-process hourly scheduler (`server/src/notifyScheduler.ts`) that checks for soon-to-expire items — no external cron service needed.
- **Database**: Node.js's built-in `node:sqlite` (Node 22+) — a single-file database with zero configuration and zero external dependencies, well suited to personal/household scale. All data access logic is contained in `server/src/db.ts`, so migrating to a production database like PostgreSQL/MySQL later only requires replacing that one file.

## Project structure

```
fridge-app/
  server/    # Backend API (Express + node:sqlite)
  client/    # Frontend web app (React + Vite)
```

## Running locally

Requires Node.js 22 or later (needed for the built-in `node:sqlite` module).

### 1. Start the backend

```bash
cd server
npm install
npm run dev
```

The backend runs on `http://localhost:4000` by default, and the database file is created automatically at `server/data/fridge.db`.
To change the port or JWT secret, edit `server/.env` (make sure to change `JWT_SECRET` before deploying to production).

Push notifications need a VAPID keypair. Generate one with `npx web-push generate-vapid-keys` and put the values in `server/.env` as `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (see `server/.env.example`). If left blank, push notifications are silently disabled and everything else still works.

### 2. Start the frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

Open the URL printed in the terminal (defaults to `http://localhost:5173`). The frontend talks to the backend via `VITE_API_URL` in `client/.env`, which defaults to `http://localhost:4000/api`.

### 3. Getting started

1. Register an account and choose "Create a new household" — this generates a 6-character invite code.
2. Share the invite code with family members; when they register, they choose "Join an existing household" and enter the code to share the same inventory.
3. Add items on the "Add" page, or use the "Scan/Receipt" page to capture them quickly and fill in the rest.
4. The dashboard highlights items by how close they are to expiring. Mark items as eaten or discarded with the buttons on each card — the "Stats" page uses this history to show waste rate and shopping suggestions.

## Try it on your phone (free deploy, no credit card)

The app is a single deployable service: the backend (Express) serves the built frontend itself, so one free web service on [Render](https://render.com) is enough to open the app from your phone's browser.

1. Sign in to [render.com](https://render.com) with your GitHub account.
2. **New > Web Service**, connect the `fridge-pantry-manager` GitHub repo.
3. Settings:
   - **Root Directory**: leave blank (repo root)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add environment variables: `JWT_SECRET` (Render can generate a random one for you), and optionally `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` if you want push notifications to work (generate them locally with `npx web-push generate-vapid-keys`).
5. Deploy. Once it's live, open the `https://<your-app>.onrender.com` URL on your phone — it works like a normal mobile website, and you can "Add to Home Screen" to make it feel like an app.

Notes:
- The free tier spins the service down after 15 minutes of inactivity; the next request takes 30–60 seconds to wake it back up. This also means data gets wiped periodically and push notifications aren't perfectly timely — see "Known limitations" below for why, and the fix options.
- Camera-based barcode scanning requires HTTPS (which Render provides automatically) or `localhost` — it won't work over a plain `http://` LAN address.
- On iPhone, push notifications only work if the app is installed via "Add to Home Screen" and opened from that icon, not from a regular Safari tab — see "Known limitations" below.

## Suggestions for going to production (as the user base grows)

- **Database**: replace `server/src/db.ts` with a connection to PostgreSQL (Prisma or Drizzle ORM recommended) to support concurrent writes and multi-instance deployments. See "Known limitations" for the free-tier data persistence issue and cheaper interim fixes.
- **Auth**: currently email + password only; consider adding email verification and password reset flows for production.
- **Expiry alerts**: currently shown only when the app is open. For proactive notifications, add a scheduled job (cron) that scans for soon-to-expire items and notifies users by email or Web Push.
- **Deployment**: the app can also be deployed as two separate services if preferred — backend on any Node 22+ host (Railway, Render, Fly.io) and frontend (`client/dist`) on a static host (Vercel, Netlify, Cloudflare Pages); just point `client/.env.production`'s `VITE_API_URL` at the backend's URL instead of `/api`.
- **Mobile**: to ship a native app, the existing frontend can be wrapped with Capacitor for iOS/Android without rewriting the business logic.

## Known limitations & future improvements

- **Data doesn't survive free-tier restarts.** Render's free Web Service plan has an *ephemeral* filesystem: any time the service restarts — including simply being spun down after 15 minutes of inactivity and spun back up on the next visit — the local disk resets to the deployed image, and the SQLite database file goes with it. This is a structural consequence of pairing a local file database with free hosting, not an application bug. Fix options, roughly in order of effort:
  1. Do nothing — fine for a casual demo/trial where occasional resets don't matter.
  2. Upgrade to Render's Starter plan (~$7/mo) and attach a persistent disk (~$0.25/GB/mo) mounted at `server/data`. Requires no code changes.
  3. Migrate `server/src/db.ts` to a free externally-hosted database (e.g. Turso for a SQLite-compatible option, or a managed Postgres) so data lives independently of the app server's own disk. More upfront work, but stays free and removes the restart-persistence problem entirely.
- **Push notifications have two platform-specific caveats**, both worth knowing before assuming a failed test is a bug:
  - **iOS**: Safari only delivers Web Push to a PWA installed via "Add to Home Screen" and opened from that home-screen icon — granting notification permission from a regular Safari tab silently does nothing, per an Apple platform restriction (iOS 16.4+). The app ships a `manifest.json` so "Add to Home Screen" installs it properly; Android Chrome has no such restriction and works from a normal browser tab.
  - **Free-tier timing**: the expiry-check scheduler (`server/src/notifyScheduler.ts`) runs inside the same process as the web server, so while the service is asleep (see above), scheduled checks don't run — notifications only get (re-)checked once someone visits and wakes the service up. On a paid always-on instance, or by triggering the check via an externally-scheduled HTTP endpoint instead of an in-process timer, this becomes reliably on-time.
- Barcode lookup relies on the public Open Food Facts database, which has limited coverage of local/regional products — items not found can be added manually.
- Receipt OCR runs in the browser and its accuracy depends on photo quality; review the extracted text before saving.
- The first receipt OCR run needs an internet connection to download the recognition model (a one-time download of a few to a few dozen MB).
