export const ALLOWED_CHIP_VARIANTS = ['copper', 'mist', 'golden', 'ruby', 'lavender', 'violet'];
const CHIP_VARIANT_SET = new Set(ALLOWED_CHIP_VARIANTS);

const CHIP_VARIANT_TW_CARD = {
  copper: 'bg-amber-900/40 border-amber-600 text-amber-300',
  mist: 'bg-gray-700/40 border-gray-400 text-gray-300',
  golden: 'bg-yellow-900/40 border-yellow-500 text-yellow-300',
  ruby: 'bg-red-950/40 border-red-600 text-red-200',
  lavender: 'bg-purple-900/35 border-purple-400 text-purple-200',
  violet: 'bg-violet-950/40 border-violet-500 text-violet-200',
};

function baseUrl() {
  const b = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL : '/';
  return b && b.endsWith('/') ? b : `${b || ''}/`;
}

/** @throws Error */
export function requireHeroSlotFromTier(tierLike) {
  if (!tierLike || typeof tierLike !== 'object') throw new Error('tier_object_required');
  const raw = tierLike.hero_slot;
  const n = typeof raw === 'string' ? Number(String(raw).trim()) : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error('tier_hero_slot_invalid');
  }
  return n;
}

/** @throws Error */
export function requireChipVariantFromTier(tierLike) {
  if (!tierLike || typeof tierLike !== 'object') throw new Error('tier_object_required');
  const raw = tierLike.chip_variant;
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!CHIP_VARIANT_SET.has(s)) throw new Error(`tier_chip_variant_invalid:${tierLike.chip_variant ?? ''}`);
  return s;
}

/** Presentation class — driven by campaign `tier.chip_variant`, not ladder id. */
/** @throws Error */
export function tierChipClassFromCampaignTier(tierLike) {
  const v = requireChipVariantFromTier(tierLike);
  return `hm-tier-chip--${v}`;
}

/** Tier hero JPEG path — positional slot from campaign (`tier.hero_slot`), not id. */
/** @throws Error */
export function tierIconSrcFromCampaignTier(tierLike) {
  const slot = requireHeroSlotFromTier(tierLike);
  return `${baseUrl()}tier-hero/tier-${slot}.jpeg?v=1`;
}

/** Tailwind accents for perk cards keyed by palette (campaign `tier.chip_variant`). */
/** @throws Error */
export function tierCardAccentClassesFromCampaignTier(tierLike) {
  const v = requireChipVariantFromTier(tierLike);
  return CHIP_VARIANT_TW_CARD[v] ?? 'bg-gray-700/40 border-gray-500 text-gray-300';
}
