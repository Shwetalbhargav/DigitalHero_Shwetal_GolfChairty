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

| Method | Path | Response |
| --- | --- | --- |
| GET | /api/charities | Paginated active directory |
| GET | /api/charities/featured | Paginated active and featured directory; literal route is registered before /:id |
| GET | /api/charities/:id | One active charity; strict 24-character hexadecimal ObjectId |

### List and featured query parameters

| Parameter | Default | Rules |
| --- | --- | --- |
| q | Empty | Trimmed, at most 100 characters; no internal control characters. Case-insensitive literal substring search of name OR description. Regex metacharacters have no special meaning. |
| category | Empty | Trimmed and lowercased; exact category slug, up to 64 characters. Letters/digits with single hyphen separators, beginning with a letter. No fixed taxonomy is assumed. |
| page | 1 | Canonical decimal integer from 1 to 1000. No signs, leading zeroes, decimals or empty value. |
| limit | 12 | Canonical decimal integer from 1 to 50. |

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
    "items": [{
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
    }],
    "pagination": {"page": 1, "limit": 12, "total": 1, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false}
  },
  "requestId": "generated-uuid"
}
```

Featured uses the same data shape. Detail places the single charity object directly in data, without items/pagination.

Public fields are id, name, slug, description, images, category, upcomingEvents, featured, active and isDemo. Images are {url, alt}; URLs must be absolute HTTP(S) without embedded credentials and alt text is required. Events are {title, startsAt, location, description}; startsAt is an ISO UTC instant. Only events at or after the response's current time are returned, sorted earliest first. Expired events remain stored but disappear from public responses. Seed keys, MongoDB _id/__v, timestamps and unknown/internal fields are not exposed.

A ready directory with no matches returns 200 with items: [], total: 0, totalPages: 0 and both navigation flags false. A page beyond the available rows returns 200 with items: [] while retaining the total and totalPages for the filter. hasPreviousPage is true only when page > 1 and total > 0. Database failure never returns a fabricated empty list.

### Errors

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | INVALID_ID | Detail ID is not 24 hexadecimal characters |
| 400 | INVALID_QUERY | Invalid/unknown/repeated list query, or any detail query |
| 404 | CHARITY_NOT_FOUND | Well-formed ID is unknown or inactive; same message for both |
| 503 | SERVICE_UNAVAILABLE | DB disconnected, selection/network failure, or query timeout |
| 500 | INTERNAL_ERROR | Unexpected application failure; existing sanitized handler |

```json
{"success":false,"error":{"code":"INVALID_ID","message":"Charity ID must be a 24-character hexadecimal ObjectId."},"requestId":"generated-uuid"}
```

```json
{"success":false,"error":{"code":"CHARITY_NOT_FOUND","message":"Charity not found."},"requestId":"generated-uuid"}
```

DB reads use DB_TIMEOUT_MS as their server-side maximum query time. List rows and count are separate parallel reads, so a concurrent future admin edit can briefly make the total differ from the returned page; no snapshot transaction is claimed. Literal substring search can require scanning at larger scale; bounded inputs/offsets/timeouts are the B04 baseline, not a full-text search service.

### Demo seeding

Run npm run seed -w backend against your configured development database. It inserts three explicitly fictional records (youth, environment and community), with Demo: names, demo- slugs and isDemo: true. Two are featured. Images/events are empty instead of inventing hosted images or scheduled real events.

Unique sparse seed keys and unique slugs back insert-only upserts. Repeating the seed preserves existing demo edits, inactive state and timestamps. It never overwrites an unrelated record with a colliding slug or key; collisions fail clearly. Concurrent same-key inserts are recognized safely. NODE_ENV=production is refused. Seeding is not transactional across all three records: a later failure can leave earlier inserts, and rerunning safely resumes. B04 did not seed any user-configured database; verification used an isolated local test database only.
