import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CharityListPage from '../../pages/public/CharityListPage.jsx';
import DonationForm from './DonationForm.jsx';
import { getCharities } from '../../modules/charities/charity.api.js';
vi.mock('../../modules/charities/charity.api.js', () => ({
  getCharities: vi.fn(),
}));
test('directory query, category and empty state use the API', async () => {
  getCharities.mockResolvedValue({
    items: [],
    pagination: { total: 0, hasNextPage: false, hasPreviousPage: false },
  });
  render(
    <MemoryRouter initialEntries={['/charities?q=trees&category=environment']}>
      <CharityListPage />
    </MemoryRouter>,
  );
  expect(await screen.findByText('No charities found')).toBeInTheDocument();
  expect(getCharities).toHaveBeenCalledWith(
    expect.objectContaining({ q: 'trees', category: 'environment', page: '1' }),
    expect.any(AbortSignal),
  );
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});
test('independent donation rejects fractional minor units and explains eligibility', async () => {
  render(
    <MemoryRouter>
      <DonationForm charityId={'a'.repeat(24)} />
    </MemoryRouter>,
  );
  const amount = screen.getByLabelText(/Donation amount/);
  await userEvent.clear(amount);
  await userEvent.type(amount, '1.001');
  await userEvent.click(
    screen.getByRole('button', { name: 'Review simulated donation' }),
  );
  expect(amount).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText(/does not activate membership/)).toBeInTheDocument();
});
