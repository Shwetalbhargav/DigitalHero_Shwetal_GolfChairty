# B06 — Authentication backend

Branch `feat/auth-backend` is stacked on `feat/home-charity-integration`; eventual integration target is `main`. No remote PR or deployment is created.

## Summary and changes

Register/login issue seven-day HS256 JWTs in HTTP-only, SameSite=Lax cookies (Secure in production). Authenticated requests load the current user; logout increments a database token version, revoking all sessions. Suspended users cannot log in or use existing sessions. Unique normalized email and server-owned role prevent duplicate accounts and role injection. Registration requires an active charity and a whole-number contribution from 10 through `100 - PRIZE_PERCENT` (default 50).

## Function and request walkthrough

`createUserModel(connection)` registers/caches the strict Mongoose schema. `publicUser(user)` returns an allowlisted identity and charity preference DTO, never hashes or token versions. Callers are authentication controllers and later user routes.

`validateBody(body, allowed)` rejects unknown fields and non-object bodies. `validateContribution(value, maximum)` returns a valid integer or throws 400. `validateCredentials(body, registration, maximum)` normalizes email and validates names, password byte limits and charity IDs. These pure validators are called by the service before persistence.

`createAuthService(User, Charity, config)` returns `register(body)`, `login(body)` and `logout(user)`. Register checks an active charity, hashes the password with bcrypt cost 12 and inserts a member; duplicate email becomes 409. Login performs a password comparison even for unknown addresses and rejects suspended accounts. Logout increments tokenVersion; this intentionally signs out all sessions.

`generateToken(user, secret)` signs subject/version with fixed issuer/audience and expiry. `verifyToken(token, secret)` verifies the same claims and an explicit algorithm allowlist. `cookieOptions(config)` chooses the environment-aware cookie attributes. No token is sent in JSON.

`createAuthMiddleware(User, config)` returns `authenticate`, which extracts the cookie, verifies claims, reads current user/version and suspension, then attaches `req.user`. Invalid sessions are 401 and suspension is 403. `requireAdmin` only advances an authenticated admin. `createCsrfMiddleware(config)` requires exact Origin and `X-CSRF-Protection: 1` for writes: cross-site forms fail and custom headers require the existing exact-origin CORS preflight. Non-browser API callers must send both headers too.

`createAuthRoutes` wires thin register/login/logout/me controllers, cookie issuance/clearing, and 20 auth attempts per 15 minutes per IP. The limiter is process-local; distributed deployment needs a shared store. GET `/auth/policy` exposes only contribution bounds. `createRoutes` mounts auth with CSRF checks; `createApp` passes validated configuration. `parseEnv` now requires AUTH_SECRET (32+ characters), validates PRIZE_PERCENT, and derives the maximum charity contribution.

## API and examples

All paths have `/api` prefix and use the existing `{success,data,requestId}` or `{success:false,error:{code,message},requestId}` envelope.

- POST `/auth/register`: `{ "name":"Alex Green", "email":"alex@example.com", "password":"a-long-unique-password", "charityId":"<active ObjectId>", "contributionPercent":10 }` → 201 `{user}` and session cookie.
- POST `/auth/login`: `{email,password}` → 200 `{user}` and cookie.
- GET `/auth/me`: cookie → 200 `{user,subscription:null}`; B09 adds live subscription state.
- POST `/auth/logout`: cookie and CSRF headers → 200 `{loggedOut:true}`, clears cookie and revokes sessions.
- GET `/auth/policy`: public → contribution min/max.

Errors: 400 invalid input/charity/contribution, 401 invalid credentials/session, 403 CSRF/suspension/admin denial, 409 duplicate email, 429 rate limit. Auth responses never return password hashes.

## Verification and prepared messages

`npm run test -w backend`: 24/24 pass, including real isolated MongoDB registration, duplicate emails, login/logout revocation, malformed/expired tokens, suspension, charity/contribution and CSRF rejection. `npm run lint` and `npm run build -w backend` are run before commit.

Commit subject / PR title: **feat: implement secure cookie based authentication**

Commit body: Add normalized user accounts, bcrypt passwords, HTTP-only JWT sessions with database revocation, CSRF and rate limits. Validate active charity selection and funding-compatible contributions. Verify 24 backend tests against isolated MongoDB, lint and backend build.

PR Summary: Implement cookie authentication and member identity.

Changes: User model, validators, services, middleware, auth routes and environment configuration.

How to test: Generate AUTH_SECRET (for example `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), put it in backend/.env, seed a charity, start the API and use the requests above. Run lint, backend tests and build.

Results: 24 passing backend tests; final aggregate results are in Run 1 handoff.

Screenshots: Not applicable to backend.

Risks: SameSite=Lax requires same-site production frontend/API domains; cross-site cookie deployments are not supported. No password recovery or email verification is claimed. PRD source sections were not present; the repository Master prompt and branch plan define this scope.
