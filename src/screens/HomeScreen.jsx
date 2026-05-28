import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { clearToken, getToken } from '../lib/session.js';
import { callFn } from '../lib/api.js';
import { PROMO_CAMPAIGN_ID } from '../lib/config.js';
import { takeListMatchesWarm } from '../lib/warmListMatches.js';
import { takeHomeAuthenticatedWarm } from '../lib/warmHomeAuthenticated.js';
import { useConfig } from '../contexts/ConfigContext.jsx';
import { mapPromoError } from '../lib/promoErrors.js';
import TierIcon from '../components/TierIcon.jsx';
import { tierHeadlineResolvedLabel, nextTierLabelForProgress } from '../lib/tierCampaignMerge.js';
import { matchPhasePrimary, matchPhaseSecondary } from '../lib/matchPhaseLines.js';
import TierRequirementBars from '../components/TierRequirementBars.jsx';
import { normalizeBenefitsPlayerCopy } from '../lib/benefitsPlayerCopy.js';
import ShareModal from '../components/ShareModal.jsx';
import AchievementModal from '../components/AchievementModal.jsx';

function leaderboardSnapshotKey(cid) {
  return `hm_leaderboard_snap_v1:${cid}`;
}

const STAGE_HE = {
  'group': 'שלב הבתים', 'Group Stage': 'שלב הבתים',
  'Group Stage - 1': 'שלב הבתים 1', 'Group Stage - 2': 'שלב הבתים 2', 'Group Stage - 3': 'שלב הבתים 3',
  'Round of 32': 'שלב 32', 'round of 32': 'שלב 32',
  'Round of 16': 'שמינית גמר', 'round of 16': 'שמינית גמר',
  'Quarter Final': 'רבע גמר', 'quarter final': 'רבע גמר', 'Quarter-finals': 'רבע גמר', 'quarter-finals': 'רבע גמר',
  'Semi Final': 'חצי גמר', 'semi final': 'חצי גמר', 'Semi-finals': 'חצי גמר', 'semi-finals': 'חצי גמר',
  '3rd Place Final': 'גמר שלישית', '3rd place final': 'גמר שלישית',
  'Final': 'גמר', 'final': 'גמר',
};
function stageHe(s) { return STAGE_HE[s] || s; }

const STAGE_SORT_KEYS = {
  'שלב הבתים': 0, 'שלב הבתים 1': 0, 'שלב הבתים 2': 0, 'שלב הבתים 3': 0,
  'שלב 32': 1, 'שמינית גמר': 2, 'רבע גמר': 3, 'חצי גמר': 4, 'גמר שלישית': 5, 'גמר': 6,
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

// Derives a flagcdn-compatible code from a flag emoji via Unicode regional indicators.
// Handles England/Scotland/Wales subdivision flags explicitly.
function emojiToFlagCode(emoji) {
  if (!emoji) return '';
  const SUBDIV = { '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'gb-eng', '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'gb-sct', '🏴󠁧󠁢󠁷󠁬󠁳󠁿': 'gb-wls' };
  if (SUBDIV[emoji]) return SUBDIV[emoji];
  const chars = [...emoji];
  if (chars.length < 2) return '';
  const a = chars[0].codePointAt(0);
  const b = chars[1].codePointAt(0);
  if (a >= 0x1F1E6 && a <= 0x1F1FF && b >= 0x1F1E6 && b <= 0x1F1FF) {
    return String.fromCharCode(a - 0x1F1E6 + 65) + String.fromCharCode(b - 0x1F1E6 + 65);
  }
  return '';
}

function TeamFlagGraphic({ match, side, parts, variant = 'inline' }) {
  const emoji = getFlag(parts?.clean, side === 'home' ? match?.home_flag : match?.away_flag);
  const rawCode = side === 'home' ? match?.home_country_code : match?.away_country_code;
  const code = (typeof rawCode === 'string' && /^[A-Z]{2}$/i.test(rawCode.trim()))
    ? rawCode.trim().toUpperCase()
    : emojiToFlagCode(emoji);
  if (variant === 'grid') {
    if (/^[A-Z]{2}$/.test(code)) {
      return (
        <div className="flex flex-col items-center gap-1">
          <img
            src={`https://flagcdn.com/w160/${code.toLowerCase()}.png`}
            alt="" width={64} height={40}
            className="rounded-md object-cover border border-white/20 shadow"
            loading="lazy" decoding="async"
          />
          <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'rgba(246,236,237,0.45)' }}>{code}</span>
        </div>
      );
    }
    return <span className="text-3xl leading-none select-none">{emoji}</span>;
  }
  const w = variant === 'picker' ? 44 : 24;
  const h = variant === 'picker' ? 33 : 18;
  if (/^[A-Z]{2}$/.test(code)) {
    return (
      <img
        src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
        alt="" width={w} height={h}
        className={variant === 'picker' ? 'rounded object-cover border border-white/25 shadow-sm' : 'rounded object-cover border border-white/20'}
        loading="lazy" decoding="async"
      />
    );
  }
  return (
    <span className={variant === 'picker' ? 'text-3xl leading-none select-none' : 'text-xl leading-none select-none'}>
      {emoji}
    </span>
  );
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

function isQuickOutcomeLine(predOutcome, hs, aw) {
  if (!predOutcome) return false;
  if (predOutcome === 'home') return hs === 1 && aw === 0;
  if (predOutcome === 'away') return hs === 0 && aw === 1;
  if (predOutcome === 'draw') return hs === 0 && aw === 0;
  return false;
}

function outcomeHeadline(predOutcome) {
  if (predOutcome === 'draw') return 'תיקו בהגשה';
  if (predOutcome === 'home') return 'ניצחון בית בהגשה';
  if (predOutcome === 'away') return 'ניצחון חוץ בהגשה';
  return '';
}

function PredictionGuessLayers({
  prediction,
  predOutcome,
  homeFlag,
  awayFlag,
  size = 'sm',
  layout = 'stack',
  bullseyeMaxPts = null,
}) {
  if (
    !prediction ||
    prediction.home_score == null ||
    prediction.away_score == null ||
    typeof prediction.home_score !== 'number' ||
    typeof prediction.away_score !== 'number'
  ) return null;

  const hs = prediction.home_score;
  const aw = prediction.away_score;
  const fzFlag = size === 'lg' ? 'text-[1.75rem] leading-none' : size === 'sm' ? 'text-[1rem] leading-none' : 'text-[1.125rem] leading-none';
  const fzNum = size === 'lg' ? 'text-xl' : 'text-sm';

  let ringHome = 'opacity-[0.86] scale-95';
  let ringAway = 'opacity-[0.86] scale-95';
  if (predOutcome === 'home') {
    ringHome = 'brightness-110 drop-shadow-[0_0_10px_rgba(244,193,93,0.45)] scale-110';
  } else if (predOutcome === 'away') {
    ringAway = 'brightness-110 drop-shadow-[0_0_10px_rgba(244,193,93,0.45)] scale-110';
  } else if (predOutcome === 'draw') {
    ringHome = 'brightness-105 scale-105 opacity-95';
    ringAway = 'brightness-105 scale-105 opacity-95';
  }

  const quickLine = isQuickOutcomeLine(predOutcome, hs, aw);
  const head = outcomeHeadline(predOutcome);

  const scoreRow = (
    <span
      lang="und"
      className={`hm-match-score-ltr inline-flex flex-row items-center justify-center gap-1.5 tabular-nums font-black rounded-lg px-2 py-0.5 ${fzNum}`}
      style={{
        background: predOutcome === 'draw' ? 'rgba(244,193,93,0.14)' : 'rgba(244,193,93,0.08)',
        color: 'var(--text)',
        border: '1px solid rgba(244,193,93,0.28)',
      }}
    >
      <span className={`shrink-0 select-none transition-transform duration-150 ${fzFlag} ${ringAway}`} aria-hidden>
        {awayFlag}
      </span>
      <span className="opacity-95">{aw}</span>
      <span className="font-bold opacity-45 text-[12px]" aria-hidden>
        −
      </span>
      <span className="opacity-95">{hs}</span>
      <span className={`shrink-0 select-none transition-transform duration-150 ${fzFlag} ${ringHome}`} aria-hidden>
        {homeFlag}
      </span>
    </span>
  );

  const outcomeFaces = predOutcome === 'draw' ? (
    <span className="inline-flex flex-row-reverse items-center gap-1 justify-center py-1" dir="rtl">
      <span className={`text-[length:clamp(1.25rem,3.5vw,1.85rem)] leading-none ${ringHome}`} aria-hidden>{homeFlag}</span>
      <span className="text-[11px] font-black opacity-60 px-1" aria-hidden>↔</span>
      <span className={`text-[length:clamp(1.25rem,3.5vw,1.85rem)] leading-none ${ringAway}`} aria-hidden>{awayFlag}</span>
    </span>
  ) : predOutcome === 'home' ? (
    <span className={`inline-block text-[length:clamp(1.35rem,3.8vw,2rem)] leading-none py-1 ${ringHome}`} aria-hidden>{homeFlag}</span>
  ) : predOutcome === 'away' ? (
    <span className={`inline-block text-[length:clamp(1.35rem,3.8vw,2rem)] leading-none py-1 ${ringAway}`} aria-hidden>{awayFlag}</span>
  ) : null;

  const outcomeBlock =
    layout === 'ribbon' ? (
      <div
        dir="rtl"
        className="inline-flex max-w-full min-w-0 shrink flex-row-reverse flex-nowrap items-center gap-2 rounded-lg px-2 py-1.5"
        style={{ background: 'rgba(53,210,111,0.12)', border: '1px solid rgba(53,210,111,0.32)' }}
      >
        <span className="shrink-0 leading-none">{outcomeFaces}</span>
        {head ? (
          <span
            className="min-w-0 shrink text-right text-[11px] font-extrabold leading-tight tracking-tight text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.42)', maxWidth: '11rem' }}
            title={head}
          >
            {head}
          </span>
        ) : null}
      </div>
    ) : (
      <div
        dir="rtl"
        className="flex flex-col items-center gap-1.5 text-center rounded-xl px-3 py-2 w-full max-w-[20rem]"
        style={{ background: 'rgba(53,210,111,0.1)', border: '1px solid rgba(53,210,111,0.28)' }}
      >
        <div className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'rgba(246,252,247,0.85)' }}>
          מנצח / תיקו
        </div>
        <div className="text-[12px] font-extrabold leading-tight" style={{ color: 'var(--text)' }}>
          {head}
        </div>
        {outcomeFaces}
      </div>
    );

  const bullseyeBlock =
    layout === 'ribbon' ? null : (
      <div
        dir="rtl"
        className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 w-full max-w-[20rem]"
        style={{ background: 'rgba(244,193,93,0.08)', border: '1px solid rgba(244,193,93,0.35)' }}
      >
        <div className="text-[10px] font-black whitespace-nowrap" style={{ color: '#fbbf24' }}>
          🎯 ניסיון בינגו (ציון מדויק)
        </div>
        {scoreRow}
        {typeof bullseyeMaxPts === 'number' && bullseyeMaxPts > 0 ? (
          <p className="text-[10px] leading-snug text-center m-0 px-0.5" style={{ color: 'var(--hm-match-grass-label)' }}>
            אם הסיום בדיוק בשורת הציון — עד +{bullseyeMaxPts}&nbsp;נ׳ בונוס בינגו, לצד ההצטרפות והכללים בקמפיין (ובונוס תיקו כשמתאים).
          </p>
        ) : null}
        <p className={`text-[10px] leading-snug text-center m-0 px-0.5 ${quickLine ? '' : 'opacity-90'}`} style={{ color: 'rgba(255,255,255,0.86)', textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
          {quickLine
            ? 'ציון בסיס מתוך הלחיצה במחוון המנצח — עדכנו את הציון בעריכת ניחוש אם מתכוונים לליין אחר פגיעה.'
            : 'הציון שמעלה מכוון לבינגו; מתחת — איזה מנצח או תיקו נקבע במחוון.'}
        </p>
      </div>
    );

  if (layout === 'ribbon') {
    return outcomeBlock;
  }

  return (
    <div dir="rtl" className="flex flex-col items-center gap-2 w-full">
      {bullseyeBlock}
      <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--hm-match-grass-label)', textShadow: '0 1px 2px rgba(0,0,0,0.4)', opacity: 0.94 }}>
        מתחת: בחירת מנצח / תיקו
      </div>
      {outcomeBlock}
    </div>
  );
}

function compareDisplayMatchOrder(a, b) {
  const ra = DISPLAY_MATCH_ORDER[a?.status] ?? 99;
  const rb = DISPLAY_MATCH_ORDER[b?.status] ?? 99;
  if (ra !== rb) return ra - rb;
  return new Date(a?.kickoff_utc || 0).getTime() - new Date(b?.kickoff_utc || 0).getTime();
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

function HeroCardSkeleton() {
  return (
    <div
      className="hm-card mb-3 mx-3 overflow-hidden animate-pulse px-5 py-8"
      style={{ border: '1px solid rgba(244,193,93,0.25)' }}
    >
      <div className="h-7 rounded mb-6 mr-auto w-4/5" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-14 rounded mb-3 mr-auto w-3/5" style={{ background: 'rgba(255,255,255,0.1)' }} />
      <div className="h-3 rounded-full mb-4 w-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-16 rounded-xl w-full mb-6" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="h-11 rounded-2xl w-full" style={{ background: 'rgba(214,58,54,0.25)' }} />
    </div>
  );
}

function HeroCard({
  totalPoints,
  pendingBookingPoints,
  config,
  onPersonalArea,
  onPersonalAreaTier,
  openMatchCount,
  onScrollToGames,
  onBranchBooking,
  tierFromServer,
  tierDetail,
}) {
  const tp = typeof totalPoints === 'number' ? totalPoints : null;

  const commercialUi = !!(tierDetail?.show_commercial_requirements_ui && tierDetail?.requirements_for_next?.length);

  const nextT = tierDetail?.next_tier;
  const effT = tierDetail?.effective_tier;
  const bandMin = typeof effT?.min_points === 'number' ? effT.min_points : (typeof tierFromServer?.min_points === 'number' ? tierFromServer.min_points : 0);
  const bandMaxRaw = typeof nextT?.min_points === 'number' ? nextT.min_points : bandMin;

  let pct = 100;
  if (commercialUi && tierDetail?.requirements_for_next?.length) {
    const reqs = tierDetail.requirements_for_next.filter((x) => x.required > 0);
    if (reqs.length) {
      const fracs = reqs.map(r => Math.min(1, r.required > 0 ? r.current / r.required : 1));
      pct = Math.round((fracs.reduce((a, b) => a + b, 0) / fracs.length) * 100);
    }
  } else if (nextT && tp != null && bandMaxRaw > bandMin) {
    pct = Math.min(100, Math.max(0, Math.round(((tp - bandMin) / (bandMaxRaw - bandMin)) * 100)));
  } else if (!nextT) {
    pct = 100;
  } else {
    pct = 0;
  }

  const tiers = Array.isArray(config?.tiers) ? config.tiers : [];
  const tierDisplayLabel =
    tierHeadlineResolvedLabel(tierFromServer, tierDetail, tiers);

  let nextLabel = '';
  if (nextT) {
    nextLabel = nextTierLabelForProgress(nextT, tiers)
      || (typeof nextT.label_he === 'string' ? nextT.label_he.trim() : '');
  }

  const ptsToNextPlain = nextT && tp != null ? nextT.min_points - tp : 0;

  const delivPts = config.delivery_points;

  return (
    <div
      className="hm-card mb-3 mx-3 overflow-hidden cursor-pointer"
      style={{ border: '1px solid rgba(244,193,93,0.45)', boxShadow: '0 0 40px rgba(244,193,93,0.14), 0 0 80px rgba(214,58,54,0.18)' }}
      onClick={onPersonalArea}
    >
      <div dir="ltr" className="flex flex-row gap-3 items-start px-5 pt-5 pb-2">
        <TierIcon
          tierLike={tierFromServer}
          sizePx={118}
          className="hm-tier-hero-shell--elevated shrink-0"
        />
        <div dir="rtl" className="flex-1 min-w-0 text-right pt-0.5">
          <span className="block text-[1.25rem] leading-none mb-1.5 opacity-95" style={{ color: 'var(--red)' }} aria-hidden>❝</span>
          <p className="text-lg font-black leading-snug" style={{ color: 'var(--text)' }}>
            פה לא רק רואים מונדיאל — פה משחקים אותו.
          </p>
          <div className="flex items-baseline gap-2 justify-end flex-wrap mt-3">
            <span className="text-[42px] font-black tabular-nums leading-none" style={{ color: 'var(--gold)' }}>
              {tp === null ? '…' : tp}
            </span>
            <span className="text-2xl font-black" style={{ color: 'var(--gold)' }}>נקודות</span>
          </div>
          {tp !== null && (
            <p className="text-[11px] mt-1 leading-relaxed max-w-[20rem] mr-0 ml-auto" style={{ color: 'var(--text-sec)' }}>
              <span className="font-bold" style={{ color: 'var(--text)' }}>{tp}</span>
              {' '}נקודות מאושרות — אלה נספרות בדירוג ובדרגה.
            </p>
          )}
          {typeof pendingBookingPoints === 'number' && pendingBookingPoints > 0 && (
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
      </div>

      {/* Tier progress */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <TierIcon tierLike={tierFromServer} sizePx={26} className="hm-tier-hero-shell--dense" />
            <button onClick={onPersonalAreaTier} className="text-sm font-bold text-right" style={{ color: 'var(--text)' }}>
            השלב שלי: {tierDisplayLabel || '—'} ↗
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
          ) : nextT && ptsToNextPlain > 0 && tp !== null ? (
            <span className="text-xs text-right" style={{ color: 'var(--text-sec)' }}>
              עוד {ptsToNextPlain} נקודות מאושרות ל{nextLabel || nextT.label_he || 'השלב הבא'}
            </span>
          ) : null}
        </div>
        {commercialUi && (
          <div className="mt-3 px-1" style={{ color: 'var(--text-sec)' }}>
            {tierDetail?.summary_lines_he?.length > 0 && (
              <div className="space-y-1 text-[10px] text-right">
                {tierDetail.summary_lines_he.slice(0, 3).map((line, i) => (
                  <p key={i} style={{ margin: '2px 0', lineHeight: 1.35 }}>{line}</p>
                ))}
              </div>
            )}
            {tierDetail?.requirements_for_next?.length > 0 && (
              <div
                className="rounded-lg space-y-1 p-2"
                style={{
                  marginTop: tierDetail?.summary_lines_he?.length > 0 ? 8 : 0,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div className="text-[9px] font-bold mb-0.5 text-right" style={{ color: 'var(--gold)' }}>
                  התקדמות לכל דרישה ל{nextLabel || tierDetail?.next_tier?.label_he || 'שלב הבא'}
                </div>
                <TierRequirementBars requirements={tierDetail.requirements_for_next} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's Snapshot */}
      <div className="mx-5 mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-bold mb-2 text-right" style={{ color: 'var(--gold)' }}>מבט מהיר להיום</p>
        <div className="space-y-1.5 text-sm text-right" style={{ color: 'var(--text)' }}>
          {openMatchCount > 0 && <p>⚽ {openMatchCount} משחקים פתוחים לניחוש</p>}
          {config.table_booking_points > 0 && (
            <p>🔥 אחרי הזמנת שולחן: +{config.table_booking_points} נק׳ <span className="opacity-90">ממתינות</span> עד קוד ביקור יומי בסניף</p>
          )}
          {typeof delivPts === 'number' && delivPts > 0 ? (
            <p>🛵 הזמנת משלוח מאושר בקוד: עד +{delivPts} נ׳ למאזן המאושר</p>
          ) : null}
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
            href={config.delivery_url}
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

const WHEEL_ITEM_H = 40;
const WHEEL_VALUES = Array.from({ length: 11 }, (_, i) => i); // 0–10

function ScoreWheel({ value, onChange, color }) {
  const wrapRef = useRef(null);
  const drumRef = useRef(null);
  const stateRef = useRef({ val: value, startY: 0, startVal: 0, vel: 0, lastY: 0, lastT: 0, raf: null });

  function commitVal(raw, animate) {
    const clamped = Math.max(0, Math.min(10, Math.round(raw)));
    stateRef.current.val = clamped;
    const wrap = wrapRef.current;
    const drum = drumRef.current;
    if (!wrap || !drum) return;
    const center = wrap.clientHeight / 2 - WHEEL_ITEM_H / 2;
    const y = center - clamped * WHEEL_ITEM_H;
    drum.style.transition = animate ? 'transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
    drum.style.transform = `translateY(${y}px)`;
    onChange(clamped);
  }

  useEffect(() => {
    commitVal(value, false);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const s = stateRef.current;

    function onDown(e) {
      if (s.raf) { cancelAnimationFrame(s.raf); s.raf = null; }
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      s.startY = y; s.startVal = s.val; s.vel = 0; s.lastY = y; s.lastT = Date.now();
      e.preventDefault();
    }
    function onMove(e) {
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const now = Date.now();
      s.vel = (s.lastY - y) / Math.max(1, now - s.lastT);
      s.lastY = y; s.lastT = now;
      const delta = (s.startY - y) / WHEEL_ITEM_H;
      commitVal(s.startVal + delta, false);
      e.preventDefault();
    }
    function onUp() {
      let v = s.vel * 14;
      function coast() {
        if (Math.abs(v) < 0.25) { commitVal(s.val, true); return; }
        commitVal(s.val + v / WHEEL_ITEM_H * 2, false);
        v *= 0.86;
        s.raf = requestAnimationFrame(coast);
      }
      coast();
    }
    function onWheel(e) {
      e.preventDefault();
      commitVal(s.val + Math.sign(e.deltaY) * 1, true);
    }

    wrap.addEventListener('pointerdown', onDown, { passive: false });
    wrap.addEventListener('pointermove', onMove, { passive: false });
    wrap.addEventListener('pointerup',    onUp);
    wrap.addEventListener('pointerleave', onUp);
    wrap.addEventListener('wheel',        onWheel, { passive: false });
    return () => {
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup',    onUp);
      wrap.removeEventListener('pointerleave', onUp);
      wrap.removeEventListener('wheel',        onWheel);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="hm-score-wheel-wrap"
      style={{ '--wheel-color': color }}
    >
      <div className="hm-score-wheel-fade hm-score-wheel-fade--top" />
      <div className="hm-score-wheel-selector" />
      <div ref={drumRef} className="hm-score-wheel-drum">
        {WHEEL_VALUES.map(v => (
          <div key={v} className="hm-score-wheel-item">{v}</div>
        ))}
      </div>
      <div className="hm-score-wheel-fade hm-score-wheel-fade--bot" />
    </div>
  );
}

function PredictionEditor({ match, prediction, config, onPredict, onSaved, homeParts, awayParts }) {
  const [homeScore, setHomeScore] = useState(prediction?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.away_score ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!prediction) { setHomeScore(0); setAwayScore(0); return; }
    setHomeScore(prediction.home_score ?? 0);
    setAwayScore(prediction.away_score ?? 0);
  }, [prediction]);

  const derivedOutcome = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
  const savingRef = useRef(false);

  async function handleSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSubmitting(true);
    setErr('');
    try {
      await onPredict(match.id, homeScore, awayScore);
      onSaved?.();
    } catch (e) {
      setErr(mapPromoError(e));
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  }

  const participationPts  = typeof config.participation_points === 'number' ? config.participation_points : 0;
  const bullseyePts       = typeof config.bullseye_points      === 'number' ? config.bullseye_points      : 0;
  const outcomePtsCfg     = typeof config.outcome_points       === 'number' ? config.outcome_points       : 0;
  const drawStripePtsCfg  = typeof config.draw_stripe_points   === 'number' ? config.draw_stripe_points   : 0;

  const outcomeLabel =
    derivedOutcome === 'home' ? homeParts.clean :
    derivedOutcome === 'away' ? awayParts.clean :
    'תיקו';
  const outcomeColor =
    derivedOutcome === 'home' ? 'var(--green)' :
    derivedOutcome === 'away' ? 'var(--red)'   :
    'var(--gold)';

  return (
    <div className="space-y-3">
      <div className="hm-match-grass-fill hm-match-grass-pane rounded-xl pt-4 px-3 pb-3">
        {/* Wheels row: away (left) | colon | home (right) — matches pitch card direction */}
        <div className="flex items-start gap-2" dir="ltr">
          {/* Away column */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <TeamFlagGraphic match={match} side="away" parts={awayParts} variant="picker" />
            <span className="text-[10px] font-bold leading-tight text-center" style={{ color: 'var(--hm-match-grass-label)' }}>
              {awayParts.clean}
            </span>
            <ScoreWheel value={awayScore} onChange={setAwayScore} color="var(--red)" />
          </div>

          {/* Middle: colon + derived outcome */}
          <div className="flex flex-col items-center justify-center gap-2 pt-12 flex-shrink-0">
            <span className="font-black text-2xl leading-none" style={{ color: 'var(--hm-match-grass-label)' }}>:</span>
            <div
              className="rounded-full px-2 py-0.5 text-[10px] font-black text-center whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${outcomeColor}`, color: outcomeColor }}
            >
              {outcomeLabel}
            </div>
          </div>

          {/* Home column */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <TeamFlagGraphic match={match} side="home" parts={homeParts} variant="picker" />
            <span className="text-[10px] font-bold leading-tight text-center" style={{ color: 'var(--hm-match-grass-label)' }}>
              {homeParts.clean}
            </span>
            <ScoreWheel value={homeScore} onChange={setHomeScore} color="var(--green)" />
          </div>
        </div>

        <div className="text-center text-[10px] mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)', textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
          שמירה: +{participationPts} נ׳ · בינגו: +{bullseyePts} נ׳ · תוצאה נכונה: +{outcomePtsCfg} נ׳
          {drawStripePtsCfg > 0 ? ` · תיקו לא מדוייק: +${bullseyePts + drawStripePtsCfg} נ׳` : ''}
        </div>
      </div>

      {err && <p className="text-red-400 text-xs text-center">{err}</p>}

      <button
        onClick={handleSave}
        disabled={submitting}
        className="hm-btn-primary w-full py-4 rounded-2xl text-base font-black"
        style={{ opacity: submitting ? 0.5 : 1 }}
      >
        {submitting ? 'שומר...' : 'שמור תחזית'}
      </button>
    </div>
  );
}

function MatchCard({ match, prediction, config, windowLocked, predictionWindowOpensHint, onPredict, onDelete, onOpenGames, onBranchBooking, isActive, onToggle, token, campaignId }) {
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
  const [showShareModal, setShowShareModal]         = useState(false);
  const [showPredShareModal, setShowPredShareModal] = useState(false);
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

  const participationPts = config.participation_points;
  const bullseyePts = config.bullseye_points;
  const outcomePts = config.outcome_points;
  const drawStripePts = config.draw_stripe_points;
  const ssc = config?.social_share_config;
  const predShareEnabled = !!(ssc?.enabled && ssc?.contexts?.prediction_share?.enabled);
  const finalShareEnabled = !!(ssc?.enabled && (ssc?.contexts?.bullseye?.enabled || ssc?.contexts?.correct_prediction?.enabled));

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

  const phasePrimary = matchPhasePrimary(match);
  let phaseSecondary = matchPhaseSecondary(match, { isLive, isFinal });
  if (phaseSecondary == null && !isLive && !isFinal) {
    phaseSecondary = [match.stage, dayDate].filter(Boolean).join(' — ') || null;
  }

  const showTableBooking = Boolean(match.broadcasts_in_venues);
  const isBroadcastVenue = Boolean(match.broadcasts_in_venues);



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

  const broadcastRimAccent =
    isBroadcastVenue && !finalCelebrate && !isActive;

  const matchPitchTeams = (
    <div className="hm-match-pitch-face mb-1" dir="rtl">
      <div className="hm-match-pitch-half hm-match-pitch-half--home">
        <div className="flex justify-center">
          <TeamFlagGraphic match={match} side="home" parts={homeParts} variant="grid" />
        </div>
        <div className="hm-match-team-name text-[13px] leading-snug break-words mx-auto max-w-[7.5rem]" style={{ color: 'var(--text)' }}>
          {homeParts.clean}
        </div>
        {homeParts.aside ? (
          <div className="text-[9px] mt-0.5 leading-snug break-words mx-auto max-w-[7.75rem]" style={{ color: 'var(--text-sec)' }}>
            {homeParts.aside}
          </div>
        ) : null}
      </div>
      <div className="hm-match-pitch-half hm-match-pitch-half--away">
        <div className="flex justify-center">
          <TeamFlagGraphic match={match} side="away" parts={awayParts} variant="grid" />
        </div>
        <div className="hm-match-team-name text-[13px] leading-snug break-words mx-auto max-w-[7.5rem]" style={{ color: 'var(--text)' }}>
          {awayParts.clean}
        </div>
        {awayParts.aside ? (
          <div className="text-[9px] mt-0.5 leading-snug break-words mx-auto max-w-[7.75rem]" style={{ color: 'var(--text-sec)' }}>
            {awayParts.aside}
          </div>
        ) : null}
      </div>
    </div>
  );

  const finalSummaryPanel =
    isFinal && !isPending && match.final_home_score != null && match.final_away_score != null ? (
          <div
            className="rounded-xl px-3 py-3 mb-2 border text-right space-y-2"
            dir="rtl"
            style={{ background: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-sec)' }}>
              ניחוש ששלחת
            </div>
            {hasPrediction ? (
              <>
                <PredictionGuessLayers
                  prediction={prediction}
                  predOutcome={predOutcome}
                  homeFlag={homeFlag}
                  awayFlag={awayFlag}
                  size="sm"
                  layout="stack"
                  bullseyeMaxPts={typeof config?.bullseye_points === 'number' ? config.bullseye_points : null}
                />
                {finalCelebrate && finalPointsEarned != null ? (
                  <div className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
                    זכית ב־+{finalPointsEarned} נ׳ בסיום משחק זה
                  </div>
                ) : null}
                {isFinal && hasPrediction && (bullseye || correctOutcome) && finalShareEnabled && (
                  <button
                    type="button"
                    className="hm-btn-secondary w-full py-2.5 rounded-xl text-xs font-bold mt-1 flex items-center justify-center gap-1"
                    onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
                  >
                    📤 שתף את הניחוש וקבל נקודות
                  </button>
                )}
                {isFinal && hasPrediction && !finalCelebrate ? (
                  <div className="text-xs leading-relaxed pt-1" style={{ color: 'var(--text-sec)' }}>
                    ניחשת{' '}
                    <span className="hm-match-score-ltr tabular-nums font-bold">{prediction.home_score}−{prediction.away_score}</span>
                    {' '}(בינגו) · בסיום{' '}
                    <span className="hm-match-score-ltr tabular-nums font-bold">{match.final_home_score}−{match.final_away_score}</span>
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
                    className="hm-btn-primary w-full py-3 rounded-xl text-xs font-bold mt-1"
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
    ) : null;

  return (
    <div
      data-match-id={match.id}
      className={`hm-match-card mb-2 ${isPending ? 'opacity-50' : ''} ${isLive && !isPending ? 'hm-match-live-glow' : ''} ${finalCelebrate && !isActive ? 'hm-match-final-celebrate' : ''} ${match.marquee_highlight ? 'hm-match-marquee' : ''} ${isActive ? 'hm-match-active-focus' : ''} ${broadcastRimAccent ? 'hm-match-broadcast-accent' : ''}`}
    >
      <div className="hm-match-card-inner">
      <button
        type="button"
        className={`w-full text-right p-0 ${!isPending && canExpandCard ? 'cursor-pointer active:opacity-95' : 'cursor-default'}`}
        onClick={handleHeaderActivate}
        disabled={isPending}
      >
        {showLiveBroadcastLayout ? (
          <>
            <div className="relative w-full hm-match-live-header-rounded hm-match-live-score-band hm-match-burgundy pt-3 px-4 pb-3">
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
                  <div
                    dir="ltr"
                    className="font-black tabular-nums tracking-tight leading-none text-sky-300/85"
                    style={{
                      fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
                      textShadow: '0 0 24px rgba(56,189,248,0.42)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    0
                    <span className="mx-1.5 opacity-50">:</span>
                    0
                  </div>
                )}
                {hasPrediction ? (
                  <div
                    dir="rtl"
                    className="mt-1.5 px-2 flex flex-col items-center gap-0.5 text-center font-extrabold"
                  >
                    <span className="text-[9px] leading-none" style={{ color: 'rgba(245,245,245,0.38)' }}>
                      ניחוש בינגו
                    </span>
                    <span
                      lang="und"
                      className="hm-match-score-ltr inline tabular-nums text-[13px] font-black"
                      style={{ color: 'var(--gold)' }}
                    >
                      {prediction.home_score} : {prediction.away_score}
                      {liveScoresKnown && guessMatchesLiveScores ? (
                        <span className="mr-1.5 whitespace-nowrap text-[10px] font-black text-emerald-400">✓ מתאים</span>
                      ) : null}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="hm-match-burgundy px-4 pt-2 pb-2">
            <div className="text-right space-y-0.5 mb-2">
              <div className="text-[11px] font-semibold leading-snug break-words text-white/92 antialiased">
                {phasePrimary || '—'}
              </div>
              {phaseSecondary ? (
                <div className="text-[10px] leading-snug break-words" style={{ color: 'var(--text-sec)' }}>
                  {phaseSecondary}
                </div>
              ) : null}
            </div>
            {openerHint ? (
              <p className="text-[10px] leading-snug mb-3 text-right break-words" style={{ color: 'var(--text-sec)' }}>
                {openerHint}
              </p>
            ) : null}
            {matchPitchTeams}
            {finalSummaryPanel ? (
              <div className="pb-2 pt-1">{finalSummaryPanel}</div>
            ) : null}
            </div>
          </>
        ) : (
          <div className="hm-match-burgundy px-4 pt-4 pb-2">
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
              <div className="min-w-0 flex-1 text-right space-y-0.5">
                <div className="text-[11px] font-bold leading-snug break-words text-white/92 antialiased">
                  {phasePrimary || '—'}
                </div>
                {phaseSecondary ? (
                  <div className="text-[10px] leading-snug break-words" style={{ color: 'var(--text-sec)' }}>
                    {phaseSecondary}
                  </div>
                ) : null}
              </div>
            </div>

            {openerHint ? (
              <p className="text-[10px] leading-snug mb-3 text-right break-words px-0.5" style={{ color: 'var(--text-sec)' }}>
                {openerHint}
              </p>
            ) : null}

            {matchPitchTeams}

            {kickoffTime && (
              <div className="text-center text-[11px] mb-2 space-y-1.5 text-white/70 antialiased tabular-nums">
                <div>
                  <span className="font-semibold text-white/88">פתיחת משחק:</span>{' '}
                  <span>{kickoffTime}</span>
                  {' '}שעון ישראל
                  {dayDate ? ` · ${dayDate}` : ''}
                </div>
                {lockTime && lockTime !== kickoffTime ? (
                  <div>
                    <span className="font-semibold text-white/88">סגירת ניחוש:</span>{' '}
                    <span className="text-white/92">{lockTime}</span>
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
                  <span className="font-bold block text-sm tabular-nums" style={{ color: 'var(--text)' }}>
                    תוצאה סופית: {match.final_home_score} : {match.final_away_score}
                  </span>
                )}
              </div>
            )}
          {finalSummaryPanel}
          </div>
        )}

        {canExpandCard ? (
          <div className="hm-match-grass-fill hm-match-grass flex items-center justify-between py-3 px-4 flex-row-reverse">
            <span className="text-[11px] font-medium" style={{ color: 'var(--hm-match-grass-label)', textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
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
            <div className="flex items-center gap-3 flex-row-reverse min-w-0 flex-1 justify-end">
              {hasPrediction ? (
                <>
                  <span className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--hm-match-grass-label)', textShadow: '0 1px 2px rgba(0,0,0,0.35)', opacity: 0.92 }}>
                    {isActive ? '▲' : '▼'}
                  </span>
                  <div className="min-w-0 scale-[0.88] origin-left">
                    <PredictionGuessLayers
                      prediction={prediction}
                      predOutcome={predOutcome}
                      homeFlag={homeFlag}
                      awayFlag={awayFlag}
                      size="sm"
                      layout="ribbon"
                      bullseyeMaxPts={typeof config?.bullseye_points === 'number' ? config.bullseye_points : null}
                    />
                  </div>
                </>
              ) : (
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--hm-match-grass-label)', textShadow: '0 1px 2px rgba(0,0,0,0.35)', opacity: 0.92 }}>
                  {isActive ? '▲' : '▼'}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </button>

      <div style={{ display: 'grid', gridTemplateRows: isActive && canExpandCard ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="hm-match-grass-fill hm-match-expand-body px-4 pb-4 pt-3 space-y-3">
            {canGuess && (!hasPrediction || editMode) && (
              <PredictionEditor
                match={match}
                prediction={prediction}
                config={config}
                onPredict={onPredict}
                homeParts={homeParts}
                awayParts={awayParts}
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
                    🎉 +{config.participation_points} נ׳ נוספו!
                  </div>
                )}
                <div className="hm-match-grass-fill hm-match-grass-pane rounded-xl p-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between">
                    <div className="flex flex-col items-end gap-1 shrink-0 w-full sm:w-auto">
                      <span className="text-xs w-full text-right" style={{ color: 'var(--hm-match-grass-label)', textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
                        ניחוש שמור
                      </span>
                      <PredictionGuessLayers
                        prediction={prediction}
                        predOutcome={predOutcome}
                        homeFlag={homeFlag}
                        awayFlag={awayFlag}
                        size="sm"
                        layout="stack"
                        bullseyeMaxPts={typeof config?.bullseye_points === 'number' ? config.bullseye_points : null}
                      />
                    </div>
                    {confirmDelete ? (
                      <div className="flex flex-row-reverse flex-wrap items-center gap-3 justify-end">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs hm-match-grass-textbtn bg-transparent border-0 cursor-pointer p-0 font-inherit"
                        >ביטול</button>
                        <button
                          type="button"
                          onClick={async () => {
                            setDeleting(true);
                            try { await onDelete(match.id); }
                            catch { setDeleting(false); setConfirmDelete(false); }
                          }}
                          disabled={deleting}
                          className="text-xs hm-match-grass-textbtn hm-match-grass-textbtn--danger bg-transparent border-0 cursor-pointer p-0 font-inherit font-bold disabled:opacity-45"
                        >{deleting ? 'מוחק...' : 'אשר הסרה ✕'}</button>
                      </div>
                    ) : (
                      <div className="flex flex-row-reverse flex-wrap items-center gap-3 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditMode(true)}
                          className="text-xs hm-match-grass-textbtn bg-transparent border-0 cursor-pointer p-0 font-inherit"
                        >שנה בחירה</button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="text-xs hm-match-grass-textbtn hm-match-grass-textbtn--danger bg-transparent border-0 cursor-pointer p-0 font-inherit"
                        >הסר ניחוש</button>
                      </div>
                    )}
                  </div>
                </div>
                {!isFinal && predShareEnabled && (
                  <button
                    type="button"
                    className="w-full mt-2 rounded-xl py-2.5 text-sm font-black flex items-center justify-center gap-2 border-0 cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#F6EFed', fontFamily: 'inherit' }}
                    onClick={(e) => { e.stopPropagation(); setShowPredShareModal(true); }}
                  >
                    📤 שתף את הניחוש וקבל נקודות
                  </button>
                )}
                {showTableBooking ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onBranchBooking?.({ matchId: match.id, matchKickoffUtc: match.kickoff_utc ?? null });
                    }}
                    className="hm-match-grass-fill hm-match-grass-pane flex flex-col gap-3 px-4 py-3 rounded-xl min-h-[4.75rem] w-full text-right border-0 appearance-none cursor-pointer"
                    style={{ fontFamily: 'inherit' }}
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
                ) : null}
              </div>
            )}

            {!canGuess && hasPrediction && (
              <div className="text-center py-2 space-y-2">
                <div className="text-xs mb-1" style={{ color: 'var(--hm-match-grass-label)', textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>הניחוש שלך</div>
                <PredictionGuessLayers
                  prediction={prediction}
                  predOutcome={predOutcome}
                  homeFlag={homeFlag}
                  awayFlag={awayFlag}
                  size="lg"
                  layout="stack"
                  bullseyeMaxPts={typeof config?.bullseye_points === 'number' ? config.bullseye_points : null}
                />
                {hasPrediction && !isFinal && predShareEnabled && (
                  <button
                    type="button"
                    className="w-full mt-2 rounded-xl py-2.5 text-sm font-black flex items-center justify-center gap-2 border-0 cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#F6EFed', fontFamily: 'inherit' }}
                    onClick={(e) => { e.stopPropagation(); setShowPredShareModal(true); }}
                  >
                    📤 שתף את הניחוש וקבל נקודות
                  </button>
                )}
                {isFinal && bullseye && exactDrawMatch && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--gold)' }}>
                    🤝 תיקו מדויק (+{config.bullseye_points} תוצאה מדויקת +{config.draw_stripe_points} תיקו לא מדוייק)
                  </div>
                )}
                {isFinal && bullseye && !exactDrawMatch && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--gold)' }}>🎯 ניחוש מדויק! +{config.bullseye_points}</div>
                )}
                {isFinal && !bullseye && correctOutcome && (
                  <div className="mt-2 text-sm font-bold" style={{ color: 'var(--green)' }}>✓ ניחוש נכון! +{config.outcome_points}</div>
                )}
                {isFinal && !bullseye && !correctOutcome && (
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-sec)' }}>✗ ניחוש שגוי</div>
                )}
                {isFinal && hasPrediction && (
                  <p className="text-[10px] mt-3 leading-snug text-center px-1" style={{ color: 'var(--text-sec)' }}>
                    נקודות ההצטרפות מהמשחק בדרך‑כלל התווספו כבר בשמירת הניחוש. השורות למעלה מתייחסות לבונוס אחרי תוצאה סופית (מדוייק או תוצאה נכונה) בלבד, לפי כללי הקמפיין.
                  </p>
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
      {showShareModal && (
        <ShareModal
          context={bullseye ? 'bullseye' : 'correct_prediction'}
          cardData={{
            home: homeParts.clean,
            away: awayParts.clean,
            home_score: match.final_home_score,
            away_score: match.final_away_score,
            home_flag: homeFlag,
            away_flag: awayFlag,
            points_earned: finalPointsEarned ?? 0,
            points: null,
            rank: null,
          }}
          token={token}
          campaignId={campaignId}
          eventId={match.id}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showPredShareModal && (
        <ShareModal
          context="prediction_share"
          cardData={{
            home: homeParts.clean,
            away: awayParts.clean,
            home_score: prediction?.home_score,
            away_score: prediction?.away_score,
            home_flag: homeFlag,
            away_flag: awayFlag,
          }}
          token={token}
          campaignId={campaignId}
          onClose={() => setShowPredShareModal(false)}
        />
      )}
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
  const [benefitsPlayerCopyLb, setBenefitsPlayerCopyLb] = useState(null);
  const scrollContainerRef            = useRef(null);
  const heroRef                       = useRef(null);
  const gamesRef                      = useRef(null);
  const [showScrollTopFab, setShowScrollTopFab]   = useState(false);

  const token = getToken();
  const campaignId = PROMO_CAMPAIGN_ID;
  const showHeroSkeleton = loading && !!(campaignId && token);

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
      if (Object.prototype.hasOwnProperty.call(s, 'benefits_player_copy')) {
        setBenefitsPlayerCopyLb(normalizeBenefitsPlayerCopy(s.benefits_player_copy));
      }
    } catch (_) {}
  }, [campaignId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const wantLb = !!(campaignId && token);
    try {
      const warm = takeListMatchesWarm();
      const warmHome = takeHomeAuthenticatedWarm();
      const matchesReq =
        warm != null
          ? warm.catch(() => callFn('listMatches', {}))
          : callFn('listMatches', {});
      const predsReq =
        campaignId && token
          ? (warmHome.predictions ?? callFn('listMyPredictions', { token, campaign_id: campaignId })).catch(
              () => callFn('listMyPredictions', { token, campaign_id: campaignId }),
            )
          : Promise.resolve({ predictions: [] });
      const lbReq = wantLb
        ? (warmHome.leaderboard ?? callFn('getLeaderboard', { campaign_id: campaignId, token })).catch(() =>
            callFn('getLeaderboard', { campaign_id: campaignId, token }),
          )
        : Promise.resolve(null);
      const [matchesRes, predsRes, lbRes] = await Promise.all([matchesReq, predsReq, lbReq]);
      const mr = matchesRes?.data ?? matchesRes;
      const pr = predsRes?.data ?? predsRes;
      setMatches(
        (mr.matches || []).map((m) => {
          const st = typeof m.status === 'string' ? m.status.trim().toLowerCase() : m.status;
          return { ...m, status: st };
        }),
      );
      const predMap = {};
      for (const p of (pr.predictions || [])) predMap[p.match_id] = p;
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
        setBenefitsPlayerCopyLb(normalizeBenefitsPlayerCopy(d?.benefits_player_copy ?? null));
        try {
          sessionStorage.setItem(
            leaderboardSnapshotKey(campaignId),
            JSON.stringify({
              total_points: d.me?.total_points,
              pending_booking_points: pbp,
              tier_detail: td,
              tier: tf,
              benefits_player_copy: normalizeBenefitsPlayerCopy(d?.benefits_player_copy ?? null),
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
    const pwm = config.prediction_window_mode === 'days' ? 'days' : 'games';
    const windowGames = config.prediction_window_games;
    const windowDays = config.prediction_window_days;

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
    config.prediction_window_mode,
    config.prediction_window_games,
    config.prediction_window_days,
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
    const unlocked = (result?.data ?? result)?.achievements_unlocked ?? [];
    if (unlocked.length) setPendingAchievements(prev => [...prev, ...unlocked]);
    await load();
  }

  return (
    <>
    <div className="h-dvh stadium-bg relative" dir="rtl">
      {pendingAchievements.length > 0 && (
        <AchievementModal
          achievement={pendingAchievements[0]}
          token={token}
          campaignId={campaignId}
          playerPoints={totalPoints}
          onClose={() => setPendingAchievements(prev => prev.slice(1))}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="h-dvh overflow-y-auto pb-[max(12px,env(safe-area-inset-bottom))]"
        onScroll={handleScroll}
      >
        <div style={{ background: 'var(--hm-bg, #100505)' }}>
          <header
            className="flex items-center justify-between px-3 pt-2 pb-2"
            style={{
              backgroundImage: 'url(/brand/humondial-banner.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <button
              onClick={onLogout}
              className="flex-shrink-0"
              aria-label="יציאה"
            >
              <img src="/assets/icon-exit.png" alt="יציאה" className="w-11 h-11 object-contain" />
            </button>
            <div className="flex-1" />
            <button
              onClick={onPersonalArea}
              className="flex-shrink-0"
              aria-label="אזור אישי"
            >
              <img src="/assets/icon-personal-area.png" alt="אזור אישי" className="w-11 h-11 object-contain" />
            </button>
          </header>

          <div ref={heroRef}>
            {showHeroSkeleton ? (
              <HeroCardSkeleton />
            ) : (
              <HeroCard
                totalPoints={totalPoints}
                pendingBookingPoints={pendingBookingPoints}
                config={config}
                tierFromServer={tierFromLb}
                tierDetail={tierDetailLb}
                onPersonalArea={onPersonalArea}
                onPersonalAreaTier={onPersonalAreaTier}
                openMatchCount={openMatchCount}
                onScrollToGames={handleGuessNow}
                onBranchBooking={onBranchBooking}
              />
            )}
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
                config={config}
                windowLocked={lockedMatchIds.has(match.id)}
                predictionWindowOpensHint={guessOpensHintById[match.id]}
                onPredict={handlePredict}
                onDelete={handleDeletePrediction}
                onBranchBooking={onBranchBooking}
                isActive={activeCard === match.id}
                onToggle={() => setActiveCard((prev) => (prev === match.id ? null : match.id))}
                token={token}
                campaignId={campaignId}
              />
            </Fragment>
          ))}
        </div>
      </div>

    </div>
    {scrolled && (
      <div className="fixed top-0 left-0 right-0 z-50 shadow-md" dir="rtl" style={{ background: 'var(--hm-bg, #100505)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
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
