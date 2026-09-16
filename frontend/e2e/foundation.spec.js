import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
const screenshotDirectory = fileURLToPath(
  new URL('../../docs/screenshots/b03/foundation/', import.meta.url),
);
for (const width of [360, 768, 1440]) {
  test(
    'responsive shells and component library at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      // Isolate visual verification from MongoDB availability; production code still calls the real API.
      await page.route('**/api/ready', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Service is not ready.',
            },
            requestId: 'browser-layout-check',
          }),
        }),
      );
      for (const [path, name] of [
        ['/foundation', 'public'],
        ['/ui', 'library'],
        ['/dashboard', 'member'],
        ['/admin', 'admin'],
      ]) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('main h1')).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(page.getByRole('main')).toHaveCount(1);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: screenshotDirectory + name + '-' + width + '.png',
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
    },
  );
}
test('keyboard dialog has initial focus, wrap, Escape, inert background and restoration', async ({
  page,
}) => {
  await page.goto('/ui');
  const trigger = page.getByRole('button', { name: 'Open example dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'A moment to focus' });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Example note' }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close dialog' }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close example', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close dialog' }),
  ).toBeFocused();
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(
    true,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: screenshotDirectory + 'dialog.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await page
    .getByRole('button', { name: 'Close example', exact: true })
    .click();
  await expect(trigger).toBeFocused();
});
test('mobile menu and dock support keyboard navigation and focus after routing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/foundation');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    page
      .getByRole('navigation', { name: 'Mobile primary navigation' })
      .getByRole('link', { name: 'Member shell' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('main')).toBeFocused();
  const dock = page.getByRole('navigation', {
    name: 'member bottom navigation',
  });
  await dock.getByRole('link', { name: 'UI library' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/ui$/);
  await expect(dock.getByRole('link', { name: 'UI library' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('main')).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(dock.getByRole('link', { name: 'Overview' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
test('validation, disabled/busy states, skip link and reduced motion work in the browser', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ui');
  await expect(page.locator('main h1')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Unavailable', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Loading example', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Validate example' }).click();
  const input = page.getByRole('textbox', { name: 'Display name' });
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription(/between 2 and 50/);
  await input.fill('Taylor');
  await page.getByRole('button', { name: 'Validate example' }).click();
  await expect(page.getByText(/Nothing was saved/)).toBeVisible();
  expect(
    await page
      .locator('.spinner')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});
test('nested routes and missing routes load directly', async ({ page }) => {
  for (const path of [
    '/dashboard/ui',
    '/admin/ui',
    '/dashboard/status',
    '/admin/status',
    '/status',
    '/missing',
    '/admin/missing',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.locator('main h1')).toBeVisible();
  }
  await expect(
    page.getByRole('heading', { name: 'This page does not exist' }),
  ).toBeVisible();
});
