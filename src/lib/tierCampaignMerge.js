import { ALLOWED_CHIP_VARIANTS } from './tierVisual.js';

const ALLOWED_CV = new Set(ALLOWED_CHIP_VARIANTS);

function canonId(tierLike) {
  if (!tierLike || typeof tierLike !== 'object') return '';
  const raw =
    tierLike.id ?? tierLike.key ?? tierLike.tier_id ?? tierLike.tier_key ?? '';
  return typeof raw === 'string' ? raw.trim() : '';
}

export function findCampaignTier(tiers, tierLike) {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  const want = canonId(tierLike);
  if (!want) return null;
  return tiers.find((t) => t.id === want || (typeof t.key === 'string' && t.key === want)) ?? null;
}

function findCampaignTierLoose(tiers, tierLike) {
  let row = findCampaignTier(tiers, tierLike);
  if (row) return row;
  if (!tierLike || !Array.isArray(tiers)) return null;
  const mp = tierLike.min_points;
  if (typeof mp !== 'number' || !Number.isFinite(mp)) return null;
  const hits = tiers.filter((t) => Number(t.min_points) === Number(mp));
  return hits.length === 1 ? hits[0] : null;
}

function sortedTiersAscending(tiers) {
  return [...(tiers || [])].sort(
    (a, b) => (a.min_points ?? 0) - (b.min_points ?? 0),
  );
}

export function heroSlotChipPatch(candidate, tiers) {
  const sorted = sortedTiersAscending(tiers);
  const id = canonId(candidate);
  const idx = id ?
      sorted.findIndex((t) => t?.id === id || (t?.key != null && t.key === id))
    : -1;
  const i = idx >= 0 ? idx : 0;

  let hero_slot = candidate?.hero_slot;
  const hn = typeof hero_slot === 'string' ? Number(String(hero_slot).trim()) : Number(hero_slot);
  if (
    !Number.isFinite(hn) ||
    !Number.isInteger(hn) ||
    hn < 1 ||
    hn > 5
  ) {
    hero_slot = Math.min(Math.max(i, 0) + 1, 5);
  } else {
    hero_slot = hn;
  }

  let chip_variant = typeof candidate?.chip_variant === 'string'
    ? candidate.chip_variant.trim().toLowerCase()
    : '';
  if (!ALLOWED_CV.has(chip_variant)) {
    chip_variant = ALLOWED_CHIP_VARIANTS[i % ALLOWED_CHIP_VARIANTS.length];
  }

  return { hero_slot, chip_variant };
}

export function mergePlayerTierWithCatalog(tierLike, tiers) {
  if (!tierLike || typeof tierLike !== 'object') return tierLike;
  const row = findCampaignTierLoose(tiers, tierLike);
  if (!row) {
    const p = heroSlotChipPatch(tierLike, tiers);
    return {
      ...tierLike,
      ...p,
      chip_variant: p.chip_variant,
    };
  }
  const base = {
    ...tierLike,
    label_he: row.label_he ?? tierLike.label_he,
    label_en: row.label_en ?? tierLike.label_en,
    perks: tierLike.perks ?? row.perks,
    hero_slot: row.hero_slot ?? tierLike.hero_slot,
    chip_variant: row.chip_variant ?? tierLike.chip_variant,
  };
  const p = heroSlotChipPatch(base, tiers);
  return {
    ...base,
    hero_slot: p.hero_slot,
    chip_variant: p.chip_variant,
  };
}

export function resolveTierPresentation(tierLike, tiers) {
  return mergePlayerTierWithCatalog(tierLike, tiers);
}

export function tierHeadlineResolvedLabel(tierLike, tierDetail, tiers) {
  const merged = mergePlayerTierWithCatalog(tierLike, tiers);
  const mk = merged?.label_he;
  const fromCampaign = typeof mk === 'string' ? mk.trim() : '';
  if (fromCampaign) return fromCampaign;
  const e1 = tierDetail?.effective_tier?.label_he;
  if (typeof e1 === 'string' && e1.trim()) return e1.trim();
  const e2 = tierDetail?.points_only_tier?.label_he;
  if (typeof e2 === 'string' && e2.trim()) return e2.trim();
  const raw = tierLike?.label_he;
  return typeof raw === 'string' ? raw.trim() : '';
}

export function nextTierLabelForProgress(nextTierObj, tiers) {
  if (!nextTierObj) return '';
  const merged = mergePlayerTierWithCatalog(nextTierObj, tiers);
  const mk = typeof merged?.label_he === 'string' ? merged.label_he.trim() : '';
  if (mk) return mk;
  const raw = nextTierObj.label_he;
  return typeof raw === 'string' ? raw.trim() : '';
}
