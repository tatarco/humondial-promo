import { useState, useEffect, useRef } from 'react';
import { callFn } from '../lib/api.js';
import { setToken } from '../lib/session.js';

export default function OtpScreen({ phone, isNewUser, onSuccess, onBack }) {
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const timerRef = useRef(null);

  const displayPhone = phone.replace(/^(972)(\d{5})(\d{4})$/, '+972-****$3');

  useEffect(() => {
    startCountdown();
    return () => clearInterval(timerRef.current);
  }, []);

  function startCountdown() {
    clearInterval(timerRef.current);
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await callFn('promoVerifyOtp', { phone, code, acceptTerms: isNewUser === true });
      const { token, playerId, komo_status, komo_bonus_points, komo_tier_name } = result;
      setToken(token);
      const komoWelcome =
        komo_status === 'existing_member'
          ? { bonusPoints: komo_bonus_points ?? 0, tierName: komo_tier_name ?? '' }
          : null;
      onSuccess(playerId, token, komoWelcome);
    } catch {
      setCode('');
      setError('קוד שגוי — נסה להזין שוב');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    setCode('');
    try {
      await callFn('promoRequestOtp', { phone });
      startCountdown();
    } catch {
      setError('שגיאה בשליחת קוד חדש — נסה שוב');
    } finally {
      setResending(false);
    }
  }

  function handleCodeChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
  }

  return (
    <div className="min-h-dvh bg-hm-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="text-hm-muted text-xs mb-8 flex items-center gap-1 opacity-40 hover:opacity-70"
        >
          ← חזרה לשינוי מספר
        </button>

        <h2 className="text-2xl font-bold text-hm-white mb-2">הזן קוד אימות</h2>
        <p className="text-hm-muted text-sm mb-2">
          שלחנו קוד ב-WhatsApp למספר {displayPhone}
        </p>

        {countdown > 0 ? (
          <p className="text-hm-muted text-xs mb-6">
            הקוד יכול לקחת עד {countdown} שניות להגיע
          </p>
        ) : (
          <p className="text-hm-muted text-xs mb-6">לא קיבלת קוד?</p>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="------"
            value={code}
            onChange={handleCodeChange}
            maxLength={6}
            className="w-full bg-hm-card border border-hm-dim rounded-xl px-4 py-4
                       text-hm-white text-3xl tracking-[0.5em] text-center
                       placeholder-hm-dim focus:outline-none focus:border-hm-red"
            dir="ltr"
            autoFocus
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full bg-hm-red text-hm-white font-bold py-3 rounded-xl
                       disabled:opacity-40 disabled:cursor-not-allowed
                       active:scale-95 transition-transform"
          >
            {loading ? '...' : 'אימות'}
          </button>

          {countdown === 0 && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full border border-hm-dim text-hm-white font-semibold py-3 rounded-xl
                         disabled:opacity-40 active:scale-95 transition-transform"
            >
              {resending ? '...' : 'שלח קוד חדש'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
