import { useState } from 'react';
import { callFn } from '../lib/api.js';
import { setToken } from '../lib/session.js';

export default function OtpScreen({ phone, onSuccess, onBack }) {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const displayPhone = phone.replace(/^(972)(\d+)(\d{4})$/, '+972-****$3');

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, playerId } = await callFn('promoVerifyOtp', { phone, code });
      setToken(token);
      onSuccess(playerId, token);
    } catch (err) {
      setError('קוד שגוי או פג תוקף — נסה שוב');
    } finally {
      setLoading(false);
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
          className="text-hm-muted text-sm mb-8 flex items-center gap-1 hover:text-hm-white"
        >
          ← חזור
        </button>

        <h2 className="text-2xl font-bold text-hm-white mb-2">הזן קוד אימות</h2>
        <p className="text-hm-muted text-sm mb-8">
          שלחנו קוד ב-WhatsApp למספר {displayPhone}
        </p>

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
        </form>
      </div>
    </div>
  );
}
