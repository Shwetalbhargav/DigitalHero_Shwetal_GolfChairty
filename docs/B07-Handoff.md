# B07 — Authentication frontend

Branch `feat/auth-frontend`, stacked on `feat/auth-backend`; eventual target `main`.

## Summary, changes and function walkthrough

`App` wraps routes in `AuthProvider`. The provider bootstraps GET `/auth/me`; `refresh(signal)` updates identity only for the latest request, and an aborted bootstrap cannot replace a later login. `authenticate(action, body)` calls register/login and installs the returned identity. `signOut()` waits for server revocation before clearing identity and subscription state. `useAuth()` returns this context and rejects use outside its provider. No JWT or user data is stored in browser storage. Private pages unmount on logout or identity change.

`ProtectedRoute` waits for bootstrap, shows a retryable service error, redirects an absent session to login with a local return path, and otherwise renders its outlet. `AdminRoute` denies members with a recovery link; the backend remains authoritative. Account creation does not confer active membership.

`AuthCard({title,children})` supplies the supplied split forest-image/card composition, collapsing on mobile. Its photo is decorative; factual impact metrics and unsupported social login/recovery controls are omitted. `LoginPage` and `RegisterPage` compose it with `AuthForm`.

`AuthForm({registration})` controls input, validates required fields and UTF-8 password length, focuses invalid controls, preserves input on server failures and uses a synchronous pending ref to reject double submissions. `change` updates one field; `submit` validates, calls auth and navigates. `safeReturnTo` rejects external/protocol-relative/backslash paths. Visibility toggling is keyboard-operable. `CharitySelection` loads the paginated directory and server policy, supports search and page buttons, and returns charity/percentage changes through callbacks. Its effect reports policy bounds so submission is disabled if policy is unavailable. The minimum is 10%; the maximum comes from the server. `AccountPage` exposes identity and a real logout action with errors; B08/B09 supply its charity/subscription destinations.

`auth.api.js` functions are small credentialed API wrappers: getSession/getPolicy read; login/register/logout send JSON. The shared client now sets JSON Content-Type when a body exists and the custom CSRF header on writes; browsers supply Origin. Header navigation adds sign-in. New CSS follows the existing tokens, responsive form cards and selected-radio states.

## How to test and results

Set backend AUTH_SECRET, seed charities, run `npm run dev`, visit `/register`, create a demo account, reload `/dashboard`, and sign out. Run `npm run lint`, `npm run test -w frontend`, `npm run build -w frontend`, `npm run test:e2e -w frontend -- auth.spec.js`.

Lint, all 24 frontend unit tests and Vite build (95 modules) passed. Tests cover refresh persistence, logout clearing, admin denial, invalid credentials, field errors and return paths. Browser results/screenshots are recorded in the consolidated handoff; browser presentation tests use explicitly stubbed API responses, while backend tests exercise real MongoDB.

## Prepared commit and PR

Subject / title: **feat: build authentication and onboarding frontend**

Body: Add accessible login/registration, API-backed charity and contribution selection, session restoration, logout and member/admin guards. Preserve form input on failures and reject stale session responses. Verify lint, 24 frontend tests, production build and responsive browser checks.

Summary: Connect public onboarding to secure cookie sessions.

Changes: Auth module, guards, account page, shared client headers, responsive forms and tests.

How to test: Use the commands and flow above.

Results: 24 unit tests passed; see Run 1 for final browser results.

Screenshots: `docs/screenshots/run1/login-*.png` and `register-*.png`.

Risks: Email verification/password recovery/social login are outside this branch. Initial membership links are fulfilled by subsequent B08/B09 branches in this authorized run. A network-failed logout displays an error and retains the session rather than claiming server revocation succeeded.

Browser verification: all six login/register cases passed at 360, 768 and 1440 pixels, including keyboard password visibility, overflow and axe checks. Mobile screenshot inspected.
