import { expect, test, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../modules/auth/AuthContext.jsx';
import HomePage from '../../pages/public/HomePage.jsx';
import FeaturedCharities, {
  validateCharityCards,
} from './FeaturedCharities.jsx';
import ScoreDemo from './ScoreDemo.jsx';
import { EXAMPLE_CHARITIES, PRIZE_TIERS } from './homeData.js';
test('homepage labels example figures and routes its primary calls to action', () => {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: null }}><HomePage /></AuthContext.Provider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Your gamecan do more.',
  );
  expect(
    screen
      .getAllByRole('link', { name: /Subscribe & play/ })
      .every((link) => link.getAttribute('href') === '/register' || link.getAttribute('href') === '/pricing'),
  ).toBe(true);
  expect(
    screen.getByRole('link', { name: 'Explore charities' }),
  ).toHaveAttribute('href', '/charities');
  expect(screen.getByText(/Loading featured charities/)).toBeInTheDocument();
  expect(
    screen.getByText(/Not a live pool, guaranteed prize/),
  ).toBeInTheDocument();
  expect(PRIZE_TIERS.reduce((sum, tier) => sum + tier.share, 0)).toBe(100);
  expect(PRIZE_TIERS.reduce((sum, tier) => sum + tier.amount, 0)).toBe(10000);
});
test('example selection updates the actual comparison with text alternatives for matches', async () => {
  const user = userEvent.setup();
  render(<ScoreDemo />);
  for (const count of [3, 4, 5]) {
    await user.click(screen.getByRole('button', { name: count + ' matches' }));
    expect(screen.getByRole('status')).toHaveTextContent(count + ' matches');
    expect(
      within(
        screen.getByRole('list', { name: 'Example draw numbers' }),
      ).getAllByText('matched'),
    ).toHaveLength(count);
  }
  expect(
    screen.getByText('No entry was submitted and no prize was won.'),
  ).toBeInTheDocument();
});
test('charity boundary handles null, duplicate IDs, unsafe URLs and missing alt text', () => {
  expect(validateCharityCards(EXAMPLE_CHARITIES)).toBe(true);
  expect(validateCharityCards(null)).toBe(false);
  expect(
    validateCharityCards([EXAMPLE_CHARITIES[0], EXAMPLE_CHARITIES[0]]),
  ).toBe(false);
  for (const change of [
    { href: 'javascript:alert(1)' },
    { href: '//external.test' },
    { isExample: undefined },
    { image: { src: '/photo.jpg', alt: '' } },
  ])
    expect(validateCharityCards([{ ...EXAMPLE_CHARITIES[0], ...change }])).toBe(
      false,
    );
  render(
    <MemoryRouter>
      <FeaturedCharities charities={null} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Charity information is unavailable',
  );
});
test('charity empty, loading and error states have no fake success and retry is wired', async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  const view = render(
    <MemoryRouter>
      <FeaturedCharities status="loading" />
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent(
    'Loading featured charities',
  );
  view.rerender(
    <MemoryRouter>
      <FeaturedCharities charities={[]} />
    </MemoryRouter>,
  );
  expect(screen.getByText('No featured charities yet')).toBeInTheDocument();
  view.rerender(
    <MemoryRouter>
      <FeaturedCharities
        status="error"
        error="Connection interrupted"
        onRetry={retry}
      />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});
test('failed charity images retain a meaningful accessible description', () => {
  render(
    <MemoryRouter>
      <FeaturedCharities charities={[EXAMPLE_CHARITIES[0]]} />
    </MemoryRouter>,
  );
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('img')).toHaveAccessibleName(
    EXAMPLE_CHARITIES[0].image.alt + ' Image unavailable.',
  );
});
