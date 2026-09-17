# Prompt 1 — B09–B12 completion handoff

This updates the existing checkout in sequence: preserve and verify B09, implement B10 score persistence, wire B11 score screens, then implement B12 dashboard/profile. The latest instruction prohibits Git actions. No Git command, commit, push, PR or deployment was performed for this request. Earlier branch handoffs are historical records.

## Behavior and data flow

A signed-in member selects a server-priced demo plan. Checkout stores an immutable funding/recipient snapshot in a pending owned payment. The server demo adapter alone decides success or failure; browser return parameters never activate access. Successful processing atomically saves entitlement, payment outcome and one or twelve allocation rows. Repeat processing returns the existing outcome. Cancel-at-period-end keeps access until the stored end; lapse is derived on requests, not delayed by a scheduler. See [B09 function contracts](B09-Handoff.md) for the retained billing implementation.

The scores page fetches authoritative records and entitlement. Form submission validates locally for helpful feedback and then calls the server; the server repeats validation and ownership/entitlement checks. Every mutation serializes through the user's revision inside a MongoDB transaction, checks duplicate dates and retained-set policy, then creates/edits/deletes a score and prunes the oldest if needed. A compound unique index is the final duplicate-date guard. Readers never see an intermediate six-score set. The UI refetches after success and retains typed values after failure. Date strings stay date strings, so timezone changes cannot move a round to another day.

Dashboard reads current subscription, newest scores and chosen charity independently. Section failures display retry controls without claiming a zero value. Future draw date, participation and winnings are explicitly unavailable/null. Profile updates only display name and date-format preference. Changing profile, reading scores, managing charity and accessing billing do not require active membership. Server roles are never user-editable.

## Functions and component contracts

### Backend

| Function/module                           | Input and caller                                            | Output, effects and reason                                                                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createScoreModel(connection)`            | Routes factory supplies dedicated Mongoose connection       | Registers/caches GolfScore schema; unique user/date index and integer constraints; no global connection                                                                               |
| `publicScore(record)`                     | Score list/mutations/dashboard                              | Pure `{id,value,roundDate}` DTO; excludes owner/internal fields                                                                                                                       |
| `parseScoreId(id)`                        | Mutation service                                            | Validates 24-hex ID or throws consistent 400                                                                                                                                          |
| `validateScore(body,{partial,now})`       | Create/update service, reusable for future admin operations | Validated allowed value/date fields; rejects unknown/empty bodies, nonintegers, invalid/future dates; no writes                                                                       |
| `createScoreService(models,config,clock)` | Routes factory                                              | Builds owned list/create/update/remove operations, injectable clock for lifecycle checks                                                                                              |
| `list(user)`                              | GET score controller                                        | Reads up to five descending round dates and fresh subscription; returns items/count/remaining/today                                                                                   |
| `mutate(user,operation,body,id)`          | Internal create/update/remove wrappers                      | Validates, acquires transactional user revision, rechecks entitlement, enforces ownership/date uniqueness/oldest policy, writes and prunes atomically; maps duplicate/topology errors |
| `create(user,body)`                       | POST controller                                             | Mutation result `{score,evictedId}`; 201 response                                                                                                                                     |
| `update(user,id,body)`                    | PATCH controller                                            | Mutation result; later list reflects changed date order                                                                                                                               |
| `remove(user,id)`                         | DELETE controller                                           | `{deletedId}`; owned transaction deletion                                                                                                                                             |
| `createScoreRoutes(service,authenticate)` | Routes factory                                              | Authenticated GET; subscription-gated mutations; rejects unsupported list queries; shared response envelope                                                                           |
| `validateProfile(body)`                   | User service                                                | Allowlisted trimmed name and/or supported date format; rejects role and other internal fields                                                                                         |
| `section(load)`                           | Dashboard service, internal                                 | Awaits one source and returns ready/error tagged data; sanitizes failure messages                                                                                                     |
| `updateProfile(user,body)`                | PATCH me controller                                         | Validates fields, updates only current unsuspended account, returns public user; 403 if unavailable                                                                                   |
| `dashboard(user)`                         | GET dashboard controller                                    | Parallel owned source reads, public user, honest unavailable future sections; no writes                                                                                               |
| `createUserService` / `createUserRoutes`  | App routes                                                  | Receive score/subscription dependencies and wire the two new endpoints; existing charity preference behavior retained                                                                 |
| `createUserModel` / `publicUser`          | Auth/user/routes services                                   | Adds private `scoreRevision` for serialization and public date-format preference defaulting to day-first; old accounts remain valid                                                   |
| `createRoutes`                            | App creation                                                | Instantiates/injects score model/service and mounts actual score routes, replacing reserved B09 guard                                                                                 |

`requireSubscription`, `subscriptionView`, billing service, adapter, payment model and payment controllers retain B09 semantics. Their exact inputs/outputs and side effects are documented in B09/B08 handoffs. Subscription tests now exercise actual score creation after approval rather than the earlier reserved-route 404.

### Frontend

| Function/component                                              | Inputs and caller                      | Output and side effects                                                                                                                                                                                                                |
| --------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getScores(signal)`                                             | Scores/AddScore pages through useFetch | Credentialed GET, cancellable authoritative list                                                                                                                                                                                       |
| `createScore(body)`, `updateScore(id,body)`, `deleteScore(id)`  | Form/delete handler                    | Shared API POST/PATCH/DELETE; errors propagate with code/message                                                                                                                                                                       |
| `displayRoundDate(value,format)`                                | ScoreCard/dashboard                    | Pure string-only ISO or day-first formatting                                                                                                                                                                                           |
| `ScoreCard({score,active,onEdit,onDelete,dateFormat})`          | ScoresPage                             | Semantic round card with labelled actions; disables mutations without entitlement; invokes parent callbacks                                                                                                                            |
| `ScoreProgress({count,active})`                                 | Scores/dashboard                       | Remaining five-score requirement, labelled progress, active/inactive/unknown membership copy; never claims actual draw entry                                                                                                           |
| `ScoreForm({score,today,onSaved,onBusyChange})`                 | AddScorePage/edit dialog               | Controlled fields; submit validates/focuses error, prevents duplicate requests, creates or patches, calls onSaved only after success; failed requests retain input                                                                     |
| `ScoresPage()`                                                  | Member route                           | Loads list, explains eviction, handles empty/error/retry/lapsed states; `open` controls edit/delete dialogs; `changed` closes/refetches and selects stable return focus; `remove` confirms server deletion with pending/error handling |
| `AddScorePage()`                                                | Member new-score route                 | Loads current count/entitlement/today; displays form only when active and navigates to list after success                                                                                                                              |
| `getDashboard(signal)`, `updateProfile(body)`                   | Dashboard/Profile pages                | Shared credentialed GET/PATCH wrappers; no local fake persistence                                                                                                                                                                      |
| `DashboardSection({title,section,retry,children})`              | DashboardPage                          | Card landmark with source-specific error and retry or supplied source content                                                                                                                                                          |
| `DashboardPage()`                                               | Dashboard index route                  | Fetches source sections, uses current user/date preference, renders membership/score/charity cards and unavailable future cards; account links and sign out                                                                            |
| `ProfilePage()` / `save(event)`                                 | Profile route/form                     | Controls name/date format, validates then PATCHes allowlisted fields and refreshes auth; pending guard, success/errors, retains form on API failure; email shown read-only                                                             |
| `SignOutButton()`                                               | Dashboard/Profile                      | Revokes server session through AuthProvider, blocks duplicate click, reports errors, navigates to login on success                                                                                                                     |
| `Modal`                                                         | Existing callers plus score dialogs    | Optional `returnFocusRef` allows successful deletion to restore a stable heading; normal cancellation still restores the initiating button; native dialog, keyboard trap and cleanup retained                                          |
| `AppRoutes`, routes constants, `MobileNav`, `Sidebar`, `Footer` | App/layout                             | Wire scores/new/profile/dashboard routes, provide responsive member navigation, update truthful demo copy                                                                                                                              |

Existing API client uses credentials/CSRF/timeout/error-envelope handling. Existing `useFetch` aborts stale reads and exposes retry; AuthProvider reloads server identity. Styling extends existing forest/cream/gold tokens for score grids, editor, progress and dashboard cards, with narrow-screen stacking. Home entrance animation keeps full opacity to avoid temporary contrast failures. No export-only design scripts were introduced.

### Verification helpers

`startBrowserServer()` in `browser-server.js` starts/seeds an isolated real MongoDB replica set with generated secret and test-only Express configuration and returns an idempotent cleanup function; startup failure also cleans up. `integration/setup.js` starts Express and Vite through their APIs and returns teardown that closes both, avoiding orphaned Windows shell children. `playwright.integration.config.js` selects this global setup. The integration `inspect` helper checks document overflow, runs axe WCAG AA and captures each view. Fixture-only browser tests use `mockPublicApi` so component regressions do not depend on an external database. These mocks are confined to tests.

## Changed-file inventory

- Backend additions: `src/modules/scores/score.model.js`, `score.validation.js`, `score.service.js`, `score.routes.js`; `src/modules/users/user.validation.js`; `test/scores.test.js`.
- Backend integration: user model/service/routes, routes/index, subscriptions test, and `.env.example` transaction topology. Retained B09 subscription/payment/config/middleware modules and browser harness are verified in the same checkout.
- Frontend additions: `modules/scores/score.api.js`; `components/scores/ScoreCard.jsx`, `ScoreForm.jsx`, `ScoreProgress.jsx`; `pages/dashboard/ScoresPage.jsx`, `AddScorePage.jsx`, `DashboardPage.jsx`, `ProfilePage.jsx`; score/dashboard tests; `modules/users/user.api.js`; `modules/auth/SignOutButton.jsx`.
- Frontend integration: AppRoutes, routes constants, shared Modal, MobileNav/Sidebar/Footer, member/home styles, integration browser journey, browser API fixtures/foundation tests. Existing billing/payment pages and clients are retained.
- Documentation: README, API, Decisions, Architecture, historical B09 clarification, Run1 index and this handoff; generated browser screenshots under `docs/screenshots/run1`.

Paths above are repository-relative descriptions, not a Git-derived diff. Existing planning/design source assets and unrelated application files were preserved.

## Exact local checks and results

Run from the repository root:

```powershell
npm run lint
npm test
npm run build
npm run format:check
npm run test:e2e -w frontend
npm run test:e2e -w frontend -- --config playwright.integration.config.js
```

Verified locally on 17 September 2026: backend 39/39 tests; frontend 33/33 tests across nine files; browser regressions 19/19; real-API integration 3/3 at 360/768/1440, including automatic teardown (42.5 seconds). Lint passes with zero warnings. Backend syntax build and frontend production build pass (113 modules). The targeted Prettier check of B09–B12 implementation/integration files and updated documentation passes. Repository-wide format:check reports 20 existing files outside this targeted change set; their formatting is preserved. No Git command is part of these checks.

Backend acceptance includes score 0/1/45/46/decimal boundaries, real/future dates, duplicate dates, unowned IDs, sixth eviction, edit reordering/delete, concurrent writes with observed committed count never above five, inactive mutation denial, field injection rejection, profile persistence, account access after lapse and partial dashboard failure. Billing tests include monthly/yearly pricing, decline/retry, concurrent approval, idempotency, annual conservation, cancellation and lapse/renewal. Frontend tests cover preserved failed input, pending actions, boundaries/date-only display, dashboard sources/partial failure and allowlisted profile requests.

The real browser journey covers registration, donation without entitlement, monthly/yearly decline/retry/approval, cancellation with retained score access, six score inserts, refresh persistence, edit/delete with focus restoration, profile reload/date preference, dashboard records, admin denial, logout and fresh login at 360/768/1440. Each captured stage checks overflow and axe. A mobile deletion focus race discovered during this run was corrected by letting dialog cleanup use a stable success return target. An ambiguous text selector was corrected without altering app behavior.

## Remaining limitations

Billing is a visibly labelled simulation and deliberately cannot run in production. It has manual renewal, no real provider/webhooks, no money movement and no automatic charging. Replica-set transactions are required. Rate limiting is process-local; production scaling would need a shared store. Email/password recovery/change is separate future work. Draws, winner records and participation are unavailable; scores are never represented as historical draw entries. Authentication fails closed if its database lookup cannot complete; dashboard partial recovery applies after successful authentication. Browser verification is Chromium, not a claim of all-browser or assistive-technology certification. Initial isolated MongoDB/Playwright downloads require network access.

### Repository-wide formatting findings

`npm run format:check` does not pass for the full repository. Its 20 reported paths are: backend/package.json; backend/scripts/check.js; backend/scripts/seed.js; frontend/src/assets/images/home/SOURCES.md; frontend/src/components/home/homeData.js, PrizePoolPreview.jsx, ScoreDemo.jsx; frontend/src/hooks/useFetch.test.jsx; frontend/src/modules/auth/auth.test.jsx; frontend/src/pages/public/AvailabilityPage.jsx, DrawExplanationPage.jsx; frontend/src/styles/index.css; docs/B02-Handoff.md, B03-Handoff.md, B05-Handoff.md, B07-Handoff.md, B08-Handoff.md, Charity-API.md, Homepage.md, UI-Foundation.md. No unrelated format sweep was applied. This does not block the requested lint/test/build/smoke gate, all of which passes.

### Screenshots reviewed

- [Mobile dashboard](screenshots/run1/dashboard-360.png)
- [Desktop scores](screenshots/run1/scores-1440.png)
- [Tablet profile](screenshots/run1/profile-768.png)
- [Monthly cancellation](screenshots/run1/subscription-cancelled-360.png)
- [Annual simulated payment](screenshots/run1/subscription-success-1440.png)

The mobile dashboard and desktop score captures were visually reviewed in addition to automated overflow/accessibility checks. All three widths have score, profile, dashboard and billing captures. The final integration setup closes its temporary server/database resources normally; the earlier shell-based attempt required stopping its two verified test-only server processes and is not represented as a clean teardown result.
