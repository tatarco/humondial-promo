import { useState, useEffect, useCallback } from 'react';
import { callFn } from '../lib/api.js';
import { DEFAULT_DELIVERY_ORDER_URL } from '../lib/campaignUrls.js';

const TIER_CSS = {
  bronze: 'tier-bronze',
  silver: 'tier-silver',
  gold:   'tier-gold',
  legend: 'tier-legend',
};

function tierCss(key) {
  return TIER_CSS[key] || 'tier-bronze';
}

function getTierForPoints(tiers, pts) {
  const sorted = [...tiers].sort((a, b) => b.min_points - a.min_points);
  return sorted.find(t => pts >= t.min_points) || sorted[sorted.length - 1] || null;
}

const AVATAR_COLORS = [
  'rgba(214,58,54,0.35)',
  'rgba(244,193,93,0.3)',
  'rgba(53,210,111,0.25)',
  'rgba(80,160,255,0.25)',
  'rgba(200,100,220,0.25)',
  'rgba(255,140,60,0.25)',
];

function WhatIfCard({ icon, label, value, onChange, pts }) {
  return (
    <div className="rounded-2xl p-4 border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)' }}>
      <div className="text-sm font-bold mb-3 text-right" style={{ color: 'var(--text)' }}>
        {icon} {label} <span style={{ color: 'var(--red)' }}>{value}</span> פעמים
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xl font-black tabular-nums" style={{ color: 'var(--gold)', minWidth: 60 }}>{pts} נ׳</div>
        <input
          type="range" min="0" max={10} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-1 rounded appearance-none cursor-pointer"
          style={{
            accentColor: 'var(--red)',
            background: `linear-gradient(to left, var(--red) ${value / 10 * 100}%, rgba(255,255,255,0.1) ${value / 10 * 100}%)`,
          }}
        />
      </div>
    </div>
  );
}

export default function LeaderboardScreen({ token, campaignId, config, onBack, onBranchBooking }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showChallenges, setShowChallenges] = useState(false);
  const [predCount, setPredCount]     = useState(4);
  const [tableCount, setTableCount]   = useState(3);
  const [delivCount, setDelivCount]   = useState(2);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await callFn('getLeaderboard', { token, campaign_id: campaignId });
      const d = r?.data ?? r;
      setData(d);
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
        <div style={{ color: 'var(--text-sec)' }}>{error}</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { top50 = [], me = {}, trajectory = {}, whatif = {}, tiers: dataTiers = [] } = data || {};
  const tiers   = dataTiers.length ? dataTiers : (config?.tiers ?? []);
  const top3    = top50.filter(r => r.rank <= 3);
  const rest    = top50.filter(r => r.rank > 3);
  const myPts   = me.total_points ?? 0;
  const myTier  = me.tier || null;

  const predDelta  = whatif.prediction_pts ?? config?.outcome_points ?? 30;
  const tableDelta = whatif.table_pts ?? config?.table_booking_points ?? 15;
  const delivDelta = whatif.delivery_pts ?? config?.delivery_points ?? 20;

  const PODIUM_ORDER = [2, 1, 3];
  const PODIUM_META = {
    1: { avatarSize: 'w-12 h-12 text-xl', platformH: 80, avatarBg: 'rgba(244,193,93,0.3)', showCrown: true },
    2: { avatarSize: 'w-9 h-9 text-base',  platformH: 60, avatarBg: 'rgba(200,200,200,0.2)', showCrown: false },
    3: { avatarSize: 'w-9 h-9 text-base',  platformH: 50, avatarBg: 'rgba(180,100,40,0.2)', showCrown: false },
  };

  return (
    <div className="min-h-dvh stadium-bg overflow-y-auto pb-20" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="text-base font-black" style={{ color: 'var(--text)' }}>לוח האלופים</div>
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >
          ← חזרה
        </button>
      </header>

      <div className="flex items-end justify-center gap-3 px-4 py-4">
        {PODIUM_ORDER.map(rank => {
          const entry = top3.find(r => r.rank === rank);
          const meta  = PODIUM_META[rank];
          if (!entry) return <div key={rank} className="w-20" />;
          const entryTier = getTierForPoints(tiers, entry.total_points);
          return (
            <div key={rank} className="flex flex-col items-center gap-1">
              {meta.showCrown && <div className="text-lg">👑</div>}
              <div
                className={`${meta.avatarSize} rounded-full flex items-center justify-center font-black`}
                style={{ background: meta.avatarBg, color: 'var(--text)' }}
              >
                {(entry.nickname || '?')[0].toUpperCase()}
              </div>
              <div className="text-xs font-bold text-center max-w-[68px] truncate" style={{ color: 'var(--text)' }}>
                {entry.nickname}
              </div>
              {entryTier && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tierCss(entryTier.id)}`}>
                  {entryTier.label_he}
                </span>
              )}
              <div className="text-[10px]" style={{ color: 'var(--gold)' }}>{entry.total_points} נ׳</div>
              <div
                className="w-16 rounded-t-md flex items-center justify-center text-sm font-black"
                style={{ height: meta.platformH, background: meta.avatarBg, color: 'rgba(255,255,255,0.4)' }}
              >
                {rank}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hm-card p-4 mx-4 mb-3" style={{ borderColor: 'var(--red)', border: '2px solid var(--red)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base flex-shrink-0"
            style={{ background: 'rgba(214,58,54,0.3)', color: 'var(--text)' }}
          >
            {(me.nickname || 'א')[0].toUpperCase()}
          </div>
          <div className="text-3xl font-black" style={{ color: 'var(--red)' }}>#{me.rank ?? '—'}</div>
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{me.nickname ?? 'אתה'}</div>
            {myTier && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierCss(myTier.id)}`}>
                {myTier.label_he}
              </span>
            )}
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-sec)' }}>{myPts} נקודות</div>
          </div>
        </div>
      </div>

      <div className="hm-card p-4 mx-4 mb-3">
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-sec)' }}>בקצב הזה אתה בדרך ל...</div>
        <div className="text-2xl font-black mb-3" style={{ color: 'var(--red)' }}>
          מסלול לשיפור
        </div>
        <div className="hm-progress-bg h-2 rounded-full overflow-hidden mb-1">
          <div
            className="hm-progress-fill h-2"
            style={{ width: `${Math.min(100, Math.round((myPts / Math.max(1, trajectory.projected_points ?? myPts)) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] mb-3" style={{ color: 'var(--text-sec)' }}>
          <span>{trajectory.days_remaining ?? 0} ימים נותרו</span>
          <span>{myPts} / {trajectory.projected_points ?? myPts} נ׳</span>
        </div>
        <button
          onClick={() => setShowChallenges(v => !v)}
          className="hm-btn-primary w-full py-3 text-sm font-bold"
        >
          {showChallenges ? 'הסתר ←' : 'ראה אתגרים שיקדמו אותי ←'}
        </button>
      </div>

      {showChallenges && (
        <div className="mx-4 mb-3 space-y-2">
          <WhatIfCard icon="⚽" label="אנחש נכון עוד" value={predCount} onChange={setPredCount} pts={predCount * predDelta} />
          <WhatIfCard icon="🍽️" label="אזמין שולחן עוד" value={tableCount} onChange={setTableCount} pts={tableCount * tableDelta} />
          <WhatIfCard icon="🛵" label="אזמין משלוח עוד" value={delivCount} onChange={setDelivCount} pts={delivCount * delivDelta} />
          <button onClick={onBack} className="hm-btn-primary w-full py-3 text-sm">⚽ לניחושים ←</button>
          <button
            type="button"
            onClick={() => onBranchBooking?.()}
            className="hm-btn-secondary flex items-center justify-center w-full py-3 text-sm"
          >
            🍽️ הזמן שולחן ←
          </button>
          <a href={config?.delivery_url || DEFAULT_DELIVERY_ORDER_URL} target="_blank" rel="noopener noreferrer"
              className="hm-btn-secondary flex items-center justify-center w-full py-3 text-sm">
              🛵 הזמן משלוח ↗
          </a>
        </div>
      )}

      <div className="px-4 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-sec)' }}>שחקנים</div>
      </div>

      <div className="mx-4 hm-card overflow-hidden">
        {rest.map(entry => {
          const entryTier = getTierForPoints(tiers, entry.total_points);
          const avatarColor = AVATAR_COLORS[entry.rank % 6];
          return (
            <div
              key={entry.player_id}
              className="flex items-center gap-3 px-4 py-2.5 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="text-xs w-7 text-center font-bold" style={{ color: 'var(--text-sec)' }}>
                #{entry.rank}
              </div>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: avatarColor, color: 'var(--text)' }}
              >
                {(entry.nickname || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{entry.nickname}</div>
                {entryTier && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tierCss(entryTier.id)}`}>
                    {entryTier.label_he}
                  </span>
                )}
              </div>
              <div className="text-sm font-black tabular-nums" style={{ color: 'var(--gold)' }}>
                {entry.total_points} נ׳
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
