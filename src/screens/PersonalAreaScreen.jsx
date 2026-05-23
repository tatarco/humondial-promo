import { useState, useEffect, useCallback } from 'react';
import { callFn } from '../lib/api.js';
import { tierPerkDisplayRows } from '../lib/tierPerks.js';
import { tierChipClassFromCampaignTier } from '../lib/tierVisual.js';
import TierIcon from '../components/TierIcon.jsx';
import CampaignHeaderBrand from '../components/CampaignHeaderBrand.jsx';

export default function PersonalAreaScreen({ token, campaignId, onBack, onLeaderboard, onLedger }) {
  const [data, setData]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [tiersExpanded, setTiersExpanded]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callFn('getLeaderboard', { token, campaign_id: campaignId });
      setData(result?.data ?? result);
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
        <div style={{ color: 'var(--text-sec)', fontSize: 13 }}>לא הצלחנו לטעון את הנתונים</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { me = {}, trajectory = {}, tiers: dataTiers = [] } = data || {};
  const myPts   = me.total_points ?? 0;
  const pendingBk = me.pending_table_booking_points ?? 0;
  const myTier  = me.tier || null;
  const tierKey = myTier?.key || myTier?.id || '';

  const allAchievements = me.achievements ?? [];
  const isAchUnlocked = (a) => !!(a.unlocked || a.unlocked_at);
  const unlockedAchievements = allAchievements
    .filter(isAchUnlocked)
    .sort((a, b) => new Date(b.unlocked_at || 0).getTime() - new Date(a.unlocked_at || 0).getTime());
  const lockedAchievements = allAchievements
    .filter(a => !isAchUnlocked(a))
    .sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
  const achievementsOrdered = [...unlockedAchievements, ...lockedAchievements];
  const stripItems = [...unlockedAchievements.slice(0, 2), ...lockedAchievements.slice(0, 3)];

  const tiersAscAll = [...dataTiers].sort((a, b) => (a.min_points ?? 0) - (b.min_points ?? 0));
  const tierStripItems = tiersAscAll.slice(0, 7);
  const earnedTierIndex = myTier && tiersAscAll.length
    ? (() => {
        const byId = tiersAscAll.findIndex(t => t.id === myTier.id);
        if (byId >= 0) return byId;
        const k = myTier?.key || myTier?.id || tierKey;
        return tiersAscAll.findIndex(t => (t.key || t.id) === k);
      })()
    : -1;
  const isTierEarned = (tierIdx) => earnedTierIndex >= 0 && tierIdx <= earnedTierIndex;

  const td            = me.tier_detail ?? null;
  const venueVisitCnt = td?.counts?.venue_visits ?? 0;
  const deliveryCnt   = td?.counts?.deliveries ?? 0;
  const commercialUi  = !!(td?.show_commercial_requirements_ui && td.requirements_for_next?.length);

  const currentTier = dataTiers.find(t => t.key === tierKey || t.id === tierKey) || dataTiers.find(t => t.id === myTier?.id) || { min_points: 0 };

  const nextTierTarget = td?.next_tier
    ? { label_he: td.next_tier.label_he, min_points: td.next_tier.min_points }
    : null;

  const bandMin       = currentTier.min_points ?? 0;
  const bandMaxPts    = nextTierTarget?.min_points ?? bandMin;
  let progPct         = bandMaxPts > bandMin
    ? Math.min(100, Math.round(((myPts - bandMin) / (bandMaxPts - bandMin)) * 100))
    : 100;

  if (commercialUi && td.requirements_for_next?.length) {
    const reqs = td.requirements_for_next.filter((r) => r.required > 0);
    if (reqs.length) {
      const fr = reqs.map((r) => Math.min(1, r.current / Math.max(r.required, 1)));
      progPct = Math.round((fr.reduce((a, b) => a + b, 0) / fr.length) * 100);
    }
  }

  const formatEndDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
  };

  return (
    <div className="h-dvh stadium-bg" dir="rtl">
    <div className="h-dvh overflow-y-auto pb-8">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="text-xs px-3 py-2.5 rounded-full border min-h-[44px] flex items-center"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >← חזרה</button>
        <CampaignHeaderBrand maxLogoHeight={26} titleSizePx={18} />
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
              {pendingBk > 0 && (
                <div className="text-xs mt-1 space-y-1 text-right" style={{ color: 'var(--gold)' }}>
                  <div className="font-bold">+{pendingBk} נק׳ מהזמנת שולחן — במצב ממתין</div>
                  <div className="text-[10px] leading-snug font-normal" style={{ color: 'rgba(246,239,237,0.78)' }}>
                    לא נכללות בדירוג או במעבר דרגה עד הפעלה. אחרי ביקור בסניף הזינו את קוד הביקור היומי במסך &quot;הגעת לסניף?&quot; — בכל ביקור נסגרת לפחות הזמנה ממתינה אחת (לפי סדר ההרשמה).
                  </div>
                </div>
              )}
              {myTier && (
                <span className={`inline-flex flex-row-reverse items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${tierChipClassFromCampaignTier(myTier)}`}>
                  <TierIcon tierLike={myTier} sizePx={22} />
                  {myTier.label_he}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3">
            {(nextTierTarget || commercialUi) ? (
              <>
                <div className="hm-progress-bg h-1.5">
                  <div className="hm-progress-fill h-1.5" style={{ width: `${progPct}%` }} />
                </div>

                {!commercialUi && nextTierTarget && (
                  <div className="text-[10px] mt-1" style={{ color: 'var(--text-sec)' }}>
                    {Math.max(0, (nextTierTarget.min_points ?? 0) - myPts)} נקודות מאושרות עד {nextTierTarget.label_he || 'הדרגה הבאה'}
                  </div>
                )}

                {commercialUi && td?.summary_lines_he?.length ? (
                  <div className="mt-3 space-y-1.5 text-right">
                    {(td.summary_lines_he || []).map((ln, idx) => (
                      <div key={idx} className="text-[10px]" style={{ color: 'var(--text-sec)', lineHeight: 1.38 }}>
                        {ln}
                      </div>
                    ))}
                    <div className="rounded-lg p-2 mt-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="text-[9px] font-bold mb-1" style={{ color: 'var(--gold)' }}>
                        מה נדרש ל{td?.next_tier?.label_he || nextTierTarget?.label_he || 'הדרגה הבאה'}
                      </div>
                      {(td.requirements_for_next || []).map((r, ri) => (
                        <div key={r.key + String(ri)} className="flex flex-row-reverse justify-between gap-2 text-[10px] py-0.5" style={{ color: 'var(--text)' }}>
                          <span className={r.satisfied ? 'text-green-400 font-bold shrink-0' : 'text-amber-300 font-bold shrink-0'}>
                            {r.satisfied ? '✓' : `−${r.shortfall}`}
                          </span>
                          <span className="text-right">{r.label_he}</span>
                          <span dir="ltr" className="tabular-nums opacity-85 shrink-0">{r.current}/{r.required}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: 'var(--text-sec)' }}>
                      ביקורים/משלוחים נספרים רק אחרי הפעלה בקוד; נקודות ממתינות להזמנת שולחן לא נספרות לדרגה.
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 8, fontWeight: 700, textAlign: 'right' }}>
                🏆 הגעת לדרגת היעד הגבוהה ביחס לכללים אלה — גם מהכאן משפרים בספאטים!
              </div>
            )}
          </div>
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

        {/* B2 — Empty state for 0-point player */}
        {data && myPts === 0 && (
          <div className="hm-card mx-3 text-center py-4">
            <div style={{ fontSize: 22, marginBottom: 6 }}>🎯</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>עוד לא צברת נקודות</div>
            <div style={{ fontSize: 11, color: 'var(--text-sec)', marginTop: 4 }}>הזמן משלוח, הגיע למסעדה או נחש תוצאות</div>
          </div>
        )}

        {/* Block 3 — הישגים */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-sec)' }}>הישגים 🏅</div>
            <button
              type="button"
              aria-expanded={achievementsExpanded}
              onClick={() => setAchievementsExpanded(e => !e)}
              className="text-[10px] px-2 py-0.5 rounded-full transition-colors duration-200"
              style={{ color: 'var(--text-sec)', border: '1px solid var(--border)' }}
            >
              {achievementsExpanded ? 'פחות ▲' : 'הצג הכל ▼'}
            </button>
          </div>
          <div className="hm-card overflow-hidden p-3">
            {!achievementsExpanded && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {stripItems.length === 0 && (
                  <div className="text-[10px] py-3 w-full text-center" style={{ color: 'var(--text-sec)' }}>אין הישגים עדיין</div>
                )}
                {stripItems.map(b => {
                  const done = isAchUnlocked(b);
                  return (
                    <div
                      key={b.id}
                      className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
                      style={{
                        background: done ? 'rgba(244,193,93,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${done ? 'rgba(244,193,93,0.25)' : 'rgba(255,255,255,0.07)'}`,
                        opacity: done ? 1 : 0.38,
                        minWidth: 60,
                      }}
                    >
                      <span className="text-xl leading-none">{b.badge}</span>
                      <span
                        className="text-[10px] font-bold text-center leading-tight"
                        style={{ color: done ? 'var(--gold)' : 'var(--text-sec)' }}
                      >
                        {b.label_he}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={`hm-ach-detail-shell ${achievementsExpanded ? 'hm-ach-detail-open' : ''}`}>
              <div className="space-y-2">
                {achievementsOrdered.length === 0 && (
                  <div className="text-[10px] py-3 text-center" style={{ color: 'var(--text-sec)' }}>אין הישגים מוגדרים עדיין</div>
                )}
                {achievementsOrdered.map((b, i) => {
                  const done = isAchUnlocked(b);
                  return (
                    <div
                      key={b.id}
                      className="hm-ach-row-item flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{
                        background: done ? 'rgba(244,193,93,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${done ? 'rgba(244,193,93,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        opacity: done ? 1 : 0.45,
                      }}
                    >
                      <span className="text-2xl leading-none flex-shrink-0">{b.badge}</span>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="text-sm font-bold leading-tight" style={{ color: done ? 'var(--gold)' : 'var(--text-sec)' }}>
                          {b.label_he}
                        </div>
                        {b.description_he && (
                          <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-sec)' }}>
                            {b.description_he}
                          </div>
                        )}
                        {done && b.bonus_points > 0 && (
                          <div className="text-[10px] mt-1 font-bold" style={{ color: 'var(--gold)' }}>+{b.bonus_points} נ׳ בונוס</div>
                        )}
                      </div>
                      {done && (
                        <span className="text-base flex-shrink-0" style={{ color: 'var(--gold)' }}>✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-sec)' }}>דרגות · הטבות 🏆</div>
            <button
              type="button"
              aria-expanded={tiersExpanded}
              onClick={() => setTiersExpanded(e => !e)}
              className="text-[10px] px-2 py-0.5 rounded-full transition-colors duration-200"
              style={{ color: 'var(--text-sec)', border: '1px solid var(--border)' }}
            >
              {tiersExpanded ? 'פחות ▲' : 'פתח פירוט ▼'}
            </button>
          </div>
          <div className="hm-card overflow-hidden p-3">
            {!tiersExpanded && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {tierStripItems.length === 0 && (
                  <div className="text-[10px] py-3 w-full text-center" style={{ color: 'var(--text-sec)' }}>לא הוגדרו דרגות בקמפיין זה</div>
                )}
                {tierStripItems.map((t, idx) => {
                  const tk = t.key || t.id || '';
                  const done = isTierEarned(idx);
                  return (
                    <div
                      key={String(t.id || tk || idx)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl flex-shrink-0 ${done ? tierChipClassFromCampaignTier(t) : ''}`}
                      style={{
                        background: done ? undefined : 'rgba(255,255,255,0.03)',
                        border: done ? undefined : '1px solid rgba(255,255,255,0.07)',
                        minWidth: 60,
                      }}
                    >
                      <span className="flex flex-col items-center gap-0.5 leading-none">
                        <TierIcon tierLike={t} sizePx={done ? 28 : 22} />
                        <span className="text-[10px]">{done ? '✓' : '○'}</span>
                      </span>
                      <span
                        className="text-[10px] font-bold text-center leading-tight"
                        style={{ color: done ? 'inherit' : 'var(--text-sec)' }}
                      >
                        {t.label_he || tk || 'דרגה'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={`hm-ach-detail-shell ${tiersExpanded ? 'hm-ach-detail-open' : ''}`}>
              <div className="space-y-2 pt-2">
                {tiersAscAll.length === 0 && (
                  <div className="text-[10px] py-3 text-center" style={{ color: 'var(--text-sec)' }}>לא הוגדרו דרגות בקמפיין זה</div>
                )}
                {tiersAscAll.map((t, i) => {
                  const tk = t.key || t.id || '';
                  const done = isTierEarned(i);
                  const benefits = tierPerkDisplayRows(t);
                  const reqs = [];
                  if (typeof t.min_points === 'number') {
                    reqs.push({ key: `pts:${tk}`, label: `מינימום ${t.min_points} נקודות מאושרות לדרגה`, done: typeof myPts === 'number' && myPts >= t.min_points });
                  }
                  const mv = typeof t.min_verified_visits === 'number' ? Math.max(0, Math.floor(t.min_verified_visits)) : 0;
                  const md = typeof t.min_deliveries === 'number' ? Math.max(0, Math.floor(t.min_deliveries)) : 0;
                  if (mv > 0) reqs.push({
                    key: `vis:${tk}`,
                    label: `מינימום ${mv} ביקורים מאומתים בסניף (קוד ביקור יומי)`,
                    done: venueVisitCnt >= mv,
                  });
                  if (md > 0) reqs.push({
                    key: `del:${tk}`,
                    label: `מינימום ${md} משלוחים מאומתים בקוד`,
                    done: deliveryCnt >= md,
                  });
                  return (
                    <div
                      key={String(t.id || tk)}
                      className="hm-ach-row-item px-3 py-2.5 rounded-xl space-y-2 text-right"
                      style={{
                        background: done ? 'rgba(244,193,93,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${done ? 'rgba(244,193,93,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div className="flex flex-row-reverse items-start gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className={`inline-flex flex-row-reverse items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold ${done ? tierChipClassFromCampaignTier(t) : ''}`}>
                            <TierIcon tierLike={t} sizePx={22} />
                            {t.label_he || tk}
                          </span>
                          {benefits.length > 0 ? (
                            <div className="mt-2 space-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--gold)', opacity: 0.92 }}>הטבות בדרגה</div>
                              {benefits.map(b => (
                                <div key={b.key} className="text-[11px] leading-snug pr-2" style={{ color: 'var(--text)' }}>
                                  {b.text.trim()}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] mt-1.5" style={{ color: 'var(--text-sec)' }}>לא הוזנו הטבות מפורטות לדרגה זו בהגדרות הקמפיין</div>
                          )}
                          {reqs.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="text-[9px] font-bold uppercase tracking-wide text-right" style={{ color: 'var(--text-sec)' }}>תנאי סף מהקונפיגורציה</div>
                              {reqs.map(r => (
                                <div key={r.key} className="flex flex-row-reverse items-start gap-2 text-[10px] leading-snug" style={{ color: 'var(--text-sec)' }}>
                                  <span className="shrink-0 font-black" style={{ color: r.done ? '#4ade80' : 'rgba(246,239,237,0.35)' }}>
                                    {r.done ? '✓' : '·'}
                                  </span>
                                  <span className="text-right">{r.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xl flex-shrink-0" style={{ color: done ? 'var(--gold)' : 'var(--text-sec)' }}>
                          {done ? '★' : '☆'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>דירוג</div>
          <div className="hm-card overflow-hidden p-3">
            <button
              type="button"
              onClick={onLeaderboard}
              className="w-full flex flex-row-reverse items-center justify-between gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-white"
              style={{ background: 'var(--red)' }}
            >
              <span style={{ opacity: 0.5 }} aria-hidden>←</span>
              <div className="text-right min-w-0">
                <div className="text-[10px] mb-0.5 font-bold" style={{ opacity: 0.82 }}>דירוג מלא · 50 הראשונים</div>
                <div>🏆 לוח האלופים</div>
              </div>
            </button>
          </div>
        </div>

        {/* Block 5 — Navigation */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>ניווט</div>
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
    </div>
  );
}
