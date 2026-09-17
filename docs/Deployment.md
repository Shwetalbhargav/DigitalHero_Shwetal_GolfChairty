# Future deployment configuration — prepared locally only

No Git, remote CI, hosting, database provisioning, release, tag or deployment action is part of this work. There is no deployed URL. `render.yaml` and `frontend/vercel.json` are reviewable configuration, not evidence of an operational release. The Vercel API rewrite points to the reserved `example.invalid` domain and MUST be replaced only during a separately authorized deployment.

## Intended topology and security

Prefer one browser origin: Vercel serves the SPA and proxies `/api/*` to the future Render API. Set `VITE_API_BASE_URL=/api`; configure exactly that HTTPS frontend origin in backend `CLIENT_ORIGIN`. Set the Vercel project root to `frontend` and enable access to files outside that root for the workspace lockfile. The prepared commands install at the repository root and build the frontend workspace. API rewrite precedes the SPA fallback, so `/dashboard/scores`, `/admin/reports` and other deep links receive `index.html`; API errors must never become SPA HTML.

CORS uses a one-origin allowlist, never wildcard/reflected arbitrary origins. A second preview hostname is deliberately not authorized automatically. Writes require both the exact Origin and `X-CSRF-Protection: 1`; cookie authentication alone is insufficient. Sessions are HttpOnly, Path=/api, SameSite=Lax, Secure in production, host-only (no Domain). Use HTTPS termination and preserve Origin/Set-Cookie through the proxy. Separate unrelated frontend/backend sites would encounter SameSite=Lax and browser third-party-cookie restrictions. Merely adding CORS will not fix that; use the same-origin proxy or same-site custom domains. Do not loosen cookies to support arbitrary previews.

`TRUST_PROXY=0` locally; `1` only behind one known, sanitizing proxy hop. Do not trust arbitrary forwarded headers or change this to boolean true. Verify Render's ingress topology and forwarded-header sanitization before future use, especially if an additional proxy changes the hop count. Production cookie security is explicit and does not depend on a caller-supplied forwarded-proto header.

Render's prepared health check is `/api/ready` (real database ping, 503 on loss/draining); `/api/health` is process liveness. Initial connection failure stops startup. Shutdown stops accepting HTTP and closes MongoDB within its deadline. Auto deployment is off. These configuration choices follow [Render Blueprint reference](https://render.com/docs/blueprint-spec), [Render health checks](https://render.com/docs/health-checks), [Vercel Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite) and [Vercel rewrite documentation](https://vercel.com/docs/routing/rewrites), consulted during local preparation.

## Environment names (no private values)

| Variable                                                           | Purpose / boundary                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| NODE_ENV                                                           | development/test locally, production only for a future production process                                                 |
| PORT                                                               | API listener, supplied by hosting or 4000 locally                                                                         |
| MONGODB_URI                                                        | Private replica-set URI; Atlas SRV/TLS URI only after separate authorization                                              |
| CLIENT_ORIGIN                                                      | One exact HTTP(S) origin, HTTPS required in production, no wildcard/path/trailing slash                                   |
| AUTH_SECRET                                                        | Private independently generated random signing secret, minimum 32 characters; example/test markers rejected in production |
| TRUST_PROXY                                                        | 0 or 1; see topology above                                                                                                |
| DB_TIMEOUT_MS / SHUTDOWN_TIMEOUT_MS                                | Connection/ping and bounded shutdown timing                                                                               |
| PAYMENT_MODE                                                       | simulated only in development/test; disabled in production until a real verified provider is implemented                  |
| CURRENCY                                                           | GBP/USD/EUR, all two-decimal currencies                                                                                   |
| MONTHLY_PRICE_MINOR / YEARLY_PRICE_MINOR                           | Server amounts; yearly must be below twelve monthly amounts                                                               |
| PRIZE_PERCENT                                                      | Server prize allocation; minimum charity percentage is 10                                                                 |
| PROOF_STORAGE                                                      | local (private MongoDB images, dev/test only), cloudinary, or disabled                                                    |
| CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET | Private server-only authenticated image storage credentials, required together when selected                              |
| VITE_API_BASE_URL                                                  | Public browser API path, preferably /api; never a secret                                                                  |
| API_PROXY_TARGET                                                   | Vite development proxy only; 4000 persistent API or 4011 disposable demo                                                  |

Never put a MongoDB URI, signing secret or Cloudinary key in a `VITE_` variable. `.env` and `.env.*` are ignored except `.env.example`. Existing private environment files were not opened for inspection or overwritten. The isolated API harness does not load them.

## Database, indexes and safe seeding

Transactions require a replica set. Future Atlas setup needs TLS, a narrowly scoped application database user, reviewed network access and backups. Do not permit unrestricted network access just to make a demo work. Test suites create random isolated local databases and never use a supplied production URI.

Production `autoIndex` is disabled. After backup and preflight duplicate checks, a separately authorized operator can run `npm run indexes -w backend` against the intended environment. It creates declared indexes additively; it never drops indexes or rewrites data. Index conflicts fail clearly. Critical unique keys include user email, charity slug/seed key, subscription user, payment user/idempotency key, score user/round date, draw month, winner draw/user, payout winner and sparse payout reference. Rollover uses one currency key; eligibility and audit histories have lookup/time indexes. Do not use `syncIndexes()` or delete duplicate financial records to bypass migration failure.

`npm run seed -w backend` is insert-only fictional charity seeding and refuses production mode. Use it only on the dedicated local development DB. It preserves edits and timestamps on existing demo records and refuses slug ownership conflicts. `npm run demo -w backend` uses a completely disposable database and creates known member/admin test identities; it does not promote existing accounts. There is deliberately no production admin bootstrap with a public default password. Future admin provisioning requires a separately reviewed secure process.

Evidence uploads are decoded, bounded, metadata-stripped PNG/JPEG images. Cloudinary uses authenticated assets and signed uploads; responses are signature-checked. Private proof is fetched server-side only after owner/admin authorization, with digest validation; provider URLs never appear in member DTOs. Local/test storage is accurately labelled and never reports an external upload. `npm run cleanup:proof -w backend` retries durable failed/staged upload cleanup; arrange an operator-controlled schedule later. Attached evidence is retained for the audit chain.

## Rollback and remaining release blockers

Keep the prior immutable application artifact and environment configuration; back up the database before changes. Stop writes before any incompatible schema rollback. Current additions are additive; do not erase winner, payout, allocation or audit history to roll code back. Restore a database snapshot only through a reviewed incident procedure, reconciling intervening payments first. A secret compromise requires secret rotation/session invalidation, not only code rollback.

Unresolved PRD/external-service gaps: implementation uses MongoDB/Mongoose, not Supabase; no Supabase auth/storage/database integration exists. Billing is a verified simulated adapter with no real provider, webhook, automatic charging, refunds or bank transfer. New accounts do not have verified email, invitation onboarding, password recovery or secure email token delivery. Production admin bootstrap, external backups/monitoring and real Cloudinary account policy/credential smoke tests are not provisioned. Production money flows intentionally remain disabled. Draw operation is bounded to 1000 accounts; scaling requires a reviewed batching/locking design. These gaps prevent claiming production release readiness even though the local demo gate passes.
