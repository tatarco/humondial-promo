import { useState } from 'react';
import { callFn } from '../lib/api.js';

const RESERVATION_BASE =
  'https://tabitisrael.co.il/%D7%94%D7%96%D7%9E%D7%A0%D7%AA-%D7%9E%D7%A7%D7%95%D7%9D/create-reservation?step=search&locale=he-IL&source=website&type=future_reservation&orgId=';

const BRANCHES = [
  { name: 'קריות', orgId: '6911cae874d1ffc13623c168' },
  { name: 'תל חנן', orgId: '59256f1016c2e4220080a088' },
  { name: 'כפר יונה', orgId: '62528de3bc0d3754454176cb' },
  { name: 'כפר סבא', orgId: '579487ca92f8401e0000da20' },
  { name: 'באר שבע', orgId: '5dd66c7a775398f3a69022b8' },
  { name: 'יהוד', orgId: '6707d900ee6c51b72796fbf1' },
  { name: 'גבעת ברנר', orgId: '579e766f2063921e00fb4551' },
];

export default function BranchBookingScreen({ token, campaignId, tableBookingPoints, onBack }) {
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function registerPendingPoints() {
    if (!token || !campaignId) {
      setMsg('שגיאת התחברות');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await callFn('recordTableBooking', { token, campaign_id: campaignId });
      const pts = tableBookingPoints ?? 15;
      setMsg(`נרשמו +${pts} נק׳ במצב ממתין להזמנת שולחן. השלב הבא: ביקור בסניף והזנת קוד הביקור היומי; עד אז הנקודות לא נכללות בדירוג או בדרגה.`);
    } catch {
      setMsg('לא הצלחנו לשמור — נסה שוב');
    } finally {
      setSaving(false);
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

      <div className="px-4 mb-4">
        <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
          בחר סניף להזמנת מקום ב-Humongous. לאחר ההזמנה אפשר לרשום כאן הזמנה ממתינה לנקודות או להשתמש בכרטיס משחק משודר במסך הבית — בשתי הדרכים אותם כללים: הנקודות נשמרות במצב ממתין ולא משפיעות על דירוג או דרגה עד שתזינו את קוד הביקור היומי במסך &quot;הגעת לסניף?&quot; לאחר ההגעה למסעדה.
        </p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {BRANCHES.map((branch) => (
          <a
            key={branch.orgId}
            href={`${RESERVATION_BASE}${branch.orgId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hm-card flex flex-col items-center justify-center gap-2 py-5 text-center"
          >
            <div className="text-2xl">🍔</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {branch.name}
            </div>
            <div
              className="text-xs px-2 py-1 rounded-full font-bold"
              style={{ background: 'var(--red)', color: '#fff' }}
            >
              הזמן ←
            </div>
          </a>
        ))}
      </div>

      <div className="mx-4 mt-8 hm-card p-4 space-y-3">
        <p className="text-sm font-bold text-right" style={{ color: 'var(--text)' }}>אחרי שקבעת תור — רישום לנקודות</p>
        <p className="text-xs text-right leading-relaxed" style={{ color: 'var(--text-sec)' }}>
          אחרי שמופיע רישום בהצלחה: הנקודות במצב ממתין — לא בדירוג ולא בשדרוג דרגה. השלב הבא הוא ביקור בסניף והזנה של הקוד היומי (&quot;הגעת לסניף?&quot;). במבקר אחד נסגרת לפחות הזמנה ממתינה אחת (לפי סדר ההרשמה שלכם).
        </p>
        <button
          type="button"
          onClick={registerPendingPoints}
          disabled={saving}
          className="w-full hm-btn-primary py-3 text-sm font-bold rounded-xl"
        >
          {saving ? 'שומר...' : 'רשמו את ההזמנה שלי (נק׳ ממתינות)'}
        </button>
        {msg && <p className="text-xs text-right" style={{ color: 'var(--green)' }}>{msg}</p>}
      </div>
    </div>
  );
}
