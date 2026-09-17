# Recruiter feature review

Reviewed 17 September 2026 against the supplied Digital Heroes Level 1 PRD and current local checkout. This is an assessment, not a feature implementation. Document requirements are evaluation criteria, not authorization to deploy or create accounts.

## Assessment

The app has substantial working domain logic, but the submission and demonstration are incomplete. The strongest interview evidence is transactional score retention, subscription allocation, immutable draw publication, access control, private evidence handling and automated tests. The most urgent work is a reliable reviewer demo, required provider/deployment completion, and navigation/content polish.

## Verification performed

- Backend: 59 tests passed. Frontend: 47 tests passed.
- Build and ESLint passed.
- Real API browser integration: three member journeys passed at widths 360, 768 and 1440. These cover signup, charity selection, independent donation simulation, monthly/yearly subscription simulation, decline/retry, cancellation, rolling scores, profile persistence, login/logout and member rejection from admin routes.
- Those member journeys include automated accessibility and horizontal-overflow assertions. These checks do not constitute complete manual accessibility certification.
- The fourth integration journey failed at its initial member login. The test and README reference operations-member@example.test; the current seed creates named members such as aarav@example.test instead. Downstream admin/proof/payout browser steps were not reached.
- Manually signed into the disposable demo as administrator and inspected the admin overview, winner queue and published draw. The draw has seven eligible entries, numbers 1–5 and zero winners. The winner queue is empty.
- Inspected current homepage/mobile dashboard screenshots and the live admin draw screen.
- Formatting check failed in 19 files. This is a hygiene issue, not evidence of broken product functionality.
- No deployed URL or real provider integration was tested. No application source was changed by this review. Existing integration tests refresh their screenshot artifacts.

## P0: complete before assignment submission

| ID | Feature | Current issue | Required change / acceptance |
|---|---|---|---|
| 1 | Working reviewer accounts | Documented member login does not exist in the current seed. | Keep seed, README and browser tests consistent. Verify both published credentials from a fresh demo startup. |
| 2 | Full demonstration data | Historical draw has no winners; no upcoming draw is configured. | Add isolated fixtures covering 3/4/5-match awards, pending proof, rejection/resubmission, approved/unpaid and paid states; include upcoming draw and lapsed subscriber. Reviewer can reach each state directly. |
| 3 | Full browser regression | Operations journey stops before proof and admin coverage. | Update all stale fixture assumptions, including member name, round dates and expected award. Complete proof upload → rejection → resubmission → approval → payout → reports in the browser. |
| 4 | Public deployment | README explicitly says nothing is deployed. | Deliver persistent frontend, API, database and media storage with working HTTPS routes and refresh/deep-link behavior. Supply the public URL and demo credentials. PRD requires a new Vercel account. |
| 5 | Database requirement | Current persistence is MongoDB; PRD specifies a new Supabase project. | Meet that requirement, or obtain explicit evaluator acceptance of the alternative. A written architecture explanation alone does not establish compliance. |
| 6 | Payment provider | Approve/decline controls are a local simulator; production billing is disabled. | Integrate Stripe or an equivalent provider. Demonstrate provider sandbox checkout and verified server callbacks; do not activate membership based on a browser success redirect alone. Provider test mode is different from the existing local simulation. |
| 7 | Provider subscription lifecycle | Manual demo renewal and cancellation exist; provider renewal reconciliation does not. | Handle renewal success/failure, cancellation, expiry and duplicate/reordered provider events, keeping authenticated request entitlements current. |
| 8 | Rollover semantics | Only absence of a five-match winner causes rollover. Existing notes leave unsubmitted/rejected winning claims unresolved. | Specify what “unclaimed” means, claim deadlines and treatment of unresolved awards. Implement the agreed policy and test conservation of funds. This is a PRD ambiguity, not proof of arithmetic failure. |

## P1: high-value changes for recruiter review

| ID | Feature | Current issue | Change / acceptance |
|---|---|---|---|
| 9 | Product navigation | Foundation, UI library, Member shell and Admin shell appear in product navigation. | Use Home, Charities, My dashboard and role-appropriate Administration. Keep development examples outside primary product navigation. |
| 10 | Charity detail navigation | Header uses an exact pathname list; /charities/:id falls back to foundation navigation. | Use route/layout-aware marketing navigation across directory and detail pages. |
| 11 | Session-aware header | Public header does not use authentication state. | Signed-in users get dashboard/account actions instead of a fresh signup CTA; admin links appear only for admins. Keep server authorization. |
| 12 | Administrator landing | Admin sign-in defaults to member dashboard. | Default admins to the operational overview while preserving valid explicit return destinations. |
| 13 | Homepage art direction | Primary hero shows golfers, clubs and a fairway. | Lead with community/charitable impact to match the explicit PRD art direction; retain golf as supporting context. |
| 14 | Charity content | Featured cards show Image unavailable; seeded profiles have no events. | Add licensed, relevant images and clearly fictional demo event content. Verify directory, profile, featured cards and image alternatives. |
| 15 | Charity filters | Visitors must type a category slug. | Use labelled dropdowns or chips from available categories, with All and Clear filters. Keep URL state and empty results understandable. |
| 16 | Public plan comparison | Prices are presented after registration in the membership screen. | Add public monthly/yearly comparison, annual saving and contribution breakdown before signup, using the same server-owned plan data. |
| 17 | Guided onboarding | Signup moves to subscription; five-score entry requires separate repeated navigation. | Provide account → charity → membership → five scores → readiness checklist. An Add another round action can reduce friction without changing retention rules. |
| 18 | Member next action | Dashboard presents separate status cards but lacks one clear prioritized action. | Surface Renew membership, Add remaining scores, Submit winning proof or View next draw, based on actual state. Distinguish readiness from confirmed participation. |
| 19 | Account recovery | No forgot-password/reset flow. | Add expiring, single-use recovery links and a completed reset flow. This is a product-completeness addition, not an explicit PRD deliverable. |
| 20 | Account settings | Only display name/date preference editable; email/password changes unsupported. | Add authenticated password change and verified email change. Email verification is a useful companion enhancement. |
| 21 | Admin overview | Overview is five navigation cards. Metrics exist separately in reports. | Bring active members, pending proofs, unpaid approved awards, next draw and relevant totals into overview with direct queue links. Reuse existing calculations. |
| 22 | Member administration | Member list has search but no subscription/role/status filters or renewal columns. | Add filters and visible membership/expiry status to support real operational tasks. Existing profile, score and entitlement editing should be retained. |
| 23 | Winner review usability | List shows amounts/status and shortened claim IDs, without member name; proof action downloads a file. | Show authorized member identity, draw, tier and submission time. Add protected in-app image preview/zoom beside stored score dates and values. |
| 24 | Charity media management | Editor uploads/displays images but offers no image removal, reorder or alt-text editing controls. | Add these controls and a clear cover-image choice, preserving referenced media/history appropriately. |
| 25 | Draw review explanation | Preview gives aggregate entries and totals; no exclusion breakdown. | Show why members are excluded (insufficient scores, lapsed membership, cutoff) and explain prize allocation/rounding. This improves confidence in already implemented calculations. |
| 26 | Customer wording | UI exposes phrases such as category slug, payment snapshots, preview UUID and storage implementation. | Keep concise demo disclosure; replace customer-facing implementation language with task-oriented wording. Put technical diagnostics in expandable admin details. |

## P2: useful additions after P0/P1

| ID | Feature | Addition |
|---|---|---|
| 27 | Notifications | Notify members about draw publication, proof required, rejected proof, approval and renewal issues; add an admin pending-review indicator. Avoid implying delivery until an actual delivery adapter exists. |
| 28 | Personal giving history | Show recorded subscription charity allocations and independent donations by date/cause, clearly distinguishing allocation from actual transfer. Current dashboard mainly shows pledge percentage. |
| 29 | Billing self-service | Add provider payment-method management and ordinary billing receipts/history. Plan switching and cancellation reversal are optional lifecycle extensions. Do not describe demo records as tax receipts. |
| 30 | Reporting usability | Add month presets, trend charts and CSV export to existing totals/reconciliation. These are enhancements; reporting itself is already implemented. |
| 31 | Demo and handoff package | Provide a concise PRD coverage matrix, architecture diagram, known limitations, verified credentials and a short recorded walkthrough. Lead README with reviewer instructions; retain detailed engineering notes separately. |
| 32 | Repeatable quality gate | Add CI for tests/build/lint/browser smoke, fix formatting drift and refresh readiness claims after a fresh full run. Extend browser coverage to another engine and manually inspect keyboard/mobile flows before claiming broader support. |

## Existing strengths to preserve

- One score per date, range validation, latest-five retention and authenticated ownership checks.
- Monthly/yearly plans, contribution selection, independent donations, cancellation and lapse handling in simulation.
- Random and frequency-weighted draws, simulation, versioned publication, 40/35/25 allocation, equal-split rounding and jackpot accounting.
- Server-enforced roles and subscription checks; CSRF defenses, revoked sessions and audited administrative changes.
- Private proof validation, rejection/resubmission and single-settlement guards at the backend test level. The current browser demonstration still needs repair.
- Clear typography, consistent green palette, error/loading states and meaningful automated tests.

## Delivery order

1. Repair demo accounts, winner fixtures and the operations browser test.
2. Resolve PRD database/deployment requirements and integrate provider sandbox billing/lifecycle.
3. Fix navigation and login destinations, then replace missing charity content and adjust the hero.
4. Improve onboarding, account recovery and admin operational queues.
5. Package the verified submission and add optional reporting/notification enhancements only after the core experience is reliable.

The supplied PDF has 13 physical pages and skips the printed technical/scalability page listed in its contents. No requirements have been invented for that missing page.
