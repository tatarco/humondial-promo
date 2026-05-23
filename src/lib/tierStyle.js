const KNOWN_CSS = {
  bronze: 'tier-bronze',
  silver: 'tier-silver',
  gold: 'tier-gold',
  legend: 'tier-legend',
};

const KNOWN_SLUG = new Set(['bronze', 'silver', 'gold', 'legend']);

const HERO_TIER_ART = {
  bronze: 'tier-1.jpeg',
  silver: 'tier-2.jpeg',
  gold: 'tier-3.jpeg',
  legend: 'tier-4.jpeg',
  custom: 'tier-5.jpeg',
};

/** Stable id/key for matching CSS + public/hm-tier-{slug}.svg assets */
export function resolveTierSlug(tierLike) {
  if (tierLike == null) return 'custom';
  const key =
    typeof tierLike === 'object'
      ? tierLike?.key ?? tierLike?.tier_key ?? tierLike?.tierKey
      : tierLike;
  const id =
    typeof tierLike === 'object' ? tierLike?.id ?? tierLike?.tier_id : null;
  const ks = typeof key === 'string' ? key.trim().toLowerCase() : '';
  if (ks && KNOWN_SLUG.has(ks)) return ks;
  if (typeof id === 'string' && KNOWN_SLUG.has(id.trim().toLowerCase())) {
    return id.trim().toLowerCase();
  }
  return 'custom';
}

const baseUrl = () => {
  const b = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL : '/';
  return b && b.endsWith('/') ? b : `${b || ''}/`;
};

/** Crest artwork from WhatsApp tier pack (`public/tier-hero`). Unknown Mongo ids resolve to ladder-top art (`tier-5`). */
export function tierIconSrc(tierLike) {
  const slug = resolveTierSlug(tierLike);
  const hero = HERO_TIER_ART[slug];
  if (!hero) {
    return `${baseUrl()}hm-tier-custom.svg?v=1`;
  }
  return `${baseUrl()}tier-hero/${hero}?v=1`;
}

export function tierClassFromServerTier(tierLike) {
  if (tierLike == null) return 'tier-custom';
  const key =
    typeof tierLike === 'object'
      ? tierLike?.key ?? tierLike?.tier_key ?? tierLike?.tierKey
      : tierLike;
  const id =
    typeof tierLike === 'object' ? tierLike?.id ?? tierLike?.tier_id : null;
  const ks = typeof key === 'string' ? key.trim() : '';
  if (ks && KNOWN_CSS[ks]) return KNOWN_CSS[ks];
  if (typeof id === 'string') {
    const idl = id.trim().toLowerCase();
    if (KNOWN_CSS[idl]) return KNOWN_CSS[idl];
    if (/^[0-9a-f-]{24,36}$/i.test(id)) return 'tier-custom';
  }
  return 'tier-custom';
}
