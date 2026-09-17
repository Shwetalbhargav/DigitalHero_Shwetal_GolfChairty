import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { mockPublicApi } from './api-fixture.js';
test.beforeEach(async ({ page }) => mockPublicApi(page));
const screenshots = fileURLToPath(
  new URL('../../docs/screenshots/run1/home-regression/', import.meta.url),
);
for (const width of [360, 768, 1440])
  test(
    'homepage appearance and accessibility at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        /Your game/,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const images = page.locator('main img');
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty('complete', true);
        expect(await img.evaluate((e) => e.naturalWidth)).toBeGreaterThan(0);
        await expect(img).toHaveAttribute('alt', /.+/);
      }
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: screenshots + 'homepage-' + width + '.png',
        fullPage: true,
      });
      expect(errors).toEqual([]);
    },
  );
test('every homepage link resolves to content and charity/prize fragments receive focus', async ({
  page,
}) => {
  await page.goto('/');
  const urls = await page
    .locator('a:visible')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute('href'))),
    ]);
  for (const url of urls) {
    if (url.startsWith('#')) continue;
    await page.goto('/');
    const link = page.locator('a:visible');
    // Read observed href values rather than guessing the CTA destinations.
    const index = await link.evaluateAll(
      (links, href) =>
        links.findIndex((item) => item.getAttribute('href') === href),
      url,
    );
    await link.nth(index).click();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(
      page.getByText('This page does not exist', { exact: true }),
    ).toHaveCount(0);
    if (url.includes('#')) {
      const id = url.split('#')[1];
      await expect(page.locator('[id="' + id + '"]')).toBeFocused();
    }
  }
  await page.goto('/register');
  await expect(
    page.getByRole('heading', { name: 'Begin your journey' }),
  ).toBeVisible();
  await expect(page.locator('form')).toHaveCount(1);
  await page.goto('/charities');
  await expect(
    page.getByRole('heading', {
      name: 'Find a cause close to you.',
    }),
  ).toBeVisible();
});
test('keyboard navigation, score examples and reduced-motion preferences work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const choice = page.getByRole('button', { name: '5 matches' });
  await choice.focus();
  await page.keyboard.press('Enter');
  await expect(
    page
      .locator('.home-page')
      .getByRole('status')
      .filter({ hasText: '5 matches' }),
  ).toBeVisible();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page
      .locator('.home-hero__copy')
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    page
      .getByRole('navigation', { name: 'Mobile primary navigation' })
      .getByRole('link', { name: 'How it works' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/how-it-works$/);
  await expect(page.getByRole('main')).toBeFocused();
});
test('draw rules and availability pages are accessible and usable on small screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ['/register', '/charities', '/how-it-works']) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
