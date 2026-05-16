import { useState, useEffect, useCallback, useMemo } from 'react';
import { clearToken, getToken } from '../lib/session.js';
import { callFn } from '../lib/api.js';
import { useConfig } from '../contexts/ConfigContext.jsx';

const STAGE_SORT_KEYS = {
  'שלב הבתים': 0, 'שמינית גמר': 1, 'רבע גמר': 2, 'חצי גמר': 3, 'גמר': 4,
};

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

function HeroCard({ totalPoints, config, onPersonalArea }) {
  const tier     = getTier(config, totalPoints);
  const nextTier = getNextTier(config, totalPoints);
  const ptsToNext = nextTier ? nextTier.min_points - totalPoints : 0;
  const pct = nextTier
    ? Math.min(100, Math.round((totalPoints / nextTier.min_points) * 100))
    : 100;

  return (
    <div
      className="hm-card p-5 mb-3 mx-3"
      style={{ border: '1px solid rgba(244,193,93,0.4)', boxShadow: '0 0 40px rgba(244,193,93,0.12), 0 0 80px rgba(214,58,54,0.15)' }}
    >
      <div className="text-center mb-4">
        <div className="text-3xl mb-1">🏆</div>
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-sec)' }}>
          פה לא רק רואים מונדיאל. פה משחקים אותו.
        </div>
      </div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[10px]" style={{ color: 'var(--text-sec)' }}>הנקודות שלי</div>
          <div className="text-4xl font-black tabular-nums" style={{ color: 'var(--text)' }}>{totalPoints}</div>
        </div>
        {tier && (
          <button
            onClick={onPersonalArea}
            className={`text-xs font-bold px-3 py-1 rounded-full ${tierCss(tier.key || tier.id)}`}
          >
            {tier.label_he}
          </button>
        )}
      </div>
      <div className="hm-progress-bg h-1.5 mb-1">
        <div className="hm-progress-fill h-1.5" style={{ width: pct + '%' }} />
      </div>
      {nextTier && (
        <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-sec)' }}>
          <span>{pct}% ⚽</span>
          <span>{ptsToNext} נ׳ עד {nextTier.label_he}</span>
        </div>
      )}
    </div>
  );
}

function QuickActionTile({ icon, label, pts, onClick, href }) {
  const inner = (
    <div className="hm-card flex flex-col items-center gap-1 p-3 cursor-pointer" onClick={onClick}>
      <div className="text-2xl">{icon}</div>
      <div className="text-[10px] font-bold text-center" style={{ color: 'var(--text)' }}>{label}</div>
      {pts != null && <div className="text-[9px] font-black" style={{ color: 'var(--gold)' }}>+{pts} נ׳</div>}
    </div>
  );
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
    : inner;
}

function PredictionButtons({ match, prediction, onPredict }) {
  const [selected, setSelected] = useState(() => {
    if (!prediction) return null;
    if (prediction.home_score > prediction.away_score) return 'home';
    if (prediction.home_score < prediction.away_score) return 'away';
    return 'draw';
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!prediction) { setSelected(null); return; }
    if (prediction.home_score > prediction.away_score) setSelected('home');
    else if (prediction.home_score < prediction.away_score) setSelected('away');
    else setSelected('draw');
  }, [prediction]);

  async function pick(outcome) {
    if (submitting) return;
    setSelected(outcome);
    setSubmitting(true);
    setErr('');
    const scoreMap = { home: [1, 0], draw: [0, 0], away: [0, 1] };
    const [hs, as_] = scoreMap[outcome];
    try {
      await onPredict(match.id, hs, as_);
    } catch (e) {
      if (e?.data?.error === 'prediction_locked') setErr('המשחק כבר התחיל');
      else setErr(e.message || 'שגיאה');
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  const homeName = match.home_team?.split(' ').pop() || '1';
  const awayName = match.away_team?.split(' ').pop() || '2';

  return (
    <div>
      <div className="flex gap-2 justify-center" dir="ltr">
        {[
          { key: 'home', label: '1', sub: homeName },
          { key: 'draw', label: 'X', sub: 'תיקו' },
          { key: 'away', label: '2', sub: awayName },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => pick(btn.key)}
            disabled={submitting}
            className={`score-btn flex-1 py-2.5 flex flex-col items-center gap-0.5 ${selected === btn.key ? 'selected' : ''}`}
          >
            <span className="font-black text-base">{btn.label}</span>
            <span className="text-[9px]" style={{ color: selected === btn.key ? 'rgba(255,255,255,0.7)' : 'var(--text-sec)' }}>
              {btn.sub}
            </span>
          </button>
        ))}
      </div>
      {err && <p className="text-red-400 text-[10px] text-center mt-1">{err}</p>}
    </div>
  );
}

function MatchCard({ match, prediction, config, onPredict, onBooking, isActive, onToggle }) {
  const isPending = !match.home_team || !match.away_team ||
    match.home_team.startsWith('?') || match.away_team.startsWith('?');
  const isOpen    = match.status === 'open' && !isPending;
  const isFinal   = match.status === 'final';
  const showBooking = (match.status === 'live' || isFinal) && config?.booking_url;
  const hasPrediction = prediction != null;

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

  const homeFlag = match.home_flag || '🏳️';
  const awayFlag = match.away_flag || '🏳️';

  return (
    <div className={`hm-card mb-2 overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
      <button
        className="w-full text-right p-4 flex items-center justify-between"
        onClick={!isPending ? onToggle : undefined}
        disabled={isPending}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              {homeFlag} {match.home_team || '?'} — {match.away_team || '?'} {awayFlag}
            </span>
          </div>
          <div className="text-[11px] mt-0.5 flex items-center gap-2 justify-end" style={{ color: 'var(--text-sec)' }}>
            <span>{match.kickoff_local}</span>
            {match.status === 'locked' && <span className="text-amber-400">🔒 נעול</span>}
            {match.status === 'live'   && <span className="text-blue-400">⚽ חי</span>}
            {isFinal && <span>✓ סיום</span>}
          </div>
        </div>
        {isFinal && (
          <div className="font-black tabular-nums text-base ml-2" style={{ color: 'var(--text)' }}>
            {match.final_home_score} – {match.final_away_score}
          </div>
        )}
        {match.status === 'live' && match.live_home_score != null && (
          <div className="font-black tabular-nums text-base ml-2 text-blue-400">
            {match.live_home_score} – {match.live_away_score}
          </div>
        )}
        {!isPending && (
          <span className="text-xs ml-2" style={{ color: 'var(--text-sec)' }}>{isActive ? '▲' : '▼'}</span>
        )}
      </button>

      <div style={{ display: 'grid', gridTemplateRows: isActive ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 pb-4 space-y-3">
            {isOpen && (
              <PredictionButtons match={match} prediction={prediction} onPredict={onPredict} />
            )}
            {!isOpen && hasPrediction && (
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>הניחוש שלך</div>
                <div className="text-2xl font-black tabular-nums" style={{ color: 'var(--text)' }}>
                  {prediction.home_score} – {prediction.away_score}
                </div>
                {isFinal && bullseye && (
                  <div className="mt-1 text-xs font-bold" style={{ color: 'var(--gold)' }}>
                    🎯 בולסאי! +{config?.bullseye_points ?? 60}
                  </div>
                )}
                {isFinal && !bullseye && correctOutcome && (
                  <div className="mt-1 text-xs font-bold" style={{ color: 'var(--green)' }}>
                    ✓ ניחוש נכון! +{config?.outcome_points ?? 30}
                  </div>
                )}
                {isFinal && !bullseye && !correctOutcome && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-sec)' }}>✗ ניחוש שגוי</div>
                )}
              </div>
            )}
            {!isOpen && !hasPrediction && (
              <p className="text-center text-xs" style={{ color: 'var(--text-sec)' }}>לא שלחת ניחוש למשחק זה</p>
            )}
            {showBooking && (
              <a
                href={config.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onBooking(match.id)}
                className="hm-card flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-bold" style={{ color: 'var(--text)' }}>צפה ב-Humongous!</div>
                  <div className="text-xs" style={{ color: 'var(--green)' }}>
                    הזמן מקום וקבל +{config.table_booking_points ?? 20} נקודות
                  </div>
                </div>
                <span className="hm-btn-primary text-xs font-bold px-3 py-2 rounded-lg">הזמן ←</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen({ playerId, onLogout, onPersonalArea }) {
  const config = useConfig();
  const [matches, setMatches]         = useState([]);
  const [predictions, setPredictions] = useState({});
  const [activeCard, setActiveCard]   = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const totalPoints = useMemo(() => {
    if (!config) return 0;
    let pts = config.join_points ?? 50;
    for (const match of matches) {
      const pred = predictions[match.id];
      if (!pred) continue;
      pts += config.participation_points ?? 10;
      if (match.status !== 'final') continue;
      const isBullseye =
        pred.home_score === match.final_home_score &&
        pred.away_score === match.final_away_score;
      if (isBullseye) { pts += config.bullseye_points ?? 60; continue; }
      const ao = match.final_home_score > match.final_away_score ? 'home'
        : match.final_home_score < match.final_away_score ? 'away' : 'draw';
      const po = pred.home_score > pred.away_score ? 'home'
        : pred.home_score < pred.away_score ? 'away' : 'draw';
      if (ao === po) pts += config.outcome_points ?? 30;
    }
    return pts;
  }, [matches, predictions, config]);

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
  }, [campaignId, token]);

  useEffect(() => { load(); }, [load]);

  const todayMatches = useMemo(() => {
    const today = new Date().toDateString();
    return matches.filter(m => {
      try { return new Date(m.kickoff_utc || '').toDateString() === today; }
      catch { return false; }
    });
  }, [matches]);

  const stages = [...new Set(matches.map(m => m.stage))].sort((a, b) =>
    (STAGE_SORT_KEYS[a] ?? 99) - (STAGE_SORT_KEYS[b] ?? 99)
  );
  const visibleMatches = activeStage ? matches.filter(m => m.stage === activeStage) : matches;

  async function handlePredict(matchId, home, away) {
    if (!campaignId || !token) throw new Error('לא מחובר');
    await callFn('upsertPromoPrediction', {
      token, campaign_id: campaignId, match_id: matchId, home_score: home, away_score: away,
    });
    await load();
  }

  function handleBooking(matchId) {
    if (!campaignId || !token) return;
    callFn('recordTableBooking', { token, campaign_id: campaignId, match_id: matchId }).catch(() => {});
  }

  return (
    <div className="min-h-dvh stadium-bg flex flex-col" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={onPersonalArea} className="text-xl">👤</button>
        <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>
          HUMON<span style={{ color: 'var(--red)' }}>DIAL</span>
          <span className="text-xs font-normal mr-1" style={{ color: 'var(--text-sec)' }}>2026</span>
        </h1>
        <button onClick={onLogout} className="text-xs" style={{ color: 'var(--text-sec)' }}>יציאה</button>
      </header>

      <HeroCard totalPoints={totalPoints} config={config} onPersonalArea={onPersonalArea} />

      {config && (
        <div className="grid grid-cols-3 gap-2 px-3 mb-3">
          <QuickActionTile
            icon="⚽" label="ניחוש" pts={config.outcome_points ?? 30}
            onClick={() => {
              const first = matches.find(m => m.status === 'open');
              if (first) setActiveCard(first.id);
            }}
          />
          {config.booking_url && (
            <QuickActionTile icon="🍽️" label="הזמן שולחן" pts={config.table_booking_points ?? 20} href={config.booking_url} />
          )}
          {config.delivery_url && (
            <QuickActionTile icon="🛵" label="משלוח" pts={config.delivery_points ?? 80} href={config.delivery_url} />
          )}
        </div>
      )}

      {todayMatches.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none">
          {todayMatches.map(m => {
            const pred = predictions[m.id];
            return (
              <button
                key={m.id}
                onClick={() => setActiveCard(m.id)}
                className="shrink-0 hm-card flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold"
                style={{ color: 'var(--text)' }}
              >
                {m.home_flag || '🏳️'} {m.home_team?.split(' ').pop()} vs {m.away_team?.split(' ').pop()} {m.away_flag || '🏳️'}
                {pred
                  ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(53,210,111,0.15)', color: 'var(--green)', border: '1px solid rgba(53,210,111,0.3)' }}>✓</span>
                  : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(244,193,93,0.15)', color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>!</span>
                }
              </button>
            );
          })}
        </div>
      )}

      {stages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveStage(null)}
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
              onClick={() => setActiveStage(s === activeStage ? null : s)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border"
              style={{
                background: activeStage === s ? 'var(--red)' : 'transparent',
                borderColor: activeStage === s ? 'var(--red)' : 'var(--border)',
                color: activeStage === s ? 'var(--text)' : 'var(--text-sec)',
                fontWeight: activeStage === s ? 'bold' : 'normal',
              }}
            >{s}</button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="p-3">
          {loading && <p className="text-center text-sm mt-8" style={{ color: 'var(--text-sec)' }}>טוען משחקים...</p>}
          {error   && <p className="text-center text-sm mt-8 text-red-400">{error}</p>}
          {!loading && !error && visibleMatches.length === 0 && (
            <p className="text-center text-sm mt-8" style={{ color: 'var(--text-sec)' }}>אין משחקים להצגה</p>
          )}
          {visibleMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictions[match.id] || null}
              config={config}
              onPredict={handlePredict}
              onBooking={handleBooking}
              isActive={activeCard === match.id}
              onToggle={() => setActiveCard(prev => (prev === match.id ? null : match.id))}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
