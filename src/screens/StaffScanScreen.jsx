import { useState, useEffect } from 'react';
import { callFn } from '../lib/api.js';
import { PROMO_CAMPAIGN_ID } from '../lib/config.js';
import CampaignHeaderBrand from '../components/CampaignHeaderBrand.jsx';

const STAFF_SESSION_KEY = 'promo_staff_session';

function loadStaffSession() {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.token || !s.expires_at) return null;
    if (new Date(s.expires_at) < new Date()) {
      localStorage.removeItem(STAFF_SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

function saveStaffSession(token, expires_at, branch_name) {
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({ token, expires_at, branch_name }));
}

function clearStaffSession() {
  localStorage.removeItem(STAFF_SESSION_KEY);
}

const TIER_STYLES = {
  bronze:   { gradient: 'linear-gradient(160deg,#3d1a02 0%,#7a3c10 100%)', border: '#c97c3a', accent: '#e8a060', emoji: '🥉' },
  silver:   { gradient: 'linear-gradient(160deg,#1e2535 0%,#3d4f6a 100%)', border: '#9ab0cc', accent: '#cad8ea', emoji: '🥈' },
  gold:     { gradient: 'linear-gradient(160deg,#2d1e00 0%,#7a5200 100%)', border: '#f4c15d', accent: '#f8d88a', emoji: '🥇' },
  diamond:  { gradient: 'linear-gradient(160deg,#001f35 0%,#005080 100%)', border: '#56c8e8', accent: '#a0dff5', emoji: '💎' },
  platinum: { gradient: 'linear-gradient(160deg,#1a0035 0%,#4a0080 100%)', border: '#c07aff', accent: '#e0b8ff', emoji: '🔮' },
};

function getTierStyle(tierId) {
  return TIER_STYLES[(tierId ?? '').toLowerCase()] ?? TIER_STYLES.bronze;
}

function formatPhone(phone) {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  return phone;
}

// ─── Sub-screen: Password ─────────────────────────────────────────────────────
function PasswordScreen({ onSuccess }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await callFn('staffLogin', { campaign_id: PROMO_CAMPAIGN_ID, password: pw });
      saveStaffSession(data.token, data.expires_at, data.branch_name);
      onSuccess({ token: data.token, branch_name: data.branch_name });
    } catch (err) {
      setError(err.status === 401 ? 'סיסמה שגויה' : 'שגיאה, נסה שנית');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8 px-6" style={{ background: '#060202' }} dir="rtl">
      <CampaignHeaderBrand maxLogoHeight={42} titleSizePx={28} />
      <p className="text-sm font-semibold" style={{ color: 'var(--text-sec)' }}>כניסת צוות סניף</p>

      <form onSubmit={submit} className="w-full max-w-xs flex flex-col gap-4">
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
          placeholder="סיסמת הסניף"
          dir="rtl"
          className="w-full rounded-2xl text-lg text-right px-5 py-4 outline-none"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
        {error && <p className="text-center text-sm font-semibold" style={{ color: 'var(--red)' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !pw}
          className="hm-btn-primary w-full py-4 text-lg font-black disabled:opacity-40"
        >
          {loading ? '...' : 'כניסה →'}
        </button>
      </form>
    </div>
  );
}

// ─── Sub-screen: Home ─────────────────────────────────────────────────────────
function HomeStaffScreen({ branchName, token, onLogout }) {
  const [codes, setCodes] = useState(null);
  const [loadingCodes, setLoadingCodes] = useState(true);

  async function fetchCodes() {
    setLoadingCodes(true);
    try {
      const data = await callFn('getStaffDailyCodes', { token });
      setCodes(data);
    } catch {
      setCodes({ venue_code: null, delivery_code: null });
    } finally {
      setLoadingCodes(false);
    }
  }

  useEffect(() => { fetchCodes(); }, []);

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-8 pb-6 gap-6" style={{ background: '#060202' }} dir="rtl">
      <div className="flex flex-col items-center gap-2">
        <CampaignHeaderBrand maxLogoHeight={38} titleSizePx={26} />
        {branchName && (
          <div className="px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--gold)' }}>
            {branchName}
          </div>
        )}
        <button
          onClick={onLogout}
          className="text-xs px-3 py-1 rounded-full"
          style={{ color: 'var(--text-sec)', opacity: 0.5 }}
        >
          התנתק
        </button>
      </div>

      {/* Daily codes */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={fetchCodes}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--card-bg)', color: 'var(--text-sec)', border: '1px solid var(--border)' }}
          >
            {loadingCodes ? '...' : '↻ רענן'}
          </button>
          <p className="text-sm font-bold" style={{ color: 'var(--text-sec)' }}>קודים יומיים</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-3xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <span className="text-2xl">🏟️</span>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>הגעה לסניף</p>
            <p className="font-black tracking-widest" style={{ fontSize: '2.6rem', lineHeight: 1, color: 'var(--gold)' }}>
              {loadingCodes ? '—' : (codes?.venue_code ?? '—')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-3xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <span className="text-2xl">🛵</span>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>משלוח</p>
            <p className="font-black tracking-widest" style={{ fontSize: '2.6rem', lineHeight: 1, color: 'var(--gold)' }}>
              {loadingCodes ? '—' : (codes?.delivery_code ?? '—')}
            </p>
          </div>
        </div>
      </div>

      {/* Scan instruction */}
      <div
        className="flex flex-col items-center gap-3 rounded-3xl p-6 text-center"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <span className="text-4xl">📷</span>
        <p className="font-bold text-base" style={{ color: 'var(--text)' }}>
          כיצד לסרוק לקוח
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sec)' }}>
          בקש מהלקוח לפתוח את ה-QR שלו באפליקציה,
          <br />
          ואז פתח את המצלמה הרגילה בטלפון וסרוק אותו.
          <br />
          המסך ייפתח אוטומטית עם פרטי הלקוח.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-screen: Result ───────────────────────────────────────────────────────
function ResultScreen({ result, onBack }) {
  const [countdown, setCountdown] = useState(10);
  const ts = getTierStyle(result.tier);
  const tierLabel = result.tier_label ?? result.tier ?? '';
  const phone = formatPhone(result.phone);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(iv); onBack(); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [onBack]);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: ts.gradient }} dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <button
          onClick={onBack}
          className="text-sm font-bold px-4 py-2 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text)' }}
        >
          ← חזור ({countdown})
        </button>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 font-black text-lg"
          style={{ borderColor: ts.border, color: ts.accent, background: 'rgba(0,0,0,0.35)' }}
        >
          <span>{ts.emoji}</span>
          <span>{tierLabel}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 px-5 pb-8">
        {/* Phone number — huge */}
        <div
          className="rounded-3xl p-6 text-center shadow-2xl"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
            מספר טלפון — הזן בטאביט
          </p>
          <p
            className="font-black tracking-widest"
            style={{ fontSize: 'clamp(2.2rem,10vw,4.5rem)', lineHeight: 1.1, color: '#fff' }}
          >
            {phone}
          </p>
        </div>

        {/* Nickname */}
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <span className="text-2xl shrink-0">👤</span>
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>שם כינוי</p>
            <p className="font-bold text-lg" style={{ color: '#fff' }}>{result.nickname}</p>
          </div>
        </div>

        {/* Perks */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold px-1" style={{ color: 'rgba(255,255,255,0.7)' }}>הטבות הדרגה</p>
          {(result.perks ?? []).length === 0 && (
            <p className="text-sm px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>אין הטבות להצגה</p>
          )}
          {(result.perks ?? []).map((perk, i) => (
            <div
              key={perk.id ?? i}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: perk.claimed_today ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)',
                border: `1px solid ${perk.claimed_today ? 'rgba(255,255,255,0.08)' : ts.border}`,
                opacity: perk.claimed_today ? 0.5 : 1,
              }}
            >
              <span className="text-xl shrink-0">{perk.claimed_today ? '✓' : '⭐'}</span>
              <div className="flex-1">
                <p
                  className="font-semibold text-base"
                  style={{
                    color: perk.claimed_today ? 'rgba(255,255,255,0.5)' : '#fff',
                    textDecoration: perk.claimed_today ? 'line-through' : 'none',
                  }}
                >
                  {perk.label_he ?? perk.label ?? perk.id}
                </p>
                {perk.claimed_today && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>מומש היום</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-8 text-center">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          הזן את המספר בטאביט — ההטבות כבר מוגדרות עבורו
        </p>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function StaffScanScreen() {
  const [view, setView] = useState('loading');
  const [session, setSession] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [pendingQr, setPendingQr] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  useEffect(() => {
    const qr = new URLSearchParams(window.location.search).get('qr');
    const s = loadStaffSession();
    if (qr) setPendingQr(qr);
    setSession(s);
    if (s && qr) {
      setView('verifying');
    } else if (s) {
      setView('home');
    } else {
      setView('password');
    }
  }, []);

  useEffect(() => {
    if (view !== 'verifying' || !pendingQr || !session) return;
    callFn('verifyPlayerQR', { payload: pendingQr, staff_token: session.token })
      .then(data => {
        if (data.valid) {
          setScanResult(data);
          setView('result');
        } else {
          const msg = data.error === 'expired' ? 'QR פג — בקש מהלקוח לרענן' : 'QR לא תקין';
          setVerifyError(msg);
          setView('qr_error');
        }
      })
      .catch(() => {
        setVerifyError('שגיאת רשת — נסה שנית');
        setView('qr_error');
      });
  }, [view, pendingQr, session]);

  function handleLogin(s) {
    setSession(s);
    setView(pendingQr ? 'verifying' : 'home');
  }

  function handleLogout() {
    clearStaffSession();
    setSession(null);
    setView('password');
  }

  if (view === 'loading' || view === 'verifying') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4" style={{ background: '#060202' }}>
        <CampaignHeaderBrand maxLogoHeight={36} titleSizePx={24} />
        {view === 'verifying' && (
          <p className="text-sm font-semibold animate-pulse" style={{ color: 'var(--text-sec)' }}>
            מאמת...
          </p>
        )}
      </div>
    );
  }

  if (view === 'qr_error') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6" style={{ background: '#060202' }} dir="rtl">
        <CampaignHeaderBrand maxLogoHeight={36} titleSizePx={24} />
        <p className="text-xl font-black text-center" style={{ color: '#e74c3c' }}>{verifyError}</p>
        <button
          onClick={() => setView('home')}
          className="hm-btn-secondary px-8 py-3 font-bold rounded-2xl"
        >
          חזור
        </button>
      </div>
    );
  }

  if (view === 'password') {
    return <PasswordScreen onSuccess={handleLogin} />;
  }

  if (view === 'result') {
    return <ResultScreen result={scanResult} onBack={() => setView('home')} />;
  }

  return (
    <HomeStaffScreen
      branchName={session?.branch_name}
      token={session?.token}
      onLogout={handleLogout}
    />
  );
}
