import { useState, useEffect, useCallback, useMemo } from 'react';
import { clearToken, getToken } from '../lib/session.js';
import { callFn } from '../lib/api.js';
import { useConfig } from '../contexts/ConfigContext.jsx';

const STAGE_SORT_KEYS = {
  'שלב הבתים': 0,
  'שמינית גמר': 1,
  'רבע גמר': 2,
  'חצי גמר': 3,
  'גמר': 4,
};

function getTier(config, points) {
  if (!config?.tiers) return null;
  const sorted = [...config.tiers].sort((a, b) => b.min_points - a.min_points);
  return sorted.find((t) => points >= t.min_points) || sorted[sorted.length - 1];
}

function PointsBar({ totalPoints, config, onPersonalArea }) {
  const tier = getTier(config, totalPoints);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-hm-dim bg-hm-card">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[10px] text-hm-muted">הנקודות שלי</div>
          <div className="text-xl font-black text-hm-white tabular-nums">{totalPoints}</div>
        </div>
        {tier && (
          <div className="text-xs font-semibold text-hm-red border border-hm-dim rounded-full px-2 py-0.5">
            {tier.label_he || tier.label_en}
          </div>
        )}
      </div>
      <button
        onClick={onPersonalArea}
        className="text-xs text-hm-muted hover:text-hm-white flex items-center gap-1"
      >
        <span>האיזור האישי</span>
        <span>←</span>
      </button>
    </div>
  );
}

function ScoreInput({ label, value, onChange, disabled }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-hm-muted truncate max-w-[70px] text-center">{label}</span>
      <input
        type="number"
        min="0"
        max="99"
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        disabled={disabled}
        className="w-14 h-10 text-center text-lg font-black bg-hm-dim text-hm-white rounded-lg border border-hm-dim focus:border-hm-red outline-none disabled:opacity-50"
        dir="ltr"
      />
    </div>
  );
}

function MatchCard({ match, prediction, config, onPredict, onBooking, isActive, onToggle }) {
  const [homeScore, setHomeScore] = useState(prediction?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.away_score ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  useEffect(() => {
    setHomeScore(prediction?.home_score ?? 0);
    setAwayScore(prediction?.away_score ?? 0);
  }, [prediction]);

  const isPending = !match.home_team || !match.away_team ||
    match.home_team.startsWith('?') || match.away_team.startsWith('?');
  const isOpen = match.status === 'open' && !isPending;
  const isFinal = match.status === 'final';
  const showBooking = (match.status === 'live' || isFinal) && config?.booking_url;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitErr('');
    try {
      await onPredict(match.id, homeScore, awayScore);
    } catch (e) {
      if (e?.data?.error === 'prediction_locked') {
        setSubmitErr('המשחק כבר התחיל — הניחוש נעול');
      } else {
        setSubmitErr(e.message || 'שגיאה');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const hasPrediction = prediction != null;
  const bullseye = isFinal && hasPrediction &&
    prediction.home_score === match.final_home_score &&
    prediction.away_score === match.final_away_score;

  return (
    <div
      className={`bg-hm-card rounded-xl mb-2 overflow-hidden transition-opacity ${isPending ? 'opacity-50' : ''}`}
    >
      <button
        className="w-full text-right p-4 flex items-center justify-between"
        onClick={!isPending ? onToggle : undefined}
        disabled={isPending}
        aria-expanded={isActive}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-bold text-hm-white text-sm">
              {match.home_team || '?'} — {match.away_team || '?'}
            </span>
          </div>
          <div className="text-[11px] text-hm-muted mt-0.5">
            {match.kickoff_local}
            {match.status === 'locked' && <span className="mr-2 text-amber-400">🔒 נעול</span>}
            {match.status === 'live' && <span className="mr-2 text-blue-400">⚽ חי</span>}
            {isFinal && <span className="mr-2 text-gray-400">✓ סיום</span>}
          </div>
        </div>
        {isFinal && (
          <div className="text-right ml-2">
            <span className="font-black text-hm-white tabular-nums text-base">
              {match.final_home_score} – {match.final_away_score}
            </span>
          </div>
        )}
        {match.status === 'live' && match.live_home_score != null && (
          <div className="text-right ml-2">
            <span className="font-black text-blue-400 tabular-nums text-base">
              {match.live_home_score} – {match.live_away_score}
            </span>
          </div>
        )}
        {!isPending && (
          <span className="text-hm-muted text-xs ml-2">{isActive ? '▲' : '▼'}</span>
        )}
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: isActive ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.32s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 pb-4 space-y-4">
            {isOpen && (
              <div>
                <div className="text-xs text-hm-muted mb-3 text-center">הניחוש שלך</div>
                <div className="flex items-center justify-center gap-4">
                  <ScoreInput
                    label={match.home_team}
                    value={homeScore}
                    onChange={setHomeScore}
                    disabled={submitting}
                  />
                  <span className="text-hm-muted font-bold text-lg">–</span>
                  <ScoreInput
                    label={match.away_team}
                    value={awayScore}
                    onChange={setAwayScore}
                    disabled={submitting}
                  />
                </div>
                {submitErr && (
                  <p className="text-red-400 text-xs text-center mt-2">{submitErr}</p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-3 w-full bg-hm-red text-hm-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                >
                  {submitting ? '...' : hasPrediction ? 'עדכן ניחוש' : 'שלח ניחוש'}
                </button>
                {hasPrediction && (
                  <p className="text-[10px] text-hm-muted text-center mt-1">
                    ניחוש נוכחי: {prediction.home_score} – {prediction.away_score}
                  </p>
                )}
              </div>
            )}

            {!isOpen && hasPrediction && (
              <div className="text-center">
                <div className="text-xs text-hm-muted mb-1">הניחוש שלך</div>
                <div className="text-2xl font-black text-hm-white tabular-nums">
                  {prediction.home_score} – {prediction.away_score}
                </div>
                {isFinal && bullseye && (
                  <div className="mt-1 text-yellow-400 text-xs font-bold">🎯 בולסאי! +{config?.bullseye_points ?? 60}</div>
                )}
                {isFinal && !bullseye && (() => {
                  const actualOutcome = match.final_home_score > match.final_away_score ? 'home'
                    : match.final_home_score < match.final_away_score ? 'away' : 'draw';
                  const predOutcome = prediction.home_score > prediction.away_score ? 'home'
                    : prediction.home_score < prediction.away_score ? 'away' : 'draw';
                  return predOutcome === actualOutcome
                    ? <div className="mt-1 text-green-400 text-xs">✓ ניחוש נכון! +{config?.outcome_points ?? 30}</div>
                    : <div className="mt-1 text-hm-muted text-xs">✗ ניחוש שגוי</div>;
                })()}
              </div>
            )}

            {!isOpen && !hasPrediction && (
              <p className="text-center text-xs text-hm-muted">לא שלחת ניחוש למשחק זה</p>
            )}

            {showBooking && (
              <a
                href={config.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onBooking(match.id)}
                className="flex items-center justify-between bg-hm-dim rounded-xl px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-bold text-hm-white">צפה ב-Humongous!</div>
                  <div className="text-xs text-green-400">
                    הזמן מקום וקבל +{config.table_booking_points ?? 20} נקודות
                  </div>
                </div>
                <span className="bg-hm-red text-hm-white text-xs font-bold px-3 py-2 rounded-lg">
                  הזמן ←
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShellScreen({ playerId, onLogout }) {
  const config = useConfig();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
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
  const [activeCard, setActiveCard] = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      const matchList = matchesRes.matches || [];
      setMatches(matchList);

      const predMap = {};
      for (const p of (predsRes.predictions || [])) {
        predMap[p.match_id] = p;
      }
      setPredictions(predMap);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [campaignId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const stages = [...new Set(matches.map((m) => m.stage))].sort((a, b) => {
    const ao = STAGE_SORT_KEYS[a] ?? 99;
    const bo = STAGE_SORT_KEYS[b] ?? 99;
    return ao - bo;
  });

  const visibleMatches = activeStage
    ? matches.filter((m) => m.stage === activeStage)
    : matches;

  async function handlePredict(matchId, home, away) {
    if (!campaignId || !token) throw new Error('לא מחובר');
    await callFn('upsertPromoPrediction', {
      token,
      campaign_id: campaignId,
      match_id: matchId,
      home_score: home,
      away_score: away,
    });
    await load();
  }

  function handleBooking(matchId) {
    if (!campaignId || !token) return;
    callFn('recordTableBooking', { token, campaign_id: campaignId, match_id: matchId })
      .catch(() => {});
  }

  function handleLogout() {
    clearToken();
    onLogout();
  }

  return (
    <div className="min-h-dvh bg-hm-bg flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-hm-dim">
        <h1 className="text-lg font-black tracking-tight text-hm-white">
          HUMON<span className="text-hm-red">DIAL</span>
          <span className="text-xs font-normal text-hm-muted ml-2">2026</span>
        </h1>
        <button onClick={handleLogout} className="text-xs text-hm-muted hover:text-hm-white">
          יציאה
        </button>
      </header>

      <PointsBar
        totalPoints={totalPoints}
        config={config}
        onPersonalArea={() => {}}
      />

      {stages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-hm-dim scrollbar-none">
          <button
            onClick={() => setActiveStage(null)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeStage === null
                ? 'bg-hm-red border-hm-red text-hm-white font-bold'
                : 'border-hm-dim text-hm-muted'
            }`}
          >
            הכל
          </button>
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStage(s === activeStage ? null : s)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeStage === s
                  ? 'bg-hm-red border-hm-red text-hm-white font-bold'
                  : 'border-hm-dim text-hm-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="p-3" dir="rtl">
          {loading && (
            <p className="text-center text-hm-muted text-sm mt-8">טוען משחקים...</p>
          )}
          {error && (
            <p className="text-center text-red-400 text-sm mt-8">{error}</p>
          )}
          {!loading && !error && visibleMatches.length === 0 && (
            <p className="text-center text-hm-muted text-sm mt-8">אין משחקים להצגה</p>
          )}
          {visibleMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictions[match.id] || null}
              config={config}
              onPredict={handlePredict}
              onBooking={handleBooking}
              isActive={activeCard === match.id}
              onToggle={() =>
                setActiveCard((prev) => (prev === match.id ? null : match.id))
              }
            />
          ))}
        </div>
      </main>
    </div>
  );
}
