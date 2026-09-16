# B05 — Homepage charity integration

Branch `feat/home-charity-integration`, base `main` at `47ec87d`. B03 and B04 are merged. Reference: mobile homepage and charity impact hub HTML/PNG; existing card styling is retained, without the design's invented impact totals.

## Changes and data flow

`HomePage` calls `useFetch(getFeaturedCharities)` and passes data/status/error/retry into `FeaturedCharities`. The hook accepts a stable async loader receiving an AbortSignal, returns request state and a retry callback, and aborts on replacement/unmount. Its effect-local guard rejects stale responses even from transports that ignore abort. Retry increments an attempt counter. No member data is stored.

`getFeaturedCharities(signal)` requests three featured records using the existing credentialed, timeout-aware API client. `getCharities(query, signal)` returns a normalized paginated directory; `getCharity(id, signal)` returns a detail card. `toCharityCard(record)` validates required API fields and maps server IDs to detail URLs, `isDemo` to the illustrative label, and image URL/alt fields. Missing images remain unavailable, rather than showing a different charity's photograph.

`validateCharityCards` accepts explicit null images; `CharityCard` renders the accessible unavailable-image state. All other card navigation and response states remain reusable. B08 implements the detail destination; until then the URL is accurate but its page is not implemented.

## Configuration and verification

Development uses Vite's `/api` proxy. Production must set `VITE_API_BASE_URL` to the backend's `/api` URL at build time and set backend `CLIENT_ORIGIN` to the exact frontend origin. The existing client includes credentials, aborts at eight seconds, and preserves error envelope metadata.

Commands: `npm run lint`, `npm run test -w frontend`, `npm run build -w frontend`. Results are recorded in the consolidated Run 1 handoff after execution. Tests cover API DTO mapping, stale requests, abort and retry, plus existing loading/empty/error presentation. B04 tests prove seed responses against MongoDB; B05 mapping tests use that contract, not a claim of a deployed integration.

## Prepared Git and PR messages

Commit subject / PR title: **feat: connect homepage to charity API**

Commit body: Fetch featured charities through the credentialed API client. Normalize demo labels and ID routes; show honest missing images and loading, empty, error and retry states. Cancel obsolete requests and guard against stale updates. Add adapter and request-lifecycle tests.

PR Summary: Connect the homepage to persisted featured charities.

Changes: Add charity API adapter and cancellable fetching hook; wire homepage; preserve reusable card states.

How to test: Start MongoDB, run `npm run seed -w backend`, `npm run dev`, and visit `/`. Run the verification commands above.

Results: See consolidated Run 1 verification record.

Screenshots: Existing homepage composition is preserved; final integrated views are checked in Run 1.

Risks: Detail routing lands in B08. Cross-origin deployments require matching origin and cookie configuration; unavailable APIs display errors rather than fixtures.

Verified: lint passed; frontend 20/20 tests passed; Vite production build passed (83 modules).
