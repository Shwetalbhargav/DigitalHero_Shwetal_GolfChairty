import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
async function inspect(page, name) {
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
    path: `../docs/screenshots/operations/${name}.png`,
    fullPage: true,
  });
}
async function login(page, who) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(`operations-${who}@example.test`);
  await page.getByLabel(/^Password/).fill('local-browser-fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(?:dashboard(?:\/profile)?|admin)$/);
}
async function logout(page) {
  await page.goto('/dashboard/profile');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}
test('local member draw/proof and admin users → charities → draw → winners → reports', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const png = await sharp({
    create: { width: 40, height: 30, channels: 3, background: '#004a36' },
  })
    .png()
    .toBuffer();
  await login(page, 'member');
  await page.goto('/dashboard/draws');
  await page
    .getByRole('link', { name: /View .* results/ })
    .first()
    .click();
  await expect(
    page.getByText('5 distinct matches · 5-match tier'),
  ).toBeVisible();
  await inspect(page, 'member-draw-1440');
  await page
    .getByRole('link', { name: 'View winnings and submit proof' })
    .click();
  const claimUrl = page.url();
  await expect(
    page.getByText(
      'Local development storage — this is not a Cloudinary upload.',
    ),
  ).toBeVisible();
  await page.getByLabel('Winning scorecard proof').setInputFiles({
    name: 'scorecard.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await page.getByRole('button', { name: 'Submit proof for review' }).click();
  await expect(
    page.getByText(
      'Your proof is under review. No further submission is needed.',
    ),
  ).toBeVisible();
  await inspect(page, 'member-proof-pending');
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin/users');
  await page.getByLabel('Search members').fill('Operations Member');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('link', { name: 'Manage Operations Member' }).click();
  await page
    .getByLabel('Member display name')
    .fill('Reviewed Operations Member');
  await page
    .getByLabel('Account change reason')
    .fill('Verified display name in local smoke test');
  await page.getByRole('button', { name: 'Save account changes' }).click();
  await expect(
    page.getByText('Verified display name in local smoke test', {
      exact: true,
    }),
  ).toBeVisible();
  const scoreForm = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Round 2020-01-01', exact: true }),
  });
  await scoreForm.getByLabel('Corrected Stableford score').fill('45');
  await scoreForm
    .getByLabel('Score correction reason')
    .fill('Corrected against isolated scorecard');
  await scoreForm
    .getByRole('button', { name: 'Save score correction' })
    .click();
  await expect(
    page.getByText('Corrected against isolated scorecard', { exact: true }),
  ).toBeVisible();
  await inspect(page, 'admin-user');
  await page.goto('/admin/charities/new');
  await page
    .getByRole('textbox', { name: 'Charity name', exact: true })
    .fill('Operations Demo Charity');
  await page.getByLabel('Charity slug').fill('operations-demo-charity');
  await page
    .getByLabel('Description', { exact: true })
    .fill(
      'An isolated fictional charity created for the browser operations check.',
    );
  await page.getByLabel('Active in public directory').check();
  await page.getByLabel('Featured', { exact: true }).check();
  await page
    .getByLabel('Charity change reason')
    .fill('Create fictional browser charity');
  await page.getByRole('button', { name: 'Save charity', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/charities\/[a-f0-9]{24}$/);
  await page
    .getByLabel('Charity image', { exact: true })
    .setInputFiles({ name: 'charity.png', mimeType: 'image/png', buffer: png });
  await page
    .getByLabel('Image alternative text')
    .fill('Forest green demo image');
  await page
    .getByLabel('Image upload reason')
    .fill('Add locally stored charity image');
  await page
    .getByRole('button', { name: 'Upload charity image', exact: true })
    .click();
  await expect(
    page.getByRole('img', { name: 'Forest green demo image' }),
  ).toBeVisible();
  await inspect(page, 'admin-charity');
  await page.goto('/admin/draws/new');
  await page
    .getByRole('combobox', { name: 'Draw strategy' })
    .selectOption('weighted');
  await page.getByRole('button', { name: 'Save draw configuration' }).click();
  await expect(page).toHaveURL(/\/admin\/draws\/[a-f0-9]{24}$/);
  await page
    .getByRole('button', { name: 'Simulate preview', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Versioned review preview' }),
  ).toBeVisible();
  await inspect(page, 'admin-preview');
  await page.getByRole('button', { name: 'Publish reviewed preview' }).click();
  await page.getByRole('button', { name: 'Cancel publication' }).click();
  await expect(
    page.getByRole('heading', { name: 'Versioned review preview' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Publish reviewed preview' }).click();
  await page.getByRole('button', { name: 'Confirm publication' }).click();
  await expect(
    page.getByRole('heading', { name: 'Published summary' }),
  ).toBeVisible();
  await inspect(page, 'admin-published');
  await page.goto('/admin/winners');
  await page.getByLabel('Verification filter').selectOption('pending');
  const claimId = claimUrl.split('/').at(-1);
  await page.goto('/admin/winners/' + claimId);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'View protected proof 1' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('winning-proof.png');
  await page
    .getByLabel('Review reason (required for rejection)')
    .fill('Please include the complete scorecard');
  await page.getByRole('button', { name: 'Reject proof', exact: true }).click();
  await expect(
    page.getByText('Rejection reason: Please include the complete scorecard'),
  ).toBeVisible();
  await logout(page);
  await login(page, 'member');
  await page.goto(claimUrl);
  await expect(
    page.getByRole('heading', { name: 'Resubmit winning proof' }),
  ).toBeVisible();
  await page.getByLabel('Winning scorecard proof').setInputFiles({
    name: 'complete-scorecard.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await page.getByRole('button', { name: 'Submit proof for review' }).click();
  await expect(
    page.getByRole('button', { name: 'Download your proof 2' }),
  ).toBeVisible();
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin/winners/' + claimId);
  await page.getByRole('button', { name: 'Approve proof' }).click();
  await expect(
    page.getByRole('heading', { name: 'Record manual/demo settlement' }),
  ).toBeVisible();
  await page
    .getByLabel('Settlement reference')
    .fill('LOCAL-SMOKE-SETTLEMENT-001');
  await page
    .getByRole('button', { name: 'Record payout', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm recorded payout' }).click();
  await expect(page.getByText(/Recorded reference: LOCAL-SMOKE/)).toBeVisible();
  await inspect(page, 'admin-paid');
  await page.goto('/admin/reports');
  await expect(
    page.getByRole('heading', { name: 'GBP ledger totals' }),
  ).toBeVisible();
  await expect(
    page.getByRole('row').filter({
      has: page.getByRole('rowheader', {
        name: 'Paid settlements',
        exact: true,
      }),
    }),
  ).not.toContainText('£0.00');
  await inspect(page, 'admin-reports-1440');
  await page.setViewportSize({ width: 360, height: 900 });
  await inspect(page, 'admin-reports-360');
  await logout(page);
  await login(page, 'member');
  await page.goto(claimUrl);
  await expect(
    page.getByText('simulated settlement, not a bank transfer', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Simulated payout recorded', { exact: true }),
  ).toBeVisible();
  await inspect(page, 'member-paid-360');
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.goto('/dashboard/draws');
  await inspect(page, 'member-draw-list-768');
  await page.goto('/dashboard');
  await expect(page.getByText(/Won .*Paid/)).toBeVisible();
  await inspect(page, 'member-dashboard-768');
  expect(errors).toEqual([]);
});
