import { useState } from 'react';
import { callFn } from '../lib/api.js';

export default function LegalScreen({ token, onSuccess, onBack }) {
  const [terms,    setTerms]    = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const canSubmit = terms && whatsapp && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await callFn('promoAcceptTerms', { token });
      onSuccess();
    } catch (err) {
      setError('שגיאה — נסה שוב');
    } finally {
      setLoading(false);
    }
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

        <h2 className="text-2xl font-bold text-hm-white mb-2 text-right">תנאים והסכמות</h2>
        <p className="text-hm-muted text-sm mb-8 text-right">
          לפני שממשיכים, אנא אשר/י את הפרטים הבאים:
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={e => setTerms(e.target.checked)}
              className="mt-1 w-5 h-5 accent-hm-red flex-shrink-0"
            />
            <span className="text-hm-white text-sm text-right leading-relaxed">
              אני מסכים/ה לתנאי השימוש ומדיניות הפרטיות
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={whatsapp}
              onChange={e => setWhatsapp(e.target.checked)}
              className="mt-1 w-5 h-5 accent-hm-red flex-shrink-0"
            />
            <span className="text-hm-white text-sm text-right leading-relaxed">
              אני מסכים/ה לקבל הודעות WhatsApp במסגרת המשחק
            </span>
          </label>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

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
