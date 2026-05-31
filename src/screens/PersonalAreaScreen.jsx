import { useState, useEffect, useCallback } from 'react';
import { callFn } from '../lib/api.js';
import { displayTierPrimaryLabelHe } from '../lib/tierCatalog.js';
import { tierChipClassFromCampaignTier } from '../lib/tierVisual.js';
import TierIcon from '../components/TierIcon.jsx';
import CampaignHeaderBrand from '../components/CampaignHeaderBrand.jsx';
import TierRequirementBars from '../components/TierRequirementBars.jsx';
import { useConfig } from '../contexts/ConfigContext.jsx';
import { overlayBenefitsPlayerCopy } from '../lib/benefitsPlayerCopy.js';
import ShareModal from '../components/ShareModal.jsx';

// ─── Pie chart (generated from ledger rows) ──────────────────────────────────
function BreakdownPie({ bd }) {
  const { guesses = 0, delivery = 0, visits = 0, bonus = 0 } = bd || {};
  const total = guesses + delivery + visits + bonus || 1;
  const segs = [
    { v: guesses,  color: '#D63A36' },
    { v: delivery, color: '#F4C15D' },
    { v: visits,   color: '#35D26F' },
    { v: bonus,    color: '#a855f7' },
  ];
  let a = -Math.PI / 2;
  const cx = 50, cy = 50, r = 44;
  const paths = segs.map((s, i) => {
    if (!s.v) return null;
    const sw = (s.v / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
    const x2 = cx + r * Math.cos(a + sw), y2 = cy + r * Math.sin(a + sw);
    const lg = sw > Math.PI ? 1 : 0;
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} Z`;
    a += sw;
    return <path key={i} d={d} fill={s.color} />;
  });
  return (
    <svg viewBox="0 0 100 100" width="72" height="72" style={{ display: 'block', filter: 'drop-shadow(0 0 8px rgba(214,58,54,0.4))' }}>
      {paths}
    </svg>
  );
}

// ─── Nav card ─────────────────────────────────────────────────────────────────
function NavCard({ leftContent, title, titleColor = 'var(--text)', subtitle, onClick, bottomContent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center rounded-2xl overflow-hidden active:opacity-80"
      style={{
        background: 'linear-gradient(to right, rgba(28,6,6,0.97) 0%, rgba(22,4,4,0.92) 100%)',
        border: '1px solid rgba(214,58,54,0.22)',
        minHeight: 90,
        textAlign: 'right',
      }}
      dir="rtl"
    >
      {/* Left image slot (end in RTL = left on screen) */}
      <div className="shrink-0 flex items-center justify-center overflow-hidden" style={{ width: 110, minHeight: 90, alignSelf: 'stretch' }}>
        {leftContent}
      </div>

      {/* Text */}
      <div className="flex-1 py-3 pr-3 pl-1 flex flex-col justify-center min-w-0">
        <div className="font-black text-[15px] leading-tight truncate" style={{ color: titleColor }}>{title}</div>
        {subtitle && <div className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-sec)' }}>{subtitle}</div>}
        {bottomContent}
      </div>

      {/* Arrow */}
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center ml-3"
        style={{ background: 'rgba(214,58,54,0.12)', border: '1.5px solid rgba(214,58,54,0.45)' }}
      >
        <span className="text-base font-black leading-none" style={{ color: 'var(--red)' }}>›</span>
      </div>
    </button>
  );
}

// ─── Image placeholders (designer replacements) ───────────────────────────────
// DESIGNER: replace each with a real image — see asset-spec.html for sizes/context

function BookIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a3a, #3a0b55, #12001f)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 60% 40%, rgba(120,0,255,0.35) 0%, transparent 70%)' }} />
      <div style={{ fontSize: 48, filter: 'drop-shadow(0 0 12px rgba(180,100,255,0.7))', position: 'relative' }}>📖</div>
      {/* DESIGNER: replace with benefits-guide-book.png (110×90px) */}
    </div>
  );
}

function TrophyIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1530, #1a3a6b, #0a0f20)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(244,193,93,0.25) 0%, transparent 70%)' }} />
      <div style={{ fontSize: 48, filter: 'drop-shadow(0 2px 12px rgba(244,193,93,0.8))', position: 'relative' }}>🏆</div>
      {/* DESIGNER: replace with leaderboard-trophy.png (110×90px) */}
    </div>
  );
}

function ChartIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0800, #3d1f00, #2a0800)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 70%, rgba(255,140,0,0.3) 0%, transparent 70%)' }} />
      <svg viewBox="0 0 60 50" width="70" height="58" style={{ position: 'relative' }}>
        <rect x="4"  y="30" width="10" height="18" rx="2" fill="#D63A36" opacity="0.9"/>
        <rect x="18" y="20" width="10" height="28" rx="2" fill="#F4C15D" opacity="0.9"/>
        <rect x="32" y="10" width="10" height="38" rx="2" fill="#F4C15D" opacity="0.9"/>
        <rect x="46" y="2"  width="10" height="46" rx="2" fill="#F4C15D" opacity="0.9"/>
        <line x1="51" y1="2" x2="58" y2="0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="51" y1="2" x2="55" y2="7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {/* DESIGNER: replace with progress-chart.png (110×90px) */}
    </div>
  );
}

function AchievementIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0800, #3d1200, #200800)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(214,58,54,0.3) 0%, transparent 70%)' }} />
      <div style={{ fontSize: 48, filter: 'drop-shadow(0 2px 14px rgba(214,58,54,0.7))', position: 'relative' }}>🥇</div>
      {/* DESIGNER: replace with achievement-trophy-wreath.png (110×90px) */}
    </div>
  );
}

function PieSlotIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(20,4,4,0.9)' }}>
      {/* DESIGNER: replace with pie-chart placeholder (110×90px) — or keep SVG */}
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PersonalAreaScreen({ token, campaignId, onBack, onLeaderboard, onLedger, onAchievements, onBenefitsGuide }) {
  const cfg = useConfig();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showTierShare, setShowTierShare] = useState(false);
  const [showRankShare, setShowRankShare] = useState(false);
  const [breakdown, setBreakdown]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callFn('getLeaderboard', { token, campaign_id: campaignId });
      const loaded = result?.data ?? result;
      setData(loaded);
      const tierId = loaded?.me?.tier?.id;
      const lsKey  = `hm_last_tier:${campaignId}`;
      const lastTierId = localStorage.getItem(lsKey);
      if (tierId) {
        if (lastTierId !== null && lastTierId !== tierId) setShowTierShare(true);
        localStorage.setItem(lsKey, tierId);
      }
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [token, campaignId]);

  useEffect(() => { load(); }, [load]);

  // Secondary: ledger rows → points breakdown by category
  useEffect(() => {
    callFn('getPlayerLedger', { token, campaign_id: campaignId })
      .then(r => {
        const rows = r?.rows ?? r?.data?.rows ?? [];
        const bd = { guesses: 0, delivery: 0, visits: 0, bonus: 0 };
        for (const row of rows) {
          const pts = row.points ?? 0;
          if (row.reason === 'prediction_participation') bd.guesses += pts;
          else if (row.reason === 'delivery') bd.delivery += pts;
          else if (row.reason === 'venue_visit') bd.visits += pts;
          else bd.bonus += pts;
        }
        setBreakdown(bd);
      })
      .catch(() => {});
  }, [token, campaignId]);

  if (loading) {
    return (
      <div className="hm-personal-screen-bg flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse" style={{ color: 'var(--red)' }}>טוען...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="hm-personal-screen-bg flex flex-col items-center justify-center gap-4 p-6">
        <div style={{ color: 'var(--text-sec)', fontSize: 13 }}>לא הצלחנו לטעון את הנתונים</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { me = {}, trajectory = {}, tiers: dataTiers = [] } = data || {};
  const myPts     = me.total_points ?? 0;
  const pendingBk = me.pending_table_booking_points ?? 0;
  const myTier    = me.tier || null;
  const tierKey   = myTier?.key || myTier?.id || '';

  const allAchievements  = me.achievements ?? [];
  const unlockedCount    = allAchievements.filter(a => !!(a.unlocked || a.unlocked_at)).length;
  const totalAchCount    = allAchievements.length;

  const tiersAscAll = [...dataTiers].sort((a, b) => (a.min_points ?? 0) - (b.min_points ?? 0));
  const earnedTierIndex = myTier && tiersAscAll.length
    ? (() => {
        const byId = tiersAscAll.findIndex(t => t.id === myTier.id);
        if (byId >= 0) return byId;
        const k = myTier?.key || myTier?.id || tierKey;
        return tiersAscAll.findIndex(t => (t.key || t.id) === k);
      })()
    : -1;

  const myLadderSlot1 = myTier && tiersAscAll.length
    ? earnedTierIndex >= 0
      ? earnedTierIndex + 1
      : (() => {
          const ix = tiersAscAll.findIndex(tt => tt?.id === myTier?.id || (typeof tt?.key === 'string' && tt.key === tierKey));
          return ix >= 0 ? ix + 1 : 0;
        })()
    : 0;
  const myTierBadgeLabel = myTier ? displayTierPrimaryLabelHe(myTier, myLadderSlot1) : '';

  const td           = me.tier_detail ?? null;
  const venueVisitCnt = td?.counts?.venue_visits ?? 0;
  const deliveryCnt   = td?.counts?.deliveries ?? 0;
  const benefitsCopyMerged = overlayBenefitsPlayerCopy(cfg?.benefits_player_copy, data?.benefits_player_copy);
  const commercialUi = !!(td?.show_commercial_requirements_ui && td.requirements_for_next?.length);

  const currentTier    = dataTiers.find(t => t.key === tierKey || t.id === tierKey) || dataTiers.find(t => t.id === myTier?.id) || { min_points: 0 };
  const nextTierTarget = td?.next_tier ? { label_he: td.next_tier.label_he, min_points: td.next_tier.min_points } : null;
  const bandMin        = currentTier.min_points ?? 0;
  const bandMaxPts     = nextTierTarget?.min_points ?? bandMin;
  let progPct = bandMaxPts > bandMin
    ? Math.min(100, Math.round(((myPts - bandMin) / (bandMaxPts - bandMin)) * 100))
    : 100;
  if (commercialUi && td.requirements_for_next?.length) {
    const reqs = td.requirements_for_next.filter(r => r.required > 0);
    if (reqs.length) {
      const fr = reqs.map(r => Math.min(1, r.current / Math.max(r.required, 1)));
      progPct = Math.round((fr.reduce((a, b) => a + b, 0) / fr.length) * 100);
    }
  }

  const ptsToNext    = nextTierTarget ? Math.max(0, (nextTierTarget.min_points ?? 0) - myPts) : 0;
  const tierBadgeSrc = myLadderSlot1 >= 1 && myLadderSlot1 <= 5 ? `/tier-hero/tier-${myLadderSlot1}.png` : null;

  const daysUntilEnd = trajectory.end_date
    ? Math.max(0, Math.ceil((new Date(trajectory.end_date) - Date.now()) / 86400000))
    : null;

  const bdTotal = breakdown ? (breakdown.guesses + breakdown.delivery + breakdown.visits + breakdown.bonus) : 0;
  const breakdownSubtitle = breakdown && bdTotal > 0
    ? [
        breakdown.guesses  > 0 ? `ניחושים ${breakdown.guesses}`  : null,
        breakdown.delivery > 0 ? `משלוחים ${breakdown.delivery}` : null,
        breakdown.visits   > 0 ? `ביקורים ${breakdown.visits}`   : null,
        breakdown.bonus    > 0 ? `בונוסים ${breakdown.bonus}`    : null,
      ].filter(Boolean).join(' · ')
    : null;

  const trajectorySubtitle = trajectory.projected_points
    ? `${trajectory.projected_points} נקודות צפויות${daysUntilEnd !== null ? ` · עוד ${daysUntilEnd} ימים` : ''}`
    : null;

  return (
    <div className="hm-personal-screen-bg" dir="rtl">
    <div className="h-dvh overflow-y-auto pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="text-xs px-3 py-2.5 rounded-full border min-h-[44px] flex items-center"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >← חזרה</button>
        <CampaignHeaderBrand maxLogoHeight={26} titleSizePx={18} />
        <div style={{ width: 64 }} />
      </header>

      {showTierShare && me.tier && (
        <ShareModal
          context="tier_upgrade"
          cardData={{ tier_name: me.tier.label_he || '', points: myPts, rank: me.rank ?? null }}
          token={token} campaignId={campaignId} eventId={me.tier.id}
          onClose={() => setShowTierShare(false)}
        />
      )}
      {showRankShare && (
        <ShareModal
          context="rank_share"
          cardData={{ rank: me.rank ?? null, points: myPts, tier_name: me.tier?.label_he || '' }}
          token={token} campaignId={campaignId}
          onClose={() => setShowRankShare(false)}
        />
      )}

      <div className="px-4 space-y-3">

        {/* ── Hero stats card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden relative" style={{ border: '1.5px solid rgba(214,58,54,0.38)' }}>
          {/* Stadium background */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(6,2,2,0.88) 0%, rgba(90,8,8,0.65) 45%, rgba(6,2,2,0.92) 100%), url(/assets/stadium-bg.jpeg) center/cover no-repeat',
          }} />

          <div className="relative z-10 p-4">
            {/* Points row + tier badge */}
            <div className="flex items-start justify-between gap-2">
              {/* My points (start = right on screen) */}
              <div className="flex flex-col items-start gap-0.5">
                <div className="text-[11px] font-bold" style={{ color: 'rgba(248,243,234,0.65)' }}>הנקודות שלי</div>
                <div className="font-black leading-none tabular-nums" style={{ color: 'var(--gold)', fontSize: 54, lineHeight: 1 }}>
                  {myPts}
                </div>
                <div className="text-sm font-bold mt-0.5" style={{ color: 'rgba(248,243,234,0.75)' }}>נקודות</div>
                {me.rank && (
                  <button type="button" onClick={() => setShowRankShare(true)}
                    className="text-[10px] font-bold mt-1" style={{ color: '#f4c15d' }}>
                    📤 שתף דירוג
                  </button>
                )}
              </div>

              {/* Center: pts to next tier */}
              {nextTierTarget && ptsToNext > 0 && (
                <div className="flex flex-col items-center flex-1 pt-3 gap-0.5">
                  <div className="text-[11px] font-bold" style={{ color: 'rgba(248,243,234,0.65)' }}>עוד</div>
                  <div className="text-2xl font-black tabular-nums" style={{ color: 'var(--red)' }}>{ptsToNext}</div>
                  <div className="text-[11px] text-center leading-tight" style={{ color: 'rgba(248,243,234,0.65)' }}>
                    נקודות<br />ל{nextTierTarget.label_he}
                  </div>
                </div>
              )}

              {/* Tier badge image */}
              {tierBadgeSrc && (
                <div className="shrink-0">
                  <img src={tierBadgeSrc} alt={myTierBadgeLabel}
                    style={{ width: 100, height: 100, objectFit: 'contain', filter: 'drop-shadow(0 0 18px rgba(214,58,54,0.55))' }} />
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="hm-progress-bg h-1.5 rounded-full overflow-hidden">
                <div className="hm-progress-fill h-1.5 rounded-full" style={{ width: `${progPct}%`, transition: 'width 0.6s ease' }} />
              </div>
              <div className="flex justify-between mt-1">
                <div />
                <div className="text-[11px]" style={{ color: 'var(--text-sec)' }}>
                  {myPts} / {bandMaxPts > bandMin ? bandMaxPts : bandMin}
                </div>
              </div>
              {pendingBk > 0 && (
                <div className="text-[10px] mt-1 font-bold" style={{ color: 'var(--gold)' }}>
                  +{pendingBk} נק׳ ממתינות לאישור
                </div>
              )}
            </div>

            {/* Commercial requirements */}
            {commercialUi && td.requirements_for_next?.length > 0 && (
              <div className="mt-2 rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-[9px] font-black mb-1" style={{ color: 'var(--gold)' }}>
                  התקדמות ל{td?.next_tier?.label_he || nextTierTarget?.label_he || 'הדרגה הבאה'}
                </div>
                <TierRequirementBars requirements={td.requirements_for_next} density="tight" />
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={onLedger}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold"
              style={{
                background: 'rgba(20,4,4,0.75)',
                border: '1.5px solid rgba(214,58,54,0.45)',
                color: 'var(--text)',
              }}
            >
              <span>⚽</span>
              <span>מסלול ההתקדמות שלי</span>
              <span style={{ opacity: 0.55 }}>›</span>
            </button>
          </div>
        </div>

        {/* ── Benefits guide ──────────────────────────────────────────────── */}
        <NavCard
          leftContent={<BookIllustration />}
          title="מדריך ההטבות 📖"
          titleColor="var(--text)"
          subtitle="גלה איך צוברים נקודות, עולים דרגות וזוכים בפרסים"
          onClick={onBenefitsGuide}
        />

        {/* ── Leaderboard ─────────────────────────────────────────────────── */}
        <NavCard
          leftContent={<TrophyIllustration />}
          title="לוח האלופים 🏆"
          titleColor="var(--gold)"
          subtitle="בדוק איפה אתה ממוקם מול שחקני HUMONDIAL"
          onClick={onLeaderboard}
        />

        {/* ── Trajectory ──────────────────────────────────────────────────── */}
        {trajectory.end_date && (
          <NavCard
            leftContent={<ChartIllustration />}
            title="קצב ההתקדמות שלי ⚡"
            titleColor="var(--text)"
            subtitle={trajectorySubtitle}
            onClick={onLedger}
          />
        )}

        {/* ── Achievements ────────────────────────────────────────────────── */}
        <NavCard
          leftContent={<AchievementIllustration />}
          title="הישגים 🥇"
          titleColor="var(--text)"
          subtitle={totalAchCount > 0 ? `${unlockedCount} מתוך ${totalAchCount} הושלמו` : 'גלה את ההישגים שלך'}
          onClick={() => onAchievements(allAchievements)}
        />

        {/* ── Points breakdown ────────────────────────────────────────────── */}
        <NavCard
          leftContent={
            breakdown && bdTotal > 0
              ? <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(18,4,4,0.95)' }}><BreakdownPie bd={breakdown} /></div>
              : <PieSlotIllustration />
          }
          title="מאיפה הגיעו הנקודות שלי 📊"
          titleColor="var(--text)"
          subtitle={breakdownSubtitle}
          onClick={onLedger}
        />

      </div>
    </div>
    </div>
  );
}
