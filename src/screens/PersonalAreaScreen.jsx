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

function PodiumDisplay({ top3 }) {
  const MEDAL = {
    1: { size: 'w-16 h-16 text-3xl', standH: 'h-16', standBg: 'rgba(244,193,93,0.25)' },
    2: { size: 'w-12 h-12 text-2xl', standH: 'h-11', standBg: 'rgba(255,255,255,0.06)' },
    3: { size: 'w-12 h-12 text-2xl', standH: 'h-8',  standBg: 'rgba(255,255,255,0.06)' },
  };
  const ORDER = [2, 1, 3];
  return (
    <div className="flex items-end justify-center gap-3 py-4">
      {ORDER.map(rank => {
        const p = top3.find(r => r.rank === rank);
        if (!p) return <div key={rank} className="w-20" />;
        const m = MEDAL[rank];
        return (
          <div key={rank} className="flex flex-col items-center gap-1">
            {rank === 1 && <div className="text-xl">👑</div>}
            <div className={`${m.size} rounded-full hm-card flex items-center justify-center text-2xl`}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </div>
            <div className="text-xs font-bold text-center max-w-[72px] truncate" style={{ color: 'var(--text)' }}>
              {p.nickname}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-sec)' }}>{p.total_points} נ׳</div>
            <div
              className={`${m.standH} w-16 rounded-t-md flex items-center justify-center text-lg font-black`}
              style={{ background: m.standBg, color: 'rgba(255,255,255,0.4)' }}
            >
              {rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LbRow({ entry }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div className="text-xs w-6 text-center" style={{ color: 'var(--text-sec)' }}>{entry.rank}</div>
      <div className="flex-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>{entry.nickname}</div>
      <div className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{entry.total_points}</div>
    </div>
  );
}

function WhatIfCard({ icon, label, max, value, onChange, currentPoints, deltaPerUnit }) {
  const projected = currentPoints + value * deltaPerUnit;
  return (
    <div className="hm-card p-4 mb-2">
      <div className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>
        {icon} {label} <span style={{ color: 'var(--red)' }}>{value}</span> פעמים
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range" min="0" max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-1 rounded appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to left, var(--red) ${value / max * 100}%, rgba(255,255,255,0.1) ${value / max * 100}%)`,
          }}
        />
        <div className="text-base font-black tabular-nums" style={{ color: 'var(--gold)', minWidth: 72, textAlign: 'left' }}>
          {projected} נ׳
        </div>
      </div>
    </div>
  );
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
                {isCurrent && <span className="text-xs font-bold" style={{ color: 'var(--red)' }}>◉ הדרגה שלך</span>}
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

export default function PersonalAreaScreen({ token, campaignId, config, onBack }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [predCount, setPredCount]     = useState(4);
  const [tableCount, setTableCount]   = useState(3);
  const [delivCount, setDelivCount]   = useState(2);
  const [lastSlider, setLastSlider]   = useState(null);
  const [showBenefits, setShowBenefits] = useState(false);

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
        <div style={{ color: 'var(--text-sec)' }}>{error}</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { top10 = [], me = {}, trajectory = {}, whatif = {}, tiers = [] } = data || {};
  const top3   = top10.filter(r => r.rank <= 3);
  const rest   = top10.filter(r => r.rank > 3);
  const myPts  = me.total_points ?? 0;
  const myTier = me.tier || null;

  const nextTier = (() => {
    const sorted = [...tiers].sort((a, b) => a.min_points - b.min_points);
    return sorted.find(t => t.min_points > myPts) || null;
  })();
  const ptsToNext = nextTier ? nextTier.min_points - myPts : 0;

  const predDelta  = whatif.prediction_pts ?? 30;
  const tableDelta = whatif.table_pts ?? 120;
  const delivDelta = whatif.delivery_pts ?? 80;

  function handleSlider(which, setter, value) {
    setter(value);
    setLastSlider(which);
  }

  const ctaPrimary = lastSlider === 'deliv' ? 'deliv' : 'table';

  return (
    <div className="min-h-dvh stadium-bg" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="text-base font-black" style={{ color: 'var(--text)' }}>האיזור האישי</div>
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >
          ← חזרה
        </button>
      </header>

      <div className="px-4 pb-8 space-y-4 overflow-y-auto">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>מובילים</div>
          <div className="hm-card p-4">
            <PodiumDisplay top3={top3} />
            <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--border)' }}>
              {rest.map(r => <LbRow key={r.player_id} entry={r} />)}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>המיקום שלי</div>
          <div className="hm-card p-4" style={{ borderColor: 'var(--red)' }}>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-black" style={{ color: 'var(--red)' }}>
                {me.rank ? `#${me.rank}` : '—'}
              </div>
              <div className="flex-1">
                <div className="text-base font-black" style={{ color: 'var(--text)' }}>{myPts} נקודות</div>
                {myTier && (
                  <button
                    onClick={() => setShowBenefits(true)}
                    className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${tierCss(myTier.key || myTier.id)}`}
                  >
                    {myTier.label_he} ↗
                  </button>
                )}
              </div>
            </div>
            {nextTier && (
              <div className="mt-3">
                <div className="hm-progress-bg h-1.5 mt-2">
                  <div
                    className="hm-progress-fill h-1.5"
                    style={{ width: `${Math.min(100, Math.round((myPts / nextTier.min_points) * 100))}%` }}
                  />
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-sec)' }}>
                  {ptsToNext} נקודות עד {nextTier.label_he}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>הצפי שלי</div>
          <div className="hm-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs" style={{ color: 'var(--text-sec)' }}>
                  צפי סיום ({trajectory.end_date || '19.7.26'})
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-sec)' }}>בקצב הנוכחי</div>
              </div>
              <div className="text-3xl font-black tabular-nums" style={{ color: 'var(--gold)' }}>
                ~{trajectory.projected_points ?? myPts} נ׳
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>מה אם...</div>
          <WhatIfCard
            icon="⚽" label="אנחש נכון עוד" max={20}
            value={predCount}  onChange={v => handleSlider('pred',  setPredCount,  v)}
            currentPoints={myPts} deltaPerUnit={predDelta}
          />
          <WhatIfCard
            icon="🍽️" label="אזמין שולחן עוד" max={20}
            value={tableCount} onChange={v => handleSlider('table', setTableCount, v)}
            currentPoints={myPts} deltaPerUnit={tableDelta}
          />
          <WhatIfCard
            icon="🛵" label="אזמין משלוח עוד" max={20}
            value={delivCount} onChange={v => handleSlider('deliv', setDelivCount, v)}
            currentPoints={myPts} deltaPerUnit={delivDelta}
          />
        </div>

        <div className="space-y-2">
          {config?.booking_url && (
            <a
              href={config.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ctaPrimary === 'table' ? 'hm-btn-primary' : 'hm-btn-secondary'} flex items-center justify-center gap-2 w-full py-3 text-sm`}
            >
              🍽️ הזמן שולחן ↗
            </a>
          )}
          {config?.delivery_url && (
            <a
              href={config.delivery_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ctaPrimary === 'deliv' ? 'hm-btn-primary' : 'hm-btn-secondary'} flex items-center justify-center gap-2 w-full py-3 text-sm`}
            >
              🛵 הזמן משלוח ↗
            </a>
          )}
          <button
            onClick={onBack}
            className="hm-btn-secondary flex items-center justify-center gap-2 w-full py-3 text-sm"
          >
            ⚽ לניחושים →
          </button>
        </div>
      </div>

      {showBenefits && (
        <BenefitsSheet tiers={tiers} myTier={myTier} onClose={() => setShowBenefits(false)} />
      )}
    </div>
  );
}
