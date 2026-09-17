# Digital Heroes

Express/Mongoose API and React/Vite frontend with a charity directory, cookie authentication, simulated subscriptions/donations, rolling golf scores, monthly draw publication, private winning evidence and audited administration/reporting. All payments and recorded payouts are simulated; no money moves. B25/B26 prepare configuration and local readiness only. Nothing has been deployed.

## Quick disposable demo (no database setup)

Use Node.js 24+ and npm. From the repository root, run `npm ci`, then `npm run demo -w backend`. In a second PowerShell terminal run:

```powershell
$env:API_PROXY_TARGET='http://127.0.0.1:4011'
$env:VITE_API_BASE_URL='/api'
npm run dev -w frontend -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. This starts a fresh, disposable local MongoDB replica set, real API and fictional member/admin fixtures; it never reads backend `.env`. Use `operations-member@example.test` or `operations-admin@example.test`, password `local-browser-fixture-password`. These public test credentials exist only in the disposable test database and must never be used for a persistent or external account. Stop both terminals with Ctrl+C; demo data is discarded. The initial run may download MongoDB 8.2.6. See [readiness and exact commands](docs/Local-Readiness.md).

## Local setup

For persistent local development, use Node.js 24+, npm and a local MongoDB replica set. Billing, scores, draw publication and administrative changes use transactions. Atlas configuration is documented for future use only; the local gate does not connect to it.

Run from the repository root:

```powershell
npm ci
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Put the generated value in `backend/.env` as `AUTH_SECRET`, set your private `MONGODB_URI`, and set `CLIENT_ORIGIN=http://localhost:5173`. Never put secrets in `VITE_` variables. Real `.env` files are ignored. Example files contain no credentials. Existing environment files are preserved by the commands above.

For a new local MongoDB development instance, install MongoDB and mongosh, create a dedicated data directory, then start it with `mongod --replSet rs0 --bind_ip 127.0.0.1 --dbpath <your-data-directory>`. In a second terminal run `mongosh --eval "rs.initiate()"` once. Use `mongodb://127.0.0.1:27017/digital_heroes?replicaSet=rs0`. Do not reinitialize an existing configured replica set.

```powershell
npm run seed -w backend
npm run dev
```

The idempotent seed inserts clearly fictional demo charities without overwriting existing records. Vite serves `http://localhost:5173` and proxies `/api` to Express on port 4000. Register, choose a charity, choose a plan and explicitly approve or decline a simulated payment. Membership activates only after server-side adapter success. Billing and profile remain reachable after lapse. Cancellation preserves access through the displayed UTC period end; renewal is manual after expiry.

Demo prices default to GBP 19 monthly / GBP 190 yearly, prize allocation 50%, and charity contribution 10–50%. These are declared demo assumptions configurable through backend environment variables. `PAYMENT_MODE=simulated` is prohibited in production; unset mode defaults to disabled.

## Verification

```powershell
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e -w frontend
npm run test:e2e -w frontend -- --config playwright.integration.config.js
```

The integration command (also `npm run test:integration -w frontend`) starts a real isolated MongoDB replica set, Express on 4011 and Vite on 5173; it never reads backend `.env` or uses your database. Leave these ports free. Browser tests cover registration, login, donations, monthly/yearly subscriptions, cancellation, scores, profile/dashboard, admin users/charities, draw review/publication, private proof rejection/resubmission/approval, recorded payout and reports. Mobile/desktop accessibility and overflow checks produce screenshots under `docs/screenshots/run1` and `docs/screenshots/operations`. See [local results](docs/Local-Readiness.md) and [code walkthrough](docs/Operations-Handoff.md). Earlier handoffs describe historical scope and are superseded by these documents.

One root `package-lock.json` covers both workspaces. `npm run build` checks backend syntax and emits `frontend/dist`. [Deployment configuration](docs/Deployment.md) documents future Render/Vercel/Atlas/Cloudinary setup, additive indexes and rollback. Its API destination is intentionally unresolved. Production billing is disabled; real billing, banking, Supabase and email account recovery are not implemented. No hosting or external resources are provisioned here.

`GET /api/health` is liveness; `/api/ready` reflects database readiness. Startup fails on invalid environment or unavailable initial database. Shutdown drains HTTP and disconnects MongoDB. The API client uses credentialed requests, CSRF headers and an eight-second timeout.

See [API](docs/API.md), [decisions](docs/Decisions.md), [architecture](docs/Architecture.md), [UI contracts](docs/UI-Foundation.md), [homepage](docs/Homepage.md), [charity API](docs/Charity-API.md), and the historical B05–B09 handoffs. `/ui` and `/foundation` retain the component examples. `/dashboard` requires authentication and `/admin` requires a server-owned admin role.
