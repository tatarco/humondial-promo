import { useState, useEffect, useCallback, useRef } from 'react';
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

function HeroCard({ totalPoints, config, onPersonalArea, onPersonalAreaTier, scrolled, openMatchCount, onScrollToGames, onBranchBooking }) {
  const tier      = getTier(config, totalPoints);
  const nextTier  = getNextTier(config, totalPoints);
  const ptsToNext = nextTier ? nextTier.min_points - totalPoints : 0;
  const pct       = nextTier ? Math.min(100, Math.round((totalPoints / nextTier.min_points) * 100)) : 100;
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
      className="hm-card mb-3 mx-3 overflow-hidden"
      style={{ border: '1px solid rgba(244,193,93,0.45)', boxShadow: '0 0 40px rgba(244,193,93,0.14), 0 0 80px rgba(214,58,54,0.18)' }}
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
          {totalPoints ?? 0} נקודות. אתה מתחמם.
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
          {nextTier && (
            <span className="text-xs text-right" style={{ color: 'var(--text-sec)' }}>
              עוד {ptsToNext} נקודות ואתה עולה ל{nextTier.label_he}
            </span>
          )}
        </div>
      </div>

      {/* Today's Snapshot */}
      <div className="mx-5 mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-bold mb-2 text-right" style={{ color: 'var(--gold)' }}>Today's Snapshot</p>
        <div className="space-y-1.5 text-sm text-right" style={{ color: 'var(--text)' }}>
          {openMatchCount > 0 && <p>⚽ {openMatchCount} משחקים פתוחים לניחוש</p>}
          {(config?.table_booking_points ?? 0) > 0 && <p>🔥 הזמנת שולחן = +{config.table_booking_points} נקודות</p>}
          <p>🍔 צפייה ביומנגס = {delivPts}+ נקודות</p>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-3" dir="rtl">
        <button onClick={onScrollToGames} className="hm-btn-primary py-3 text-sm font-black">
          נחש עכשיו ←
        </button>
        <button onClick={onBranchBooking} className="hm-btn-secondary py-3 text-sm font-bold flex items-center justify-center gap-1.5">
          📅 שמור לי שולחן
        </button>
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
  const totalBonus = (config?.participation_points ?? 10) + (config?.outcome_points ?? 30) + (config?.bullseye_points ?? 60);

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

function MatchCard({ match, prediction, config, windowLocked, onPredict, onBooking, onVenueCode, isActive, onToggle }) {
  const isPending = !match.home_team || !match.away_team ||
    match.home_team.startsWith('?') || match.away_team.startsWith('?');
  const isOpen    = match.status === 'open' && !isPending && !windowLocked;
  const isLocked  = match.status === 'locked' || windowLocked;
  const isLive    = match.status === 'live';
  const isFinal   = match.status === 'final';
  const hasPrediction = prediction != null;

  const [editMode, setEditMode] = useState(false);
  const [showPointsFlash, setShowPointsFlash] = useState(false);
  const flashTimer = useRef(null);
  const prevActive = useRef(isActive);
  useEffect(() => {
    if (prevActive.current && !isActive) {
      setEditMode(false);
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
  const correctOutcome = predOutcome && actualOutcome && predOutcome === actualOutcome;

  useEffect(() => {
    if (bullseye) spawnConfetti();
  }, [bullseye]);

  const homeFlag = getFlag(match.home_team, match.home_flag);
  const awayFlag = getFlag(match.away_team, match.away_flag);

  const kickoffTime = match.kickoff_utc ? fmtTime(match.kickoff_utc) : '';
  const lockTime    = match.lock_deadline_utc ? fmtTime(match.lock_deadline_utc) : '';
  const dayDate     = match.kickoff_utc ? fmtDayDate(match.kickoff_utc) : '';

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

  return (
    <div
      className={`hm-card mb-2 overflow-hidden ${isPending ? 'opacity-50' : ''}`}
      style={isActive ? { border: '1px solid rgba(214,58,54,0.45)', boxShadow: '0 0 24px rgba(214,58,54,0.1)' } : {}}
    >
      <button
        className="w-full text-right p-4"
        onClick={!isPending ? onToggle : undefined}
        disabled={isPending}
      >
        <div className="flex items-center justify-between mb-2">
          {statusBadge || <span />}
          <span className="text-[11px]" style={{ color: 'var(--text-sec)' }}>
            {[match.stage, dayDate].filter(Boolean).join(' — ')}
          </span>
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
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-xs underline"
                      style={{ color: 'var(--text-sec)' }}
                    >
                      שנה בחירה
                    </button>
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
                {config?.booking_url ? (
                  <a
                    href={config.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onBooking(match.id)}
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
                {isFinal && bullseye && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--gold)' }}>🎯 בולסאי! +{config?.bullseye_points ?? 60}</div>
                )}
                {isFinal && !bullseye && correctOutcome && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--green)' }}>✓ ניחוש נכון! +{config?.outcome_points ?? 30}</div>
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
  const effectiveCfg = config ? {
    ...config,
    delivery_url: config.delivery_url || 'https://humongous.co.il/delivery',
  } : config;
  const items = [
    { icon: '⚽', label: 'ניחוש', pts: config?.outcome_points ?? 30, onClick: onScrollToGames },
    { icon: '🍽️', label: 'שולחן', pts: config?.table_booking_points ?? 20, onClick: onBranchBooking },
    { icon: '🛵', label: 'משלוח', pts: config?.delivery_points ?? 80, href: effectiveCfg?.delivery_url },
  ];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(16,5,5,0.9)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(255,255,255,0.09)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch justify-around px-2 py-2 max-w-lg mx-auto" dir="rtl">
        {items.map(item => {
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
        })
        .catch(() => {});
    }
  }, [campaignId, token]);

  useEffect(() => { load(); }, [load]);

  const stages = [...new Set(matches.map(m => m.stage))].sort((a, b) =>
    (STAGE_SORT_KEYS[stageHe(a)] ?? 99) - (STAGE_SORT_KEYS[stageHe(b)] ?? 99)
  );
  const windowGames = effectiveConfig?.prediction_window_games ?? 5;
  const allFiltered = activeStage ? matches.filter(m => m.stage === activeStage) : matches;
  const lockedMatchIds = (() => {
    let openCount = 0;
    const ids = new Set();
    allFiltered.forEach(m => {
      if (m.status !== 'open') return;
      openCount++;
      if (openCount > windowGames) ids.add(m.id);
    });
    return ids;
  })();
  const openMatchCount = matches.filter(m => m.status === 'open' && !lockedMatchIds.has(m.id)).length;
  const visibleMatches = allFiltered;

  function handleScroll() {
    if (!heroRef.current) return;
    setScrolled(heroRef.current.getBoundingClientRect().bottom <= 0);
  }

  function scrollToGames() {
    if (gamesRef.current) {
      gamesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  function handleBooking(matchId) {
    if (!campaignId || !token) return;
    callFn('recordTableBooking', { token, campaign_id: campaignId, match_id: matchId })
      .then(result => {
        const unlocked = result?.data?.achievements_unlocked ?? result?.achievements_unlocked ?? [];
        if (unlocked.length) setPendingAchievements(prev => [...prev, ...unlocked]);
      })
      .catch(() => {});
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
        className="h-dvh overflow-y-auto pb-20"
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
            <div className="flex flex-col items-center gap-0.5">
              <img src="/assets/humondial-logo.png" alt="HUMONDIAL" style={{ width: 148, height: 'auto' }} />
              <img src="/assets/year-2026.png" alt="2026" style={{ width: 64, height: 'auto', marginTop: -6 }} />
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
              config={config}
              onPersonalArea={onPersonalArea}
              onPersonalAreaTier={onPersonalAreaTier}
              scrolled={false}
              openMatchCount={openMatchCount}
              onScrollToGames={scrollToGames}
              onBranchBooking={onBranchBooking}
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
              onBooking={handleBooking}
              onVenueCode={onVenueCode}
              isActive={activeCard === match.id}
              onToggle={() => setActiveCard(prev => (prev === match.id ? null : match.id))}
            />
          ))}
        </div>
      </div>

    </div>
    <FloatingDock config={config} onScrollToGames={scrollToGames} onBranchBooking={onBranchBooking} />
    {scrolled && (
      <div className="fixed top-0 left-0 right-0 z-50" dir="rtl" style={{ background: 'var(--hm-bg, #100505)' }}>
        <HeroCard
          totalPoints={totalPoints}
          config={config}
          onPersonalArea={onPersonalArea}
          onPersonalAreaTier={onPersonalAreaTier}
          scrolled={true}
          openMatchCount={openMatchCount}
          onScrollToGames={scrollToGames}
          onBranchBooking={onBranchBooking}
        />
        <div className="grid grid-cols-3 gap-2 px-3 mb-1">
          <QuickActionTile icon="🎁" label="הטבות שלי" onClick={onMyQR} scrolled={true} />
          <QuickActionTile icon="🏆" label="דירוג" onClick={onLeaderboard} scrolled={true} />
          <QuickActionTile icon="🛵" label="קיבלת משלוח?" onClick={() => onVenueCode('delivery')} scrolled={true} />
        </div>
        <StageFilterTabs stages={stages} activeStage={activeStage} onSelect={setActiveStage} />
      </div>
    )}
    </>
  );
}
