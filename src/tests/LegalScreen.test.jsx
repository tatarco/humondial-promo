import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LegalScreen from '../screens/LegalScreen.jsx';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));
import { callFn } from '../lib/api.js';

describe('LegalScreen', () => {
  const onSuccess = vi.fn();
  const onBack    = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('renders two checkboxes and a disabled continue button', () => {
    render(<LegalScreen token="t" onSuccess={onSuccess} onBack={onBack} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(screen.getByRole('button', { name: /המשך/i })).toBeDisabled();
  });

  it('button stays disabled when only one checkbox checked', async () => {
    const user = userEvent.setup();
    render(<LegalScreen token="t" onSuccess={onSuccess} onBack={onBack} />);
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByRole('button', { name: /המשך/i })).toBeDisabled();
  });

  it('button enables when both checkboxes checked', async () => {
    const user = userEvent.setup();
    render(<LegalScreen token="t" onSuccess={onSuccess} onBack={onBack} />);
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb);
    expect(screen.getByRole('button', { name: /המשך/i })).not.toBeDisabled();
  });

  it('calls promoAcceptTerms with token and calls onSuccess', async () => {
    callFn.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<LegalScreen token="tok123" onSuccess={onSuccess} onBack={onBack} />);
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb);
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() =>
      expect(callFn).toHaveBeenCalledWith('promoAcceptTerms', { token: 'tok123' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows error on API failure', async () => {
    callFn.mockRejectedValueOnce(new Error('invalid_session'));
    const user = userEvent.setup();
    render(<LegalScreen token="t" onSuccess={onSuccess} onBack={onBack} />);
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb);
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => expect(screen.getByText(/שגיאה/i)).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
