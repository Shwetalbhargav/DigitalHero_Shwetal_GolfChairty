import { test, expect } from '@playwright/test';
import { mockPublicApi } from './api-fixture.js';
test('HTTP and offline recovery requires an explicit read retry, and session loss removes private routes', async ({
  page,
  context,
}) => {
  await mockPublicApi(page, true);
  let status = 500,
    requests = 0;
  const handler = (route) => {
    requests++;
    return route.fulfill({
      status,
      json: {
        success: false,
        error: {
          code: status === 401 ? 'UNAUTHENTICATED' : 'TEST_ERROR',
          message: `Recovery fixture ${status}`,
        },
      },
    });
  };
  await page.route('**/api/draws?*', handler);
  await page.goto('/dashboard/draws');
  await expect(page.getByRole('alert')).toContainText('Recovery fixture 500');
  expect(requests).toBe(1);
  for (status of [403, 404, 409, 422]) {
    const before = requests;
    await page.getByRole('button', { name: 'Try again' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText(
      `Recovery fixture ${status}`,
    );
    expect(requests).toBe(before + 1);
  }
  await page.unroute('**/api/draws?*', handler);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Unable to reach the service',
  );
  await context.setOffline(false);
  status = 401;
  await page.route('**/api/draws?*', handler);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Monthly draws & results' }),
  ).toHaveCount(0);
});

test('failed profile writes retain typed input, focus the error and do not retry automatically', async ({
  page,
}) => {
  await mockPublicApi(page, true);
  let requests = 0;
  await page.route('**/api/users/me', (route) => {
    requests++;
    return route.fulfill({
      status: 422,
      json: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check this profile value.',
        },
      },
    });
  });
  await page.goto('/dashboard/profile');
  await page
    .getByRole('textbox', { name: 'Display name', exact: true })
    .fill('Unsaved display name');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(
    page.getByRole('textbox', { name: 'Display name', exact: true }),
  ).toHaveValue('Unsaved display name');
  expect(requests).toBe(1);
});
