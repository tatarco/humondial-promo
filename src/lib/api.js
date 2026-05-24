const GATEWAY_HTML_RE =
  /<(!DOCTYPE\s+)?html\b|cf-error-details|\b522\s*[:\|\u003A]\s*Connection timed out|524\s*[:\|\u003A]|525\s*[:\|\u003A]|526\s*[:\|\u003A]|<title[^>]*>\s*(?:[^\n]*?(?:522|523|524|525|526|527)\b[^\n]*?)\s*<\/title>/i;

const CF_EDGE_CODES = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 529, 530]);

export function isLikelyUpstreamHtmlFault(status, rawText, contentType) {
  const ct = (contentType || '').toLowerCase();
  const s = String(rawText ?? '');
  if ((ct.includes('text/html') || ct.includes('application/xhtml+xml')) && GATEWAY_HTML_RE.test(s)) {
    return true;
  }
  if (CF_EDGE_CODES.has(Number(status))) {
    const t = s.trim();
    const structured = /^[\[{]/.test(t);
    if (GATEWAY_HTML_RE.test(s)) return true;
    if (!structured && /<\s*html\b|<body\b|<div[^>]+\sclass=["'][^"']*cf-/i.test(s)) return true;
  }
  return false;
}

const MSG_BACKEND_UNAVAILABLE =
  'השרת הבסיס לא הגיב כראוי זמנית (בעיה ברשת או אצל ספק). נסה שוב בעוד כמה דקות.';

function readEnv() {
  return {
    base: import.meta.env.VITE_BASE44_URL,
    key: import.meta.env.VITE_BASE44_API_KEY,
  };
}

export async function callFn(name, body) {
  const { base, key } = readEnv();
  const res = await fetch(`${base}/api/functions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api_key': key,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  const ct = res.headers.get('content-type') || '';

  if (isLikelyUpstreamHtmlFault(res.status, raw, ct)) {
    throw Object.assign(new Error(MSG_BACKEND_UNAVAILABLE), {
      status: res.status,
      code: 'UPSTREAM_UNAVAILABLE',
      data: undefined,
    });
  }

  let json = undefined;
  if (raw.trim()) {
    try {
      json = JSON.parse(raw);
    } catch {
      if (!res.ok) {
        throw Object.assign(
          new Error((raw.trim().slice(0, 260) || res.statusText || 'Request failed').trim()),
          { status: res.status, code: 'NON_JSON_BODY', data: raw.slice(0, 2000) },
        );
      }
      throw Object.assign(new Error(MSG_BACKEND_UNAVAILABLE), {
        status: res.status,
        code: 'BAD_JSON_BODY',
      });
    }
  } else if (!res.ok) {
    json = {};
  }

  if (!res.ok) {
    const errMsg =
      (json && typeof json === 'object' && json.error) ||
      (typeof json?.message === 'string' && json.message) ||
      (raw.trim() && raw.trim().slice(0, 240)) ||
      res.statusText ||
      'Request failed';
    throw Object.assign(new Error(typeof errMsg === 'string' ? errMsg : 'Request failed'), {
      status: res.status,
      data: json,
    });
  }

  return json;
}
