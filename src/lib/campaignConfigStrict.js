const INT_KEYS = [
  'table_booking_points',
  'visit_points',
  'delivery_points',
  'join_points',
  'participation_points',
  'bullseye_points',
  'outcome_points',
  'draw_stripe_points',
];

export function validatePlayerCampaignConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return { ok: false, reason: 'no_config' };
  if (cfg.error && typeof cfg.error === 'string') return { ok: false, reason: cfg.error };

  if (!cfg.id || typeof cfg.id !== 'string') return { ok: false, reason: 'missing_campaign_id' };
  if (!Array.isArray(cfg.tiers) || cfg.tiers.length < 1) {
    return { ok: false, reason: 'campaign_tiers_missing' };
  }

  for (const k of INT_KEYS) {
    const v = cfg[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      return { ok: false, reason: `invalid_economy_int:${k}` };
    }
  }

  if (typeof cfg.booking_url !== 'string' || cfg.booking_url.trim().length < 8) {
    return { ok: false, reason: 'missing_booking_url' };
  }
  if (typeof cfg.delivery_url !== 'string' || cfg.delivery_url.trim().length < 8) {
    return { ok: false, reason: 'missing_delivery_url' };
  }

  const pwm = cfg.prediction_window_mode === 'days' ? 'days' : 'games';
  if (pwm === 'games') {
    const g = cfg.prediction_window_games;
    if (typeof g !== 'number' || !Number.isInteger(g) || g < 1) {
      return { ok: false, reason: 'invalid_prediction_window_games' };
    }
  } else {
    const d = cfg.prediction_window_days;
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 1) {
      return { ok: false, reason: 'invalid_prediction_window_days' };
    }
  }

  return { ok: true };
}
