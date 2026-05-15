import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneScreen from '../screens/PhoneScreen.jsx';

vi.mock('../lib/api.js', () => ({
  callFn: vi.fn(),
}));

import { callFn } from '../lib/api.js';

describe('PhoneScreen', () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders phone input and submit button', () => {
    render(<PhoneScreen onSuccess={onSuccess} />);
    expect(screen.getByPlaceholderText(/05/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /המשך|continue/i })).toBeInTheDocument();
  });

  it('disables submit when phone is empty', () => {
    render(<PhoneScreen onSuccess={onSuccess} />);
    expect(screen.getByRole('button', { name: /המשך|continue/i })).toBeDisabled();
  });

  it('enables submit when valid phone entered', async () => {
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.type(screen.getByPlaceholderText(/כינוי/i), 'GoalKing');
    expect(screen.getByRole('button', { name: /המשך|continue/i })).not.toBeDisabled();
  });

  it('calls promoRequestOtp and calls onSuccess with normalized phone', async () => {
    callFn.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.type(screen.getByPlaceholderText(/כינוי/i), 'GoalKing');
    await user.click(screen.getByRole('button', { name: /המשך|continue/i }));
    await waitFor(() => expect(callFn).toHaveBeenCalledWith('promoRequestOtp', { phone: '0521234567', nickname: 'GoalKing' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('972521234567'));
  });

  it('shows error message on API failure', async () => {
    callFn.mockRejectedValueOnce(new Error('rate_limited'));
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.type(screen.getByPlaceholderText(/כינוי/i), 'GoalKing');
    await user.click(screen.getByRole('button', { name: /המשך|continue/i }));
    await waitFor(() => expect(screen.getByText(/שגיאה|error|rate/i)).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('renders nickname input', () => {
    render(<PhoneScreen onSuccess={onSuccess} />);
    expect(screen.getByPlaceholderText(/כינוי/i)).toBeInTheDocument();
  });

  it('disables submit when nickname is empty but phone is valid', async () => {
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    expect(screen.getByRole('button', { name: /המשך/i })).toBeDisabled();
  });

  it('disables submit when nickname is too short', async () => {
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.type(screen.getByPlaceholderText(/כינוי/i), 'A');
    expect(screen.getByRole('button', { name: /המשך/i })).toBeDisabled();
  });

  it('calls promoRequestOtp with phone and nickname', async () => {
    callFn.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.type(screen.getByPlaceholderText(/כינוי/i), 'GoalKing');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() =>
      expect(callFn).toHaveBeenCalledWith('promoRequestOtp', { phone: '0521234567', nickname: 'GoalKing' })
    );
  });
});
