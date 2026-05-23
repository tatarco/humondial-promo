/** Marketing names from tier crest artwork (Humondial 2026 ladder). Stored as reference for BizFlow קמפיין → רמות `label_he` / `label_en`. Keep API ids `bronze`…`legend` unchanged; tier 5 may use id `legend` at top or an extra tier — match your campaign ladder order ascending. */

export const TIER_HERO_LADDER_MARKETING = [
  {
    ladder_index: 1,
    slug: 'bronze',
    label_he: 'שחקן ספסל',
    label_en: 'Bench player',
    asset: 'tier-hero/tier-1.jpeg',
  },
  {
    ladder_index: 2,
    slug: 'silver',
    label_he: 'פותח בהרכב',
    label_en: 'Starter',
    asset: 'tier-hero/tier-2.jpeg',
  },
  {
    ladder_index: 3,
    slug: 'gold',
    label_he: 'חלוץ חוד',
    label_en: 'Striker',
    asset: 'tier-hero/tier-3.jpeg',
  },
  {
    ladder_index: 4,
    slug: 'legend',
    label_he: 'מלך השערים',
    label_en: 'Top scorer',
    asset: 'tier-hero/tier-4.jpeg',
  },
  {
    ladder_index: 5,
    slug: 'custom',
    label_he: 'אלוף',
    label_en: 'Champion',
    asset: 'tier-hero/tier-5.jpeg',
  },
];
