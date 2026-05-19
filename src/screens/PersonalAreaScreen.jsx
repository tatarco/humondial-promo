import { useState, useEffect, useCallback } from 'react';
import { callFn } from '../lib/api.js';

const TIER_CSS = {
  bronze: 'tier-bronze',
  silver: 'tier-silver',
  gold:   'tier-gold',
  legend: 'tier-legend',
};

function tierCss(key) {
  return TIER_CSS[key] || 'tier-bronze';
}

const BADGES = [
  { id: 'silver',    emoji: '🥈', label: 'חבר סילבר',          check: (t, c) => ['silver','gold','legend'].includes(t) },
  { id: 'gold',      emoji: '🥇', label: 'חבר זהב',           check: (t, c) => ['gold','legend'].includes(t) },
  { id: 'legend',    emoji: '🏆', label: 'אגדה',              check: (t, c) => t === 'legend' },
  { id: 'delivery1', emoji: '🛵', label: 'הזמנה ראשונה',    check: (t, c) => (c.delivery ?? 0) >= 1 },
  { id: 'table1',    emoji: '🍽️',label: 'מסעדה ראשונה',    check: (t, c) => (c.table_booking ?? 0) >= 1 },
  { id: 'visit1',    emoji: '🏟️', label: 'ביקור ראשון',     check: (t, c) => (c.venue_visit ?? 0) >= 1 },
  { id: 'pred5',     emoji: '⚽', label: '5 ניחושים',       check: (t, c) => (c.prediction_participation ?? 0) >= 5 },
  { id: 'pred10',    emoji: '🔥', label: '10 ניחושים',      check: (t, c) => (c.prediction_participation ?? 0) >= 10 },
  { id: 'achieve1',  emoji: '🏅', label: 'הישג',            check: (t, c) => (c.achievement ?? 0) >= 1 },
];

function MiniPodium({ top3 }) {
  const ORDER = [2, 1, 3];
  const META = {
    1: { cls: 'w-10 h-10 text-base', standH: 54, standBg: 'rgba(244,193,93,0.18)', crown: true },
    2: { cls: 'w-8 h-8 text-sm',     standH: 40, standBg: 'rgba(255,255,255,0.07)', crown: false },
    3: { cls: 'w-8 h-8 text-sm',     standH: 30, standBg: 'rgba(255,255,255,0.05)', crown: false },
  };
  return (
    <div className="flex items-end justify-center gap-3 py-3">
      {ORDER.map(rank => {
        const p = top3.find(r => r.rank === rank);
        if (!p) return <div key={rank} className="w-14" />;
        const m = META[rank];
        return (
          <div key={rank} className="flex flex-col items-center gap-1">
            {m.crown && <div className="text-sm">👑</div>}
            <div
              className={`${m.cls} rounded-full flex items-center justify-center font-black`}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text)' }}
            >
              {(p.nickname || '?')[0].toUpperCase()}
            </div>
            <div className="text-[10px] font-bold text-center max-w-[56px] truncate" style={{ color: 'var(--text)' }}>
              {p.nickname}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-sec)' }}>{p.total_points} נ׳</div>
            <div
              className="w-12 rounded-t-md flex items-center justify-center text-xs font-black"
              style={{ height: m.standH, background: m.standBg, color: 'rgba(255,255,255,0.3)' }}
            >
              {rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PersonalAreaScreen({ token, campaignId, onBack, onLeaderboard, onLedger }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callFn('getLeaderboard', { token, campaign_id: campaignId });
      setData(result);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [token, campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-dvh stadium-bg flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse" style={{ color: 'var(--red)' }}>טוען...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-dvh stadium-bg flex flex-col items-center justify-center gap-4 p-6">
        <div style={{ color: 'var(--text-sec)' }}>שגיאה: {error}</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { top50 = [], me = {}, trajectory = {}, tiers: dataTiers = [] } = data || {};
  const top3    = top50.filter(r => r.rank <= 3);
  const myPts   = me.total_points ?? 0;
  const myTier  = me.tier || null;
  const tierKey = myTier?.key || myTier?.id || '';
  const counts  = me.ledger_counts ?? {};

  const currentTier = dataTiers.find(t => t.key === tierKey) || { min_points: 0 };
  const nextTier = dataTiers.slice().sort((a, b) => a.min_points - b.min_points).find(t => t.min_points > myPts);
  const bandMin = currentTier.min_points || 0;
  const bandMax = nextTier?.min_points ?? bandMin;
  const progPct = bandMax > bandMin
    ? Math.min(100, Math.round(((myPts - bandMin) / (bandMax - bandMin)) * 100))
    : 100;
  const badges  = BADGES.map(b => ({ ...b, unlocked: b.check(tierKey, counts) }));

  const formatEndDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
  };

  return (
    <div className="min-h-dvh stadium-bg overflow-y-auto pb-8" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="text-xs px-3 py-2.5 rounded-full border min-h-[44px] flex items-center"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >← חזרה</button>
        <div className="flex flex-col items-center leading-none">
          <span className="font-black" style={{ fontSize: 18, color: '#fff', textShadow: '0 0 16px rgba(214,58,54,0.4)', letterSpacing: 3 }}>
            HUMON<span style={{ color: 'var(--red)' }}>DIAL</span>
          </span>
          <span dir="ltr" className="font-black" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 3, marginTop: 1 }}>
            2 0 2 6
          </span>
        </div>
        <div style={{ width: 64 }} />
      </header>

      <div className="px-4 space-y-4">
        {/* Block 1 — My Stats */}
        <div className="hm-card p-4" style={{ borderColor: 'var(--red)', borderWidth: 2 }}>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-black" style={{ color: 'var(--red)' }}>
              {me.rank ? `#${me.rank}` : '—'}
            </div>
            <div>
              <div className="text-base font-black" style={{ color: 'var(--text)' }}>{myPts} נקודות</div>
              {myTier && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierCss(tierKey)}`}>
                  {myTier.label_he}
                </span>
              )}
            </div>
          </div>
          {nextTier && (
            <div className="mt-3">
              <div className="hm-progress-bg h-1.5">
                <div className="hm-progress-fill h-1.5" style={{ width: `${progPct}%` }} />
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-sec)' }}>
                {nextTier.min_points - myPts} נקודות עד {nextTier.label_he}
              </div>
            </div>
          )}
        </div>

        {/* Block 2 — Trajectory */}
        {trajectory.end_date && (
          <div
            className="traj-chip flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'rgba(244,193,93,0.06)', border: '1px solid rgba(244,193,93,0.18)' }}
          >
            <div className="text-xs" style={{ color: 'var(--text-sec)' }}>
              <div>צפי סיום {formatEndDate(trajectory.end_date)}</div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>בקצב הנוכחי</div>
            </div>
            <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--gold)' }}>{trajectory.projected_points} נ׳</span>
          </div>
        )}

        {/* Block 3 — הישגים */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>הישגים 🏅</div>
          <div className="hm-card p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {badges.map(b => (
                <div
                  key={b.id}
                  className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
                  style={{
                    background: b.unlocked ? 'rgba(244,193,93,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${b.unlocked ? 'rgba(244,193,93,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    opacity: b.unlocked ? 1 : 0.38,
                    minWidth: 60,
                  }}
                >
                  <span className="text-xl leading-none">{b.emoji}</span>
                  <span
                    className="text-[10px] font-bold text-center leading-tight"
                    style={{ color: b.unlocked ? 'var(--gold)' : 'var(--text-sec)' }}
                  >
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Block 4 — Mini podium */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>3 המובילים</div>
          <div className="hm-card">
            <MiniPodium top3={top3} />
          </div>
        </div>

        {/* Block 5 — Navigation */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>ניווט</div>
          <button
            onClick={onLeaderboard}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-2 font-bold text-sm text-white"
            style={{ background: 'var(--red)' }}
          >
            <div>
              <div className="text-[10px] mb-0.5" style={{ opacity: 0.7 }}>כל 50 השחקנים</div>
              🏆 לוח האלופים
            </div>
            <span style={{ opacity: 0.5 }}>←</span>
          </button>
          <button
            onClick={onLedger}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <div>
              <div className="text-[10px] mb-0.5" style={{ opacity: 0.5 }}>מאיפה הגיעו הנקודות</div>
              📊 הניקוד שלי
            </div>
            <span style={{ opacity: 0.4 }}>←</span>
          </button>
        </div>
      </div>
    </div>
  );
}
