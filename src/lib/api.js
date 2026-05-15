const BASE = import.meta.env.VITE_BASE44_URL;
const KEY  = import.meta.env.VITE_BASE44_API_KEY;

export async function callFn(name, body) {
  const res = await fetch(`${BASE}/api/functions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api_key': KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Request failed'), { status: res.status, data: json });
  return json;
}
