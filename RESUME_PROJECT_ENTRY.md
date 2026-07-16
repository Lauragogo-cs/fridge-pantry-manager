## Fridge Pantry Manager

**Full-Stack Web Application** | React, TypeScript, Node.js, Express, SQLite, Web Push API
[GitHub](https://github.com/Lauragogo-cs/fridge-pantry-manager) · Live demo: *add your Render URL here*

Pick 3–5 bullets below depending on how much space you have and which role you're targeting. They're grouped roughly from "broadest scope" to "most specific technical depth," so trim from the bottom first if you need to shorten.

- Architected and built a full-stack household food-inventory app from scratch — React + TypeScript frontend, Node.js/Express + TypeScript backend — with JWT authentication and multi-tenant data isolation across household groups sharing a single account model.
- Designed and implemented a REST API spanning 20+ endpoints across 7 resource domains (auth, inventory, consumption logs, statistics, push notifications, recipes), backed by a normalized 5-table SQLite schema with a self-migrating schema layer to support zero-downtime upgrades on an already-deployed database.
- Built camera-based barcode scanning (html5-qrcode + Open Food Facts API integration) and client-side OCR receipt parsing (Tesseract.js) with a multi-select batch-import flow, cutting manual data entry from one form per item to a single tap per receipt.
- Implemented end-to-end browser push notifications (Web Push API, VAPID, Service Worker) with an in-process scheduler, proactively alerting users to expiring inventory without any external cron service or third-party notification platform.
- Developed a rule-based recommendation engine that scores a recipe knowledge base against a household's expiring inventory, and an analytics endpoint that converts raw consumption/waste logs into cost-based metrics (money saved vs. wasted) rather than abstract percentages.
- Reduced infrastructure footprint by unifying frontend and backend into a single deployable service (Express serving the built SPA), enabling zero-cost deployment on free-tier cloud hosting with a mobile-responsive, installable UI supporting touch swipe gestures.
- Iterated the product based on a self-conducted market/competitive analysis (grounded in food-waste cost data and existing app landscape), translating prioritized findings directly into 5 shipped features in a single release cycle.

### One-line summary (for a skills section, LinkedIn headline, or cover letter)

Built and deployed a full-stack household inventory app (React/TypeScript, Node/Express, SQLite) featuring barcode/OCR ingestion, Web Push notifications, and a rule-based recipe recommendation engine, architected for zero-cost cloud deployment.

### Notes on how these numbers were derived (so you can defend them in an interview)

- **20+ endpoints / 7 domains**: auth (register, login, me), items (list, get, create, batch-create, update, delete, consume, set-level), stats (summary), barcode (lookup), household (get, rename), push (vapid-key, subscribe, unsubscribe), recipes (suggestions).
- **5-table schema**: households, users, food_items, consumption_logs, push_subscriptions.
- **Self-migrating schema layer**: `ensureColumn()` helper in `db.ts` that checks `PRAGMA table_info` and runs `ALTER TABLE` for any column missing from an existing database file, so the schema can evolve without wiping deployed data.
