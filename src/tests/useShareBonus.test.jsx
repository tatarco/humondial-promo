import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));
vi.mock('../contexts/ConfigContext.jsx', () => ({
  useConfig: vi.fn(),
}));

import { useShareBonus } from '../lib/useShareBonus.js';
import { callFn } from '../lib/api.js';
import { useConfig } from '../contexts/ConfigContext.jsx';

const ENABLED_CONFIG = {
  social_share_config: {
    enabled: true,
    contexts: { rank_share: { enabled: true, bonus_points: 5 } },
    templates: { rank_share: { headline_he: 'אני במקום #{rank}!', subline_he: '{points} נקודות', cta_he: 'הצטרפו!', hashtags: '#הומונדיאל' } },
  },
};

describe('useShareBonus', () => {
  beforeEach(() => { vi.clearAllMocks(); useConfig.mockReturnValue(ENABLED_CONFIG); });

  it('returns shareEnabled=true when config enables the context', () => {
    const { result } = renderHook(() => useShareBonus('rank_share'));
    expect(result.current.shareEnabled).toBe(true);
  });

  it('returns shareEnabled=false when feature disabled globally', () => {
    useConfig.mockReturnValue({ social_share_config: { enabled: false, contexts: {}, templates: {} } });
    const { result } = renderHook(() => useShareBonus('rank_share'));
    expect(result.current.shareEnabled).toBe(false);
  });

  it('returns shareEnabled=false when context disabled', () => {
    useConfig.mockReturnValue({ social_share_config: { enabled: true, contexts: { rank_share: { enabled: false, bonus_points: 5 } }, templates: {} } });
    const { result } = renderHook(() => useShareBonus('rank_share'));
    expect(result.current.shareEnabled).toBe(false);
  });

  it('returns correct bonusPoints from config', () => {
    const { result } = renderHook(() => useShareBonus('rank_share'));
    expect(result.current.bonusPoints).toBe(5);
  });

  it('markAttempted sets hasAttemptedShare to true', () => {
    const { result } = renderHook(() => useShareBonus('rank_share'));
    expect(result.current.hasAttemptedShare).toBe(false);
    act(() => result.current.markAttempted());
    expect(result.current.hasAttemptedShare).toBe(true);
  });

  it('claim calls recordPromoShare and sets claimed=true on success', async () => {
    callFn.mockResolvedValue({ success: true, points_granted: 5, already_claimed: false });
    const { result } = renderHook(() => useShareBonus('rank_share', { token: 'tok', campaignId: 'cid' }));
    act(() => result.current.markAttempted());
    await act(async () => result.current.claim());
    expect(callFn).toHaveBeenCalledWith('recordPromoShare', { token: 'tok', campaign_id: 'cid', context: 'rank_share', event_id: undefined, platform: undefined });
    expect(result.current.claimed).toBe(true);
    expect(result.current.pointsGranted).toBe(5);
    expect(result.current.alreadyClaimed).toBe(false);
  });

  it('claim sets alreadyClaimed=true when backend returns already_claimed', async () => {
    callFn.mockResolvedValue({ success: true, points_granted: 0, already_claimed: true });
    const { result } = renderHook(() => useShareBonus('rank_share', { token: 'tok', campaignId: 'cid' }));
    act(() => result.current.markAttempted());
    await act(async () => result.current.claim());
    expect(result.current.alreadyClaimed).toBe(true);
    expect(result.current.claimed).toBe(true);
    expect(result.current.pointsGranted).toBe(0);
  });
});
