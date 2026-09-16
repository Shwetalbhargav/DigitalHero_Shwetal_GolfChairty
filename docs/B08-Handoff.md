# B08 — Charity selection and independent donations

Branch `feat/charity-module`, stacked on `feat/auth-frontend`; eventual target `main`.

## Summary and changes

The public directory now searches/filters/paginates the real API and opens details by server ID. Members can persist their charity and contribution and create explicitly simulated independent donations. Each donation records its recipient and 100% allocation separately from any subscription; no eligibility is granted.

## Function and component walkthrough

`createUserService(User, Charity, config).updateCharity(user, body)` validates allowed fields, active recipient and funding bounds, updates only an unsuspended current user, and returns the safe identity DTO. `createUserRoutes` mounts the authenticated PATCH controller with the shared response envelope.

`createPaymentModel(connection)` caches the strict Payment schema. Its compound unique user/key index makes repeated creation idempotent. Payment records own status, simulated mode, amount/currency, recipient/name, percentages and embedded allocation rows. `publicPayment(record)` exposes the owned payment without the internal key/fingerprint/user.

`validateKey` rejects missing/malformed request keys. `fingerprint` hashes normalized request details. `insertPayment` upserts once and checks that reusing a key has identical intent, handling a concurrent unique-index race. `createPaymentService` supplies `getOwned` (validated ID plus user ownership, 404 for other owners), `donation` (validate amount and active recipient, snapshot details, create pending record), `processDonation` (single-document pending-to-terminal conditional update with one embedded allocation), `retry` (failed-to-pending only) and `detail` (safe DTO). Duplicate terminal processing returns the existing result. No external payment or charity transfer occurs.

`assertDemo` blocks disabled/production adapters. `simulatePayment` validates an explicit approve/decline test scenario and returns an adapter outcome. `createDonationRoutes` and `createPaymentRoutes` wrap the service behind authentication and CSRF. `parseEnv` accepts disabled/simulated mode and a two-decimal GBP/USD/EUR currency; simulated mode is forbidden in production. The routes factory wires these modules.

`CharityFilter` emits controlled URL filter values. `CharityGrid` renders normalized cards or no-results. `CharityListPage` reads URL state, memoizes API loading, shows errors/retry and drives real pagination. `CharityDetailPage` loads its ID, renders image alternatives/events or missing state, and exposes selection/donation actions according to current identity. `MyCharityPage.save` validates current policy, PATCHes preferences, refreshes identity, and reports errors/success. Earlier transaction snapshots are never rewritten.

`DonationForm.submit` validates decimal amount, converts to minor units, preserves one idempotency key for retries of the same body and navigates to its created payment. `PaymentPage` loads the owned record, shows server status and review amount, and uses `act` for explicit approve/decline/retry. Its pending ref prevents repeated clicks; no URL flag can declare success. Module API wrappers perform the owned read and writes; `money` formats server minor units. Private views unmount when logout clears identity. Layout navigation now points to the real charity page; B09 supplies subscription.

## API

- PATCH `/api/users/me/charity`: `{charityId,contributionPercent}` → `{user}`.
- POST `/api/donations`: `{charityId,amountMinor}`, `Idempotency-Key` 16–100 URL-safe characters → 201 pending payment DTO. Allowed demo amount: 100–1,000,000 minor units.
- GET `/api/payments/:id`: owned payment DTO, 404 for another owner.
- POST `/api/payments/:id/process`: `{scenario:"approve"}` or `{scenario:"decline"}` → terminal simulated result.
- POST `/api/payments/:id/retry`: `{}` → reopens only failed attempts.

Writes require session cookie, exact Origin and `X-CSRF-Protection: 1`. Errors use the existing envelope: 400 validation, 401 session, 403 CSRF/suspension, 404 missing/ownership, 409 reused-key mismatch, 503 disabled payments.

## How to test and results

Set `PAYMENT_MODE=simulated` in development, seed charities and start both services. Browse `/charities`, register/sign in, save preferences, review a donation, simulate decline, retry then approve. Repeated API creation with the same key must return the same ID.

Run `npm run lint`, `npm test`, `npm run build`. Backend 27/27 passed, including concurrent donation creation/completion against real MongoDB, preference boundaries, snapshot preservation and no subscription activation. Frontend directory/donation tests are included before commit. Final browser integration results are recorded in Run 1.

## Prepared commit and PR

Subject / title: **feat: add charity selection and independent donations**

Body: Add searchable directory/details, persisted charity preferences and explicit simulated donation review. Snapshot recipients and integer allocations, enforce ownership and idempotent creation/completion, and keep donations separate from membership. Verify backend concurrency tests, frontend tests, lint and builds.

Summary: Connect charity choice and independent demo donations end to end.

Changes: Charity pages/components, preferences service, owned payment model/adapter/routes, review UI and tests.

How to test: Follow the flow and commands above.

Results: See verification above and consolidated Run 1 results.

Screenshots: Final integrated directory/payment views are captured in Run 1.

Risks: Simulation has no financial effect or tax receipt. Newly selected charities must be active at validation time; later administrative deactivation does not rewrite an existing transaction recipient. Subscription processing is added in B09.

Verified before commit: lint passed; 27 backend and 26 frontend tests passed; backend syntax build and frontend production build passed (102 modules).
