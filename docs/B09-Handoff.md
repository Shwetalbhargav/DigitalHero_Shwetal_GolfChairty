# B09 — Subscriptions and simulated billing

Branch `feat/subscription-module`, stacked on `feat/charity-module`; eventual integration target `main`. Historical B09 branch context. The subsequent B09–B12 request prohibits Git actions; see Prompt1-Handoff.md for the current completion gate.

## Summary and changes

Server-priced monthly/yearly checkout creates an owned pending payment. Explicit adapter approval commits payment success, a subscription period and embedded monthly allocations in one MongoDB transaction. A decline grants no access; retries reuse the payment. Cancellation preserves access until the UTC period end. Every authenticated request reloads entitlement, so lapse takes effect without a scheduler. Billing and charity management remain available after lapse.

## Configuration and decisions

- Demo defaults: GBP, monthly 1900 minor units, yearly 19000 (discounted from twelve monthly payments), prize 50%, charity 10–50%. These are declared assumptions, not prices copied from contradictory design samples. Configure `CURRENCY`, `MONTHLY_PRICE_MINOR`, `YEARLY_PRICE_MINOR`, `PRIZE_PERCENT` and `PAYMENT_MODE` on the server.
- `PAYMENT_MODE=simulated` works only outside production; disabled mode is default when unset. Production simulation is rejected at startup and by the adapter. No card details, payment provider, tax receipts, financial transfers or guaranteed draw entries are fabricated.
- Subscription processing requires a MongoDB replica set (Atlas supports transactions). A standalone server produces an explicit 503 and cannot partially activate access. Donation finalization remains a single atomic document update.
- Renewal is manual in this demo and allowed after expiry. No automatic charge, hidden grace period or scheduler is claimed. Cancellation records intent and preserves the existing end date. A new renewal starts a fresh period from approval time. Active periods cannot be bought again or extended by replaying a payment.
- Checkout snapshots expire after 24 hours. Reusing a key returns that checkout; an expired checkout needs a new key. Annual revenue is divided into twelve calendar-month rows, with remainder pennies in the earliest rows. Each row floors charity and prize percentages independently; platform receives the residual. Every row and the total conserve revenue. Future ledger rows are scheduled demo allocations, not present cash transfers or live pool totals.

## Every new or changed function

`createSubscriptionModel(connection)` registers/caches the unique-per-user schema. `subscriptionView(record, config, now)` is a pure DTO projection deriving active/lapsed/inactive from UTC bounds and enabled demo mode; cancelled subscriptions remain active until end. It returns null when no membership exists.

`addMonths(date, months)` adds calendar months in UTC with month-end clamping. `allocatePayment(payment, start)` returns one or twelve conserving rows and has no persistence side effects. `createSubscriptionService(Subscription, Payment, Charity, config, clock)` supplies these service operations:

| Function   | Inputs / caller                                          | Output and effects                                                                                                                                                               |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plans`    | Public plans controller                                  | Server prices, currency, funding bounds and availability; no database writes                                                                                                     |
| `current`  | User; auth middleware and me controller                  | Reads current subscription and derives entitlement                                                                                                                               |
| `checkout` | User, body, key, renewal flag; checkout/renew controller | Validates plan, active charity, funding and renewal state; returns an existing matching checkout or inserts a pending snapshot                                                   |
| `process`  | User, payment ID, scenario; shared payment controller    | Validates ownership/expiry; uses replica-set transaction to commit terminal status, allocations and subscription together; repeated terminal processing returns unchanged result |
| `cancel`   | User and empty body; cancel controller                   | Sets cancel-at-period-end and returns entitlement without shortening it                                                                                                          |
| `history`  | User; subscription me controller                         | Returns latest 20 owned subscription payments, newest first                                                                                                                      |

`createSubscriptionRoutes` exposes plans publicly and gates me/checkout/renew/cancel behind authentication. `createAuthMiddleware` now invokes `current` on every authenticated request and attaches `req.subscription`. `requireSubscription` advances only active entitlement; the routes factory applies it to score writes. The subsequent B10 implementation now persists scores transactionally: active valid creates return 201 and lapsed writes return 403. See Prompt1-Handoff.md.

The routes factory constructs the models/services once per app and wires subscription processing into `createPaymentRoutes`. That controller loads the owned payment and dispatches by its server-owned purpose. `Payment` gains expiry. `parseEnv` adds validated discounted pricing. Existing donation retry cannot reopen a succeeded payment. It can reopen a failed subscription payment, but processing still enforces expiry and active-period checks.

`subscription.api.js` exposes getPlans/getSubscription/checkout/cancelSubscription wrappers. `SubscriptionPage` loads plans and current membership together via a stable `load` callback, controls a monthly/yearly radio choice, and displays status/history. `purchase` preserves its idempotency key on network retry and navigates to the server payment ID. `cancel` submits through a keyboard-accessible confirmation Modal, refreshes entitlement, and reports failures. Pending refs prevent duplicate actions. `PaymentPage` reuses B08 review, processing, decline, retry and success states, then renders server allocation rows and links to subscription management. `AuthForm` now sends newly registered users to plan selection.

`CharityFilter` now keeps a local draft and submits both filters together. Its URL-value key resets draft after navigation; this fixes a rapid-edit race discovered during real browser testing. It performs no API call itself. `CharityListPage` applies submitted filters to URL state and its existing cancellable loader. The API client now distinguishes a timeout during JSON body reading from malformed JSON; the new unit case verifies that boundary and CSRF headers.

Header, Sidebar, Footer, HeroSection, HowItWorks and HomePage copy now describe the implemented demo accurately. Member UI/status routes remain available as foundation examples. Styles add responsive plan cards, membership summaries and allocation rows; the auth image eyebrow uses a readable light color.

## API examples

All paths use `/api`, the shared envelope and owned-cookie authorization. Writes require exact Origin and `X-CSRF-Protection: 1`.

```text
GET /subscriptions/plans
GET /subscriptions/me
POST /subscriptions/checkout   Idempotency-Key: <unique request key>
  {"plan":"monthly"}
POST /subscriptions/renew      Idempotency-Key: <new renewal key>
  {"plan":"yearly"}
POST /subscriptions/cancel
  {}
POST /payments/<id>/process
  {"scenario":"decline"}
POST /payments/<id>/retry
  {}
POST /payments/<id>/process
  {"scenario":"approve"}
```

Checkout returns the B08 payment DTO with purpose=subscription, plan, months, price and recipient snapshot. Me returns `{subscription,payments}`; subscription includes status, active, periodStart/End, cancelAtPeriodEnd, paymentId, simulated mode and manual-demo renewalMode. Payment detail after approval includes the exact allocation rows. Return URL query strings have no role in state changes.

Additional errors: 400 invalid plan/client-supplied amount, 409 active subscription/expired checkout/idempotency conflict, 503 billing database topology or disabled provider. Ownership mismatches remain 404.

## How to test

```powershell
npm ci
npm run lint
npm test
npm run build
npm run test:e2e -w frontend
npm run test:e2e -w frontend -- --config playwright.integration.config.js
npm run format:check
npm audit
# No Git actions under the latest completion gate.
```

The integration configuration starts a separate real MongoDB 8.2.6 replica set and backend on 4011, then Vite on 5173. `browser-server.js` uses only generated test configuration, seeds demo charities, and exposes explicit listener/database/MongoDB cleanup to the integration global setup. It never loads .env or a user database. `inspect` in the browser tests checks overflow/axe and captures screenshots. The three tests cover complete user flows at 360/768/1440, with reduced motion enabled. Older foundation browser tests use explicitly stubbed admin/public fixtures, updated for now-authenticated shells; new captures go under Run 1 to preserve earlier screenshots.

Backend tests cover both plan prices, client amount rejection, monthly failure/retry, concurrent approval, competing payments, annual conservation, expiry, cancel-at-end, lapse blocking score writes, manual renewal, ownership and disabled provider. Exact final counts/results and screenshot links are recorded in [Run1-Handoff.md](Run1-Handoff.md).

## Prepared Git and PR messages

Commit subject / PR title: **feat: add subscription lifecycle and simulated billing**

Commit body: Add server-priced monthly/yearly plans and transactional simulated payment activation. Persist recipient and monthly allocation snapshots, enforce idempotent retries, manual renewal, cancel-at-period-end and fresh entitlement checks. Wire responsive billing and payment review/status pages. Fix the directory rapid-filter race and body-read timeout handling found during verification. Verify isolated MongoDB lifecycle/concurrency tests, frontend tests, builds and browser journeys; see Run 1 handoff for exact counts.

PR Summary: Complete the subscription demo lifecycle without financial side effects.

Changes: Subscription model/service/routes and entitlement middleware; server plan configuration; payment-purpose dispatch; responsive plan/history/cancellation/ledger views; isolated browser harness; final public-copy integration fixes.

How to test: Run the commands above or register, choose a plan, decline, retry, approve and cancel at period end. Reload to verify persistence.

Results: See consolidated Run 1 results, including actual failures corrected during verification.

Screenshots: `docs/screenshots/run1/plans-*.png`, `payment-review-*.png`, `payment-declined-*.png`, `subscription-success-*.png`, `subscription-cancelled-*.png`.

Risks: Transactions require replica-set MongoDB; simulation is intentionally unavailable in production. Live draws, real payment provider/webhooks, automatic renewal, recovery and real tax receipts are outside this run. Auth rate limits are process-local. SameSite cookies require same-site frontend/API hosting. No strict compliance with absent PRD sections is claimed.
