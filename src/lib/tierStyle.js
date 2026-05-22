const KNOWN_CSS = {
  bronze: 'tier-bronze',
  silver: 'tier-silver',
  gold: 'tier-gold',
  legend: 'tier-legend',
};

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
  if (typeof id === 'string' && KNOWN_CSS[id]) return KNOWN_CSS[id];
  if (typeof id === 'string' && /^[0-9a-f-]{24,36}$/i.test(id)) {
    return 'tier-custom';
  }
  return 'tier-custom';
}
