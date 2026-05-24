import { PLAYER_BENEFITS_COPY_KEYS } from './benefitsPlayerCopy.js';

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

function isClientSafeBrandAssetUrl(s) {
  const t = typeof s === 'string' ? s.trim() : '';
  if (!t) return true;
  if (/^https?:\/\/[^\s#$]+$/i.test(t)) return true;
  if (t.includes('..') || t.includes('//')) return false;
  return /^[A-Za-z0-9_-][A-Za-z0-9_\-.\\/]*\.(svg|png|webp|jpeg|jpg)$/i.test(t);
}

export function validatePlayerCampaignConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return { ok: false, reason: 'no_config' };
  if (cfg.error && typeof cfg.error === 'string') return { ok: false, reason: cfg.error };

  if (!cfg.id || typeof cfg.id !== 'string') return { ok: false, reason: 'missing_campaign_id' };
  if (!Array.isArray(cfg.tiers) || cfg.tiers.length < 1) {
    return { ok: false, reason: 'campaign_tiers_missing' };
  }
  if (cfg.tiers.length > 5) return { ok: false, reason: 'tier_ladder_max_five' };

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

  const seenHeroSlots = new Set();
  for (let i = 0; i < cfg.tiers.length; i++) {
    const tier = cfg.tiers[i];
    const cv =
      tier.chip_variant == null ? '' : String(tier.chip_variant).trim().toLowerCase();
    const palette = ['copper', 'mist', 'golden', 'ruby', 'lavender', 'violet'];
    if (!palette.includes(cv)) {
      return { ok: false, reason: `tier_chip_variant:${i}:${cv}` };
    }
    const rawHs = tier.hero_slot;
    const hn = typeof rawHs === 'string' ? Number(rawHs.trim()) : Number(rawHs);
    if (!Number.isFinite(hn) || !Number.isInteger(hn) || hn < 1 || hn > 5) {
      return { ok: false, reason: `tier_hero_slot:${i}` };
    }
    if (seenHeroSlots.has(hn)) return { ok: false, reason: `tier_hero_slot_dup:${hn}` };
    seenHeroSlots.add(hn);
  }

  if (
    typeof cfg.brand_header_logo_url === 'string' &&
    cfg.brand_header_logo_url.trim() &&
    !isClientSafeBrandAssetUrl(cfg.brand_header_logo_url)
  ) {
    return { ok: false, reason: 'brand_header_logo_invalid' };
  }

  if (
    typeof cfg.brand_header_logo_alt === 'string' &&
    cfg.brand_header_logo_alt.length > 160
  ) {
    return { ok: false, reason: 'brand_header_logo_alt_too_long' };
  }
  if (
    typeof cfg.brand_header_subtitle === 'string' &&
    cfg.brand_header_subtitle.length > 80
  ) {
    return { ok: false, reason: 'brand_header_subtitle_too_long' };
  }

  const bpc = cfg.benefits_player_copy;
  if (bpc !== undefined && bpc !== null) {
    if (typeof bpc !== 'object' || Array.isArray(bpc)) return { ok: false, reason: 'invalid_benefits_player_copy' };
    for (const [fk, fv] of Object.entries(bpc)) {
      if (!PLAYER_BENEFITS_COPY_KEYS.includes(fk)) continue;
      if (typeof fv !== 'string') return { ok: false, reason: `invalid_benefits_field:${fk}` };
    }
  }

  return { ok: true };
}
