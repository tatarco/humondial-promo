import { useState } from 'react';
import { callFn } from '../lib/api.js';

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0'))   return '972' + digits.slice(1);
  return '972' + digits;
}

function isValidPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) || /^972\d{9}$/.test(digits);
}

function isValidNickname(n) {
  return n.trim().length >= 2 && n.trim().length <= 20;
}

export default function PhoneScreen({ onSuccess }) {
  const [phone,    setPhone]    = useState('');
  const [nickname, setNickname] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const canSubmit = isValidPhone(phone) && isValidNickname(nickname) && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await callFn('promoRequestOtp', { phone, nickname: nickname.trim() });
      onSuccess(normalizePhone(phone));
    } catch (err) {
      setError(err.message || 'שגיאה — נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-hm-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-hm-white">
            HUMON<span className="text-hm-red">DIAL</span>
          </h1>
          <p className="text-sm text-hm-muted mt-2">2026</p>
        </div>

        <div className="bg-hm-card rounded-2xl px-4 py-3 mb-6 text-center border border-hm-dim">
          <p className="text-hm-white text-sm font-semibold leading-relaxed">
            🏆 ניחשו, נצחו, אכלו
          </p>
          <p className="text-hm-muted text-xs mt-1">
            פרסים ראשיים: כרטיסים לגמר המונדיאל
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-hm-white font-semibold text-right">כינוי בלוח התוצאות</label>
            <input
              type="text"
              placeholder="כינוי (2–20 תווים)"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              className="w-full bg-hm-card border border-hm-dim rounded-xl px-4 py-3 text-hm-white
                         text-base text-right placeholder-hm-muted
                         focus:outline-none focus:border-hm-red"
              dir="rtl"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-hm-white font-semibold text-right">מספר טלפון</label>
            <input
              type="tel"
              placeholder="05X-XXX-XXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              inputMode="numeric"
              className="w-full bg-hm-card border border-hm-dim rounded-xl px-4 py-3 text-hm-white
                         text-lg tracking-wider text-right placeholder-hm-muted
                         focus:outline-none focus:border-hm-red"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-hm-red text-hm-white font-bold py-3 rounded-xl
                       disabled:opacity-40 disabled:cursor-not-allowed
                       active:scale-95 transition-transform"
          >
            {loading ? '...' : 'המשך'}
          </button>
        </form>
      </div>
    </div>
  );
}
