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
