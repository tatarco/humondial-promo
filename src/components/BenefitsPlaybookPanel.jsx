import { normalizeBenefitsPlayerCopy, PLAYER_BENEFITS_COPY_KEYS } from '../lib/benefitsPlayerCopy.js';

const SECTIONS = [
  { key: 'milestones_he', title: 'שלבים ותאריכים' },
  { key: 'booking_notice_he', title: 'הזמנת מקום' },
  { key: 'stacking_notice_he', title: 'שילוב הטבות' },
  { key: 'alcohol_notice_he', title: 'אלכוהול' },
  { key: 'contingency_notice_he', title: 'מקרי קצה' },
  { key: 'redemption_notice_he', title: 'פדיון ושימוש בסניף' },
];

function sectionItems(copy) {
  const c = normalizeBenefitsPlayerCopy(copy);
  return SECTIONS.filter((s) => typeof c[s.key] === 'string' && c[s.key].trim());
}

export default function BenefitsPlaybookPanel({ copy, variant = 'compact' }) {
  const c = normalizeBenefitsPlayerCopy(copy);
  const items = sectionItems(c);
  if (!items.length) return null;

  const body = (
    <div className={variant === 'compact' ? 'space-y-3 px-4 pb-3 pt-2' : 'space-y-4'}>
      {items.map(({ key, title }) => (
        <div key={key}>
          <div className="text-xs font-black text-right mb-1" style={{ color: 'var(--gold)' }}>
            {title}
          </div>
          <p
            className="text-[10px] leading-relaxed text-right whitespace-pre-wrap m-0"
            style={{ color: 'var(--text-sec)' }}
          >
            {c[key]}
          </p>
        </div>
      ))}
    </div>
  );

  if (variant === 'compact') {
    return (
      <details
        className="hm-card mb-2 mx-3 overflow-hidden rounded-xl border"
        style={{ borderColor: 'rgba(244,193,93,0.35)', background: 'rgba(255,255,255,0.03)' }}
        dir="rtl"
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-right select-none [&::-webkit-details-marker]:hidden">
          מדריך הטבות וכללים
          <span className="block text-[10px] font-normal mt-0.5 opacity-80" style={{ color: 'var(--text-sec)' }}>
            {PLAYER_BENEFITS_COPY_KEYS.filter((k) => typeof c[k] === 'string' && c[k].trim()).length} קטגוריות · לחץ לפתיחה
          </span>
        </summary>
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {body}
        </div>
      </details>
    );
  }

  return (
    <section
      className="hm-card p-4 rounded-xl border"
      dir="rtl"
      style={{ borderColor: 'rgba(244,193,93,0.35)', background: 'rgba(255,255,255,0.03)' }}
    >
      <h3 className="text-sm font-black text-right m-0 mb-3" style={{ color: 'var(--gold)' }}>
        מדריך הטבות וכללים
      </h3>
      {body}
    </section>
  );
}
