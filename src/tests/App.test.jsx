import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));
vi.mock('../lib/session.js', () => ({
  isLoggedIn: vi.fn(() => false),
  getToken: vi.fn(() => ''),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));
vi.mock('../lib/config.js', () => ({
  loadConfig: vi.fn(),
  getConfig: vi.fn(),
  DISPLAY_TIMEZONE: 'Asia/Jerusalem',
}));

import App from '../App.jsx';
import { loadConfig } from '../lib/config.js';
import { isLoggedIn } from '../lib/session.js';

describe('App config loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads config during LOADING state and passes to ConfigProvider', async () => {
    loadConfig.mockResolvedValue({ participation_points: 10, tiers: [], achievement_templates: [], show_leaderboard: true });
    isLoggedIn.mockReturnValue(false);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(loadConfig).toHaveBeenCalledOnce();
    });
  });

  it('shows PhoneScreen when session is invalid and config loaded', async () => {
    loadConfig.mockResolvedValue({ participation_points: 10, tiers: [], achievement_templates: [], show_leaderboard: true });
    isLoggedIn.mockReturnValue(false);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(screen.queryByText(/המשך/)).toBeTruthy();
    });
  });
});
