import { useState, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext.jsx';
import { callFn } from './api.js';

// Matches backend idempotency_key logic in recordPromoShare:
// - correct_prediction / bullseye → per event (share:context:eventId)
// - everything else → per day per player (date-keyed)
const MATCH_CONTEXTS = new Set(['correct_prediction', 'bullseye']);

function claimCacheKey(context, campaignId, eventId) {
  if (MATCH_CONTEXTS.has(context) && eventId) {
    return `hm_share:${context}:${campaignId}:event:${eventId}`;
  }
  return `hm_share:${context}:${campaignId}:${new Date().toISOString().slice(0, 10)}`;
}

export function useShareBonus(context, opts = {}) {
  const { token, campaignId, eventId, platform } = opts;
  const config = useConfig();

  const cacheKey = claimCacheKey(context, campaignId, eventId);
  const alreadyClaimedLocally = !!localStorage.getItem(cacheKey);

  const [hasAttemptedShare, setHasAttemptedShare] = useState(false);
  const [claiming, setClaiming]     = useState(false);
  const [claimed, setClaimed]       = useState(alreadyClaimedLocally);
  const [alreadyClaimed, setAlreadyClaimed] = useState(alreadyClaimedLocally);
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
      const wasAlreadyClaimed = d?.already_claimed ?? false;
      setPointsGranted(d?.points_granted ?? 0);
      setAlreadyClaimed(wasAlreadyClaimed);
      setClaimed(true);
      localStorage.setItem(cacheKey, '1');
    } finally {
      setClaiming(false);
    }
  }, [hasAttemptedShare, claiming, claimed, token, campaignId, context, eventId, platform, cacheKey]);

  return { shareEnabled, bonusPoints, template, hasAttemptedShare, markAttempted, claim, claiming, claimed, alreadyClaimed, pointsGranted };
}
