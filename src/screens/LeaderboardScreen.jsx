import { useState, useEffect, useCallback } from 'react';
import { callFn } from '../lib/api.js';
import { useConfig } from '../contexts/ConfigContext.jsx';
import { tierChipClassFromCampaignTier } from '../lib/tierVisual.js';
import TierIcon from '../components/TierIcon.jsx';
import ShareModal from '../components/ShareModal.jsx';

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

export default function LeaderboardScreen({ token, campaignId, onNavigateHome, onBranchBooking }) {
  const globalCfg = useConfig();
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showChallenges, setShowChallenges] = useState(false);
  const [predCount, setPredCount]     = useState(4);
  const [tableCount, setTableCount]   = useState(3);
  const [delivCount, setDelivCount]   = useState(2);
  const [showRankShare, setShowRankShare] = useState(false);
  const [podiumScale, setPodiumScale] = useState(() => Math.max(window.innerWidth / 390, window.innerHeight / 844));

  useEffect(() => {
    // Update on mount (catches navigation from another screen) and on resize
    const update = () => setPodiumScale(Math.max(window.innerWidth / 390, window.innerHeight / 844));
    update(); // always re-compute on mount
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
      <div className="min-h-dvh leaderboard-bg flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse" style={{ color: 'var(--red)' }}>טוען...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh leaderboard-bg flex flex-col items-center justify-center gap-4 p-6">
        <div style={{ color: 'var(--text-sec)' }}>{error}</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { top50 = [], me = {}, trajectory = {}, whatif = {}, tiers: dataTiers = [] } = data || {};
  const tiers   = dataTiers;
  const top3    = top50.filter(r => r.rank <= 3);
  const rest    = top50.filter(r => r.rank > 3);
  const myPts   = me.total_points ?? 0;
  const myTier  = me.tier || null;

  const predDelta =
    typeof whatif.prediction_pts === 'number' && Number.isFinite(whatif.prediction_pts) ? whatif.prediction_pts : null;
  const tableDelta =
    typeof whatif.table_pts === 'number' && Number.isFinite(whatif.table_pts) ? whatif.table_pts : null;
  const delivDelta =
    typeof whatif.delivery_pts === 'number' && Number.isFinite(whatif.delivery_pts) ? whatif.delivery_pts : null;
  const whatIfReady = predDelta != null && tableDelta != null && delivDelta != null;

  const PODIUM_ORDER = [2, 1, 3];
  const _hdr = 54;
  // Phone screen interior (pixel-sampled): side y=121-192, center y=84-163
  // Content centered in each screen: side mid=157→top=138, center mid=124→top=105
  const PODIUM_COL = {
    0: { left: 'calc(25% - 44px)', top: Math.max(0, Math.round(138 * podiumScale) - _hdr) },
    1: { left: '50%', transform: 'translateX(calc(-50% + 8px))', top: Math.max(0, Math.round(105 * podiumScale) - _hdr) },
    2: { left: 'calc(75% - 44px)', top: Math.max(0, Math.round(138 * podiumScale) - _hdr) },
  };
  const PODIUM_META = {
    1: { textColor: 'var(--gold)', w: 110 },
    2: { textColor: 'rgba(220,220,255,1.0)', w: 88 },
    3: { textColor: 'rgba(220,160,60,1.0)', w: 88 },
  };

  return (
    <div className="h-dvh leaderboard-bg flex flex-col overflow-hidden" dir="rtl">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3">
        <div className="text-base font-black" style={{ color: 'var(--text)' }}>לוח האלופים</div>
        <button
          type="button"
          onClick={onNavigateHome}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >
          חזרה לדף הבית ←
        </button>
      </header>

      <div className="flex-shrink-0 relative w-full" style={{ height: Math.round(220 * podiumScale) }}>
        {PODIUM_ORDER.map((rank, colIdx) => {
          const entry = top3.find(r => r.rank === rank);
          const meta  = PODIUM_META[rank];
          if (!entry) return null;
          const entryTier = getTierForPoints(tiers, entry.total_points);
          return (
            <div
              key={rank}
              className="absolute flex flex-col items-center gap-1"
              style={{ ...PODIUM_COL[colIdx], width: meta.w }}
            >
              <div className="text-xs font-black text-center w-full" style={{ color: meta.textColor, textShadow: '0 2px 6px rgba(0,0,0,1)' }}>
                {entry.nickname.length > 10 ? entry.nickname.slice(0, 10) + '…' : entry.nickname}
              </div>
              <div className="text-base font-black" style={{ color: 'var(--gold)', textShadow: '0 2px 6px rgba(0,0,0,1)' }}>
                {entry.total_points} נ׳
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 hm-card p-3 mx-4 mb-2" style={{ borderColor: 'var(--red)', border: '2px solid var(--red)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base flex-shrink-0"
            style={{ background: 'rgba(214,58,54,0.3)', color: 'var(--text)' }}
          >
            {(me.nickname || 'א')[0].toUpperCase()}
          </div>
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="text-[1.68rem] leading-none font-black tabular-nums" style={{ color: 'var(--red)' }}>
              #{me.rank ?? '—'}
            </div>
            <button
              type="button"
              className="text-[10px] font-bold whitespace-nowrap"
              style={{ color: '#f4c15d' }}
              onClick={() => setShowRankShare(true)}
            >
              📤 שתף
            </button>
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="text-[13px] font-extrabold truncate" style={{ color: 'var(--text)' }}>
              {me.nickname ?? 'אתה'}
            </div>
            {myTier && (
              <span className={`inline-flex flex-row-reverse items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${tierChipClassFromCampaignTier(myTier)}`}>
                <TierIcon tierLike={myTier} sizePx={20} />
                {myTier.label_he}
              </span>
            )}
            <div className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--text-sec)' }}>{myPts} נקודות</div>
          </div>
        </div>
      </div>
      {showRankShare && (
        <ShareModal
          context="rank_share"
          cardData={{
            rank: me.rank ?? null,
            points: myPts,
            tier_name: myTier?.label_he || '',
          }}
          token={token}
          campaignId={campaignId}
          onClose={() => setShowRankShare(false)}
        />
      )}

      <div className="flex-shrink-0 hm-card p-3 mx-4 mb-2">
        <div className="text-[11px] font-extrabold mb-0.5 text-right" style={{ color: 'var(--text-sec)' }}>בקצב הזה אתה בדרך ל...</div>
        <div className="text-[1.35rem] leading-tight font-black mb-2 text-right" style={{ color: 'var(--red)' }}>
          מסלול לשיפור
        </div>
        <div className="hm-progress-bg h-2 rounded-full overflow-hidden mb-1">
          <div
            className="hm-progress-fill h-2"
            style={{ width: `${Math.min(100, Math.round((myPts / Math.max(1, trajectory.projected_points ?? myPts)) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] mb-2" style={{ color: 'var(--text-sec)' }} dir="ltr">
          <span className="tabular-nums">{myPts} / {trajectory.projected_points ?? myPts} נ׳</span>
          <span>{trajectory.days_remaining ?? 0} ימים נותרו</span>
        </div>
        <button
          onClick={() => setShowChallenges(v => !v)}
          className="hm-btn-primary w-full py-2.5 text-sm font-bold"
        >
          {showChallenges ? 'הסתר ←' : 'ראה אתגרים שיקדמו אותי ←'}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-20">
      {showChallenges && (
        <div className="mx-4 mb-2 space-y-2">
          {!whatIfReady ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-sec)' }}>
              מה־אם חסרים נתוני קמפיין — טען שוב מהשרת או החזר מסך.
            </p>
          ) : (
            <>
              <p className="text-[10px] text-right leading-snug px-0.5" style={{ color: 'var(--text-sec)' }}>
                הדגמה בלבד · המספרים בשורת הסליידרים (0–10) משמשים למחשבון מהיר; בפועל התקדמות נקבעת לפי מה שכבר הרווחת בקמפיין ולכללים בשטח.
              </p>
              <WhatIfCard icon="⚽" label="אנחש נכון עוד" value={predCount} onChange={setPredCount} pts={predCount * predDelta} />
              <WhatIfCard icon="🍽️" label="אזמין שולחן עוד" value={tableCount} onChange={setTableCount} pts={tableCount * tableDelta} />
              <WhatIfCard icon="🛵" label="אזמין משלוח עוד" value={delivCount} onChange={setDelivCount} pts={delivCount * delivDelta} />
            </>
          )}
          <button type="button" onClick={onNavigateHome} className="hm-btn-primary w-full py-3 text-sm">חזרה לדף הבית ←</button>
          <button
            type="button"
            onClick={() => onBranchBooking?.()}
            className="hm-btn-secondary flex items-center justify-center w-full py-3 text-sm"
          >
            🍽️ הזמן שולחן ←
          </button>
          <a
            href={globalCfg.delivery_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hm-btn-secondary flex items-center justify-center w-full py-3 text-sm"
          >
            🛵 הזמן משלוח ↗
          </a>
        </div>
      )}

      <div className="px-4 mb-2 pt-1">
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-sec)' }}>שחקנים</div>
      </div>

      <div className="mx-4 hm-card overflow-hidden mb-4">
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
                  <span className={`inline-flex flex-row-reverse items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tierChipClassFromCampaignTier(entryTier)}`}>
                    <TierIcon tierLike={entryTier} sizePx={16} />
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
    </div>
  );
}
