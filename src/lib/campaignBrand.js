function baseUrl() {
  const b = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL : '/';
  return b && b.endsWith('/') ? b : `${b || ''}/`;
}

export function resolvedBrandHeaderLogoUrl(config) {
  if (!config || typeof config !== 'object') return null;
  const raw = config.brand_header_logo_url;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.replace(/^\//, '');
  return `${baseUrl()}${path}`;
}

/** Spaced digits for subtitles like “2026” → “2 0 2 6” when not already spaced. */
export function formatBrandSubtitleDisplay(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '';
  if (/\s/.test(s)) return s;
  if (/^\d+$/.test(s)) return [...s].join(' ');
  return s;
}
