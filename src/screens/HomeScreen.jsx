import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { clearToken, getToken } from '../lib/session.js';
import { callFn } from '../lib/api.js';
import { useConfig } from '../contexts/ConfigContext.jsx';

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

function fmtDayDate(utcIso) {
  try {
    const d = new Date(utcIso);
    return `${DAYS_HE[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
  } catch { return ''; }
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
  const delivPts  = config?.delivery_points ?? 80;

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
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-sec)' }}>
          {totalPoints ?? 0} נקודות פעילות
          {(pendingBookingPoints ?? 0) > 0 && (
            <span className="mr-2"> · +{pendingBookingPoints} הזמנת שולחן ממתינות לסריקת קוד</span>
          )}
          . אתה מתחמם.
        </p>
      </div>

      {/* Tier progress */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl leading-none">{tierMedal}</span>
          <button onClick={onPersonalAreaTier} className="text-sm font-bold text-right" style={{ color: 'var(--text)' }}>
            השלב שלי: {tier?.label_he || 'ברונזה'} ↗
          </button>
        </div>
        <div className="relative h-3 rounded-full overflow-visible" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: pct + '%', background: 'linear-gradient(to right, var(--gold), var(--red))' }}
          />
          <span
            className="absolute top-1/2 -translate-y-1/2 text-sm leading-none"
            style={{ left: `calc(${Math.max(2, pct)}% - 10px)` }}
          >⚽</span>
        </div>
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
            <p>🔥 הזמנת שולחן = +{config.table_booking_points} נק׳ (ממתינות עד קוד ביקור יומי)</p>
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
          <button onClick={onBranchBooking} className="hm-btn-secondary py-3 text-xs font-bold flex items-center justify-center gap-1">
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
      <div className="text-2xl leading-none">{icon}</div>
      {!scrolled && (
        <div className="text-[10px] font-bold text-center leading-tight" style={{ color: 'var(--text)' }}>{label}</div>
      )}
      {!scrolled && sub && (
        <div className="text-[10px] font-bold text-center leading-tight" style={{ color: 'var(--gold)' }}>{sub}</div>
      )}
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
  const totalBonus = (config?.participation_points ?? 10) + (config?.outcome_points ?? 15)
    + Math.max(config?.bullseye_points ?? 30, config?.draw_stripe_points ?? 10);

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
          🎯 נחש נכון = +{totalBonus} נקודות בונוס
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

function MatchCard({ match, prediction, config, windowLocked, onPredict, onDelete, onBooking, onVenueCode, isActive, onToggle }) {
  const isPending = !match.home_team || !match.away_team ||
    match.home_team.startsWith('?') || match.away_team.startsWith('?');
  const isOpen    = match.status === 'open' && !isPending && !windowLocked;
  const isLocked  = match.status === 'locked' || windowLocked;
  const isLive    = match.status === 'live';
  const isFinal   = match.status === 'final';
  const hasPrediction = prediction != null;

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

  useEffect(() => {
    if (bullseye) spawnConfetti();
  }, [bullseye]);

  const homeFlag = getFlag(match.home_team, match.home_flag);
  const awayFlag = getFlag(match.away_team, match.away_flag);

  const kickoffTime = match.kickoff_utc ? fmtTime(match.kickoff_utc) : '';
  const lockTime    = match.lock_deadline_utc ? fmtTime(match.lock_deadline_utc) : '';
  const dayDate     = match.kickoff_utc ? fmtDayDate(match.kickoff_utc) : '';

  const resolvedBookingUrl = (match.booking_url_override && String(match.booking_url_override).trim())
    || (config?.booking_url && String(config.booking_url).trim())
    || '';
  const showTableBooking = Boolean(match.broadcasts_in_venues && resolvedBookingUrl);
  const isBroadcastVenue = Boolean(match.broadcasts_in_venues);

  const predLabel = predOutcome === 'home' ? homeFlag : predOutcome === 'away' ? awayFlag : predOutcome === 'draw' ? 'X' : null;

  const statusBadge = isOpen
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(53,210,111,0.15)', color: 'var(--green)', border: '1px solid rgba(53,210,111,0.3)' }}><span>●</span> פתוח</span>
    : isLive
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>⚽ חי</span>
    : isLocked
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>🔒 בקרוב</span>
    : isFinal
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(157,133,133,0.15)', color: 'var(--text-sec)', border: '1px solid rgba(157,133,133,0.3)' }}>✓ סיום</span>
    : !isPending
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(156,163,175,0.15)', color: '#9ca3af', border: '1px solid rgba(156,163,175,0.3)' }}>⏳ בקרוב</span>
    : null;

  const outerCardStyle = isActive
    ? { border: '1px solid rgba(214,58,54,0.45)', boxShadow: '0 0 24px rgba(214,58,54,0.1)' }
    : isBroadcastVenue
      ? {
          border: '1px solid rgba(244,193,93,0.42)',
          boxShadow: '0 0 22px rgba(244,193,93,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
        }
      : {};

  return (
    <div
      data-match-id={match.id}
      className={`hm-card mb-2 overflow-hidden ${isPending ? 'opacity-50' : ''}`}
      style={outerCardStyle}
    >
      <button
        className="w-full text-right p-4"
        onClick={!isPending ? onToggle : undefined}
        disabled={isPending}
      >
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          {statusBadge || <span />}
          <div className="flex flex-row-reverse items-center gap-1.5 flex-wrap justify-end min-w-0">
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
            <span className="text-[11px] text-right whitespace-pre-wrap leading-snug break-words" style={{ color: 'var(--text-sec)' }}>
              {[match.stage, dayDate].filter(Boolean).join(' — ')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <span className="font-black text-base leading-tight" style={{ color: 'var(--text)' }}>
            {match.home_team || '?'} <span className="text-xl">{homeFlag}</span>
          </span>
          <span className="text-xs font-normal px-1" style={{ color: 'var(--text-sec)' }}>vs</span>
          <span className="font-black text-base leading-tight" style={{ color: 'var(--text)' }}>
            <span className="text-xl">{awayFlag}</span> {match.away_team || '?'}
          </span>
        </div>

        {kickoffTime && (
          <div className="text-center text-[11px] mb-2" style={{ color: 'var(--text-sec)' }}>
            {kickoffTime} שעון ישראל
            {lockTime && lockTime !== kickoffTime ? ` • נועל ב-${lockTime}` : ''}
            {isLive && match.live_home_score != null && (
              <span className="font-black text-blue-400 mr-2">
                {' '}{match.live_home_score} : {match.live_away_score}
              </span>
            )}
            {isFinal && (
              <span className="font-black mr-2" style={{ color: 'var(--text)' }}>
                {' '}{match.final_home_score} : {match.final_away_score}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--text-sec)' }}>
              {isActive ? '▲' : '▼'}
              {hasPrediction ? ` ${prediction.home_score}:${prediction.away_score}` : ''}
            </span>
            {predLabel && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-md" style={{ background: 'var(--red)', color: 'var(--text)' }}>
                {predLabel}
              </span>
            )}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-sec)' }}>הבחירה שלך</span>
        </div>
      </button>

      <div style={{ display: 'grid', gridTemplateRows: isActive ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 pb-4 space-y-3">
            {isOpen && (!hasPrediction || editMode) && (
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

            {isOpen && hasPrediction && !editMode && (
              <div className="space-y-2">
                {showPointsFlash && (
                  <div className="rounded-xl px-4 py-2 text-center text-sm font-black"
                       style={{ background: 'rgba(244,193,93,0.15)', border: '1px solid rgba(244,193,93,0.35)', color: 'var(--gold)' }}>
                    🎉 +{config?.participation_points ?? 10} נ׳ נוספו!
                  </div>
                )}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between">
                    {confirmDelete ? (
                      <div className="flex items-center gap-3">
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
                      <div className="flex items-center gap-3">
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-sec)' }}>בחרת:</span>
                      <span className="font-black px-2.5 py-1 rounded-lg text-sm" style={{ background: 'var(--red)', color: 'var(--text)' }}>
                        {predLabel}
                      </span>
                    </div>
                  </div>
                  {prediction.home_score != null && (
                    <div className="text-center text-xs mt-2" style={{ color: 'var(--text-sec)' }}>
                      תוצאה מדויקת: {prediction.home_score} : {prediction.away_score}
                    </div>
                  )}
                </div>
                {showTableBooking ? (
                  <a
                    href={resolvedBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        await onBooking?.(match.id);
                      } catch {
                        /* recordTableBooking may fail if session expired */
                      }
                      window.open(resolvedBookingUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <span className="hm-btn-primary text-xs font-bold px-3 py-2 rounded-lg">הזמן ←</span>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>🗓️ הזמן מקום</div>
                      <div className="text-xs" style={{ color: 'var(--green)' }}>רואים יחד? +{config?.table_booking_points ?? 20} נ׳</div>
                    </div>
                  </a>
                ) : config?.delivery_url ? (
                  <a
                    href={config.delivery_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <span className="hm-btn-primary text-xs font-bold px-3 py-2 rounded-lg">הזמן ←</span>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>🛵 הזמן משלוח!</div>
                      <div className="text-xs" style={{ color: 'var(--green)' }}>וקבל +{config.delivery_points ?? 80} נ׳</div>
                    </div>
                  </a>
                ) : onVenueCode ? (
                  <button
                    onClick={onVenueCode}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <span className="hm-btn-primary text-xs font-bold px-3 py-2 rounded-lg">צבור ←</span>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>📍 הגעת לסניף?</div>
                      <div className="text-xs" style={{ color: 'var(--green)' }}>הזן קוד וצבור נקודות</div>
                    </div>
                  </button>
                ) : null}
              </div>
            )}

            {!isOpen && hasPrediction && (
              <div className="text-center py-2">
                <div className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>הניחוש שלך</div>
                <div className="text-3xl font-black tabular-nums" style={{ color: 'var(--text)' }}>
                  {prediction.home_score} : {prediction.away_score}
                </div>
                {isFinal && bullseye && exactDrawMatch && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--gold)' }}>
                    🤝 תיקו מדויק (+{config?.outcome_points ?? 15} תוצאה +{config?.draw_stripe_points ?? 10} שכבת תיקו)
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

            {!isOpen && !hasPrediction && (
              <p className="text-center text-xs py-2" style={{ color: 'var(--text-sec)' }}>לא שלחת ניחוש למשחק זה</p>
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

function FloatingDock({ config, onScrollToGames, onBranchBooking }) {
  const deliveryUrl = (config?.delivery_url || 'https://humongous.co.il/delivery');
  const outcome = config?.outcome_points ?? 15;
  const bullseye = config?.bullseye_points ?? 30;
  const drawStripe = config?.draw_stripe_points ?? 10;
  const scoringChips = [
    { key: 'outcome', icon: '⚽', label: 'ניחוש', pts: outcome, onClick: onScrollToGames },
    { key: 'bullseye', icon: '🎯', label: 'ניחוש מדויק', pts: bullseye, onClick: onScrollToGames },
    { key: 'draw', icon: '🤝', label: 'תיקו מדויק', pts: drawStripe, onClick: onScrollToGames },
  ];
  const venueItems = [
    { icon: '🍽️', label: 'שולחן', pts: config?.table_booking_points ?? 20, onClick: onBranchBooking },
    { icon: '🛵', label: 'משלוח', pts: config?.delivery_points ?? 80, href: deliveryUrl },
  ];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto"
      dir="rtl"
      style={{
        background: 'rgba(16,5,5,0.92)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(255,255,255,0.09)',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex gap-2 overflow-x-auto px-3 pt-2 pb-1" style={{ scrollbarWidth: 'thin' }}>
        {scoringChips.map(c => (
          <button
            key={c.key}
            type="button"
            onClick={c.onClick}
            className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[4.75rem] text-right"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <span className="text-xl leading-none" aria-hidden>{c.icon}</span>
            <span className="text-[10px] font-bold leading-tight" style={{ color: 'var(--text)' }}>{c.label}</span>
            <span className="text-[10px] font-black" style={{ color: 'var(--gold)' }}>+{c.pts} נ׳</span>
          </button>
        ))}
      </div>
      <div className="flex items-stretch justify-around px-2 pb-2 pt-1">
        {venueItems.map(item => {
          const inner = (
            <div className="flex flex-col items-center gap-0.5 py-1 cursor-pointer" onClick={item.onClick}>
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-bold" style={{ color: 'var(--text)' }}>{item.label}</span>
              <span className="text-[10px] font-bold" style={{ color: 'var(--gold)' }}>+{item.pts} נ׳</span>
            </div>
          );
          return item.href
            ? <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center">{inner}</a>
            : <div key={item.label} className="flex-1 flex justify-center">{inner}</div>;
        })}
      </div>
    </div>
  );
}

export default function HomeScreen({ playerId, onLogout, onPersonalArea, onPersonalAreaTier, onVenueCode, onMyQR, onLeaderboard, onBranchBooking }) {
  const config = useConfig();
  const effectiveConfig = config ? {
    ...config,
    booking_url: config.booking_url || 'https://humongous.co.il/book',
    delivery_url: config.delivery_url || 'https://humongous.co.il/delivery',
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

  const token = getToken();
  const campaignId = config?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [matchesRes, predsRes] = await Promise.all([
        callFn('listMatches', {}),
        campaignId && token
          ? callFn('listMyPredictions', { token, campaign_id: campaignId })
          : Promise.resolve({ predictions: [] }),
      ]);
      setMatches(matchesRes.matches || []);
      const predMap = {};
      for (const p of (predsRes.predictions || [])) predMap[p.match_id] = p;
      setPredictions(predMap);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
    if (campaignId && token) {
      callFn('getLeaderboard', { campaign_id: campaignId, token })
        .then(lbRes => {
          const d = lbRes?.data ?? lbRes;
          if (d?.me?.total_points != null) setTotalPoints(d.me.total_points);
          setPendingBookingPoints(d?.me?.pending_table_booking_points ?? 0);
          setTierDetailLb(d?.me?.tier_detail ?? null);
          setTierFromLb(d?.me?.tier ?? null);
        })
        .catch(() => {});
    }
  }, [campaignId, token]);

  useEffect(() => { load(); }, [load]);

  const stages = [...new Set(matches.map(m => m.stage))].sort((a, b) =>
    (STAGE_SORT_KEYS[stageHe(a)] ?? 99) - (STAGE_SORT_KEYS[stageHe(b)] ?? 99)
  );

  const { lockedMatchIds, openMatchCount } = useMemo(() => {
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
    if (pwm === 'days') {
      const maxTs = Date.now() + windowDays * 86400000;
      for (const m of matches) {
        if (m.status !== 'open') continue;
        if (new Date(m.kickoff_utc).getTime() > maxTs) ids.add(m.id);
      }
    } else {
      const sorted = [...matches].sort(
        (a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime(),
      );
      let openCount = 0;
      for (const m of sorted) {
        if (m.status !== 'open') continue;
        openCount++;
        if (openCount > windowGames) ids.add(m.id);
      }
    }

    const omc = matches.filter(m => m.status === 'open' && !ids.has(m.id)).length;
    return { lockedMatchIds: ids, openMatchCount: omc };
  }, [
    matches,
    effectiveConfig?.prediction_window_mode,
    effectiveConfig?.prediction_window_games,
    effectiveConfig?.prediction_window_days,
  ]);

  const allFiltered = activeStage ? matches.filter(m => m.stage === activeStage) : matches;
  const visibleMatches = allFiltered;

  function handleScroll() {
    if (!heroRef.current) return;
    setScrolled(heroRef.current.getBoundingClientRect().bottom <= 0);
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

  async function handleBooking(matchId) {
    if (!campaignId || !token) return;
    try {
      const payload = { token, campaign_id: campaignId };
      if (matchId) payload.match_id = matchId;
      const result = await callFn('recordTableBooking', payload);
      const unlocked = result?.data?.achievements_unlocked ?? result?.achievements_unlocked ?? [];
      if (unlocked.length) setPendingAchievements(prev => [...prev, ...unlocked]);
      const r = await callFn('getLeaderboard', { campaign_id: campaignId, token });
      const d = r?.data ?? r;
      if (d?.me?.total_points != null) setTotalPoints(d.me.total_points);
      setPendingBookingPoints(d?.me?.pending_table_booking_points ?? 0);
      setTierDetailLb(d?.me?.tier_detail ?? null);
      setTierFromLb(d?.me?.tier ?? null);
    } catch {
    }
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
        className="h-dvh overflow-y-auto pb-32"
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
            <QuickActionTile icon="🏆" label="דירוג" onClick={onLeaderboard} scrolled={false} />
            <QuickActionTile icon="🛵" label="קיבלת משלוח?" onClick={() => onVenueCode('delivery')} scrolled={false} />
          </div>

          <StageFilterTabs stages={stages} activeStage={activeStage} onSelect={setActiveStage} />
        </div>

        <div ref={gamesRef} className="p-3">
          {loading && <p className="text-center text-sm mt-8" style={{ color: 'var(--text-sec)' }}>טוען משחקים...</p>}
          {error   && <p className="text-center text-sm mt-8 text-red-400">{error}</p>}
          {!loading && !error && visibleMatches.length === 0 && (
            <p className="text-center text-sm mt-8" style={{ color: 'var(--text-sec)' }}>אין משחקים להצגה</p>
          )}
          {visibleMatches.map(match => (
            <MatchCard
              key={match.id}
              match={{ ...match, stage: stageHe(match.stage) }}
              prediction={predictions[match.id] || null}
              config={effectiveConfig}
              windowLocked={lockedMatchIds.has(match.id)}
              onPredict={handlePredict}
              onDelete={handleDeletePrediction}
              onBooking={handleBooking}
              onVenueCode={onVenueCode}
              isActive={activeCard === match.id}
              onToggle={() => setActiveCard(prev => (prev === match.id ? null : match.id))}
            />
          ))}
        </div>
      </div>

    </div>
    {scrolled && (
      <div className="fixed top-0 left-0 right-0 z-50" dir="rtl" style={{ background: 'var(--hm-bg, #100505)' }}>
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
        <div className="grid grid-cols-3 gap-2 px-3 mb-1">
          <QuickActionTile icon="🎁" label="הטבות שלי" onClick={onMyQR} scrolled={true} />
          <QuickActionTile icon="🏆" label="דירוג" onClick={onLeaderboard} scrolled={true} />
          <QuickActionTile icon="🛵" label="קיבלת משלוח?" onClick={() => onVenueCode('delivery')} scrolled={true} />
        </div>
        <StageFilterTabs stages={stages} activeStage={activeStage} onSelect={setActiveStage} />
      </div>
    )}
    <FloatingDock
      config={effectiveConfig}
      onScrollToGames={handleGuessNow}
      onBranchBooking={onBranchBooking}
    />
    </>
  );
}
