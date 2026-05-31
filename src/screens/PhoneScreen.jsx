import { useState } from 'react';
import { callFn } from '../lib/api.js';
import CampaignHeaderBrand from '../components/CampaignHeaderBrand.jsx';

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
  const [phone,     setPhone]    = useState('');
  const [nickname,  setNickname] = useState('');
  const [terms,     setTerms]    = useState(false);
  const [whatsapp,  setWhatsapp] = useState(false);
  const [phase,     setPhase]    = useState('phone'); // 'phone' | 'checking' | 'new-user' | 'returning'
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState('');

  const phoneValid   = isValidPhone(phone);
  const canCheck     = phoneValid && !loading;
  const canSubmitNew = phoneValid && isValidNickname(nickname) && terms && whatsapp && !loading;

  async function handleCheck(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { isNewUser } = await callFn('promoCheckPhone', { phone });
      if (!isNewUser) {
        await callFn('promoRequestOtp', { phone });
        onSuccess(normalizePhone(phone), false);
        return;
      }
      setPhase('new-user');
    } catch {
      setError('שגיאה — נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = phase === 'new-user'
        ? { phone, nickname: nickname.trim() }
        : { phone };
      await callFn('promoRequestOtp', payload);
      onSuccess(normalizePhone(phone), phase === 'new-user');
    } catch (err) {
      setError(err.message || 'שגיאה — נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  const isPhasePhone = phase === 'phone';
  const isNewUser    = phase === 'new-user';

  return (
    <div
      className="min-h-dvh flex flex-col justify-end px-6 pb-10"
      style={{
        backgroundImage: 'url(/assets/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-sm mx-auto">
        <form onSubmit={isPhasePhone ? handleCheck : handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1">
            <label className="text-sm text-hm-white font-semibold text-right">מספר טלפון</label>
            <input
              type="tel"
              placeholder="05X-XXX-XXXX"
              value={phone}
              onChange={e => { setPhone(e.target.value); setPhase('phone'); setError(''); }}
              inputMode="numeric"
              disabled={loading}
              className="w-full bg-hm-card border border-hm-dim rounded-xl px-4 py-3 text-hm-white
                         text-lg tracking-wider text-right placeholder-hm-muted
                         focus:outline-none focus:border-hm-red disabled:opacity-60"
              dir="ltr"
            />
          </div>

          {isNewUser && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-hm-white font-semibold text-right">כינוי בלוח התוצאות</label>
                <input
                  type="text"
                  placeholder="כינוי (2–20 תווים)"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  maxLength={20}
                  autoFocus
                  className="w-full bg-hm-card border border-hm-dim rounded-xl px-4 py-3 text-hm-white
                             text-base text-right placeholder-hm-muted
                             focus:outline-none focus:border-hm-red"
                  dir="rtl"
                />
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-hm-red flex-shrink-0"
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
                    className="mt-0.5 w-5 h-5 accent-hm-red flex-shrink-0"
                  />
                  <span className="text-hm-white text-sm text-right leading-relaxed">
                    אני מסכים/ה לקבל הודעות WhatsApp במסגרת המשחק
                  </span>
                </label>
              </div>
            </>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPhasePhone ? !canCheck : !canSubmitNew}
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

