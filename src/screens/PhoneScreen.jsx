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

export default function PhoneScreen({ onSuccess }) {
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await callFn('promoRequestOtp', { phone });
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
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight text-hm-white">
            HUMON<span className="text-hm-red">DIAL</span>
          </h1>
          <p className="text-sm text-hm-muted mt-2">2026</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm text-hm-white font-semibold">מספר טלפון</label>
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

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!isValidPhone(phone) || loading}
            className="w-full bg-hm-red text-hm-white font-bold py-3 rounded-xl
                       disabled:opacity-40 disabled:cursor-not-allowed
                       active:scale-95 transition-transform"
          >
            {loading ? '...' : 'המשך'}
          </button>
        </form>

        <p className="text-xs text-hm-muted text-center mt-8 leading-relaxed">
          בהמשך אתה מסכים לתנאי השימוש ומדיניות הפרטיות.
          <br />אנחנו שומרים את מספר הטלפון שלך בלבד לצורכי אימות.
        </p>
      </div>
    </div>
  );
}
