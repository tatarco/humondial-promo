/** Canonical five-rung ladder (Humondial 2026): bench → champion (`promo_campaigns.tiers` defaults after migrations). `hero_slot` 1–5 maps to crest PNG `tier-{n}.png`; `chip_variant` selects chip styling. At most five tier rows server-side + PWA-enforced.
 */

export const TIER_HERO_LADDER_MARKETING = [
  {
    ladder_index: 1,
    slug: 'bench',
    label_he: 'שחקן ספסל',
    label_en: 'Bench player',
    asset: 'tier-hero/tier-1.png',
  },
  {
    ladder_index: 2,
    slug: 'starter',
    label_he: 'פותח בהרכב',
    label_en: 'Starter',
    asset: 'tier-hero/tier-2.png',
  },
  {
    ladder_index: 3,
    slug: 'striker',
    label_he: 'חלוץ חוד',
    label_en: 'Striker',
    asset: 'tier-hero/tier-3.png',
  },
  {
    ladder_index: 4,
    slug: 'top_scorer',
    label_he: 'מלך השערים',
    label_en: 'Top scorer',
    asset: 'tier-hero/tier-4.png',
  },
  {
    ladder_index: 5,
    slug: 'champion',
    label_he: 'אלוף',
    label_en: 'Champion',
    asset: 'tier-hero/tier-5.png',
  },
];

export function marketingLabelHeForLadderIndex(ladderIndex1Based) {
  const idx = typeof ladderIndex1Based === 'number' ? ladderIndex1Based : NaN;
  const row =
    Number.isFinite(idx) &&
    idx >= 1 &&
    idx <= TIER_HERO_LADDER_MARKETING.length
      ? TIER_HERO_LADDER_MARKETING[idx - 1]
      : null;
  const s = typeof row?.label_he === 'string' ? row.label_he.trim() : '';
  return s || '';
}

export function displayTierPrimaryLabelHe(campaignTier, ladderIndex1Based) {
  const m = marketingLabelHeForLadderIndex(ladderIndex1Based);
  if (m) return m;
  const v = typeof campaignTier?.label_he === 'string' ? campaignTier.label_he.trim() : '';
  const k =
    typeof campaignTier?.key === 'string'
      ? campaignTier.key.trim()
      : typeof campaignTier?.id === 'string'
        ? campaignTier.id.trim()
        : '';
  return v || k || 'דרגה';
}
