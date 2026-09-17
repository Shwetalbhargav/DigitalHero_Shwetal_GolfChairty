# Localhost readiness report — B13–B26

Verified locally on 2026-09-17, Windows, Node.js 24/npm11. The local demo is runnable and the requested test/build gate passed. Production release is **not** claimed. B25/B26 are configuration and local verification only. No Git command/action, remote CI, production connection, push, tag, release or deployment was performed. No deployed URL exists.

## Actual command results

Run all commands from `E:\GreenImpact_Shwetal`.

| Command / check                                                   | Actual result                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                          | PASS — fresh install, 502 packages added, 505 audited, zero reported vulnerabilities. One dependency deprecation warning for whatwg-encoding.                                                                                                                                                                                                                     |
| `npm test`                                                        | PASS — 59 backend tests, 47 frontend tests. No skipped/cancelled tests in this full run.                                                                                                                                                                                                                                                                          |
| `npm run lint`                                                    | PASS — backend and frontend ESLint.                                                                                                                                                                                                                                                                                                                               |
| `npm run build`                                                   | PASS — backend source/script syntax and frontend Vite production build, 130 modules; JS approximately 375 KB / 114 KB gzip.                                                                                                                                                                                                                                       |
| `npm run test:e2e -w frontend`                                    | PASS — 21 browser tests: responsive shells/public pages, accessibility, keyboard dialog/navigation, status injection, real offline recovery and failed-form preservation. This suite stubs API data intentionally; missing local API readiness produced expected proxy diagnostics.                                                                               |
| `npm run test:integration -w frontend`                            | PASS — four real-API browser journeys with freshly seeded isolated MongoDB replica set, Express and Vite, covering 360/768/1440 px and admin/member workflows.                                                                                                                                                                                                    |
| `npm run test:integration -w frontend -- operations.spec.js`      | PASS — one operations journey after presentation cleanup; refreshed screenshots.                                                                                                                                                                                                                                                                                  |
| `node --test backend/test/recovery-config.test.js`                | PASS — three focused environment/envelope/configuration checks. Included in the 59-test full gate.                                                                                                                                                                                                                                                                |
| `npm run demo -w backend` and separate frontend dev command below | PASS — fresh disposable seed, loopback listener, both fixture logins, owned five-score list, dashboard and admin reports. GET `/api/ready` returned ready; frontend `/dashboard/scores` returned 200 and `/api/ready` proxy returned ready. Both listeners were stopped after smoke testing.                                                                      |
| Source/bundle sensitive-marker scan                               | PASS — no credential-bearing MongoDB URI, live-provider key/private-key pattern in inspected source/docs/build; no AUTH_SECRET/MONGODB_URI/CLOUDINARY_API_SECRET or fixture password embedded in frontend assets. This is a bounded pattern check, not a guarantee about unknown secret formats. Private environment file contents were not inspected or printed. |
| `npm run format:check`                                            | FAIL — 18 existing unrelated formatting warnings, listed below. Changed/new scope files were formatted. No broad unrelated formatting rewrite was made.                                                                                                                                                                                                           |

During development, selectors that included the visual required-field asterisk failed in two browser/component checks; accessible-role selectors corrected them. One historical dashboard assertion expected disconnected draw data and was updated to the now-connected honest zero state. A duplicate charity slug exposed a transaction/Mongoose document rollback issue; slug checking now occurs under the shared transaction lock and duplicate errors remain 409. The final full suites pass those cases. An exploratory backend command using only `--test-name-pattern` hung in unrelated fixture hooks and was terminated; use an explicit test file for targeted execution. The normal full runner now has bounded concurrency 2 and timeout 180s.

Formatting-only warnings retained: `backend/scripts/check.js`, `backend/scripts/seed.js`; frontend `src/assets/images/home/SOURCES.md`, `components/home/homeData.js`, `PrizePoolPreview.jsx`, `ScoreDemo.jsx`, `hooks/useFetch.test.jsx`, `modules/auth/auth.test.jsx`, `pages/public/AvailabilityPage.jsx`, `styles/index.css`; docs `B02-Handoff.md`, `B03-Handoff.md`, `B05-Handoff.md`, `B07-Handoff.md`, `B08-Handoff.md`, `Charity-API.md`, `Homepage.md`, `UI-Foundation.md`.

## Start the disposable local demo

Requires Node.js 24+ and npm. The first run can download the MongoDB 8.2.6 test binary. It uses only a generated local test database, local private media and simulated payments. No separate MongoDB installation or `.env` is needed.

Terminal 1 — backend:

```powershell
Set-Location E:\GreenImpact_Shwetal
npm ci
npm run demo -w backend
```

Terminal 2 — frontend:

```powershell
Set-Location E:\GreenImpact_Shwetal
$env:API_PROXY_TARGET='http://127.0.0.1:4011'
$env:VITE_API_BASE_URL='/api'
npm run dev -w frontend -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173` (use 127.0.0.1 consistently, not localhost, because the Origin is exact). The API listens at `http://127.0.0.1:4011`. Ctrl+C stops each process. Data disappears when the backend stops; restarting gives fresh isolated fixtures. Do not run browser tests simultaneously with this demo because they own ports 4011/5173.

| Fictional test account         | Role   | Purpose                                                                              |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------ |
| operations-member@example.test | member | Active yearly demo membership, five scores, prior-month 5-match award awaiting proof |
| operations-admin@example.test  | admin  | Member/charity/draw/winner/report operations                                         |

Both use the publicly documented **test-only** password `local-browser-fixture-password`. These accounts are created only in the disposable harness, never by normal startup or the persistent charity seed. Never reuse these credentials outside the fixture. New registration creates a member; the browser cannot assign an admin role.

Member smoke: sign in → dashboard → scores → historical draw → winnings → upload a genuine small PNG/JPEG. Admin smoke: sign in → `/admin` → members → charities → configure current due monthly draw → simulate → inspect → publish → winners → protected proof → reject/resubmit or approve → record a unique demo settlement reference → reports. To demonstrate fresh signup/subscription, register a new email and explicitly approve/decline the simulated payment. No money moves.

## Persistent local backend/frontend development

Use a dedicated local MongoDB replica set as described in README. Copy example files only if absent, then set a newly generated AUTH_SECRET in backend `.env` and keep CLIENT_ORIGIN=http://localhost:5173. Never point these demo commands at production resources.

```powershell
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
# After configuring the local replica set and private backend environment:
npm run seed -w backend
npm run dev -w backend
```

Separate frontend terminal:

```powershell
$env:API_PROXY_TARGET='http://127.0.0.1:4000'
npm run dev -w frontend
```

Open `http://localhost:5173`. The persistent seed inserts fictional charities idempotently; it does not create a privileged user or overwrite existing work. Use the disposable fixture above for an immediately available admin demo. `npm run dev` at the root can alternatively start both persistent-development processes together.

## Test commands

Stop any demo listeners first. All automated DB tests are isolated; they do not use the configured development database.

```powershell
npm test -w backend
npm test -w frontend
npm run lint
npm run build
# Install local browser binary if this machine has not done so:
npx playwright install chromium
npm run test:e2e -w frontend
npm run test:integration -w frontend
```

Backend-only syntax/build: `npm run build -w backend`. Frontend production build: `npm run build -w frontend`. Target a backend file with `node --test backend/test/draws-winners.test.js` rather than filtering every suite. The root `npm test` runs both backend/frontend tests. No command here pushes code or runs remote CI.

## Coverage and evidence

- Deterministic 0/3/4/5 distinct-match outcomes, random/weighted boundaries, money conservation, single-jackpot carry and simulation purity.
- Stale preview, fixed cutoff history, private drafts/owned results, concurrent publication and immutable results after score edits.
- Secure evidence validation/ownership/size, signed offline Cloudinary transport fixture, cleanup failures, rejection/resubmission and approval-gated exactly-once recorded settlement.
- Admin allowlists/audit reasons/final-admin protection, suspension revocation, manual subscription adjustments without fake ledger revenue, charity media/archive/history and annual/donation/report reconciliation.
- Monthly/yearly payment success/failure/retry, cancellation/expiry, concurrent rolling-five scores, duplicate dates, member isolation and honest dashboard source failures.
- 401/403/404/409/422/500/offline, no automatic write retry, session cache disposal, form focus and preserved input, reduced motion and keyboard dialog/navigation.

Screenshots: `docs/screenshots/operations/` contains admin user, charity, simulation, publication, paid claim and reports plus member draw/proof/paid/dashboard states. `docs/screenshots/run1/` contains 360/768/1440 signup/billing/scores/profile/public journeys. Automated axe and document overflow checks pass. Visual review confirmed readable forest/cream styling and labelled simulated amounts. The reference designs' invented bank escrow, hardware certification, WHS integration, totals and audit claims are intentionally absent; these are not implemented services.

## Explicit remaining gaps

Local demo is ready; production is not. Real billing/webhooks/recurring charging, bank transfers, Supabase, verified-email/new-account workflows and secure password recovery are not implemented. Actual Cloudinary credentials/account policies, Render/Vercel/Atlas deployment, production bootstrap, monitoring/backups and cross-proxy behavior have not been exercised. Production billing is disabled and the hosting API destination remains `.invalid`. Draw snapshots are bounded to 1000 accounts; no backdated cutoff reconstruction predating configuration. Evidence accepts PNG/JPEG only, max 5 MB/five submissions. Subscriber views refresh from authoritative records on load/reload; no push notification service is claimed. The 18 unrelated formatting warnings remain. See [Deployment](Deployment.md) for safeguards and rollback, [API](API.md) for contracts, and [Operations handoff](Operations-Handoff.md) for changed files/function data flow.
