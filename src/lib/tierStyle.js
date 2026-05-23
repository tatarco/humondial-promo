const KNOWN_CSS = {
  bronze: 'tier-bronze',
  silver: 'tier-silver',
  gold: 'tier-gold',
  legend: 'tier-legend',
};

const KNOWN_SLUG = new Set(['bronze', 'silver', 'gold', 'legend']);

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

/** Versioned same-origin URL so deploy cache-busts remain optional; files live in /public */
export function tierIconSrc(tierLike) {
  return `${baseUrl()}hm-tier-${resolveTierSlug(tierLike)}.svg?v=1`;
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
