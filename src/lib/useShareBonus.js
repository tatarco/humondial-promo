import { useState, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext.jsx';
import { callFn } from './api.js';

export function useShareBonus(context, opts = {}) {
  const { token, campaignId, eventId, platform } = opts;
  const config = useConfig();
  const [hasAttemptedShare, setHasAttemptedShare] = useState(false);
  const [claiming, setClaiming]     = useState(false);
  const [claimed, setClaimed]       = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [pointsGranted, setPointsGranted]   = useState(0);

  const ssc = config?.social_share_config;
  const shareEnabled = !!(ssc?.enabled && ssc?.contexts?.[context]?.enabled);
  const bonusPoints  = ssc?.contexts?.[context]?.bonus_points ?? 0;
  const template     = ssc?.templates?.[context] ?? {};

  const markAttempted = useCallback(() => setHasAttemptedShare(true), []);

  const claim = useCallback(async () => {
    if (!hasAttemptedShare || claiming || claimed) return;
    setClaiming(true);
    try {
      const result = await callFn('recordPromoShare', {
        token,
        campaign_id: campaignId,
        context,
        event_id: eventId,
        platform,
      });
      const d = result?.data ?? result;
      setPointsGranted(d?.points_granted ?? 0);
      setAlreadyClaimed(d?.already_claimed ?? false);
      setClaimed(true);
    } finally {
      setClaiming(false);
    }
  }, [hasAttemptedShare, claiming, claimed, token, campaignId, context, eventId, platform]);

  return { shareEnabled, bonusPoints, template, hasAttemptedShare, markAttempted, claim, claiming, claimed, alreadyClaimed, pointsGranted };
}
