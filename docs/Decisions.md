# Decisions

The Master prompt and D01–D11 below were recovered from the supplied plan-generation source and plan.json. The original PRD is not present in this workspace; its descriptions below are inherited claims, not independently verified requirements. B01 implements infrastructure only.

## D01 — Database and stack

Source conflict: Root plan: MongoDB, Express, React and Vite. PRD deployment section: new Supabase project.

Recorded plan decision: User selected root-plan MongoDB for demo; strict PRD delivery requires a confirmed Supabase architecture change.

Applies to: B01, B25

## D02 — Payment mode

Source conflict: Root plan explicitly requests simulated payment; PRD section 04 requests Stripe or equivalent.

Recorded plan decision: User selected a labelled demo adapter. Real provider integration, verified webhooks and real renewal reconciliation remain a separate compliance gate.

Applies to: B08, B09, B25

## D03 — Deployment accounts

Source conflict: Root plan: Render/Vercel/Atlas. PRD: new Vercel account and new Supabase project.

Recorded plan decision: Prepare root-plan deployment; verify account requirements before claiming PRD compliance.

Applies to: B25, B26

## D04 — Plan prices and prize contribution

Source conflict: No plan amounts, currency, discount or fixed prize contribution rate supplied.

Recorded plan decision: Keep server configuration explicit; use labelled demo values only. Require charity share plus prize share not to exceed the fee.

Applies to: B09, B13

## D05 — Draw numbers and duplicates

Source conflict: PRD does not define replacement, duplicate-score matching or weighted formula.

Recorded plan decision: Proposed: five distinct 1-45 numbers; weighted frequency plus one smoothing; no replacement; distinct intersection and one highest tier. Confirm policy before real-money use.

Applies to: B13, B14

## D06 — Eligibility and cutoff

Source conflict: Active subscribers and latest five scores required; exact cutoff/timezone omitted.

Recorded plan decision: Proposed: UTC monthly cutoff, five valid retained scores, active unsuspended membership; freeze entries at preview and reject stale publication.

Applies to: B10, B13, B14

## D07 — Allocation and money rounding

Source conflict: PRD sets 40/35/25 percent and equal division; annual accounting and remainder unspecified.

Recorded plan decision: Proposed: minor-unit ledger, yearly allocation spread over 12 months with deterministic remainder; unawarded 3/4 shares stay separately recorded and never roll over.

Applies to: B09, B13, B22

## D08 — Unclaimed jackpot definition

Source conflict: PRD says unclaimed five-match jackpot rolls; no verification deadline supplied.

Recorded plan decision: Proposed: no five-match winner at publication triggers rollover. Rejected/unsubmitted winners need a separately agreed expiry policy; never reallocate automatically.

Applies to: B13, B16, B21

## D09 — Dates and older scores

Source conflict: PRD requires dates and latest five; future/backdated submission policy omitted.

Recorded plan decision: Proposed: date-only round dates, reject future dates; reject older-than-retained-set additions when five exist; allow valid edits and prune by date.

Applies to: B10, B11

## D10 — PRD completeness

Source conflict: PDF contents lists technical/scalability sections but supplied file has 13 physical pages and skips printed page 11.

Recorded plan decision: Use the available text and root structures; do not fabricate missing section requirements.

Applies to: B01, B26

## D11 — Additional UI designs

Source conflict: Account recovery and some workflow designs exceed explicit branch scope.

Recorded plan decision: Implement only functional routes; secure account recovery is optional future scope unless explicitly included.

Applies to: B07, B23

## B01 implementation decisions

- No Git repository, remote, application manifests or AGENTS.md existed. No Git initialization, branch, commit, push or PR is performed. Proposed branch is chore/project-setup and base is main until an actual default branch exists.
- npm workspaces share one root lockfile. Install from the root with npm ci; do not create competing workspace lockfiles. Node 24+ is required.
- Only purposeful B01 files are created; the supplied full-product trees are a roadmap. Authentication, upload, domain models, seeds and full UI components belong to later branches.
- Use the machine-readable sage/green tokens in feel_not_fairway/DESIGN.md consistently; its prose also proposes an ivory palette. The core system errors HTML and PNG guide the status card. No illustrative financial amounts are copied. Fonts are bundled locally.
- /api/health is liveness, /api/ready checks MongoDB with a real ping and returns 503 on failure or draining. Startup fails before listening when MongoDB cannot connect.
- API and frontend are separate deployment units; production must route /api to the backend or configure a public API URL and the exact client origin. Credentialed requests are supported but authentication and CSRF-protected writes are later scope.

- Vitest uses one thread worker because a repeated Windows fork-worker run timed out before running tests. The explicit threads configuration passed and keeps test startup deterministic on this host.
