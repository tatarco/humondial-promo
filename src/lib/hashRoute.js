const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readPromoHashRoute() {
  const raw =
    typeof window.location.hash === 'string' ? window.location.hash : '';
  const inner = raw.replace(/^#\/?/, '');
  const [pathRaw = 'home', qs = ''] = inner.split('?');
  const path = String(pathRaw || 'home').replace(/^\/+|\/+$/g, '') || 'home';
  const params = new URLSearchParams(qs);
  return { path, params };
}

export function authenticatedRouteFromHash() {
  const { path, params } = readPromoHashRoute();

  const bookingCandidate = () => {
    const mid = params.get('matchId')?.trim?.();
    let kick = params.get('matchKickoffUtc');
    if (mid && UUID_RE.test(mid)) {
      if (kick != null && typeof kick !== 'string') kick = '';
      return { matchId: mid, matchKickoffUtc: kick || null };
    }
    return null;
  };

  switch (path) {
    case 'leaderboard':
      return { key: 'leaderboard', bookingContext: null };
    case 'me':
    case 'personal':
      return { key: 'personal_area', bookingContext: null };
    case 'ledger':
      return { key: 'ledger', bookingContext: null };
    case 'venue-code':
    case 'venue_code':
      return { key: 'venue_code', bookingContext: null };
    case 'qr':
      return { key: 'my_qr', bookingContext: null };
    case 'booking': {
      const ctx = bookingCandidate();
      return { key: 'branch_booking', bookingContext: ctx };
    }
    case 'shell':
    case 'home':
    default:
      return { key: 'shell', bookingContext: null };
  }
}
