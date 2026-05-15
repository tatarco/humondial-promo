import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtpScreen from '../screens/OtpScreen.jsx';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));
vi.mock('../lib/session.js', () => ({ setToken: vi.fn() }));

import { callFn } from '../lib/api.js';
import { setToken } from '../lib/session.js';

describe('OtpScreen', () => {
  const onSuccess = vi.fn();
  const onBack    = vi.fn();
  const phone     = '972521234567';

  beforeEach(() => vi.clearAllMocks());

  it('renders OTP input and verify button', () => {
    render(<OtpScreen phone={phone} onSuccess={onSuccess} onBack={onBack} />);
    expect(screen.getByPlaceholderText('------')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /אימות|verify/i })).toBeInTheDocument();
  });

  it('verify button disabled when code is not 6 digits', () => {
    render(<OtpScreen phone={phone} onSuccess={onSuccess} onBack={onBack} />);
    expect(screen.getByRole('button', { name: /אימות|verify/i })).toBeDisabled();
  });

  it('on success: stores token and calls onSuccess', async () => {
    callFn.mockResolvedValueOnce({ token: 'tok-abc', playerId: 'pid-1' });
    const user = userEvent.setup();
    render(<OtpScreen phone={phone} onSuccess={onSuccess} onBack={onBack} />);
    await user.type(screen.getByPlaceholderText('------'), '123456');
    await user.click(screen.getByRole('button', { name: /אימות|verify/i }));
    await waitFor(() => expect(callFn).toHaveBeenCalledWith('promoVerifyOtp', { phone, code: '123456' }));
    await waitFor(() => expect(setToken).toHaveBeenCalledWith('tok-abc'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('pid-1'));
  });

  it('shows error on invalid code', async () => {
    callFn.mockRejectedValueOnce(Object.assign(new Error('invalid_code'), { status: 401 }));
    const user = userEvent.setup();
    render(<OtpScreen phone={phone} onSuccess={onSuccess} onBack={onBack} />);
    await user.type(screen.getByPlaceholderText('------'), '000000');
    await user.click(screen.getByRole('button', { name: /אימות|verify/i }));
    await waitFor(() => expect(screen.getByText(/שגיאה|קוד שגוי|invalid/i)).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
