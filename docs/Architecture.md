# Architecture and code walkthrough

The supplied trees describe the full product. B01 adds only executable infrastructure, tests and documentation; no empty domain files are created. Styles, tests, a syntax-check script and root workspace tooling are purposeful additions. All existing source assets and planning documents remain unchanged.

## Main data flow

server.js loads backend/.env and validates it, creates a Mongoose connection, then opens the HTTP listener. createApp itself neither reads environment files nor opens sockets, which lets tests supply controlled database adapters. A request receives a generated ID, security headers, origin checks and a bounded JSON parser before entering the router. Readiness pings MongoDB. Express 5 forwards rejected asynchronous handlers into the central error middleware.

The browser mounts App, which calls the shared credentialed client for /ready. The client validates and unwraps the envelope. App displays loading, ready or failure and permits a fresh check. Effect cleanup aborts the previous request, preventing stale responses after unmount. A shutdown signal marks readiness false before draining HTTP traffic and closing the database.

## Backend functions

| Function                  | Inputs and caller                                     | Output and side effects                                                                                            |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| parseEnv                  | Environment map, called by server bootstrap/tests     | Frozen validated config; throws a clear aggregated error without echoing values                                    |
| integer (inside parseEnv) | Key, fallback, maximum                                | Parsed number; records range/type violations                                                                       |
| createDatabase            | Validated config, called by startServer               | Independent Mongoose connection adapter; attaches a sanitized error listener                                       |
| connect                   | Called by startServer                                 | Opens MongoDB with bounded selection/connect timeouts and disabled buffering                                       |
| isReady                   | Called by readiness route                             | Boolean promise after connected-state check and bounded database ping; DB errors become false                      |
| disconnect                | Called by startup failure/shutdown                    | Closes the Mongoose connection                                                                                     |
| createApp                 | Config, database adapter, optional shutdown predicate | Express app; installs ID/cache middleware, helmet, credentialed CORS, JSON parsing, routes and errors; no listener |
| origin callback           | Browser origin and cors callback                      | Allows exact configured origin or no origin; forwards a typed 403 otherwise                                        |
| createRoutes              | Database and shutdown predicate, called by createApp  | Router with liveness and readiness handlers; rechecks draining after ping                                          |
| health handler            | Express request/response                              | 200 liveness envelope, independent of DB                                                                           |
| readiness handler         | Express request/response                              | Awaits DB readiness; returns 200 or throws typed 503                                                               |
| ApiError constructor      | Status, code, safe message from middleware/routes     | Error object suitable for public response                                                                          |
| apiResponse               | Data and request ID from route                        | Plain success envelope with no side effects                                                                        |
| notFound                  | Unmatched Express request                             | Passes typed 404 to next middleware                                                                                |
| errorHandler              | Express error/request/response/next                   | Normalizes parse/size failures; masks unknown errors, writes JSON, delegates if headers already sent               |
| startServer               | Config and optional DB adapter                        | Connects DB, listens, registers signal handlers; returns server and shutdown; closes DB on startup failure         |
| shutdown                  | Returned to tests or called by signal handler         | Idempotently marks draining, closes HTTP and DB, removes handlers; deadline forces process exit 1                  |
| onSignal                  | SIGINT/SIGTERM                                        | Starts shutdown; records nonzero exit on failure                                                                   |
| check                     | Directory, called by backend build script             | Recursively runs node --check on source JS; exits nonzero on syntax failure                                        |

## Frontend functions and components

| Function/component          | Inputs and caller                                               | Output and side effects                                                                                           |
| --------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Vite configuration factory  | Mode supplied by Vite                                           | Loads env, validates public API base, configures React, strict dev port, proxy and jsdom tests                    |
| ApiClientError constructor  | Message and optional metadata, called by api                    | Error preserving status/code/request ID                                                                           |
| api                         | Relative route and fetch options from App/future module clients | Credentialed timed HTTP request; validates response and returns data or typed error; respects caller cancellation |
| App                         | No props; mounted in main.jsx                                   | Accessible service-status view; stores attempt/result, fetches readiness on mount/retry, aborts on cleanup        |
| retry                       | Button event in App                                             | Sets loading and increments attempt to trigger a new request                                                      |
| readiness promise callbacks | Data/error from api in App effect                               | Update live status only when the request has not been aborted                                                     |
| main.jsx bootstrap          | DOM root                                                        | Imports local fonts/styles and renders App in StrictMode                                                          |

Test callbacks exercise public contracts, network failures, real Mongoose refusal, startup/shutdown, CORS, malformed requests and client retry/unmount behavior. fixture builds isolated apps with controlled readiness. Frontend setup registers DOM assertions and cleans rendered trees after each test. No test API is exposed in production.
