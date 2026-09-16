# Digital Heroes — B01 project setup

JavaScript Express/Mongoose API and React/Vite client. This release delivers the runnable platform foundation and a live readiness screen. Membership, payments, scores and draws belong to later branches.

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
