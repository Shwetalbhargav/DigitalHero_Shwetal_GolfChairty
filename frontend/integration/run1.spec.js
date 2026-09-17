import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function inspect(page, name, width) {
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
  await page.screenshot({
    path: `../docs/screenshots/run1/${name}-${width}.png`,
    fullPage: true,
  });
}
for (const width of [360, 768, 1440])
  test(`real API registration, donation and subscription lifecycle at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Demo: Green Habitat' }),
    ).toBeVisible();
    await inspect(page, 'home-live', width);
    await page.goto('/charities');
    await expect(
      page.getByRole('heading', { name: 'Demo: Youth Golf Access' }),
    ).toBeVisible();
    await page.getByLabel('Search charities').fill('no-such-charity');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByText('No charities found')).toBeVisible();
    await page.getByLabel('Search charities').fill('');
    await page.getByLabel('Category', { exact: true }).selectOption('youth');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(
      page.getByRole('heading', { name: 'Demo: Youth Golf Access' }),
    ).toBeVisible();
    await inspect(page, 'directory', width);
    await page.getByRole('link', { name: 'Explore youth' }).click();
    await expect(page).toHaveURL(/\/charities\/[a-f0-9]{24}$/);
    await expect(
      page.getByRole('heading', { name: 'Demo event: community open day' }),
    ).toBeVisible();
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Demo Member ' + width);
    await page.getByLabel('Email address').fill(`browser${width}@example.com`);
    await page.getByLabel(/^Password/).fill('browser-test-password');
    await page.getByRole('radio', { name: /Demo: Youth Golf Access/ }).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard\/subscription$/);
    await expect(
      page.getByRole('heading', { name: 'Choose your membership plan' }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Subscription & billing' }),
    ).toBeVisible();
    await inspect(page, 'plans', width);
    await page.goto('/dashboard/charity');
    await page.getByLabel('Charity contribution (%)').fill('20');
    await page
      .getByRole('button', { name: 'Save charity preferences' })
      .click();
    await expect(
      page.getByText(/Your charity preferences have been saved/),
    ).toBeVisible();
    await inspect(page, 'my-charity', width);
    await page.goto('/charities?q=Youth');
    await page.getByRole('link', { name: 'Explore youth' }).click();
    await page
      .getByRole('button', { name: 'Review simulated donation' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Review your demo payment' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Simulate approval' }).click();
    await expect(
      page.getByRole('heading', { name: 'Simulation completed' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'This donation does not activate a subscription or grant draw eligibility.',
      ),
    ).toBeVisible();
    await inspect(page, 'donation-success', width);
    await page.goto('/dashboard/subscription');
    await expect(
      page.getByRole('heading', { name: 'Choose your membership plan' }),
    ).toBeVisible();
    if (width === 1440) await page.locator('input[value="yearly"]').check();
    await page
      .getByRole('button', { name: 'Review simulated subscription' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Review your demo payment' }),
    ).toBeVisible();
    await inspect(page, 'payment-review', width);
    await page.getByRole('button', { name: 'Simulate decline' }).click();
    await expect(
      page.getByRole('heading', { name: 'Simulated payment declined' }),
    ).toBeVisible();
    await inspect(page, 'payment-declined', width);
    await page.getByRole('button', { name: 'Retry this demo payment' }).click();
    await expect(
      page.getByRole('button', { name: 'Simulate approval' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Simulate approval' }).click();
    await expect(
      page.getByRole('heading', { name: 'Simulation completed' }),
    ).toBeVisible();
    await inspect(page, 'subscription-success', width);
    await page.getByRole('link', { name: 'Manage subscription' }).click();
    await expect(
      page.getByRole('heading', { name: 'Your demo membership is active' }),
    ).toBeVisible();
    const cancel = page.getByRole('button', { name: 'Cancel at period end' });
    await cancel.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(cancel).toBeFocused();
    await cancel.click();
    await page.getByRole('button', { name: 'Confirm cancellation' }).click();
    await expect(
      page.getByText('Cancellation scheduled. Access ends at the date above.'),
    ).toBeVisible();
    await inspect(page, 'subscription-cancelled', width);
    await page.goto('/dashboard/scores');
    await expect(page.getByText('No rounds recorded yet')).toBeVisible();
    for (let day = 1; day <= 6; day++) {
      await page.getByRole('link', { name: 'Add score', exact: true }).click();
      await page
        .getByLabel('Stableford score')
        .fill(String(day === 6 ? 45 : day));
      await page.getByLabel('Round date').fill(`2020-01-0${day}`);
      await page
        .getByRole('button', { name: 'Save score', exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/scores$/);
      await expect(page.locator('.score-card')).toHaveCount(Math.min(day, 5));
    }
    await page.reload();
    await expect(page.locator('.score-card')).toHaveCount(5);
    await expect(page.locator('.score-card').first()).toContainText(
      '06/01/2020',
    );
    await page
      .getByRole('button', { name: 'Edit score from 2020-01-06' })
      .click();
    await page.getByLabel('Stableford score').fill('44');
    await page.getByRole('button', { name: 'Save score changes' }).click();
    await expect(page.locator('.score-card').first()).toContainText('44');
    const remove = page.getByRole('button', {
      name: 'Delete score from 2020-01-02',
    });
    await remove.click();
    await page.keyboard.press('Escape');
    await expect(remove).toBeFocused();
    await remove.click();
    await page.getByRole('button', { name: 'Confirm deletion' }).click();
    await expect(page.locator('.score-card')).toHaveCount(4);
    await expect(
      page.getByRole('heading', { name: 'Golf scores', exact: true }),
    ).toBeFocused();
    await inspect(page, 'scores', width);
    await page.goto('/dashboard/profile');
    await page.getByLabel('Display name').fill('Updated Member ' + width);
    await page.getByRole('radio', { name: 'ISO (2026-09-17)' }).check();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(
      page.getByText('Profile and date-display preference saved.'),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Display name')).toHaveValue(
      'Updated Member ' + width,
    );
    await inspect(page, 'profile', width);
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', {
        name: 'Welcome back, Updated Member ' + width,
      }),
    ).toBeVisible();
    await expect(page.getByText('44 points', { exact: true })).toBeVisible();
    await expect(page.getByText('2020-01-06', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Upcoming draw' }),
    ).toBeVisible();
    await expect(page.getByText('0 published draws entered')).toBeVisible();
    await expect(page.getByText('No winnings recorded.')).toBeVisible();
    await inspect(page, 'dashboard', width);
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: 'Administrator access required' }),
    ).toBeVisible();
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email address').fill(`browser${width}@example.com`);
    await page.getByLabel(/^Password/).fill('browser-test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('44 points', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
