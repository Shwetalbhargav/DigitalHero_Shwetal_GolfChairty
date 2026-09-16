# Digital Heroes — B03 homepage

JavaScript Express/Mongoose API and React/Vite client. This release adds accessible shared components, public/member/admin layout previews, an interactive UI reference, and live readiness. Membership, payments, scores and draws belong to later branches.

## Setup

Requires Node.js 24+ and npm, plus a reachable MongoDB instance. Run from the project root:

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm run dev
```

Edit backend/.env with your MongoDB URI before starting. Local default is mongodb://127.0.0.1:27017/digital_heroes. Start your own local MongoDB service or use Atlas; no database is bundled. Vite runs at http://localhost:5173 and proxies /api to port 4000. Missing required variables, an unavailable initial database or an occupied port fail startup clearly. Never put secrets in VITE_ variables.

## Checks and production

``powershell
npm run lint
npm run format:check
npm test
npm run build
npm start

# In another terminal; production assets preview only:

npm run preview -w frontend -- --port 4173

```

The build checks backend JavaScript syntax and emits frontend/dist. The backend runs native ESM without transpilation. Production static hosting must proxy /api to the backend or build with VITE_API_BASE_URL=https://your-api.example/api. Set CLIENT_ORIGIN to the exact frontend origin, NODE_ENV=production and private MONGODB_URI on the server. Preview does not provide the development API proxy; use a public API URL and matching CLIENT_ORIGIN for a connected preview.

Use GET /api/health for process liveness and GET /api/ready for database readiness. SIGINT/SIGTERM drain HTTP requests, then close MongoDB; the shutdown deadline forces a nonzero exit if draining hangs. API requests have an eight-second client timeout. Backend DB operations use DB_TIMEOUT_MS.

One root package-lock.json covers both workspaces. npm run format formats only implementation and documentation, preserving source planning/design files. No cloud service, credentials, payment or deployment is provisioned.

See [API contract](docs/API.md), [decisions](docs/Decisions.md), [architecture and function walkthrough](docs/Architecture.md), and [verification and PR handoff](docs/Handoff.md).
```

## UI foundation and browser checks

Use /ui for the component library, /dashboard for the member shell, /admin for the admin shell and /status for the live connection. Member/admin pages are openly accessible previews with no private data or authorization. Each shell also has /ui and /status child routes.

To work on the UI without MongoDB, run npm run dev -w frontend. The service card will honestly show an unavailable response while the rest of the foundation works. For full-stack development follow the environment setup above.

Run from the root:

```powershell
npm ci
npx playwright install chromium
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e -w frontend
```

Playwright starts Vite on port 5173 (or reuses a running server), checks keyboard behavior, axe accessibility rules, and overflow at 360/768/1440px, then captures screenshots under docs/screenshots/b02. Production static hosting must rewrite non-asset browser routes to index.html while keeping /api routed to Express.

See [component/function contracts](docs/UI-Foundation.md) and [B02 results and prepared commit/PR](docs/B02-Handoff.md).

## Homepage

The homepage is at /. It links to /how-it-works for a complete explanation and to /register and /charities for explicit availability notices while those later features are being built. B02's overview is retained at /foundation. The homepage uses labelled illustrative score/prize/cause data and never displays invented live totals.

Run npm run dev -w frontend to view it without a database. npm test runs unit/regression tests; npm run test:e2e -w frontend runs Chromium acceptance checks and captures docs/screenshots/b03. Setup, lint and build commands above are unchanged. See [homepage contracts](docs/Homepage.md) and [B03 handoff](docs/B03-Handoff.md).
