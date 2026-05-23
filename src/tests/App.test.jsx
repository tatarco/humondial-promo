import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));
vi.mock('../lib/session.js', () => ({
  isLoggedIn: vi.fn(() => false),
  getToken: vi.fn(() => ''),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

import { PLAYER_CAMPAIGN_MINIMAL_FIXTURE } from '../fixtures/playerCampaignMinimal.fixture.js';

vi.mock('../lib/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadConfig: vi.fn(),
  };
});

vi.mock('../lib/warmListMatches.js', () => ({
  startListMatchesWarm: vi.fn(),
  takeListMatchesWarm: vi.fn(() => null),
  resetListMatchesWarmForTests: vi.fn(),
}));

import App from '../App.jsx';
import { loadConfig, resetConfigCache } from '../lib/config.js';
import { isLoggedIn } from '../lib/session.js';

describe('App config loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigCache();
    loadConfig.mockResolvedValue(PLAYER_CAMPAIGN_MINIMAL_FIXTURE);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads config during LOADING state and passes to ConfigProvider', async () => {
    isLoggedIn.mockReturnValue(false);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(loadConfig.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows PhoneScreen when session is invalid and config loaded', async () => {
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
