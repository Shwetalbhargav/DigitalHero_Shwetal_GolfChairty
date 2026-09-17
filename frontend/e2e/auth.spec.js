import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me'))
      return route.fulfill({
        status: 401,
        json: {
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Sign in' },
        },
      });
    if (path.endsWith('/auth/policy'))
      return route.fulfill({
        json: { success: true, data: { maxContributionPercent: 50 } },
      });
    return route.fulfill({
      json: {
        success: true,
        data: {
          items: [
            {
              id: 'a'.repeat(24),
              name: 'Demo: Youth Golf Access',
              description: 'Fictional demonstration charity for young golfers.',
              category: 'youth',
              images: [],
              isDemo: true,
            },
          ],
          pagination: { page: 1, hasNextPage: false, hasPreviousPage: false },
        },
      },
    });
  });
});
for (const width of [360, 768, 1440])
  for (const path of ['login', 'register'])
    test(`${path} accessible at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/' + path);
      if (path === 'register')
        await expect(page.getByText('Demo: Youth Golf Access')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
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
      await page.getByLabel(/^Password/).focus();
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('button', { name: 'Show password' }),
      ).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByLabel(/^Password/)).toHaveAttribute(
        'type',
        'text',
      );
      await page.screenshot({
        path: `../docs/screenshots/run1/${path}-${width}.png`,
        fullPage: true,
      });
    });
