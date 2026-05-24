export const PLAYER_BENEFITS_COPY_KEYS = [
  'milestones_he',
  'redemption_notice_he',
  'alcohol_notice_he',
  'stacking_notice_he',
  'booking_notice_he',
  'contingency_notice_he',
];

const MAX_LEN = 6000;

export function normalizeBenefitsPlayerCopy(raw) {
  const out = {};
  for (const k of PLAYER_BENEFITS_COPY_KEYS) out[k] = '';
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const k of PLAYER_BENEFITS_COPY_KEYS) {
    const v = raw[k];
    if (typeof v === 'string') out[k] = v.slice(0, MAX_LEN);
  }
  return out;
}

export function overlayBenefitsPlayerCopy(baseRaw, overlayRaw) {
  const base = normalizeBenefitsPlayerCopy(baseRaw);
  const over = normalizeBenefitsPlayerCopy(overlayRaw);
  const merged = {};
  for (const k of PLAYER_BENEFITS_COPY_KEYS) {
    const o = over[k];
    merged[k] = typeof o === 'string' && o.trim() ? o : base[k];
  }
  return merged;
}

export function hasAnyBenefitsPlayerCopy(copy) {
  const c = normalizeBenefitsPlayerCopy(copy);
  return PLAYER_BENEFITS_COPY_KEYS.some((k) => typeof c[k] === 'string' && c[k].trim().length > 0);
}
