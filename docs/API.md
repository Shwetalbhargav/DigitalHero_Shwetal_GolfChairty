# API contract

All routes use /api. JSON responses include a server-generated requestId, also returned as X-Request-ID. Responses are not cached. Request IDs supplied by callers are not trusted. There is no authentication or write API in B01; both probes are public and expose no connection strings or user data.

## Success

```json
{
  "success": true,
  "data": { "status": "alive" },
  "requestId": "generated-uuid"
}
```

## Error

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service is not ready."
  },
  "requestId": "generated-uuid"
}
```

Clients branch on code/status, not English messages. Unknown errors return a generic message with no stack or database details. Logs for unexpected errors contain only event and requestId to avoid credential leakage.

| Method | Path        | Success                                            | Failure                                                                   |
| ------ | ----------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | /api/health | 200, data.status=alive                             | Does not test MongoDB                                                     |
| GET    | /api/ready  | 200, data.status=ready and data.database=connected | 503 SERVICE_UNAVAILABLE when disconnected, ping fails, or shutdown begins |

Probes have no request body. Initial DB connection failure exits before opening the HTTP port; runtime DB failure yields 503 while health stays 200. Express handles HEAD for GET routes. Allowed-origin CORS preflight returns 204 without a JSON body.

| Status | Code                | Meaning                                   |
| ------ | ------------------- | ----------------------------------------- |
| 400    | INVALID_JSON        | Invalid JSON body                         |
| 403    | ORIGIN_NOT_ALLOWED  | Browser origin differs from CLIENT_ORIGIN |
| 404    | NOT_FOUND           | No route matches                          |
| 413    | PAYLOAD_TOO_LARGE   | JSON body exceeds 16 KB                   |
| 500    | INTERNAL_ERROR      | Unexpected server error                   |
| 503    | SERVICE_UNAVAILABLE | Readiness failed                          |

Credentialed CORS allows exactly CLIENT_ORIGIN. Requests with no Origin (probes/CLI) are accepted. CORS is not authentication or CSRF protection. Add server-side authorization and CSRF defenses before introducing cookie-authenticated writes.

The frontend api(path, options) uses credentials: include, accepts an AbortSignal and returns unwrapped data. It throws ApiClientError with message, status, code and requestId for HTTP errors. NETWORK_ERROR, TIMEOUT, INVALID_PATH and INVALID_RESPONSE are local client codes (status 0 when no HTTP response exists). Caller cancellation passes through to the caller. For future JSON writes, callers must serialize the body and supply Content-Type: application/json.

## B02 browser routes (not backend endpoints)

| Path              | Layout and content                                                   | Access         |
| ----------------- | -------------------------------------------------------------------- | -------------- |
| /foundation       | Preserved public foundation overview and live readiness card         | Public         |
| /ui               | Interactive component reference                                      | Public         |
| /status           | Live GET /api/ready status                                           | Public         |
| /dashboard        | Member layout preview; no account data                               | Public preview |
| /dashboard/ui     | Component reference in member layout                                 | Public preview |
| /dashboard/status | Readiness in member layout                                           | Public preview |
| /admin            | Admin layout preview; no authorization granted                       | Public preview |
| /admin/ui         | Component reference in admin layout                                  | Public preview |
| /admin/status     | Readiness in admin layout                                            | Public preview |
| Other paths       | Visible not-found view; /dashboard/* and /admin/* retain their shell | Public         |

B02 adds no API endpoints and no persistence. The library's display-name example accepts a trimmed length of 2–50 characters locally and reports that nothing was saved. Future private product routes require server-side authorization and authentication integration. Production hosting needs history fallback to index.html for these browser paths; do not rewrite /api requests to the SPA.

## B03 public browser routes

| Path                            | Behavior                                                        |
| ------------------------------- | --------------------------------------------------------------- |
| /                               | Charity-led homepage with labelled examples; no API calls       |
| /foundation                     | Preserved B02 overview and live readiness card                  |
| /register                       | Registration availability notice; no account/payment submission |
| /charities                      | Directory availability notice and illustrative cause categories |
| /charities#youth-access         | Focused youth/opportunity example                               |
| /charities#greener-spaces       | Focused nature/conservation example                             |
| /charities#community-connection | Focused community/wellbeing example                             |
| /how-it-works                   | Subscription, score, giving, prize and verification explanation |
| /how-it-works#draw-rules        | Focused prize-tier explanation                                  |

These are frontend routes and do not add Express endpoints. GET / is served by Vite/static hosting with the existing SPA fallback requirement. The charity-card view contract is documented in Homepage.md. B03 does not fetch future charity APIs, submit membership/donations or generate a real draw.

## B04 public charity API

All three endpoints are public read-only routes. They retain the shared success/error envelope, request ID, credentialed CORS policy and no-store headers. Only active charities are visible, including on direct ID lookup. No authentication, admin write API or donation operation is added.

| Method | Path                    | Response                                                                         |
| ------ | ----------------------- | -------------------------------------------------------------------------------- |
| GET    | /api/charities          | Paginated active directory                                                       |
| GET    | /api/charities/featured | Paginated active and featured directory; literal route is registered before /:id |
| GET    | /api/charities/:id      | One active charity; strict 24-character hexadecimal ObjectId                     |

### List and featured query parameters

| Parameter | Default | Rules                                                                                                                                                                            |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| q         | Empty   | Trimmed, at most 100 characters; no internal control characters. Case-insensitive literal substring search of name OR description. Regex metacharacters have no special meaning. |
| category  | Empty   | Trimmed and lowercased; exact category slug, up to 64 characters. Letters/digits with single hyphen separators, beginning with a letter. No fixed taxonomy is assumed.           |
| page      | 1       | Canonical decimal integer from 1 to 1000. No signs, leading zeroes, decimals or empty value.                                                                                     |
| limit     | 12      | Canonical decimal integer from 1 to 50.                                                                                                                                          |

Search and category combine with AND. A syntactically valid unknown category returns an empty result. Blank q/category mean no filter. Repeated parameters, unknown keys (including active/featured), arrays and operator-shaped inputs return 400 INVALID_QUERY. Detail requests accept no query parameters. Results sort by name ascending then ObjectId ascending using MongoDB's default binary string ordering.

### Request examples

```powershell
Invoke-RestMethod 'http://localhost:4000/api/charities?q=golf&category=youth&page=1&limit=12'
Invoke-RestMethod 'http://localhost:4000/api/charities/featured?page=1&limit=2'
# Use an actual id returned by the list:
Invoke-RestMethod 'http://localhost:4000/api/charities/507f1f77bcf86cd799439011'
```

### List response example

This is an illustrative response after seeding, with an illustrative ID. Use the actual returned id for detail lookup; slugs are stored for future URLs but are not accepted in :id.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Demo: Youth Golf Access",
        "slug": "demo-youth-golf-access",
        "description": "Fictional demo charity showing how equipment and coaching could make golf more accessible. This record does not represent a real organization.",
        "images": [],
        "category": "youth",
        "upcomingEvents": [],
        "featured": true,
        "active": true,
        "isDemo": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "requestId": "generated-uuid"
}
```

Featured uses the same data shape. Detail places the single charity object directly in data, without items/pagination.

Public fields are id, name, slug, description, images, category, upcomingEvents, featured, active and isDemo. Images are {url, alt}; URLs must be absolute HTTP(S) without embedded credentials and alt text is required. Events are {title, startsAt, location, description}; startsAt is an ISO UTC instant. Only events at or after the response's current time are returned, sorted earliest first. Expired events remain stored but disappear from public responses. Seed keys, MongoDB _id/__v, timestamps and unknown/internal fields are not exposed.

A ready directory with no matches returns 200 with items: [], total: 0, totalPages: 0 and both navigation flags false. A page beyond the available rows returns 200 with items: [] while retaining the total and totalPages for the filter. hasPreviousPage is true only when page > 1 and total > 0. Database failure never returns a fabricated empty list.

### Errors

| HTTP | Code                | Meaning                                                      |
| ---- | ------------------- | ------------------------------------------------------------ |
| 400  | INVALID_ID          | Detail ID is not 24 hexadecimal characters                   |
| 400  | INVALID_QUERY       | Invalid/unknown/repeated list query, or any detail query     |
| 404  | CHARITY_NOT_FOUND   | Well-formed ID is unknown or inactive; same message for both |
| 503  | SERVICE_UNAVAILABLE | DB disconnected, selection/network failure, or query timeout |
| 500  | INTERNAL_ERROR      | Unexpected application failure; existing sanitized handler   |

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ID",
    "message": "Charity ID must be a 24-character hexadecimal ObjectId."
  },
  "requestId": "generated-uuid"
}
```

```json
{
  "success": false,
  "error": { "code": "CHARITY_NOT_FOUND", "message": "Charity not found." },
  "requestId": "generated-uuid"
}
```

DB reads use DB_TIMEOUT_MS as their server-side maximum query time. List rows and count are separate parallel reads, so a concurrent future admin edit can briefly make the total differ from the returned page; no snapshot transaction is claimed. Literal substring search can require scanning at larger scale; bounded inputs/offsets/timeouts are the B04 baseline, not a full-text search service.

### Demo seeding

Run npm run seed -w backend against your configured development database. It inserts three explicitly fictional records (youth, environment and community), with Demo: names, demo- slugs and isDemo: true. Two are featured. Images/events are empty instead of inventing hosted images or scheduled real events.

Unique sparse seed keys and unique slugs back insert-only upserts. Repeating the seed preserves existing demo edits, inactive state and timestamps. It never overwrites an unrelated record with a colliding slug or key; collisions fail clearly. Concurrent same-key inserts are recognized safely. NODE_ENV=production is refused. Seeding is not transactional across all three records: a later failure can leave earlier inserts, and rerunning safely resumes. B04 did not seed any user-configured database; verification used an isolated local test database only.

## Authenticated member API (B05–B12)

All routes below have `/api` prefix and the envelope described above. Cookie `dh_session` is HTTP-only. Browser writes send `Origin` matching `CLIENT_ORIGIN`, JSON content type and `X-CSRF-Protection: 1`. Missing/expired sessions return 401; unauthorized operations return 403. Owned resource lookups return 404 for another user's ID. Validation rejects unexpected fields.

| Method / route               | Request                                               | Successful data                                           |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| GET /auth/policy             | none                                                  | contribution bounds                                       |
| POST /auth/register          | name, email, password, charityId, contributionPercent | user and subscription; sets cookie                        |
| POST /auth/login             | email, password                                       | user and subscription; sets cookie                        |
| GET /auth/me                 | cookie                                                | user and fresh subscription                               |
| POST /auth/logout            | empty object                                          | revokes current user's sessions and clears cookie         |
| PATCH /users/me/charity      | charityId, contributionPercent                        | user                                                      |
| GET /subscriptions/plans     | none                                                  | server currency, plans, prize percentage and availability |
| GET /subscriptions/me        | cookie                                                | subscription and latest payment history                   |
| POST /subscriptions/checkout | `{"plan":"monthly"}` or yearly                        | owned pending payment                                     |
| POST /subscriptions/renew    | plan, after expiry                                    | owned pending renewal payment                             |
| POST /subscriptions/cancel   | `{}`                                                  | subscription with cancellation flag, unchanged end        |
| POST /donations              | charityId, amountMinor                                | owned pending donation                                    |
| GET /payments/:id            | cookie                                                | payment snapshot and status                               |
| POST /payments/:id/process   | `{"scenario":"approve"}` or decline                   | server adapter outcome                                    |
| POST /payments/:id/retry     | `{}`                                                  | failed attempt reopened pending                           |
| GET /scores                  | no query parameters                                   | items, count, remaining, subscription, today              |
| POST /scores                 | `{"value":32,"roundDate":"2020-01-03"}`               | score, evictedId; HTTP 201                                |
| PATCH /scores/:id            | value and/or roundDate                                | score, evictedId null                                     |
| DELETE /scores/:id           | no body                                               | deletedId                                                 |
| GET /users/me/dashboard      | cookie                                                | user and independently tagged source sections             |
| PATCH /users/me              | `{"name":"Taylor","displayDateFormat":"iso"}`         | user                                                      |

Checkout/renew/donation require `Idempotency-Key` (16–100 supported characters). Reusing an identical key/body returns the same record; changing its intent returns 409. Never send client prices or trust a payment return URL. Subscription approval, payment state and allocations commit together. Failed donations or subscription attempts grant no entitlement. Reprocessing a succeeded record cannot credit twice. Amounts are integers in currency minor units; twelve annual allocation rows sum to the one annual payment. See [billing contracts](B09-Handoff.md) and [donation contracts](B08-Handoff.md).

Score writes require active entitlement, rechecked within the transaction. Reads remain available after lapse. Dates must be real `YYYY-MM-DD`, no later than UTC today; score values must be integers 1–45. Duplicate user/date gives 409 `DUPLICATE_ROUND_DATE`. Malformed ID gives 400; unknown or unowned ID gives 404 `SCORE_NOT_FOUND`. Invalid values/dates and older-than-full-set dates give 400. Lapse gives 403 `SUBSCRIPTION_REQUIRED`. Standalone MongoDB gives 503 `SCORE_DATABASE_UNAVAILABLE` for mutations. A sixth accepted score atomically replaces the oldest; edits reorder the next authoritative GET. Historical draw snapshots are never modified.

Example list data (inside the standard success envelope):

```json
{
  "items": [
    { "id": "aaaaaaaaaaaaaaaaaaaaaaaa", "value": 32, "roundDate": "2020-01-03" }
  ],
  "count": 1,
  "remaining": 4,
  "subscription": null,
  "today": "2026-09-17"
}
```

The example date is illustrative; actual `today` is computed on the server. Empty scores return items `[]`, count 0 and remaining 5. Profile accepts only `name` (2–120 trimmed characters) and `displayDateFormat` (`day-first` or `iso`), at least one field. `role`, email, ownership and internal fields are rejected rather than silently ignored.

Dashboard subscription/scores/charity use `{status:"ready",data:...}` or `{status:"error",data:null,message:...}`. A failed source does not claim empty success. Draw integration now supplies the next configured future draft schedule (or null), the owned published-entry count, and currency-separated won/paid totals. Zero/empty means a successful read found no records; source failure remains an error. Account and billing endpoints do not require active membership. Authentication still fails closed if session validation cannot complete.

## Draws, winning evidence and administration (B13–B23)

All paths below are relative to `/api`. List pagination uses `page=1&limit=12` (limit 1–50). Public draw DTOs contain aggregate outcomes only, never another user's entry or identity. Drafts/previews are admin-only. Member winning records require ownership even after membership lapse; suspended accounts have no protected access.

| Method / route                             | Input / output                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| GET /draws                                 | Published paginated `{items,page,limit,total}`                                             |
| GET /draws/latest                          | Latest published draw or successful `data:null`                                            |
| GET /draws/:id                             | Published aggregate result; draft/unknown 404                                              |
| GET /draws/:id/me                          | Owned frozen `{status,scores,matches,tier,amountMinor,currency,winnerId,cutoff}`           |
| GET /winnings                              | Owned paginated awards with separate verification/payout state                             |
| GET /winnings/:id                          | Owned immutable entry, submissions, safe timeline, payout and canSubmit                    |
| POST /winnings/:id/proof                   | Raw PNG/JPEG body, correct Content-Type, max 5 MB; returns updated owned claim             |
| GET /winnings/:id/proof/:submissionId      | Authorized private image attachment, no provider URL                                       |
| GET /admin/users                           | `q,page,limit`; literal name/email search                                                  |
| GET /admin/users/:id                       | Profile, subscription, current scores, audit history                                       |
| PATCH /admin/users/:id                     | Allowlisted name/displayDateFormat/charityId/contributionPercent/role/suspended and reason |
| PATCH /admin/users/:id/scores/:scoreId     | value and/or roundDate plus reason; same score rules                                       |
| PATCH /admin/users/:id/subscription        | plan, periodStart, periodEnd, cancelAtPeriodEnd, reason; server records mode=manual-demo   |
| GET /admin/charities                       | `q,page,limit` including inactive records                                                  |
| POST /admin/charities                      | name, slug, description, category, upcomingEvents, featured, active, reason                |
| GET /admin/charities/:id                   | Editable charity and audit history                                                         |
| PATCH /admin/charities/:id                 | Same allowlisted content fields and reason                                                 |
| DELETE /admin/charities/:id                | `{reason}`; archive if referenced, otherwise delete                                        |
| POST /admin/charities/:id/media            | Raw PNG/JPEG; query `alt` and `reason`; sanitized managed image                            |
| GET /charities/:id/media/:mediaId          | Public managed charity image only while active/referenced; never winning proof             |
| GET /admin/draws                           | Paginated drafts and published records                                                     |
| POST /admin/draws                          | month, strategy=random/weighted, scheduledAt, optional cutoffAt                            |
| GET /admin/draws/:id                       | Draft/configuration or aggregate reviewed/published result                                 |
| PATCH /admin/draws/:id                     | Full draft configuration; month immutable, increments version and clears preview           |
| POST /admin/draws/:id/simulate             | `{}`; returns versioned server preview, creates no winners/payouts/rollover                |
| POST /admin/draws/:id/publish              | `{previewVersion}`; commits exactly that reviewed result atomically                        |
| GET /admin/winners                         | `page,limit,verification,payout`; pending/approved/rejected and pending/paid filters       |
| GET /admin/winners/:id                     | Review claim with immutable entry/history                                                  |
| GET /admin/winners/:id/proof/:submissionId | Protected admin evidence download                                                          |
| POST /admin/winners/:id/review             | `{decision:"approved" or "rejected",revision,reason}`; reason mandatory on rejection       |
| POST /admin/winners/:id/payout             | `{mode:"simulated",reference}`; approved unpaid only; actor/time recorded                  |
| GET /admin/reports?from=&to=               | Inclusive real YYYY-MM-DD UTC dates, max ten years; source totals and metric definitions   |

Example draft request (dates illustrative; choose a due instant in the current UTC month for immediate simulation):

```json
{
  "month": "2026-09",
  "strategy": "weighted",
  "scheduledAt": "2026-09-17T09:00:00Z"
}
```

A fixed cutoff must first be configured in the future, within the draw month and no later than its schedule. Eligibility history preserves state at that instant. With no fixed cutoff, simulation freezes current eligibility. Draws can be simulated only when due in the current UTC month. Changing configuration or eligibility/funding after preview gives 409 `STALE_PREVIEW`; review a new simulation. Publish with the exact returned `previewVersion`. Same-version repeat publication returns the existing result; a different version fails. Monthly uniqueness and a transaction guard concurrent clicks. Public static `/latest` and owned `/:id/me` are registered before `/:id`.

Numbers are five distinct integers 1–45. Match counts are distinct intersections, so repeated score values never inflate wins. Only highest 3/4/5 tier pays. Server minor-unit arithmetic assigns 25/35/40 percent, leftover split pennies deterministically by user ID; only unclaimed five-match jackpot rolls. Annual subscription allocation is counted once per monthly row. Unclaimed three/four-tier amounts remain separately reported. Browser components only format server-calculated money.

Example review and payout bodies:

```json
{
  "decision": "rejected",
  "revision": 1,
  "reason": "Please include the full readable scorecard."
}
```

```json
{ "mode": "simulated", "reference": "local-demo-settlement-unique-reference" }
```

Proof is PNG/JPEG only, decoded to a bounded single-frame image and re-encoded without metadata. Maximum five submissions; resubmit only after rejection. Identical pending proof retries do not add a submission. Approval prevents further upload; payout cannot precede approval, repeat, or reuse a settlement reference. Rejection reason/history remains after resubmission. Mark-paid is an audited manual/demo record, not a bank transfer.

Reports use successful subscription allocation-month rows and successful independent donation completion dates separately. Awarded means draws published in range; paid means payout timestamps in range. Users, active subscriptions and outstanding rollover are current balances regardless of filter. Never add rollover to allocated revenue. Each currency is a separate row; historical charity attribution is retained.

### Recovery contract

400 covers malformed IDs/explicit field rules; 401 unauthenticated; 403 role/CSRF/origin/suspension/inactive entitlement; 404 missing/unowned; 409 duplicate/stale transition; 413 endpoint payload limit; 422 schema validation; 503 unavailable database/provider; 500 unexpected internal error. Database duplicate keys normalize to `RECORD_CONFLICT`; schema errors to `VALIDATION_ERROR`; unknown exceptions never expose stack, field values, connection strings or secrets. Request IDs support correlation without internal error disclosure.

The browser never automatically retries writes. Read-error retry is explicit. Payment requests retain their idempotency key; draw publication retains the reviewed version. Network timeout on a write means status is uncertain: refresh its authoritative record before submitting again. Session loss removes private routes/query state and redirects to login; ordinary forbidden/admin-only responses do not log out a valid member. Form errors retain typed values and focus guidance. No nonfunctional password-recovery link is provided.
