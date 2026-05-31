import { useState, useEffect } from 'react';
import { callFn } from '../lib/api.js';
import { PROMO_CAMPAIGN_ID } from '../lib/config.js';
import { getToken } from '../lib/session.js';
import { normalizeBenefitsPlayerCopy } from '../lib/benefitsPlayerCopy.js';

const SECTIONS = [
  { key: 'milestones_he', title: 'שלבים ותאריכים' },
  { key: 'booking_notice_he', title: 'הזמנת מקום' },
  { key: 'stacking_notice_he', title: 'שילוב הטבות' },
  { key: 'alcohol_notice_he', title: 'אלכוהול' },
  { key: 'contingency_notice_he', title: 'מקרי קצה' },
  { key: 'redemption_notice_he', title: 'פדיון ושימוש בסניף' },
];

export default function BenefitsGuideScreen({ onBack }) {
  const [copy, setCopy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    callFn('getLeaderboard', { token: getToken(), campaign_id: PROMO_CAMPAIGN_ID })
      .then((d) => {
        if (cancelled) return;
        setCopy(d?.benefits_player_copy ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e ?? ''));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const c = normalizeBenefitsPlayerCopy(copy);
  const items = SECTIONS.filter((s) => typeof c[s.key] === 'string' && c[s.key].trim());

  return (
    <div
      className="h-dvh overflow-y-auto pb-8"
      style={{ background: 'var(--hm-bg, #100505)' }}
      dir="rtl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: 'var(--hm-bg, #100505)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex-1" />
        <h1 className="text-base font-black text-center flex-1" style={{ color: 'var(--gold, #f4c15d)' }}>
          מדריך הטבות וכללים
        </h1>
        <div className="flex-1 flex justify-end">
          <button
            type="button"
            className="text-sm font-bold px-2 py-1"
            style={{ color: 'var(--gold, #f4c15d)' }}
            onClick={onBack}
          >
            חזרה ←
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="animate-pulse text-sm" style={{ color: 'var(--text-sec, rgba(246,239,237,0.65))' }}>
              טוען...
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm" style={{ color: 'var(--text-sec, rgba(246,239,237,0.65))' }}>
              שגיאה בטעינת הנתונים
            </span>
          </div>
        )}

        {!loading && !error && !items.length && (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm" style={{ color: 'var(--text-sec, rgba(246,239,237,0.65))' }}>
              אין נתוני הטבות להציג
            </span>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-0">
            {items.map(({ key, title }, idx) => (
              <div
                key={key}
                className="py-4"
                style={idx < items.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.08)' } : {}}
              >
                <div className="text-sm font-black text-right mb-2" style={{ color: 'var(--gold, #f4c15d)' }}>
                  {title}
                </div>
                <p
                  className="text-sm leading-relaxed text-right whitespace-pre-wrap m-0"
                  style={{ color: 'var(--text-sec, rgba(246,239,237,0.65))' }}
                >
                  {c[key]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
