import { useState } from 'react';
import { callFn } from '../lib/api.js';
import AchievementModal from '../components/AchievementModal.jsx';

const RESERVATION_BASE =
  'https://tabitisrael.co.il/%D7%94%D7%96%D7%9E%D7%A0%D7%AA-%D7%9E%D7%A7%D7%95%D7%9D/create-reservation?step=search&locale=he-IL&source=website&type=future_reservation&orgId=';

function unwrap(payload) {
  return payload?.data ?? payload;
}

function pendingPointsFrom(bookingCfg, body) {
  if (typeof body?.points_pending === 'number' && Number.isFinite(body.points_pending)) {
    return body.points_pending;
  }
  if (typeof bookingCfg === 'number' && Number.isFinite(bookingCfg)) return bookingCfg;
  return null;
}

export default function BranchBookingScreen({
  token,
  campaignId,
  tableBookingPoints,
  branches = [],
  bookingContext,
  onBack,
}) {
  const [msg, setMsg]       = useState('');
  const [branchTip, setBranchTip] = useState('');
  const [busy, setBusy]       = useState(null);
  const [pendingAchievements, setPendingAchievements] = useState([]);

  const matchId = bookingContext?.matchId;
  const matchKickoffUtc = bookingContext?.matchKickoffUtc;

  async function flushPending(branch) {
    if (!token || !campaignId) return;
    const payload = {
      token,
      campaign_id: campaignId,
      tabit_org_id: branch.orgId,
      branch_name: branch.name,
    };
    if (matchId) {
      payload.match_id = matchId;
      if (matchKickoffUtc) payload.match_kickoff_utc = matchKickoffUtc;
    }
    const raw = await callFn('recordTableBooking', payload);
    const body = unwrap(raw);
    const duplicate = Boolean(body.duplicate);
    const ach = Array.isArray(body.achievements_unlocked) ? body.achievements_unlocked : [];
    const pts = pendingPointsFrom(tableBookingPoints, body);
    let tip =
      duplicate
        ? matchId
          ? 'כבר רשום לכרטיס הזה — ממשיכים לטאבּיט להזמנה.'
          : 'כבר יש סטטוס ממתין בזיכוי כללי — ממשיכים לטאבּיט להזמנה.'
        : pts != null
          ? `נשמרו +${pts} נק׳ ממתין. נפתח טאבּיט להזמנה — אחר כך הקוד היומי בסניף משחרר למאושר.`
          : 'נשמרו נקודות ממתין. נפתח טאבּיט להזמנה — אחר כך הקוד היומי בסניף משחרר למאושר.';
    if (!duplicate && ach.length) {
      setPendingAchievements(ach);
    }
    setBranchTip(tip);
  }

  async function branchReserve(branch, e) {
    e.preventDefault();
    const url = `${RESERVATION_BASE}${branch.orgId}`;
    setBranchTip('');
    if (token && campaignId) {
      setBusy(branch.orgId);
      try {
        await flushPending(branch);
      } catch {
        setBranchTip('לא הצלחנו לשמור נקודות ממתינות — עדיין אפשר להמשיך לטאבּיט מהקישור שייפתח.');
      } finally {
        setBusy(null);
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function registerPendingPoints() {
    if (!token || !campaignId) {
      setMsg('שגיאת התחברות');
      return;
    }
    setBusy('manual');
    setMsg('');
    try {
      const payload = { token, campaign_id: campaignId };
      if (matchId) {
        payload.match_id = matchId;
        if (matchKickoffUtc) payload.match_kickoff_utc = matchKickoffUtc;
      }
      const raw = await callFn('recordTableBooking', payload);
      const body = unwrap(raw);
      const pts = pendingPointsFrom(tableBookingPoints, body);
      const duplicate = Boolean(body.duplicate);
      setMsg(
        duplicate
          ? pts != null
            ? `כבר יש רישום למצב זה (${pts} נ׳ במתנה במערכת). אם טרם הזמנת — בחר סניף למעלה.`
            : 'כבר יש רישום למצב זה. אם טרם הזמנת — בחר סניף למעלה.'
          : pts != null
            ? `נרשמו +${pts} נק׳ במצב ממתין להזמנת שולחן. השלב הבא: ביקור בסניף והזנת קוד הביקור היומי; עד אז הנקודות לא נכללות בדירוג או בדרגה.`
            : 'נרשמו נקודות ממתין להזמנת שולחן. השלב הבא: ביקור בסניף והזנת קוד הביקור היומי; עד אז הנקודות לא נכללות בדירוג או בדרגה.',
      );
    } catch {
      setMsg('לא הצלחנו לשמור — נסה שוב');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-dvh stadium-bg overflow-y-auto pb-8" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="text-base font-black" style={{ color: 'var(--text)' }}>הזמנת מקום</div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >
          ← חזרה
        </button>
      </header>

      <div className="px-4 mb-4 space-y-2">
        <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
          בחר סניף להזמנת מקום ב-Humongous. אל תשכח להזין את קוד הביקור בסניף כדי שהנק׳ במתנה יאושרו.
        </p>
        <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
          עם לחיצה על סניף נשמרות נקודות ממתינות (אוטומטית) ואז נפתח טאבּיט להזמנה.
          {matchId ? (
            <>
              {' '}
              במסלול הזה הרישום מקושר לכרטיס המשחק.
            </>
          ) : (
            <>
              {' '}
              מהדוק או מתפריט הדירוג — רישום כללי (בלי משחק ספציפי).
            </>
          )}
        </p>
      </div>

      {branchTip && (
        <p className="px-4 mb-3 text-xs text-right" style={{ color: 'var(--green)' }}>{branchTip}</p>
      )}

      {branches.length === 0 ? (
        <p className="px-4 text-sm text-center leading-relaxed" style={{ color: 'var(--text-sec)' }}>
          אין רשימת סניפים זמינה מהשרת בהגדרות הקמפיין. צרף מזהי ארגון בטאבּיט בשדה הקמפיין בביזפלואו או בקש מהמפעיל לעדכן — עד אז ההזמנה דרך הטופס הבא לא תוצג.
        </p>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {branches.map((branch) => (
            <button
              key={branch.orgId}
              type="button"
              disabled={!!busy}
              onClick={(e) => branchReserve(branch, e)}
              className="hm-card flex flex-col items-center justify-center gap-2 py-5 text-center border-0 cursor-pointer appearance-none disabled:opacity-55"
            >
              <div className="text-2xl">🍔</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {branch.name}
            </div>
            <div dir="ltr" className="text-[10px] font-mono opacity-75 break-all px-1" style={{ color: 'var(--text-sec)' }} title={branch.orgId}>
              {branch.orgId}
            </div>
              <div
                className="text-xs px-2 py-1 rounded-full font-bold"
                style={{ background: 'var(--red)', color: '#fff' }}
              >
                {busy === branch.orgId ? 'שומר...' : 'הזמן ←'}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mx-4 mt-8 hm-card p-4 space-y-3">
        <p className="text-sm font-bold text-right" style={{ color: 'var(--text)' }}>אחרי שקבעת תור — רישום נקודות</p>
        <p className="text-xs text-right leading-relaxed" style={{ color: 'var(--text-sec)' }}>
          אם לחיצה על הסניף למעלה כבר הצליחה להוסיף ממתין אז אין צורך בכפתור — לחץ כאן רק אם הזמנת דרך ערוץ אחר ועדיין אין למצב הזה רישום משלך במערכת.
        </p>
        <button
          type="button"
          onClick={registerPendingPoints}
          disabled={!!busy}
          className="w-full hm-btn-primary py-3 text-sm font-bold rounded-xl disabled:opacity-55"
        >
          {busy === 'manual' ? 'שומר...' : 'רשמו את ההזמנה שלי (נק׳ ממתינות)'}
        </button>
        {msg && <p className="text-xs text-right" style={{ color: 'var(--green)' }}>{msg}</p>}
      </div>
      {pendingAchievements.length > 0 && (
        <AchievementModal
          achievement={pendingAchievements[0]}
          token={token}
          campaignId={campaignId}
          onClose={() => setPendingAchievements(prev => prev.slice(1))}
        />
      )}
    </div>
  );
}
