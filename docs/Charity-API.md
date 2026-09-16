# B04 charity API: architecture and function walkthrough

## Main request flow

createDatabase now exposes its dedicated Mongoose connection. createApp passes the configured DB timeout to createRoutes, which registers the Charity model on that connection, creates a service and mounts the charity router. No global/default Mongoose connection is introduced. B01 startup still connects MongoDB before listening and handles shutdown as before.

GET /api/charities enters the shared request-ID, security, CORS and JSON middleware, then the charity router. The controller validates and normalizes the query. The service always supplies active: true, adds category/search constraints, requests a stable sorted page plus a count, and maps an explicit public response object. The controller wraps it with apiResponse. Express 5 forwards errors to the existing central handler.

GET /api/charities/featured additionally forces featured: true. It is registered before the ID route. GET /api/charities/:id validates a strict ObjectId before querying for both ID and active: true. Unknown and inactive records share the same 404. MongoDB failures become sanitized 503 errors instead of fake empty results.

No frontend files, UI flows or backend write endpoints are added in B04. The future charity UI must call these endpoints and map its view contract (B03 uses image.src and isExample; B04 returns images[].url and isDemo). Public :id accepts ObjectIds only; slug lookup is not implemented.

## Model and persistence

| Field | Storage/validation |
| --- | --- |
| name | Required trimmed string, 2–120 characters |
| slug | Required trimmed lowercase slug, at most 120 characters, unique index |
| description | Required trimmed string, 20–5000 characters |
| images | Up to 10 {url, alt} subdocuments; empty by default; no subdocument IDs |
| category | Required lowercase category slug, max 64; no invented fixed taxonomy |
| upcomingEvents | Up to 50 {title, startsAt, location, description} subdocuments; empty by default |
| featured | Boolean, false by default |
| active | Boolean, false by default so new unreviewed records are not implicitly public |
| isDemo | Boolean, false by default; explicit true for seed examples |
| seedKey | Optional immutable internal key, select:false, unique sparse index |
| createdAt / updatedAt | Mongoose timestamps; not part of public response |

Image URLs are absolute HTTP(S), max 2048 characters, with no embedded credentials/whitespace; alt text is required and max 300. Event titles are required and max 160; startsAt is a required valid Date; location/description default to empty strings with 200/1000 limits. Unknown schema fields throw. Indexes support active/name ordering, active/category/name ordering and active/featured/name ordering; slug and seed ownership uniqueness are database-enforced.

## Functions and callers

| Function | Inputs and caller | Output and side effects |
| --- | --- | --- |
| createCharityModel | Mongoose connection, from root router or seed | Returns existing connection-scoped Charity model or registers its schema/indexes. Does not open a connection. |
| Image/event schemas | Values passed to Mongoose model writes | Validate nested data and omit nested IDs. Array validator callbacks cap image/event counts. Schema setters trim/lowercase canonical values. |
| isHttpUrl | Candidate image URL, called by schema validator | Boolean from URL parsing/protocol/credential/whitespace checks. No network requests. |
| parseCharityId | Route string, called by detail controller | Same ID string if 24 hex characters; otherwise typed 400 INVALID_ID. Avoids permissive casts. |
| parseCharityQuery | Express query object, called by list/featured controller | Normalized {q, category, page, limit}; rejects unknown/repeated/nonstring values, invalid category, long/control-character search or invalid pagination with 400 INVALID_QUERY. |
| integer (query helper) | Key, default and maximum from parseCharityQuery | Canonical bounded integer; throws a field-specific safe error. No side effects. |
| escapeSearch | Validated search string, called by list service | Regex-escaped literal substring; prevents metacharacters becoming a regex program. |
| createCharityService | Connection-bound Charity model; optional timeoutMs and clock now | Returns list/getById closures. No DB call during construction. The injected clock lets mapping use one timestamp per response. |
| withDatabase | Async operation from list/getById | Checks connected state, executes it, and maps driver/selection failures to 503. Unknown application errors pass to central handling. A test adapter without a model reports unavailable; it never returns fake records. |
| list | Validated query plus featuredOnly boolean, from controller | Parallel MongoDB find/count; enforced active filter, optional featured/category and escaped name-or-description search; stable name/_id sort, bounded skip/limit/time; returns items and pagination. Only reads. |
| getById | Validated ID from controller | Reads an active document, returns a public object, or throws 404. Only reads. |
| toPublicCharity | Lean record and current Date, from service | Explicit DTO with string id, public content/flags, mapped image fields and future-only events sorted by time and serialized to UTC. Excludes seed/internal fields. Does not mutate stored data. |
| Public image/event mapping callbacks | Lean subdocuments | Pick allowed fields; event filter/sort operate on a new filtered array. No persistence side effects. |
| createCharityController | Service, called by charity router | Returns thin Express list/featured/detail handlers. No DB logic or connection creation. |
| controller.list | req/res | Parse query, await service.list, write shared success envelope with request ID. |
| controller.featured | req/res | Same parsing, forces featuredOnly, writes the same paginated envelope. |
| controller.detail | req/res | Validate ID, reject detail query parameters, await getById and write single-record envelope. |
| createCharityRoutes | Service, called by root router | Returns an Express Router with list, literal featured and ID routes in that order. No public mutations. |
| createRoutes changes | Database adapter, shutdown predicate, queryTimeoutMs from createApp | Preserves probes, registers the connection-scoped model/service, mounts /charities. Timeout defaults to 3000 when not supplied. |
| createApp changes | Existing config/database/shutdown arguments | Passes config.dbTimeoutMs through to route/service construction. Existing middleware order and error envelope remain unchanged. |
| createDatabase change | Existing validated config | Exposes its already-owned connection so module factories share the server's actual connection. connect/isReady/disconnect behavior is unchanged. |
| check script change | Existing directory walker, called by backend build | Now runs node --check on scripts as well as src, covering the new seed CLI; no compilation artifacts. |

## Seed flow and functions

The seed CLI loads backend/.env using the same location convention as server.js, validates config, refuses production mode, creates/connects a dedicated database adapter, registers Charity and awaits its indexes. Every seed record is schema-validated. An insert-only upsert identifies each row by a unique stable seedKey and isDemo: true. Unique slugs prevent collisions with unrelated records. Existing rows retain all edits, including deactivation and timestamps.

| Function/data | Inputs and caller | Output and side effects |
| --- | --- | --- |
| DEMO_CHARITIES | Static local fixture definitions consumed by seeder | Three clearly fictional names/slugs/categories, isDemo true, explicit active/featured state and empty images/events. No financial values. |
| seedDemoCharities | Connected Charity model; runSeed and tests | Ensures indexes, validates rows, performs insert-only upserts, handles concurrent owned-key insert races, and returns {inserted, existing}. Conflicting unrelated slug/key raises a safe error. Does not delete/reset/update existing rows. |
| runSeed | Validated config from CLI/tests | Refuses NODE_ENV=production, opens isolated connection to specified database, seeds, and closes in finally on both success/failure. Returns counts or rejects. |
| Seed CLI entry block | process environment and invocation path | Only runs when directly invoked. Loads dotenv, calls parseEnv/runSeed, prints actual counts on success, or sanitized error and exitCode=1 on failure. Importing the file in tests does not run the CLI. |

No transaction spans the three demo inserts. A failure after an earlier insert can leave a partial demo set; retrying resumes without duplicate or destructive behavior. This is intentional development tooling, not a production migration. The command is implemented and exercised only against test-owned MongoDB during B04.

## Tests and tooling

backend/test/charities.test.js starts a real MongoDB 8.2.6 process using mongodb-memory-server, with a dedicated temporary DB and no dependency on backend/.env or user DB credentials. Its before hook creates the database/model/app and indexes; beforeEach deletes only records in that isolated collection; after closes the connection and stops/removes the test server. fixtures inserts representative active/inactive/featured/category records and past/future events.

Thirteen integration cases exercise list order/counts/pages, combined/literal search, featured ordering, allowlisted DTO/event behavior, malformed/missing/inactive IDs, invalid queries, empty responses, model constraints/indexes, repeated/edit-preserving seed, concurrent seed and collisions, actual seed CLI runs, DB disconnection/recovery and absence of writes. The child-process helper runs seed.js twice with the test URI and inspects actual inserted/existing counts. The existing eight B01 backend tests remain intact.

The MongoDB helper is a devDependency only, locked at the workspace root. First install/test can download/cache its pinned test binary; missing network/binary support produces a real failure rather than skipping tests. The production backend still uses a separately configured MongoDB instance. B04 adds no frontend dependency, UI tests or screenshots.
