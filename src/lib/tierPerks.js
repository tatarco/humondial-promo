export function tierPerkDisplayRows(tier) {
  const perks = Array.isArray(tier?.perks) ? tier.perks : [];
  return perks.map((p, idx) => {
    const label = typeof p?.label_he === 'string' ? p.label_he : '';
    const emoji = typeof p?.emoji === 'string' && p.emoji.trim() ? p.emoji : '•';
    const suf = p?.per_day ? ' · פעם ביום' : '';
    const text = `${emoji} ${label}${suf}`.trim();
    return {
      key: String(p?.id ?? `perk:${idx}`),
      text,
    };
  }).filter(row => row.text.length > 0);
}
