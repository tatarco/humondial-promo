import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { clearToken, getToken } from '../lib/session.js';
import { callFn } from '../lib/api.js';
import { useConfig } from '../contexts/ConfigContext.jsx';

import { DEFAULT_BOOKING_URL, DEFAULT_DELIVERY_ORDER_URL } from '../lib/campaignUrls.js';

function leaderboardSnapshotKey(cid) {
  return `hm_leaderboard_snap_v1:${cid}`;
}

const STAGE_HE = {
  'group': 'שלב הבתים', 'Group Stage': 'שלב הבתים',
  'Group Stage - 1': 'שלב הבתים 1', 'Group Stage - 2': 'שלב הבתים 2', 'Group Stage - 3': 'שלב הבתים 3',
  'Round of 16': 'שמינית גמר', 'round of 16': 'שמינית גמר',
  'Quarter Final': 'רבע גמר', 'quarter final': 'רבע גמר',
  'Semi Final': 'חצי גמר', 'semi final': 'חצי גמר',
  'Final': 'גמר', 'final': 'גמר',
};
function stageHe(s) { return STAGE_HE[s] || s; }

const STAGE_SORT_KEYS = {
  'שלב הבתים': 0, 'שלב הבתים 1': 0, 'שלב הבתים 2': 0, 'שלב הבתים 3': 0,
  'שמינית גמר': 1, 'רבע גמר': 2, 'חצי גמר': 3, 'גמר': 4,
};

const FLAG_MAP = {
  'גרמניה': '🇩🇪', 'צרפת': '🇫🇷', 'ארגנטינה': '🇦🇷', 'ברזיל': '🇧🇷',
  'ספרד': '🇪🇸', 'אנגליה': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'פורטוגל': '🇵🇹', 'הולנד': '🇳🇱',
  'בלגיה': '🇧🇪', 'קרואטיה': '🇭🇷', 'איטליה': '🇮🇹', 'שוויץ': '🇨🇭',
  'דנמרק': '🇩🇰', 'אורוגוואי': '🇺🇾', 'קולומביה': '🇨🇴', 'מקסיקו': '🇲🇽',
  'ארה"ב': '🇺🇸', 'יפן': '🇯🇵', 'קוריאה': '🇰🇷', 'סנגל': '🇸🇳',
  'מרוקו': '🇲🇦', 'תוניסיה': '🇹🇳', 'קמרון': '🇨🇲', 'גאנה': '🇬🇭',
  'אוסטרליה': '🇦🇺', 'קנדה': '🇨🇦', 'פולין': '🇵🇱', 'סרביה': '🇷🇸',
  'ניגריה': '🇳🇬', 'מצרים': '🇪🇬', 'אקוודור': '🇪🇨', 'פרגוואי': '🇵🇾',
  'Algeria': '🇩🇿', 'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
  'Belgium': '🇧🇪', 'Bosnia & Herzegovina': '🇧🇦', 'Brazil': '🇧🇷', 'Canada': '🇨🇦',
  'Cape Verde Islands': '🇨🇻', 'Colombia': '🇨🇴', 'Congo DR': '🇨🇩', 'Croatia': '🇭🇷',
  'Curaçao': '🇨🇼', 'Czech Republic': '🇨🇿', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Ghana': '🇬🇭',
  'Haiti': '🇭🇹', 'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Ivory Coast': '🇨🇮',
  'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Mexico': '🇲🇽', 'Morocco': '🇲🇦',
  'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴', 'Panama': '🇵🇦',
  'Paraguay': '🇵🇾', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦', 'Saudi Arabia': '🇸🇦',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Senegal': '🇸🇳', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷',
  'Spain': '🇪🇸', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Tunisia': '🇹🇳',
  'Türkiye': '🇹🇷', 'USA': '🇺🇸', 'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿',
};

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getFlag(teamName, fallback) {
  return FLAG_MAP[teamName] || fallback || '🏳️';
}

function fmtTime(utcIso, tz = 'Asia/Jerusalem') {
  try {
    return new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date(utcIso));
  } catch { return ''; }
}

function fmtDayDate(utcIso, tz = 'Asia/Jerusalem') {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      timeZone: tz,
    }).format(new Date(utcIso));
  } catch {
    try {
      const d = new Date(utcIso);
      return `${DAYS_HE[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
    } catch {
      return '';
    }
  }
}

function extractTrailingBracketAside(raw) {
  if (!raw || typeof raw !== 'string') return { clean: raw || '?', aside: null };
  const trimmed = raw.trim();
  const idx = trimmed.indexOf(' [');
  if (idx <= 0) return { clean: trimmed, aside: null };
  const aside = trimmed.slice(idx).trim();
  const clean = trimmed.slice(0, idx).trim();
  return { clean: clean || trimmed, aside };
}

const DISPLAY_MATCH_ORDER = { live: 0, locked: 1, open: 2, final: 3 };

function compareDisplayMatchOrder(a, b) {
  const ra = DISPLAY_MATCH_ORDER[a?.status] ?? 99;
  const rb = DISPLAY_MATCH_ORDER[b?.status] ?? 99;
  if (ra !== rb) return ra - rb;
  return new Date(a?.kickoff_utc || 0).getTime() - new Date(b?.kickoff_utc || 0).getTime();
}

const TIER_CSS = { bronze: 'tier-bronze', silver: 'tier-silver', gold: 'tier-gold', legend: 'tier-legend' };
function tierCss(key) { return TIER_CSS[key] || 'tier-bronze'; }

function getTier(config, points) {
  if (!config?.tiers) return null;
  const sorted = [...config.tiers].sort((a, b) => b.min_points - a.min_points);
  return sorted.find(t => points >= t.min_points) || sorted[sorted.length - 1];
}

function getNextTier(config, points) {
  if (!config?.tiers) return null;
  const sorted = [...config.tiers].sort((a, b) => a.min_points - b.min_points);
  return sorted.find(t => t.min_points > points) || null;
}

function spawnConfetti() {
  const COLORS = ['#D63A36', '#F4C15D', '#35D26F', '#ffffff', '#ff9500', '#a78bfa'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    el.style.animationName = 'confetti-fall';
    el.style.animationDuration = (2 + Math.random() * 2) + 's';
    el.style.animationDelay = (Math.random() * 1) + 's';
    el.style.animationFillMode = 'forwards';
    el.style.animationTimingFunction = 'linear';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function BenefitsSheet({ tiers, myTier, onClose }) {
  const sorted = [...tiers].sort((a, b) => b.min_points - a.min_points);
  const myPts = myTier?.min_points ?? 0;
  return (
    <div className="fixed inset-0 z-40 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-6 pb-8"
        style={{ background: 'rgba(18,4,4,0.98)', border: '1px solid var(--border)', maxHeight: '75vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center text-base font-black mb-4" style={{ color: 'var(--text)' }}>הטבות לפי דרגה</div>
        {sorted.map(tier => {
          const isCurrent  = tier.id === myTier?.id;
          const isAchieved = tier.min_points <= myPts && !isCurrent;
          const tierKey    = tier.key || tier.id;
          return (
            <div
              key={tier.id}
              className={`rounded-2xl p-4 mb-3 ${isCurrent ? 'border-2' : 'border'}`}
              style={{
                borderColor: isCurrent ? 'var(--red)' : 'var(--border)',
                background:  isCurrent ? 'rgba(214,58,54,0.12)' : 'transparent',
                opacity:     isAchieved || isCurrent ? 1 : 0.38,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierCss(tierKey)}`}>
                  {tier.label_he}
                </span>
                {isAchieved && <span className="text-xs font-bold" style={{ color: 'var(--green)' }}>✓ נצבר</span>}
                {isCurrent  && <span className="text-xs font-bold" style={{ color: 'var(--red)' }}>◉ הדרגה שלך</span>}
              </div>
              <ul className="space-y-1">
                {(tier.benefits || []).map((b, i) => (
                  <li key={i} className="text-xs" style={{ color: 'var(--text-sec)' }}>• {b}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroCard({
  totalPoints,
  pendingBookingPoints,
  config,
  onPersonalArea,
  onPersonalAreaTier,
  scrolled,
  openMatchCount,
  onScrollToGames,
  onBranchBooking,
  deliveryUrl,
  tierFromServer,
  tierDetail,
}) {
  const tierFromPts = getTier(config, totalPoints ?? 0);
  const tier = tierFromServer ?? tierFromPts;

  const nextTierPtsOnly = totalPoints != null ? getNextTier(config, totalPoints) : null;
  const ptsToNextPlain = nextTierPtsOnly ? nextTierPtsOnly.min_points - (totalPoints ?? 0) : 0;

  let pct = tier && nextTierPtsOnly ? Math.min(100, Math.round(((totalPoints ?? 0) / nextTierPtsOnly.min_points) * 100)) : (tier ? 100 : 0);
  let nextLabel = nextTierPtsOnly?.label_he;
  let commercialUi = !!(tierDetail?.show_commercial_requirements_ui && tierDetail?.requirements_for_next?.length);

  if (commercialUi && tierDetail.next_tier) {
    nextLabel = tierDetail.next_tier.label_he;
    const reqs = tierDetail.requirements_for_next.filter((x) => x.required > 0);
    const fracs = reqs.length
      ? reqs.map(r => Math.min(1, r.required > 0 ? r.current / r.required : 1))
      : [pct / 100];
    pct = Math.round((fracs.reduce((a, b) => a + b, 0) / Math.max(fracs.length, 1)) * 100);
  }

  const tierKey   = tier?.key || tier?.id || 'bronze';
  const tierMedal = tierKey === 'legend' ? '🏅' : tierKey === 'gold' ? '🥇' : tierKey === 'silver' ? '🥈' : '🥉';
  const delivPts  = config?.delivery_points ?? 20;

  if (scrolled) {
    return (
      <div
        className="hm-card mx-3 mb-2 flex items-center justify-between px-4 py-2"
        style={{ border: '1px solid rgba(244,193,93,0.4)', minHeight: 44 }}
      >
        <div className="flex items-center gap-1">
          <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--text)' }}>{totalPoints ?? '—'}</span>
          {totalPoints != null && <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>נ׳</span>}
        </div>
        {tier && (
          <button onClick={onPersonalAreaTier} className={`text-xs font-bold px-3 py-1 rounded-full ${tierCss(tierKey)}`}>
            {tier.label_he}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="hm-card mb-3 mx-3 overflow-hidden cursor-pointer"
      style={{ border: '1px solid rgba(244,193,93,0.45)', boxShadow: '0 0 40px rgba(244,193,93,0.14), 0 0 80px rgba(214,58,54,0.18)' }}
      onClick={onPersonalArea}
    >
      {/* Tagline + trophy */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="pl-16 text-right">
          <p className="text-xl font-black leading-snug" style={{ color: 'var(--text)' }}>פה לא רק רואים מונדיאל.</p>
          <p className="text-xl font-black leading-snug" style={{ color: 'var(--text)' }}>פה משחקים אותו.</p>
        </div>
        <div className="absolute top-4 left-4 text-6xl leading-none select-none">🏆</div>
      </div>

      {/* Points */}
      <div className="px-5 pb-3 text-right">
        <div className="flex items-baseline gap-2 justify-end">
          <span className="text-[42px] font-black tabular-nums leading-none" style={{ color: 'var(--gold)' }}>
            {totalPoints ?? '—'}
          </span>
          <span className="text-2xl font-black" style={{ color: 'var(--gold)' }}>נקודות</span>
        </div>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
          <span className="font-bold" style={{ color: 'var(--text)' }}>{totalPoints ?? 0}</span>
          {' '}נקודות מאושרות — אלה נספרות בדירוג ובדרגה. אתה מתחמם.
        </p>
        {(pendingBookingPoints ?? 0) > 0 && (
          <div
            className="mt-2 rounded-xl px-3 py-2.5 text-right space-y-1"
            style={{ background: 'rgba(244,193,93,0.08)', border: '1px solid rgba(244,193,93,0.35)' }}
          >
            <div className="text-xs font-black" style={{ color: 'var(--gold)' }}>
              +{pendingBookingPoints} נק׳ ממתינות · הזמנת שולחן
            </div>
            <p className="text-[10px] leading-snug" style={{ color: 'var(--text-sec)' }}>
              עדיין לא חלק מהניקוד המאושר. כדי להפוך אותן למאושרות: לבוא ליומנגס ולהזין את{' '}
              <span className="font-bold" style={{ color: 'var(--text)' }}>קוד הביקור היומי</span> במסך &quot;הגעת לסניף?&quot;.
              בכל ביקור משוחררת לפחות הזמנה ממתינה אחת (לפי סדר ההרשמה).
            </p>
          </div>
        )}
      </div>

      {/* Tier progress */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl leading-none">{tierMedal}</span>
          <button onClick={onPersonalAreaTier} className="text-sm font-bold text-right" style={{ color: 'var(--text)' }}>
            השלב שלי: {tier?.label_he || 'ברונזה'} ↗
          </button>
        </div>
        {(() => {
          const p = Math.min(100, Math.max(0, pct));
          const leftGrow = Math.max(0, 100 - p);
          return (
            <div
              className="relative h-3 w-full overflow-visible rounded-full"
              dir="ltr"
              lang="en"
              style={{ background: 'rgba(255,255,255,0.1)', isolation: 'isolate' }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <div className="absolute inset-0 flex flex-row" dir="ltr">
                  <div style={{ flex: `${leftGrow} 0 0px`, minHeight: '100%' }} aria-hidden />
                  <div
                    style={{
                      flex: `${p} 0 0px`,
                      minHeight: '100%',
                      borderRadius: 9999,
                      background: 'linear-gradient(to right, var(--red), var(--gold))',
                    }}
                    aria-hidden
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] flex -translate-y-1/2 flex-row" dir="ltr" aria-hidden>
                <div style={{ flex: `${leftGrow} 0 0px` }} />
                <span className="shrink-0 text-sm leading-none">⚽</span>
                <div style={{ flex: `${p} 0 0px` }} />
              </div>
            </div>
          );
        })()}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{pct}%</span>
          {nextLabel && commercialUi ? (
            <span className="text-xs text-right max-w-[70%]" style={{ color: 'var(--text-sec)' }}>
              מתקדמים ל{nextLabel} לפי הכללים (נקודות + מסעדה / משלוח כשמוגדרים)
            </span>
          ) : nextTierPtsOnly ? (
            <span className="text-xs text-right" style={{ color: 'var(--text-sec)' }}>
              עוד {ptsToNextPlain} נקודות ואתה עולה ל{nextTierPtsOnly.label_he}
            </span>
          ) : null}
        </div>
        {commercialUi && tierDetail?.summary_lines_he?.length > 0 && (
          <div className="mt-3 space-y-1 text-[10px] text-right px-1" style={{ color: 'var(--text-sec)' }}>
            {tierDetail.summary_lines_he.slice(0, 3).map((line, i) => (
              <p key={i} style={{ margin: '2px 0', lineHeight: 1.35 }}>{line}</p>
            ))}
            <div className="rounded-lg mt-2 space-y-1 p-2" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {tierDetail.requirements_for_next.map((r, i) => (
                <div key={r.key ?? i} className="flex flex-row-reverse justify-between gap-2 leading-tight">
                  <span className={`font-bold ${r.satisfied ? 'text-green-400' : 'text-amber-200'}`}>
                    {r.satisfied ? '✓' : `${r.shortfall}`}
                  </span>
                  <span className="opacity-95">{r.label_he} — {r.current}/{r.required}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's Snapshot */}
      <div className="mx-5 mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-bold mb-2 text-right" style={{ color: 'var(--gold)' }}>Today's Snapshot</p>
        <div className="space-y-1.5 text-sm text-right" style={{ color: 'var(--text)' }}>
          {openMatchCount > 0 && <p>⚽ {openMatchCount} משחקים פתוחים לניחוש</p>}
          {(config?.table_booking_points ?? 0) > 0 && (
            <p>🔥 אחרי הזמנת שולחן: +{config.table_booking_points} נק׳ <span className="opacity-90">ממתינות</span> עד קוד ביקור יומי בסניף</p>
          )}
          <p>🍔 צפייה ביומנגס = {delivPts}+ נקודות</p>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-5 pb-5 space-y-2.5" dir="rtl" onClick={e => e.stopPropagation()}>
        <button onClick={onScrollToGames} className="hm-btn-primary w-full py-3 text-sm font-black">
          נחש עכשיו ←
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => onBranchBooking?.()} className="hm-btn-secondary py-3 text-xs font-bold flex items-center justify-center gap-1">
            📅 שמור לי שולחן
          </button>
          <a
            href={deliveryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hm-btn-secondary py-3 text-xs font-bold flex items-center justify-center gap-1 text-center"
          >
            🛵 הזמן משלוח
          </a>
        </div>
      </div>
    </div>
  );
}

function QuickActionTile({ icon, label, sub, onClick, href, scrolled }) {
  const inner = (
    <div
      className="hm-card flex flex-col items-center gap-0.5 cursor-pointer transition-all duration-200 w-full"
      style={{ padding: scrolled ? '8px 4px' : '10px 6px' }}
      onClick={onClick}
    >
      <div className={`${scrolled ? 'text-xl' : 'text-2xl'} leading-none`}>{icon}</div>
      {label ? (
        <div
          className={`font-bold text-center leading-tight ${scrolled ? 'text-[9px]' : 'text-[10px]'}`}
          style={{ color: 'var(--text)' }}
        >
          {label}
        </div>
      ) : null}
      {!scrolled && sub ? (
        <div className="text-[10px] font-bold text-center leading-tight" style={{ color: 'var(--gold)' }}>{sub}</div>
      ) : null}
    </div>
  );
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="w-full">{inner}</a>
    : inner;
}

function PredictionEditor({ match, prediction, config, onPredict, onSaved, homeFlag, awayFlag }) {
  const initOutcome = () => {
    if (!prediction) return null;
    if (prediction.home_score > prediction.away_score) return 'home';
    if (prediction.home_score < prediction.away_score) return 'away';
    return 'draw';
  };
  const [selected, setSelected] = useState(initOutcome);
  const [homeScore, setHomeScore] = useState(prediction?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.away_score ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!prediction) { setSelected(null); setHomeScore(0); setAwayScore(0); return; }
    setSelected(initOutcome());
    setHomeScore(prediction.home_score);
    setAwayScore(prediction.away_score);
  }, [prediction]);

  function pickOutcome(outcome) {
    setSelected(outcome);
    if (outcome === 'home')  { setHomeScore(1); setAwayScore(0); }
    else if (outcome === 'away') { setHomeScore(0); setAwayScore(1); }
    else                     { setHomeScore(0); setAwayScore(0); }
  }

  async function handleSave() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setErr('');
    try {
      await onPredict(match.id, homeScore, awayScore);
      onSaved?.();
    } catch (e) {
      if (e?.data?.error === 'prediction_locked') setErr('המשחק כבר התחיל');
      else setErr(e.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  }

  const homeName = match.home_team || '?';
  const awayName = match.away_team || '?';
  const totalBonus = (config?.participation_points ?? 10)
    + (config?.bullseye_points ?? 30)
    + (config?.draw_stripe_points ?? 10);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-right mb-2.5" style={{ color: 'var(--text)' }}>מי ינצח?</p>
        <div className="flex gap-2" dir="ltr">
          {[
            { key: 'away', label: awayFlag, sub: awayName },
            { key: 'draw', label: 'X', sub: 'תיקו' },
            { key: 'home', label: homeFlag, sub: homeName },
          ].map(btn => (
            <button
              key={btn.key}
              onClick={() => pickOutcome(btn.key)}
              disabled={submitting}
              className={`score-btn flex-1 py-6 flex flex-col items-center gap-1.5 ${selected === btn.key ? 'selected' : ''}`}
            >
              <span className="font-black text-3xl">{btn.label}</span>
              <span className="text-[11px]" style={{ color: selected === btn.key ? 'rgba(255,255,255,0.75)' : 'var(--text-sec)' }}>
                {btn.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs text-right mb-3" style={{ color: 'var(--text-sec)' }}>
          תוצאה מדויקת <span style={{ fontWeight: 'normal' }}>(אופציונלי)</span>
        </p>
        <div className="flex items-center justify-center gap-3" dir="ltr">
          <span className="text-xs" style={{ color: 'var(--text-sec)' }}>{homeName}</span>
          <input
            type="number" min="0" max="20"
            value={homeScore}
            onChange={e => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-14 h-12 rounded-xl text-center font-black text-xl outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)' }}
          />
          <span className="font-black text-lg" style={{ color: 'var(--text)' }}>:</span>
          <input
            type="number" min="0" max="20"
            value={awayScore}
            onChange={e => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-14 h-12 rounded-xl text-center font-black text-xl outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-sec)' }}>{awayName}</span>
        </div>
        <p className="text-center text-[11px] mt-3" style={{ color: 'var(--text-sec)' }}>
          עד +{totalBonus} נק׳ צבירה מהמשחק (הצטרפות + התאמה למצב הניקוד בפועל)
        </p>
      </div>

      {err && <p className="text-red-400 text-xs text-center">{err}</p>}

      <button
        onClick={handleSave}
        disabled={!selected || submitting}
        className="hm-btn-primary w-full py-4 rounded-2xl text-base font-black"
        style={{ opacity: !selected || submitting ? 0.5 : 1 }}
      >
        {submitting ? 'שומר...' : 'שמור תחזית'}
      </button>
    </div>
  );
}

function MatchCard({ match, prediction, config, windowLocked, predictionWindowOpensHint, onPredict, onDelete, onOpenGames, onBranchBooking, isActive, onToggle }) {
  const isPending = !match.home_team || !match.away_team ||
    match.home_team.startsWith('?') || match.away_team.startsWith('?');
  const outsideGuessWindow = !isPending && windowLocked && match.status === 'open';
  const canGuess =
    match.status === 'open' && !isPending && !windowLocked;
  const preKickLocked = match.status === 'locked';
  const isLive = match.status === 'live';
  const isFinal = match.status === 'final';
  const hasPrediction = prediction != null;
  const canExpandCard = Boolean(canGuess || hasPrediction || isFinal);

  const [editMode, setEditMode]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [showPointsFlash, setShowPointsFlash] = useState(false);
  const flashTimer = useRef(null);
  const prevActive = useRef(isActive);
  useEffect(() => {
    if (prevActive.current && !isActive) {
      setEditMode(false);
      setConfirmDelete(false);
      setDeleting(false);
      setShowPointsFlash(false);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    }
    prevActive.current = isActive;
  }, [isActive]);

  const predOutcome = hasPrediction
    ? (prediction.home_score > prediction.away_score ? 'home'
      : prediction.home_score < prediction.away_score ? 'away' : 'draw')
    : null;
  const actualOutcome = isFinal
    ? (match.final_home_score > match.final_away_score ? 'home'
      : match.final_home_score < match.final_away_score ? 'away' : 'draw')
    : null;
  const bullseye = isFinal && hasPrediction &&
    prediction.home_score === match.final_home_score &&
    prediction.away_score === match.final_away_score;
  const exactDrawMatch = bullseye && match.final_home_score === match.final_away_score;
  const correctOutcome = predOutcome && actualOutcome && predOutcome === actualOutcome;

  const participationPts = config?.participation_points ?? 10;
  const bullseyePts = config?.bullseye_points ?? 30;
  const outcomePts = config?.outcome_points ?? 15;
  const drawStripePts = config?.draw_stripe_points ?? 10;

  let finalPointsEarned = null;
  if (isFinal && hasPrediction) {
    if (bullseye && exactDrawMatch) finalPointsEarned = bullseyePts + drawStripePts;
    else if (bullseye) finalPointsEarned = bullseyePts;
    else if (correctOutcome) finalPointsEarned = outcomePts;
    else finalPointsEarned = 0;
  }

  const hypotheticalMaxGuessPts = participationPts + bullseyePts;
  const finalCelebrate =
    Boolean(isFinal && hasPrediction && (bullseye || correctOutcome));

  useEffect(() => {
    if (bullseye) spawnConfetti();
  }, [bullseye]);

  const homeParts = extractTrailingBracketAside(match.home_team || '?');
  const awayParts = extractTrailingBracketAside(match.away_team || '?');
  const homeFlag = getFlag(homeParts.clean, match.home_flag);
  const awayFlag = getFlag(awayParts.clean, match.away_flag);

  const kickoffTime = match.kickoff_utc ? fmtTime(match.kickoff_utc) : '';
  const lockTime    = match.lock_deadline_utc ? fmtTime(match.lock_deadline_utc) : '';
  const dayDate     = match.kickoff_utc ? fmtDayDate(match.kickoff_utc) : '';

  const showTableBooking = Boolean(match.broadcasts_in_venues);
  const isBroadcastVenue = Boolean(match.broadcasts_in_venues);

  const predLabel = predOutcome === 'home' ? homeFlag : predOutcome === 'away' ? awayFlag : predOutcome === 'draw' ? 'X' : null;

  const statusBadge = isPending
    ? null
    : outsideGuessWindow
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-right" style={{ background: 'rgba(167,139,250,0.18)', color: '#ddd6fe', border: '1px solid rgba(167,139,250,0.45)' }}>⏸ מחוץ לחלון הניחוש</span>
    : canGuess
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(53,210,111,0.15)', color: 'var(--green)', border: '1px solid rgba(53,210,111,0.3)' }}><span>●</span> פתוח</span>
    : isLive
    ? <span className="inline-flex flex-row-reverse items-center gap-0.5 text-[11px] font-bold pl-2.5 pr-2 py-1 rounded-full shrink-0" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}><span className="leading-tight">חי</span><span className="shrink-0 text-[13px] leading-none pb-px" aria-hidden>⚽</span></span>
    : preKickLocked
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 text-right leading-tight max-w-[11rem]" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>🔒 נעול לפני הפתיחה</span>
    : isFinal
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(157,133,133,0.15)', color: 'var(--text-sec)', border: '1px solid rgba(157,133,133,0.3)' }}>✓ הסתיים</span>
    : <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 text-right leading-tight max-w-[10rem]" style={{ background: 'rgba(156,163,175,0.15)', color: '#9ca3af', border: '1px solid rgba(156,163,175,0.3)' }}>מתוזמן</span>;

  const openerHint =
    predictionWindowOpensHint ||
    (preKickLocked && lockTime ? `לא ניתן לפתוח ניחוש חדש — נעילה בשעה ${lockTime}` : null);

  const showLiveBroadcastLayout = isLive && !isPending;
  const liveScoresKnown =
    match.live_home_score != null && match.live_away_score != null;
  const guessMatchesLiveScores =
    hasPrediction &&
    liveScoresKnown &&
    prediction.home_score === match.live_home_score &&
    prediction.away_score === match.live_away_score;

  function handleHeaderActivate() {
    if (isPending || !canExpandCard) return;
    onToggle?.();
  }

  const outerCardStyle = isActive
    ? { border: '1px solid rgba(214,58,54,0.45)', boxShadow: '0 0 24px rgba(214,58,54,0.1)' }
    : finalCelebrate
      ? {}
      : isBroadcastVenue
        ? {
            border: '1px solid rgba(244,193,93,0.42)',
            boxShadow: '0 0 22px rgba(244,193,93,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
          }
        : {};

  return (
    <div
      data-match-id={match.id}
      className={`hm-card mb-2 overflow-hidden ${isPending ? 'opacity-50' : ''} ${isLive && !isPending ? 'hm-match-live-glow' : ''} ${finalCelebrate && !isActive ? 'hm-match-final-celebrate' : ''} ${isActive ? 'hm-match-active-focus' : ''}`}
      style={outerCardStyle}
    >
      <button
        type="button"
        className={`w-full text-right p-4 ${!isPending && canExpandCard ? 'cursor-pointer active:opacity-95' : 'cursor-default'}`}
        onClick={handleHeaderActivate}
        disabled={isPending}
      >
        {showLiveBroadcastLayout ? (
          <>
            <div
              className="relative pt-3 pr-3 pl-3 pb-3 mb-3 -mx-4 -mt-4"
              style={{
                background: 'linear-gradient(270deg, rgba(96,165,250,0.14), rgba(96,165,250,0.02))',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="absolute top-3 z-10 max-w-[42%]"
                style={{ left: 'max(12px, env(safe-area-inset-left))' }}
                dir="rtl"
              >
                <div className="flex flex-col gap-1.5 items-start">
                  {statusBadge}
                  {isBroadcastVenue && (
                    <span
                      className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        background: 'rgba(244,193,93,0.18)',
                        color: '#fbbf24',
                        border: '1px solid rgba(244,193,93,0.45)',
                      }}
                      aria-label="משחק משודר במסעדות יומנגס"
                    >
                      📺 משודר אצלנו
                    </span>
                  )}
                </div>
              </div>
              <div className="flex min-h-[52px] w-full flex-col items-center justify-center px-14 pt-1">
                {liveScoresKnown ? (
                  <div
                    dir="ltr"
                    className="font-black tabular-nums tracking-tight leading-none text-sky-300 opacity-95"
                    style={{
                      fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
                      textShadow: '0 0 24px rgba(56,189,248,0.42)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {match.live_home_score}
                    <span className="mx-1.5 opacity-50">:</span>
                    {match.live_away_score}
                  </div>
                ) : (
                  <div className="text-xs font-black text-sky-300/90 px-2 text-center leading-tight">בשידור</div>
                )}
                {hasPrediction ? (
                  <div
                    dir="rtl"
                    className="mt-1.5 px-2 text-center text-[10px] leading-snug font-extrabold"
                    style={{ color: 'rgba(245,245,245,0.42)' }}
                  >
                    <span className="whitespace-nowrap">ניחושך </span>
                    <span dir="ltr" className="inline whitespace-nowrap align-middle tabular-nums text-[13px] font-black" style={{ color: 'var(--gold)' }}>
                      {prediction.home_score}:{prediction.away_score}
                      {liveScoresKnown && guessMatchesLiveScores ? (
                        <span className="ml-1.5 whitespace-nowrap text-[10px] font-black text-emerald-400">✓ מתאים</span>
                      ) : null}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="text-[11px] leading-snug break-words text-right mb-2" style={{ color: 'var(--text-sec)' }}>
              {[match.stage, dayDate].filter(Boolean).join(' — ')}
            </div>
            {openerHint ? (
              <p className="text-[10px] leading-snug mb-2 text-right break-words px-0.5" style={{ color: 'var(--text-sec)' }}>
                {openerHint}
              </p>
            ) : null}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-2 items-start mb-1" dir="rtl">
              <div className="min-w-0 text-center px-px">
                <div className="text-xl leading-none mb-1.5">{homeFlag}</div>
                <div className="font-black text-[13px] leading-snug break-words mx-auto max-w-[7.5rem]" style={{ color: 'var(--text)' }}>
                  {homeParts.clean}
                </div>
                {homeParts.aside ? (
                  <div className="text-[9px] mt-1 leading-snug break-words mx-auto max-w-[7.75rem]" style={{ color: 'var(--text-sec)' }}>
                    {homeParts.aside}
                  </div>
                ) : null}
              </div>
              <div
                aria-hidden
                className="self-center px-2 pt-6 text-[9px] font-black uppercase tracking-wide"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                vs
              </div>
              <div className="min-w-0 text-center px-px">
                <div className="text-xl leading-none mb-1.5">{awayFlag}</div>
                <div className="font-black text-[13px] leading-snug break-words mx-auto max-w-[7.5rem]" style={{ color: 'var(--text)' }}>
                  {awayParts.clean}
                </div>
                {awayParts.aside ? (
                  <div className="text-[9px] mt-1 leading-snug break-words mx-auto max-w-[7.75rem]" style={{ color: 'var(--text-sec)' }}>
                    {awayParts.aside}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-row-reverse items-start justify-between mb-2 gap-2">
              <div className="shrink-0 flex flex-col gap-1.5 items-end max-w-[48%]">
                {statusBadge}
                {isBroadcastVenue && (
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      background: 'rgba(244,193,93,0.18)',
                      color: '#fbbf24',
                      border: '1px solid rgba(244,193,93,0.45)',
                    }}
                    aria-label="משחק משודר במסעדות יומנגס"
                  >
                    📺 משודר אצלנו
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-right">
                <span className="text-[11px] leading-snug break-words" style={{ color: 'var(--text-sec)' }}>
                  {[match.stage, dayDate].filter(Boolean).join(' — ')}
                </span>
              </div>
            </div>

            {openerHint ? (
              <p className="text-[10px] leading-snug mb-3 text-right break-words px-0.5" style={{ color: 'var(--text-sec)' }}>
                {openerHint}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 mb-3" dir="rtl">
              <div className="flex flex-row-reverse items-start gap-2">
                <span className="text-xl shrink-0 leading-none pt-0.5">{homeFlag}</span>
                <div className="min-w-0 flex-1 text-right">
                  <div className="font-black text-base leading-snug break-words" style={{ color: 'var(--text)' }}>
                    {homeParts.clean}
                  </div>
                  {homeParts.aside ? (
                    <div className="text-[10px] mt-1 leading-snug break-words" style={{ color: 'var(--text-sec)' }}>
                      {homeParts.aside}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="text-center text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-sec)' }}>vs</div>
              <div className="flex flex-row-reverse items-start gap-2">
                <span className="text-xl shrink-0 leading-none pt-0.5">{awayFlag}</span>
                <div className="min-w-0 flex-1 text-right">
                  <div className="font-black text-base leading-snug break-words" style={{ color: 'var(--text)' }}>
                    {awayParts.clean}
                  </div>
                  {awayParts.aside ? (
                    <div className="text-[10px] mt-1 leading-snug break-words" style={{ color: 'var(--text-sec)' }}>
                      {awayParts.aside}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {kickoffTime && (
              <div className="text-center text-[11px] mb-2 space-y-1" style={{ color: 'var(--text-sec)' }}>
                <div>
                  <span className="font-medium text-white/85">פתיחת משחק:</span>{' '}
                  {kickoffTime} שעון ישראל
                  {dayDate ? ` · ${dayDate}` : ''}
                </div>
                {lockTime && lockTime !== kickoffTime ? (
                  <div>
                    <span className="font-medium text-white/85">סגירת ניחוש:</span>{' '}
                    {lockTime}
                  </div>
                ) : null}
                {isLive && match.live_home_score != null && (
                  <div
                    dir="ltr"
                    className="mt-3 block font-black tabular-nums tracking-tight leading-none text-sky-300"
                    style={{
                      fontSize: 'clamp(1.875rem, 9vw, 2.875rem)',
                      textShadow: '0 0 28px rgba(56,189,248,0.42)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {match.live_home_score}
                    <span className="mx-2 opacity-50">:</span>
                    {match.live_away_score}
                  </div>
                )}
                {isFinal && (
                  <span className="font-black block text-sm" style={{ color: 'var(--text)' }}>
                    תוצאה סופית: {match.final_home_score} : {match.final_away_score}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {isFinal && !isPending && match.final_home_score != null && match.final_away_score != null && (
          <div
            className="rounded-xl px-3 py-3 mb-2 border text-right space-y-2"
            dir="rtl"
            style={{ background: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--text-sec)' }}>
              ניחוש ששלחת
            </div>
            {hasPrediction ? (
              <>
                <div className="text-2xl font-black tabular-nums leading-tight" style={{ color: 'var(--text)' }}>
                  {prediction.home_score} : {prediction.away_score}
                </div>
                {finalCelebrate && finalPointsEarned != null ? (
                  <div className="text-xs font-black" style={{ color: 'var(--gold)' }}>
                    זכית ב־+{finalPointsEarned} נ׳ בסיום משחק זה
                  </div>
                ) : null}
                {isFinal && hasPrediction && !finalCelebrate ? (
                  <div className="text-xs leading-relaxed pt-1" style={{ color: 'var(--text-sec)' }}>
                    ניחשת {prediction.home_score}:{prediction.away_score} · בסיום {match.final_home_score}:{match.final_away_score}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-xs leading-snug m-0" style={{ color: 'var(--text-sec)' }}>
                  לא הגשת ניחוש לסיום משחק זה · אילו השתתפת והיית פוגע בתוצאה המדויקת, הניקוד היה יכול להגיע לעד&nbsp;
                  {hypotheticalMaxGuessPts}&nbsp;נ׳ (&lrm;+
                  {participationPts}&rlm; הגשה + &lrm;+
                  {bullseyePts}&rlm;
                  תוצאה מדויקת&rlm;)
                </p>
                <p className="text-[11px] leading-snug m-0 mt-1 font-medium" style={{ color: '#fecaca' }}>
                  אל תישאר בחוץ בפעם הבאה — תפוס את המשחקים הפתוחים.
                </p>
                {onOpenGames ? (
                  <button
                    type="button"
                    className="hm-btn-primary w-full py-3 rounded-xl text-xs font-black mt-1"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      onOpenGames();
                    }}
                  >
                    למשחקים שכרגע פתוחים לניחוש
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}

        {canExpandCard ? (
          <div className="flex items-center justify-between pt-1 border-t border-white/5 flex-row-reverse">
            <span className="text-[11px]" style={{ color: 'var(--text-sec)' }}>
              {isFinal
                ? (hasPrediction ? 'פתח לפרט ניקוד והודעות' : 'פתח להסבר והמלצה')
                : isLive && hasPrediction
                  ? 'ניחוש · הזמנות והטבות'
                  : isLive
                    ? 'פתח למידע משחק'
                    : hasPrediction
                      ? 'הבחירה שלך'
                      : 'הקש לניחוש'}
            </span>
            <div className="flex items-center gap-2 flex-row-reverse">
              {predLabel && hasPrediction ? (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md" style={{ background: 'var(--red)', color: 'var(--text)' }}>
                  {predLabel}
                </span>
              ) : null}
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-sec)' }}>
                {isActive ? '▲' : '▼'}
                {hasPrediction ? ` · ${prediction.home_score}:${prediction.away_score}` : ''}
              </span>
            </div>
          </div>
        ) : null}
      </button>

      <div style={{ display: 'grid', gridTemplateRows: isActive && canExpandCard ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 pb-4 space-y-3">
            {canGuess && (!hasPrediction || editMode) && (
              <PredictionEditor
                match={match}
                prediction={prediction}
                config={config}
                onPredict={onPredict}
                homeFlag={homeFlag}
                awayFlag={awayFlag}
                onSaved={() => {
                  setEditMode(false);
                  setShowPointsFlash(true);
                  if (flashTimer.current) clearTimeout(flashTimer.current);
                  flashTimer.current = setTimeout(() => setShowPointsFlash(false), 3000);
                }}
              />
            )}

            {canGuess && hasPrediction && !editMode && (
              <div className="space-y-2">
                {showPointsFlash && (
                  <div className="rounded-xl px-4 py-2 text-center text-sm font-black"
                       style={{ background: 'rgba(244,193,93,0.15)', border: '1px solid rgba(244,193,93,0.35)', color: 'var(--gold)' }}>
                    🎉 +{config?.participation_points ?? 10} נ׳ נוספו!
                  </div>
                )}
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2 flex-row-reverse shrink-0">
                      <span className="text-xs" style={{ color: 'var(--text-sec)' }}>בחרת:</span>
                      <span className="font-black px-2.5 py-1 rounded-lg text-sm" style={{ background: 'var(--red)', color: 'var(--text)' }}>
                        {predLabel}
                      </span>
                    </div>
                    {confirmDelete ? (
                      <div className="flex flex-row-reverse flex-wrap items-center gap-3 justify-end">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs"
                          style={{ color: 'var(--text-sec)' }}
                        >ביטול</button>
                        <button
                          onClick={async () => {
                            setDeleting(true);
                            try { await onDelete(match.id); }
                            catch { setDeleting(false); setConfirmDelete(false); }
                          }}
                          disabled={deleting}
                          className="text-xs font-bold"
                          style={{ color: 'var(--red)' }}
                        >{deleting ? 'מוחק...' : 'אשר הסרה ✕'}</button>
                      </div>
                    ) : (
                      <div className="flex flex-row-reverse flex-wrap items-center gap-3 justify-end">
                        <button
                          onClick={() => setEditMode(true)}
                          className="text-xs underline"
                          style={{ color: 'var(--text-sec)' }}
                        >שנה בחירה</button>
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="text-xs underline"
                          style={{ color: 'var(--red)', opacity: 0.65 }}
                        >הסר ניחוש</button>
                      </div>
                    )}
                  </div>
                  {prediction.home_score != null && (
                    <div className="text-center text-xs pt-1" style={{ color: 'var(--text-sec)' }}>
                      תוצאה מדויקת: {prediction.home_score} : {prediction.away_score}
                    </div>
                  )}
                </div>
                {showTableBooking ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onBranchBooking?.({ matchId: match.id, matchKickoffUtc: match.kickoff_utc ?? null });
                    }}
                    className="flex flex-col gap-3 px-4 py-3 rounded-xl min-h-[4.75rem] w-full text-right border-0 appearance-none cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit' }}
                  >
                    <div className="flex flex-row-reverse items-start gap-3 text-right w-full">
                      <span className="text-xl shrink-0 leading-none mt-1" aria-hidden="true">🗓️</span>
                      <div className="min-w-0 flex-1 space-y-2 px-0.5">
                        <div className="text-sm font-bold leading-tight break-words" style={{ color: 'var(--text)' }}>הזמן מקום</div>
                        <div className="text-xs leading-relaxed break-words px-1" style={{ color: 'var(--green)' }}>
                          יתווספו לניקוד המאושר אחרי קוד ביקור יומי בסניף · ביקור אחד משחרר הזמנה אחת בסדר
                        </div>
                      </div>
                    </div>
                    <span className="hm-btn-primary block w-full text-center py-3 rounded-xl text-sm font-black">המשך להזמנה ←</span>
                  </button>
                ) : (
                  <a
                    href={config?.delivery_url || DEFAULT_DELIVERY_ORDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-3 px-4 py-3 rounded-xl min-h-[4.75rem]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex flex-row-reverse items-start gap-3 text-right w-full">
                      <span className="text-xl shrink-0 leading-none mt-1" aria-hidden="true">🛵</span>
                      <div className="min-w-0 flex-1 space-y-1 px-0.5">
                        <div className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>הזמן משלוח</div>
                        <div className="text-xs leading-relaxed px-1" style={{ color: 'var(--green)' }}>וקבל +{config.delivery_points ?? 20} נ׳</div>
                      </div>
                    </div>
                    <span className="hm-btn-primary block w-full text-center py-3 rounded-xl text-sm font-black">המשך למשלוח ←</span>
                  </a>
                )}
              </div>
            )}

            {!canGuess && hasPrediction && (
              <div className="text-center py-2">
                <div className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>הניחוש שלך</div>
                <div className="text-3xl font-black tabular-nums" style={{ color: 'var(--text)' }}>
                  {prediction.home_score} : {prediction.away_score}
                </div>
                {isFinal && bullseye && exactDrawMatch && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--gold)' }}>
                    🤝 תיקו מדויק (+{config?.bullseye_points ?? 30} תוצאה מדויקת +{config?.draw_stripe_points ?? 10} שכבת תיקו)
                  </div>
                )}
                {isFinal && bullseye && !exactDrawMatch && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--gold)' }}>🎯 ניחוש מדויק! +{config?.bullseye_points ?? 30}</div>
                )}
                {isFinal && !bullseye && correctOutcome && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--green)' }}>✓ ניחוש נכון! +{config?.outcome_points ?? 15}</div>
                )}
                {isFinal && !bullseye && !correctOutcome && (
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-sec)' }}>✗ ניחוש שגוי</div>
                )}
              </div>
            )}

            {!canGuess && !hasPrediction && (
              <p className="text-center text-xs py-3 px-2 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                {outsideGuessWindow
                  ? 'משחק זה מחוץ לחלון ההגשה של הקמפיין כרגע — כשיכנס טווח הימים או משחקי התור שלך הוא יפתח עם שאר ההגדרות.'
                  : preKickLocked
                    ? 'נעילה לפני שעת הפתיחה — לא ניתן להגיע ניחוש חדש.'
                    : isLive || isFinal
                      ? 'המשחק כבר בשידור או הסתיים — לא ניתן להגיע ניחוש מהממשק המשחק בעמוד הבית זה למשחק הזה.'
                      : !isPending
                        ? 'לא הגשת ניחוש למשחק זה'
                        : 'ממתינים למילוי שמות הקבוצות'}
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function AchievementToast({ achievement, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-hm-card border border-hm-red rounded-2xl px-5 py-4 shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
      <span className="text-3xl">{achievement.badge}</span>
      <div>
        <p className="text-hm-white font-bold text-sm">הישג חדש!</p>
        <p className="text-hm-muted text-xs">{achievement.label_he}</p>
        {achievement.bonus_points > 0 && (
          <p className="text-hm-red text-xs font-bold">+{achievement.bonus_points} נקודות</p>
        )}
      </div>
    </div>
  );
}

function StageFilterTabs({ stages, activeStage, onSelect }) {
  if (stages.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none border-b" style={{ borderColor: 'var(--border)' }}>
      <button
        onClick={() => onSelect(null)}
        className="shrink-0 text-xs px-3 py-1.5 rounded-full border"
        style={{
          background: activeStage === null ? 'var(--red)' : 'transparent',
          borderColor: activeStage === null ? 'var(--red)' : 'var(--border)',
          color: activeStage === null ? 'var(--text)' : 'var(--text-sec)',
          fontWeight: activeStage === null ? 'bold' : 'normal',
        }}
      >הכל</button>
      {stages.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s === activeStage ? null : s)}
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border"
          style={{
            background: activeStage === s ? 'var(--red)' : 'transparent',
            borderColor: activeStage === s ? 'var(--red)' : 'var(--border)',
            color: activeStage === s ? 'var(--text)' : 'var(--text-sec)',
            fontWeight: activeStage === s ? 'bold' : 'normal',
          }}
        >{stageHe(s)}</button>
      ))}
    </div>
  );
}

export default function HomeScreen({ playerId, onLogout, onPersonalArea, onPersonalAreaTier, onVenueCode, onMyQR, onBranchBooking }) {
  const openVenueDelivery = () => onVenueCode?.('delivery');
  const openVenueAtBranch = () => onVenueCode?.('venue');
  const config = useConfig();
  const effectiveConfig = config ? {
    ...config,
    booking_url: config.booking_url || DEFAULT_BOOKING_URL,
    delivery_url: config.delivery_url || DEFAULT_DELIVERY_ORDER_URL,
  } : config;
  const [matches, setMatches]         = useState([]);
  const [predictions, setPredictions] = useState({});
  const [activeCard, setActiveCard]   = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [scrolled, setScrolled]       = useState(false);
  const [totalPoints, setTotalPoints] = useState(null);
  const [pendingBookingPoints, setPendingBookingPoints] = useState(null);
  const [tierDetailLb, setTierDetailLb]             = useState(null);
  const [tierFromLb, setTierFromLb]               = useState(null);
  const scrollContainerRef            = useRef(null);
  const heroRef                       = useRef(null);
  const gamesRef                      = useRef(null);
  const [showScrollTopFab, setShowScrollTopFab]   = useState(false);

  const token = getToken();
  const campaignId = config?.id;

  useLayoutEffect(() => {
    if (!campaignId) return;
    try {
      const raw = sessionStorage.getItem(leaderboardSnapshotKey(campaignId));
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.total_points === 'number' && Number.isFinite(s.total_points)) setTotalPoints(s.total_points);
      if (typeof s.pending_booking_points === 'number') setPendingBookingPoints(s.pending_booking_points);
      if (Object.prototype.hasOwnProperty.call(s, 'tier_detail')) setTierDetailLb(s.tier_detail);
      if (Object.prototype.hasOwnProperty.call(s, 'tier')) setTierFromLb(s.tier);
    } catch (_) {}
  }, [campaignId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const wantLb = !!(campaignId && token);
    try {
      const [matchesRes, predsRes, lbRes] = await Promise.all([
        callFn('listMatches', {}),
        campaignId && token
          ? callFn('listMyPredictions', { token, campaign_id: campaignId })
          : Promise.resolve({ predictions: [] }),
        wantLb ? callFn('getLeaderboard', { campaign_id: campaignId, token }) : Promise.resolve(null),
      ]);
      setMatches(
        (matchesRes.matches || []).map((m) => {
          const st = typeof m.status === 'string' ? m.status.trim().toLowerCase() : m.status;
          return { ...m, status: st };
        }),
      );
      const predMap = {};
      for (const p of (predsRes.predictions || [])) predMap[p.match_id] = p;
      setPredictions(predMap);

      if (lbRes != null && campaignId) {
        const d = lbRes?.data ?? lbRes;
        if (d?.me?.total_points != null) setTotalPoints(d.me.total_points);
        const pbp = d?.me?.pending_table_booking_points ?? 0;
        setPendingBookingPoints(pbp);
        const td = d?.me?.tier_detail ?? null;
        const tf = d?.me?.tier ?? null;
        setTierDetailLb(td);
        setTierFromLb(tf);
        try {
          sessionStorage.setItem(
            leaderboardSnapshotKey(campaignId),
            JSON.stringify({
              total_points: d.me?.total_points,
              pending_booking_points: pbp,
              tier_detail: td,
              tier: tf,
            }),
          );
        } catch (_) {}
      }
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [campaignId, token]);

  useEffect(() => { load(); }, [load]);

  const stages = [...new Set(matches.map(m => m.stage))].sort((a, b) =>
    (STAGE_SORT_KEYS[stageHe(a)] ?? 99) - (STAGE_SORT_KEYS[stageHe(b)] ?? 99)
  );

  const { lockedMatchIds, openMatchCount, guessOpensHintById } = useMemo(() => {
    const pwm = effectiveConfig?.prediction_window_mode === 'days' ? 'days' : 'games';
    const windowGames =
      typeof effectiveConfig?.prediction_window_games === 'number' && effectiveConfig.prediction_window_games >= 1
        ? effectiveConfig.prediction_window_games
        : 5;
    const windowDays =
      typeof effectiveConfig?.prediction_window_days === 'number' && effectiveConfig.prediction_window_days >= 1
        ? effectiveConfig.prediction_window_days
        : 3;

    const ids = new Set();
    const hintById = {};

    const sortedKick = [...matches].sort(
      (a, b) => new Date(a.kickoff_utc || 0).getTime() - new Date(b.kickoff_utc || 0).getTime(),
    );

    const openAmongSorted = sortedKick.filter((m) => m.status === 'open');
    const openSlotById = new Map();
    let oi = 0;
    for (const m of openAmongSorted) {
      oi += 1;
      openSlotById.set(String(m.id), oi);
    }

    if (pwm === 'days') {
      const maxTs = Date.now() + windowDays * 86400000;
      for (const m of matches) {
        if (m.status !== 'open') continue;
        const kickMs = new Date(m.kickoff_utc || 0).getTime();
        if (kickMs > maxTs) {
          ids.add(m.id);
          const opensMs = kickMs - windowDays * 86400000;
          const opensIso = new Date(opensMs).toISOString();
          hintById[m.id] = `הניחוש ייפתח מ־${fmtDayDate(opensIso)} · ${fmtTime(opensIso)} שעון ישראל (חלון ${windowDays} ימים מהיום אל הפתיחה)`;
        }
      }
    } else {
      for (const m of sortedKick) {
        if (m.status !== 'open') continue;
        const slot = openSlotById.get(String(m.id)) ?? 999;
        if (slot > windowGames) {
          ids.add(m.id);
          const ahead = slot - windowGames;
          hintById[m.id] =
            ahead === 1
              ? `ייפתח לניחוש אחרי שמשחק אחד שמוקדם ממך בטור ייסגר (${windowGames} משחקים בחלון)`
              : `ייפתח לניחוש אחר שייסגרו עוד ${ahead} משחקים שמוקדמים ממך בטור (${windowGames} משחקים בחלון)`;
        }
      }
    }

    const omc = matches.filter(m => m.status === 'open' && !ids.has(m.id)).length;
    return { lockedMatchIds: ids, openMatchCount: omc, guessOpensHintById: hintById };
  }, [
    matches,
    effectiveConfig?.prediction_window_mode,
    effectiveConfig?.prediction_window_games,
    effectiveConfig?.prediction_window_days,
  ]);

  const allFiltered = activeStage ? matches.filter(m => m.stage === activeStage) : matches;
  const visibleMatches = useMemo(() => [...allFiltered].sort(compareDisplayMatchOrder), [allFiltered]);

  useEffect(() => {
    setActiveCard((prev) => {
      if (prev == null) return prev;
      const row = matches.find((m) => String(m.id) === String(prev));
      if (!row) return null;
      const pend = !row.home_team || !row.away_team || row.home_team.startsWith('?') || row.away_team.startsWith('?');
      const canGuessNow = row.status === 'open' && !pend && !lockedMatchIds.has(row.id);
      const hasPred = predictions[row.id];
      if (canGuessNow || hasPred || row.status === 'final') return prev;
      return null;
    });
  }, [matches, predictions, lockedMatchIds]);

  function handleScroll() {
    const sc = scrollContainerRef.current;
    if (heroRef.current) {
      setScrolled(heroRef.current.getBoundingClientRect().bottom <= 0);
    }
    if (sc) {
      setShowScrollTopFab(sc.scrollTop > 320);
    }
  }

  function scrollHomeToTop() {
    setActiveCard(null);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleGuessNow() {
    const openUnguessed = visibleMatches.find(m =>
      m.status === 'open' && !lockedMatchIds.has(m.id) && !predictions[m.id]
    );
    const firstOpen = visibleMatches.find(m =>
      m.status === 'open' && !lockedMatchIds.has(m.id)
    );
    const target = openUnguessed || firstOpen;
    if (!target) {
      gamesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (openUnguessed) setActiveCard(target.id);
    setTimeout(() => {
      document.querySelector(`[data-match-id="${target.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  async function handleDeletePrediction(matchId) {
    if (!campaignId || !token) return;
    await callFn('deletePromoPrediction', { token, campaign_id: campaignId, match_id: matchId });
    setPredictions(prev => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  }

  async function handlePredict(matchId, home, away) {
    if (!campaignId || !token) throw new Error('לא מחובר');
    const result = await callFn('upsertPromoPrediction', {
      token, campaign_id: campaignId, match_id: matchId, home_score: home, away_score: away,
    });
    const unlocked = result?.data?.achievements_unlocked ?? result?.achievements_unlocked ?? [];
    if (unlocked.length) setPendingAchievements(prev => [...prev, ...unlocked]);
    await load();
  }

  return (
    <>
    <div className="h-dvh stadium-bg relative" dir="rtl">
      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievement={pendingAchievements[0]}
          onClose={() => setPendingAchievements(prev => prev.slice(1))}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="h-dvh overflow-y-auto pb-[max(12px,env(safe-area-inset-bottom))]"
        onScroll={handleScroll}
      >
        <div style={{ background: 'var(--hm-bg, #100505)' }}>
          <header className="flex items-center justify-between px-4 pt-4 pb-3">
            <button
              onClick={onPersonalArea}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <span className="text-lg leading-none">👤</span>
            </button>
            <div className="flex flex-col items-center leading-none">
              <h1 className="font-black m-0" style={{ fontSize: 22, color: '#fff', textShadow: '0 0 16px rgba(214,58,54,0.4)', letterSpacing: 3 }}>
                HUMON<span style={{ color: 'var(--red)' }}>DIAL</span>
              </h1>
              <span dir="ltr" className="font-black" style={{ fontSize: 14, color: 'var(--gold)', letterSpacing: 4, marginTop: 2 }}>
                2 0 2 6
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ color: 'var(--text-sec)', border: '1px solid rgba(255,255,255,0.15)' }}
            >יציאה</button>
          </header>

          <div ref={heroRef}>
            <HeroCard
              totalPoints={totalPoints}
              pendingBookingPoints={pendingBookingPoints}
              config={config}
              tierFromServer={tierFromLb}
              tierDetail={tierDetailLb}
              onPersonalArea={onPersonalArea}
              onPersonalAreaTier={onPersonalAreaTier}
              scrolled={false}
              openMatchCount={openMatchCount}
              onScrollToGames={handleGuessNow}
              onBranchBooking={onBranchBooking}
              deliveryUrl={effectiveConfig?.delivery_url}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 px-3 mb-1">
            <QuickActionTile icon="🎁" label="הטבות שלי" onClick={onMyQR} scrolled={false} />
            <QuickActionTile icon="🛵" label="קיבלת משלוח?" onClick={openVenueDelivery} scrolled={false} />
            <QuickActionTile icon="📍" label="הגעתי לסניף" onClick={openVenueAtBranch} scrolled={false} />
          </div>

          <StageFilterTabs stages={stages} activeStage={activeStage} onSelect={setActiveStage} />
        </div>

        <div ref={gamesRef} className="p-3">
          {loading && <p className="text-center text-sm mt-8" style={{ color: 'var(--text-sec)' }}>טוען משחקים...</p>}
          {error   && <p className="text-center text-sm mt-8 text-red-400">{error}</p>}
          {!loading && !error && visibleMatches.length === 0 && (
            <p className="text-center text-sm mt-8" style={{ color: 'var(--text-sec)' }}>אין משחקים להצגה</p>
          )}
          {visibleMatches.map((match, idx) => (
            <Fragment key={match.id}>
              {match.status === 'live' && (idx === 0 || visibleMatches[idx - 1]?.status !== 'live') ? (
                <p
                  className="px-1 mb-2 text-right text-xs font-black"
                  style={{ color: '#bae6fd', textShadow: '0 0 12px rgba(56,189,248,0.35)' }}
                >
                  ⚽ עכשיו בשידור חי
                </p>
              ) : null}
              <MatchCard
                match={{ ...match, stage: stageHe(match.stage) }}
                prediction={predictions[match.id] || null}
                config={effectiveConfig}
                windowLocked={lockedMatchIds.has(match.id)}
                predictionWindowOpensHint={guessOpensHintById[match.id]}
                onPredict={handlePredict}
                onDelete={handleDeletePrediction}
                onBranchBooking={onBranchBooking}
                isActive={activeCard === match.id}
                onToggle={() => setActiveCard((prev) => (prev === match.id ? null : match.id))}
              />
            </Fragment>
          ))}
        </div>
      </div>

    </div>
    {scrolled && (
      <div className="fixed top-0 left-0 right-0 z-50 shadow-md" dir="rtl" style={{ background: 'var(--hm-bg, #100505)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <HeroCard
          totalPoints={totalPoints}
          pendingBookingPoints={pendingBookingPoints}
          config={config}
          tierFromServer={tierFromLb}
          tierDetail={tierDetailLb}
          onPersonalArea={onPersonalArea}
          onPersonalAreaTier={onPersonalAreaTier}
          scrolled={true}
          openMatchCount={openMatchCount}
          onScrollToGames={handleGuessNow}
          onBranchBooking={onBranchBooking}
          deliveryUrl={effectiveConfig?.delivery_url}
        />
        <div className="px-4 pt-2 pb-1">
          <h2 className="m-0 text-right text-sm font-black tracking-wide" style={{ color: 'var(--text)' }}>המשחקים</h2>
        </div>
        <StageFilterTabs stages={stages} activeStage={activeStage} onSelect={setActiveStage} />
      </div>
    )}
    {showScrollTopFab ? (
      <button
        type="button"
        aria-label="חזרה להתחלה"
        className="pointer-events-auto fixed z-[60] flex items-center gap-1 rounded-full border px-4 py-2.5 text-xs font-black shadow-xl backdrop-blur-sm transition-opacity active:scale-95 rtl:flex-row-reverse"
        style={{
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          right: 'calc(1rem + env(safe-area-inset-right, 0px))',
          background: 'rgba(214,58,54,0.96)',
          color: '#fff',
          borderColor: 'rgba(255,255,255,0.25)',
          maxWidth: 'calc(100vw - 2rem)',
        }}
        onClick={scrollHomeToTop}
      >
        <span aria-hidden className="text-base leading-none">↑</span>
        <span className="whitespace-nowrap">להתחלה</span>
      </button>
    ) : null}
    </>
  );
}
