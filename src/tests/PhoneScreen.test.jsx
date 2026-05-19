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

  it('renders phone input and submit button, no nickname initially', () => {
    render(<PhoneScreen onSuccess={onSuccess} />);
    expect(screen.getByPlaceholderText(/05/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /המשך/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/כינוי/i)).not.toBeInTheDocument();
  });

  it('disables submit when phone is empty', () => {
    render(<PhoneScreen onSuccess={onSuccess} />);
    expect(screen.getByRole('button', { name: /המשך/i })).toBeDisabled();
  });

  it('enables submit once a valid phone is entered', async () => {
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    expect(screen.getByRole('button', { name: /המשך/i })).not.toBeDisabled();
  });

  it('calls promoCheckPhone on first submit with valid phone', async () => {
    callFn.mockResolvedValueOnce({ isNewUser: false });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() =>
      expect(callFn).toHaveBeenCalledWith('promoCheckPhone', { phone: '0521234567' })
    );
  });

  it('reveals nickname field and checkboxes when promoCheckPhone returns isNewUser: true', async () => {
    callFn.mockResolvedValueOnce({ isNewUser: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/כינוי/i)).toBeInTheDocument());
    expect(screen.getByText(/תנאי השימוש/i)).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp/i)).toBeInTheDocument();
  });

  it('returning user: skips reveal and calls onSuccess immediately after check', async () => {
    callFn
      .mockResolvedValueOnce({ isNewUser: false })
      .mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('972521234567', false));
    expect(screen.queryByPlaceholderText(/כינוי/i)).not.toBeInTheDocument();
  });

  it('new user: button disabled until nickname + both checkboxes filled', async () => {
    callFn.mockResolvedValueOnce({ isNewUser: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => screen.getByPlaceholderText(/כינוי/i));

    const btn = screen.getByRole('button', { name: /המשך/i });
    expect(btn).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/כינוי/i), 'GoalKing');
    expect(btn).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    expect(btn).toBeDisabled();

    await user.click(checkboxes[1]);
    expect(btn).not.toBeDisabled();
  });

  it('new user: calls promoRequestOtp with nickname and onSuccess(normalizedPhone, true)', async () => {
    callFn
      .mockResolvedValueOnce({ isNewUser: true })
      .mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => screen.getByPlaceholderText(/כינוי/i));
    await user.type(screen.getByPlaceholderText(/כינוי/i), 'GoalKing');
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() =>
      expect(callFn).toHaveBeenCalledWith('promoRequestOtp', { phone: '0521234567', nickname: 'GoalKing' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('972521234567', true));
  });

  it('returning user: calls promoRequestOtp without nickname inside handleCheck', async () => {
    callFn
      .mockResolvedValueOnce({ isNewUser: false })
      .mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() =>
      expect(callFn).toHaveBeenCalledWith('promoRequestOtp', { phone: '0521234567' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('972521234567', false));
  });

  it('shows error when promoCheckPhone fails', async () => {
    callFn.mockRejectedValueOnce(new Error('שגיאה'));
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => expect(screen.getByText(/שגיאה/i)).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows error when promoRequestOtp fails for returning user', async () => {
    callFn
      .mockResolvedValueOnce({ isNewUser: false })
      .mockRejectedValueOnce(new Error('rate_limited'));
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => expect(screen.getByText(/שגיאה/i)).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('editing phone resets to phone-check phase', async () => {
    callFn.mockResolvedValueOnce({ isNewUser: true });
    const user = userEvent.setup();
    render(<PhoneScreen onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText(/05/i), '0521234567');
    await user.click(screen.getByRole('button', { name: /המשך/i }));
    await waitFor(() => screen.getByPlaceholderText(/כינוי/i));
    await user.clear(screen.getByPlaceholderText(/05/i));
    await user.type(screen.getByPlaceholderText(/05/i), '052');
    expect(screen.queryByPlaceholderText(/כינוי/i)).not.toBeInTheDocument();
  });
});
