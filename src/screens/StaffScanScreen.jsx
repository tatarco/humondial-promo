import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
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
function HomeStaffScreen({ branchName, token, onScan }) {
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
        {!loadingCodes && !codes?.venue_code && (
          <p className="text-xs text-center" style={{ color: 'var(--text-sec)' }}>הקודים ייווצרו אוטומטית בחצות</p>
        )}
      </div>

      {/* Scan button */}
      <button
        onClick={onScan}
        className="hm-btn-primary flex flex-col items-center gap-3 w-full py-8 text-xl font-black rounded-3xl active:scale-95 transition-transform"
      >
        <span className="text-4xl">📷</span>
        <span>סרוק QR של לקוח</span>
      </button>

      <p className="text-xs text-center" style={{ color: 'var(--text-sec)' }}>
        הצג ללקוח את קוד ה-QR שלו, ולאחר הסריקה הזן את מספר הטלפון בטאביט
      </p>
    </div>
  );
}

// ─── Sub-screen: Camera Scanner ───────────────────────────────────────────────
function CameraScreen({ token,  onResult, onCancel }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const processingRef = useRef(false);
  const [error, setError] = useState(null);

  const startScanner = useCallback(async () => {
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const back = devices.find(d =>
        /back|rear|environment/i.test(d.label)
      );
      const deviceId = back?.deviceId ?? devices[devices.length - 1]?.deviceId;

      await reader.decodeFromVideoDevice(deviceId, videoRef.current, async (result, err) => {
        if (!result || processingRef.current) return;
        if (err) return;
        processingRef.current = true;

        try {
          const data = await callFn('verifyPlayerQR', { payload: result.getText(), staff_token: token });
          if (!data.valid) {
            const msg = data.error === 'expired'
              ? 'QR פג — בקש מהלקוח לרענן'
              : 'QR לא תקין';
            setError(msg);
            setTimeout(() => { setError(null); processingRef.current = false; }, 2500);
            return;
          }
          onResult(data);
        } catch {
          setError('שגיאת רשת — נסה שנית');
          setTimeout(() => { setError(null); processingRef.current = false; }, 2500);
        }
      });
    } catch {
      setError('לא ניתן לגשת למצלמה');
    }
  }, [token,  onResult]);

  useEffect(() => {
    startScanner();
    return () => { readerRef.current?.reset(); };
  }, [startScanner]);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#000' }}>
      <div className="relative flex-1" style={{ minHeight: '70dvh' }}>
        <video ref={videoRef} className="w-full h-full object-cover" style={{ minHeight: '70dvh' }} playsInline />

        {/* Fixed back button — always visible over camera */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 z-20 font-bold px-4 py-2 rounded-xl text-sm"
          style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
        >
          ← חזור
        </button>

        {/* Corner viewfinder */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-64">
            {['top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
            ].map((c, i) => (
              <div key={i} className={`absolute w-12 h-12 ${c}`} style={{ borderColor: 'var(--gold)' }} />
            ))}
          </div>
        </div>

        {error && (
          <div className="absolute bottom-6 inset-x-4 text-white text-center rounded-2xl py-4 px-6 font-bold text-lg" style={{ background: 'rgba(214,58,54,0.9)' }}>
            {error}
          </div>
        )}
      </div>

      <div className="px-6 py-6 text-center" style={{ background: '#060202' }}>
        <p className="font-semibold mb-4" style={{ color: 'var(--gold)' }}>כוון את המצלמה אל קוד ה-QR של הלקוח</p>
        <button onClick={onCancel} className="hm-btn-secondary px-8 py-3 font-bold rounded-2xl">ביטול</button>
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

  useEffect(() => {
    const s = loadStaffSession();
    setSession(s);
    setView(s ? 'home' : 'password');
  }, []);

  function handleLogin(s) {
    setSession(s);
    setView('home');
  }

  function handleResult(r) {
    setScanResult(r);
    setView('result');
  }

  if (view === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#060202' }}>
        <CampaignHeaderBrand maxLogoHeight={36} titleSizePx={24} />
      </div>
    );
  }

  if (view === 'password') {
    return <PasswordScreen onSuccess={handleLogin} />;
  }

  if (view === 'scanner') {
    return (
      <CameraScreen
        token={session.token}
        onResult={handleResult}
        onCancel={() => setView('home')}
      />
    );
  }

  if (view === 'result') {
    return <ResultScreen result={scanResult} onBack={() => setView('home')} />;
  }

  return (
    <HomeStaffScreen
      branchName={session?.branch_name}
      token={session?.token}
      onScan={() => setView('scanner')}
    />
  );
}
