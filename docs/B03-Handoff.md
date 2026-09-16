# B03 homepage handoff

Branch: feat/home-page. Base: main (remote default confirmed). Started from merged B02 commit 869f8a2 with a clean tree. The branch was created locally; no commit, push, PR or deployment was executed in B03. Existing B02 screenshots and source design files are preserved.

## Summary

The public homepage now explains Digital Heroes through charity-led messaging, a prominent subscribe action, illustrated cause cards, an interactive score example and a clear prize breakdown. Every CTA resolves to an implemented destination. Registration and the live charity directory explicitly report their unavailable state; they do not collect data or pretend to process payments.

## Changes and walkthrough

- Implement HeroSection, HowItWorks, ScoreDemo, FeaturedCharities and PrizePoolPreview using the B02 shared components and design tokens.
- Add HomePage, a complete DrawExplanationPage and honest AvailabilityPage destinations for registration/charities.
- Label all illustrative scores, prize amounts and cause categories; explain 3/4/5 matches, 25/35/40 shares, at least 10% charity contribution, separate donations, equal tier division, jackpot-only rollover and verification before payout.
- Define and validate the charity-card prop contract, including loading/empty/error/retry and failed-image behavior.
- Add marketing navigation, accessible fragment focus, local reference images and responsive CSS with reduced motion. Preserve B02 at /foundation and all existing shells.
- Add unit/browser acceptance tests, screenshot artifacts and source/architecture/API decisions. Normalize inherited formatting in Modal.jsx, index.css, UI-Foundation.md and frontend package/Vite/Playwright configuration; no logic or dependency changes in those files.
- Complete the missing historical B02 handoff document linked by the existing README.

[Homepage.md](Homepage.md) explains each component/function, its inputs, caller, output, side effects and main data flow. [Decisions.md](Decisions.md) records scope/source conflicts; [API.md](API.md) lists browser routes and clarifies that no backend endpoints were added.

## Files changed

- README.md
- docs/API.md
- docs/Architecture.md
- docs/B02-Handoff.md
- docs/B03-Handoff.md
- docs/Decisions.md
- docs/Homepage.md
- docs/UI-Foundation.md
- docs/screenshots/b03/foundation/admin-1440.png
- docs/screenshots/b03/foundation/admin-360.png
- docs/screenshots/b03/foundation/admin-768.png
- docs/screenshots/b03/foundation/dialog.png
- docs/screenshots/b03/foundation/library-1440.png
- docs/screenshots/b03/foundation/library-360.png
- docs/screenshots/b03/foundation/library-768.png
- docs/screenshots/b03/foundation/member-1440.png
- docs/screenshots/b03/foundation/member-360.png
- docs/screenshots/b03/foundation/member-768.png
- docs/screenshots/b03/foundation/public-1440.png
- docs/screenshots/b03/foundation/public-360.png
- docs/screenshots/b03/foundation/public-768.png
- docs/screenshots/b03/hero-1440.png
- docs/screenshots/b03/hero-360.png
- docs/screenshots/b03/hero-768.png
- docs/screenshots/b03/homepage-1440.png
- docs/screenshots/b03/homepage-360.png
- docs/screenshots/b03/homepage-768.png
- frontend/e2e/foundation.spec.js
- frontend/e2e/homepage.spec.js
- frontend/src/assets/images/home/SOURCES.md
- frontend/src/assets/images/home/community-support.jpg
- frontend/src/assets/images/home/golf-community.jpg
- frontend/src/assets/images/home/habitat.jpg
- frontend/src/assets/images/home/junior-golf.jpg
- frontend/src/components/common/Modal.jsx
- frontend/src/components/home/FeaturedCharities.jsx
- frontend/src/components/home/HeroSection.jsx
- frontend/src/components/home/HowItWorks.jsx
- frontend/src/components/home/PrizePoolPreview.jsx
- frontend/src/components/home/ScoreDemo.jsx
- frontend/src/components/home/home.test.jsx
- frontend/src/components/home/homeData.js
- frontend/src/components/layout/Footer.jsx
- frontend/src/components/layout/Header.jsx
- frontend/src/constants/routes.js
- frontend/src/main.jsx
- frontend/src/pages/public/AvailabilityPage.jsx
- frontend/src/pages/public/DrawExplanationPage.jsx
- frontend/src/pages/public/HomePage.jsx
- frontend/src/routes/AppRoutes.jsx
- frontend/src/styles/home.css
- frontend/src/styles/index.css

## Exact setup and test commands

From the repository root (Node 24+):

```powershell
npm ci
npx playwright install chromium
npm run dev -w frontend
```

Open http://localhost:5173. The homepage and explanations need no database. Full-stack readiness still needs the B01 backend environment and MongoDB.

```powershell
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e -w frontend
npm audit
git diff --check
```

The browser runner starts Vite if needed or reuses a local server. Tests use one Chromium worker. A browser install was already available from B02; no new dependency or lockfile change was required in B03.

## Actual results

- npm ci: passed, 418 packages installed from the existing lockfile; this final Windows run took about 15 minutes.
- npm run lint: passed.
- npm run format:check: passed after normalizing inherited frontend configuration formatting.
- git diff --check: passed.
- npm test: passed, 8 backend and 18 frontend tests (26 total).
- npm run build: passed, native backend syntax check and Vite production bundle with local image/font assets.
- npm run test:e2e -w frontend: 13 passed, including 7 B02 regressions and 6 B03 checks. Final browser run took 20.3 seconds.
- Homepage at 360, 768 and 1440px: no horizontal overflow, all four images load, descriptive alt text present, one page heading/main landmark, no page JavaScript errors, and zero axe violations in the configured WCAG A/AA checks.
- All unique visible homepage links resolve; charity and prize fragments receive focus. Score examples update from keyboard input; reduced motion disables the entry animation.
- Registration, charity availability and draw explanation pages also passed mobile overflow/axe checks.
- npm audit: zero vulnerabilities. npm still reports the inherited whatwg-encoding deprecation warning.
- Screenshots were inspected for mobile, tablet and desktop layout. Full-page images capture all sections; hero crops make the initial viewport easy to review.

The first browser run caught a 768px hero figure overflow; the width/aspect-ratio correction passed the rerun. One B02 skip-link test raced initial React mounting in a subsequent run; waiting for the visible page heading before the first Tab made the test exercise the rendered page. The final full browser suite passed. There is no skipped or fake-success test path.

## Screenshots

- [Desktop hero](screenshots/b03/hero-1440.png)
- [Mobile hero](screenshots/b03/hero-360.png)
- [Tablet hero](screenshots/b03/hero-768.png)
- [Full desktop homepage](screenshots/b03/homepage-1440.png)
- [Full mobile homepage](screenshots/b03/homepage-360.png)
- [Full tablet homepage](screenshots/b03/homepage-768.png)

Hero viewport captures disable animations to show the completed entry state. B02 regression screenshots are stored separately under screenshots/b03/foundation; original B02 artifacts are unchanged.

## Remaining limitations

- Registration, subscriptions, payments, donations and a live charity directory remain later-branch dependencies. CTAs show explicit availability notices, with working explanations and return links.
- No live totals, real draw engine, duplicate-score policy, real membership prices or backend business operations are implemented in B03. The GBP amount is only a labelled example.
- Source image assets are illustrative and modest resolution. Source URLs are recorded alongside them; use appropriate production assets before public launch.
- Automated browser checks used Chromium only. Axe results are useful evidence, not a claim of full accessibility certification or manual screen-reader coverage.
- Production hosting must retain SPA history fallback for browser paths while keeping /api routed to Express.

## Prepared Git commit

Subject: feat: build charity focused homepage

Body:

Build the Digital Heroes homepage with charity-led messaging, responsive sections, local reference imagery, labelled score/prize examples and an interactive 3/4/5-match comparison. Explain charitable contributions, tier allocation, equal sharing, jackpot-only rollover and proof before payout.

Wire subscription, charity and draw-explanation links to implemented public routes, with explicit availability notices for later registration/directory features. Add a validated charity-card contract and loading, empty, error, retry and image-failure states. Preserve B02 layouts at their existing routes and the foundation overview at /foundation.

Verify clean install, lint, formatting, 26 unit/backend tests, 13 Chromium browser tests, production build and a zero-vulnerability audit. Check links, fragment focus, keyboard/reduced motion, image alternatives and no overflow at 360/768/1440px. No live payment, charity totals or draw results are implied.

## Prepared PR

Title: feat: build charity focused homepage

### Summary

Deliver the charity-focused public homepage on the merged UI foundation, with working navigation and clear example boundaries.

### Changes

Add the five requested homepage sections, local design imagery, responsive styling, marketing navigation, an interactive score comparison and a documented charity-card contract. Add draw explanation and honest availability destinations. Keep all B02 reference/shell pages available and support accessible fragment navigation.

### How to test

Run npm ci, npm run lint, npm run format:check, npm test, npm run build and npm run test:e2e -w frontend. Install Chromium with npx playwright install chromium if needed. Run npm run dev -w frontend, open /, use every CTA and switch the match examples. Visit /register, /charities and /how-it-works, and test the page at 360, 768 and 1440px.

### Results

26 unit/backend tests and 13 Chromium acceptance tests pass. The production build and audit pass (zero vulnerabilities). Links, anchored focus, image alternatives, keyboard navigation and reduced-motion behavior are verified. No horizontal overflow at the acceptance widths; configured axe checks report no violations.

### Screenshots

See the desktop/mobile/tablet and full-page screenshots above. All displayed amounts, score examples and causes are explicitly illustrative.

### Risks

Registration and the charity directory are unavailable until later branches. Source assets are low resolution, browser validation is Chromium-only, and production needs SPA history fallback. Example GBP amounts do not choose actual pricing or currency. No commit, push, PR or deployment was performed for this implementation.
