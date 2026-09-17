export async function mockPublicApi(page, authenticated = false) {
  await page.route('**/api/scores', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          items: [],
          count: 0,
          remaining: 5,
          subscription: null,
          today: '2026-09-17',
        },
      },
    }),
  );
  await page.route('**/api/users/me/dashboard', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          subscription: { status: 'ready', data: null },
          scores: {
            status: 'ready',
            data: { items: [], count: 0, remaining: 5 },
          },
          charity: { status: 'ready', data: null },
          upcomingDraw: { status: 'unavailable', message: 'Not connected.' },
          participation: { status: 'unavailable', message: 'Not connected.' },
          winnings: { status: 'unavailable', message: 'Not connected.' },
        },
      },
    }),
  );
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: authenticated ? 200 : 401,
      json: authenticated
        ? {
            success: true,
            data: {
              user: {
                id: 'test-browser-admin',
                name: 'Browser Fixture',
                email: 'fixture@example.com',
                role: 'admin',
                charityId: 'a'.repeat(24),
                contributionPercent: 10,
              },
              subscription: null,
            },
          }
        : {
            success: false,
            error: { code: 'UNAUTHENTICATED', message: 'Sign in' },
          },
    }),
  );
  await page.route('**/api/auth/policy', (route) =>
    route.fulfill({
      json: { success: true, data: { maxContributionPercent: 50 } },
    }),
  );
  const charity = {
    id: 'a'.repeat(24),
    name: 'Demo: Youth Golf Access',
    description: 'A fictional charity for browser presentation tests.',
    category: 'youth',
    images: [],
    upcomingEvents: [],
    isDemo: true,
  };
  await page.route('**/api/charities**', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          items: [charity],
          pagination: {
            page: 1,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      },
    }),
  );
  await page.route('**/api/charities/*', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: route.request().url().includes('/featured')
          ? { items: [charity], pagination: { total: 1 } }
          : charity,
      },
    }),
  );
}
