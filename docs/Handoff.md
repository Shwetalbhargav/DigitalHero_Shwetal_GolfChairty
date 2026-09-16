# B01 verification and handoff

## Delivered files

All files below are new. Existing planning, design and generated planning artifacts were preserved. No Git repository existed, so there is no Git diff, actual default branch, commit or PR. Branch intent: chore/project-setup; proposed PR base: main, to be replaced by the real default branch when a remote is configured.

- .gitignore
- .prettierignore
- .prettierrc.json
- README.md
- backend/.env.example
- backend/package.json
- backend/scripts/check.js
- backend/src/app.js
- backend/src/config/db.js
- backend/src/config/env.js
- backend/src/middleware/error.middleware.js
- backend/src/middleware/notFound.middleware.js
- backend/src/routes/index.js
- backend/src/server.js
- backend/src/utils/ApiError.js
- backend/src/utils/ApiResponse.js
- backend/test/app.test.js
- docs/API.md
- docs/Architecture.md
- docs/Decisions.md
- docs/Handoff.md
- docs/screenshots/status-1440.png
- docs/screenshots/status-360.png
- docs/screenshots/status-768.png
- eslint.config.js
- frontend/.env.example
- frontend/index.html
- frontend/package.json
- frontend/src/App.jsx
- frontend/src/App.test.jsx
- frontend/src/main.jsx
- frontend/src/services/api.js
- frontend/src/services/api.test.js
- frontend/src/styles.css
- frontend/src/test/setup.js
- frontend/vite.config.js
- package-lock.json
- package.json

The root package-lock.json locks both npm workspaces. frontend/dist and node_modules are generated and ignored. Function/component inputs, outputs, callers and side effects are documented in Architecture.md; API.md defines the envelope and routes; Decisions.md carries D01–D11 and B01 choices.

## Actual verification

Environment: Windows PowerShell, Node v24.11.0, npm 11.6.1.

| Command/check                                    | Actual result                                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm ci                                           | Passed: clean dependency installation from the workspace lockfile                                                                                          |
| npm run lint                                     | Passed                                                                                                                                                     |
| npm run format:check                             | Passed after formatting with the installed Prettier version                                                                                                |
| npm test                                         | Passed: 8 backend and 6 frontend tests                                                                                                                     |
| npm run build                                    | Passed: backend source syntax checks and Vite production assets                                                                                            |
| npm audit                                        | Zero vulnerabilities after upgrading Vitest to 4.1.11                                                                                                      |
| node backend/src/server.js without backend/.env  | Expected exit 1; explicitly names missing MONGODB_URI and CLIENT_ORIGIN                                                                                    |
| Mongoose connection to 127.0.0.1:1               | Expected startup failure; connection closes and reports unready                                                                                            |
| Isolated Git ignore check                        | backend/.env, frontend/.env.production, backend/.env.local, node_modules/example and frontend/dist/index.html ignored; both .env.example files not ignored |
| Headless Chromium at 360, 768, 1440 px           | No horizontal overflow; retry enabled in error state; no page JavaScript errors                                                                            |
| Browser retry with intercepted readiness success | Recovered to ready; this is a controlled response, not proof of live MongoDB                                                                               |

The isolated ignore test initialized a temporary repository under the OS temporary directory with a copy of .gitignore. It did not initialize this workspace. Git check-ignore returns 1 for the intentionally nonignored examples.

Browser verification used the bundled Playwright runtime against npm run dev -w frontend -- --host 127.0.0.1. It exercised the real unavailable-backend response, inspected scrollWidth at three viewport widths, saved screenshots, then intercepted only /api/ready with the documented success envelope to verify retry recovery. The unavailable Vite upstream returns non-JSON, correctly shown as an invalid server response. Screenshots were visually inspected at mobile and desktop sizes.

## Run locally

From the root, run npm ci, copy each workspace .env.example to .env, set a working MONGODB_URI and run npm run dev. See README.md for exact PowerShell commands. A real successful MongoDB handshake and runtime server-loss/recovery remain to be checked against your database; no local mongod, Docker or Atlas credential was available. Runtime API readiness transitions and shutdown were tested using injected database adapters. No product-domain functionality is included in B01.

## Prepared Git commit

Subject: chore: scaffold Digital Heroes frontend and backend

Body:

Add npm workspaces for the Express/Mongoose API and React/Vite client with reproducible dependency locking, lint, format, test, build and development commands.

Validate server configuration, connect MongoDB before listening, separate app creation from startup, expose liveness and database readiness, normalize API errors, restrict credentialed CORS and drain connections on shutdown. Wire the responsive service-status screen to a credentialed API client with cancellation, timeout, error and retry handling. Document environment setup, API contracts, source decisions and every function/component.

Verified npm ci, lint, formatting, 14 tests and production build; npm audit reports zero vulnerabilities. Checked missing configuration, real Mongoose refusal, ignore rules and browser layouts at 360/768/1440 px. Successful database readiness/recovery uses controlled adapters; live MongoDB success remains unverified.

## Prepared PR

Title: chore: scaffold Digital Heroes frontend and backend

### Summary

Provide the runnable Digital Heroes project foundation with an honest live connection screen and a reproducible full-stack development workflow.

### Changes

- Add JavaScript Express/Mongoose backend and React/Vite frontend under the supplied architecture.
- Separate app factory and startup; validate environment, connect DB, expose /api/health and /api/ready, normalize errors and shut down gracefully.
- Add credentialed client, origin allowlist, safe request IDs, bounded parsing and request timeouts.
- Add locked npm workspaces, examples/ignore rules, automated tests and API/architecture/decision documentation.
- Implement a responsive status view using the supplied Feel Not Fairway theme with local fonts.

### How to test

1. Run npm ci at the root.
2. Copy backend/.env.example to backend/.env and frontend/.env.example to frontend/.env; configure a reachable MongoDB and the exact client origin.
3. Run npm run lint, npm run format:check, npm test and npm run build.
4. Run npm run dev and visit http://localhost:5173. Check /api/health and /api/ready.
5. Stop MongoDB after successful startup: readiness should return 503, health should remain 200, and the UI should report failure on retry. Restore MongoDB and retry. This live operational step still requires your database.
6. Stop the API with Ctrl+C and confirm that the listener closes. Remove required environment values and confirm a clear nonzero startup exit.

### Results

Clean installation, lint, format, all 14 tests and production build pass. Audit: zero vulnerabilities. Missing config and actual connection refusal fail safely. Browser error/retry checks pass, without horizontal overflow at 360/768/1440 px. Real successful MongoDB integration remains unverified.

### Screenshots

- [Mobile, 360 px](screenshots/status-360.png)
- [Tablet, 768 px](screenshots/status-768.png)
- [Desktop, 1440 px](screenshots/status-1440.png)

Screenshots show the real unavailable-service state, not simulated business data.

### Risks

- Requires Node 24+ and a reachable MongoDB. No database is provisioned.
- Production static hosting needs an API reverse proxy or explicit VITE_API_BASE_URL and matching CLIENT_ORIGIN.
- Auth, CSRF-protected writes and product workflows are intentionally future branch scope.
- The source PRD is absent; inherited source conflicts are recorded without claiming strict compliance.
- npm reports a deprecated whatwg-encoding transitive test dependency; the audit is clean.
- No Git initialization, commit, push, PR or deployment was performed in this workspace.

### Verification correction

A later repeat using Vitest's default fork pool failed before executing frontend tests with worker-startup timeouts. The configuration now explicitly uses the threads pool with one worker. The targeted command npm run test -w frontend -- --pool=threads --maxWorkers=1 passed all six tests; the final standard npm test run also passed after making that configuration permanent.
