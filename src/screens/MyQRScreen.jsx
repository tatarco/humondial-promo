import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { callFn } from '../lib/api.js';

export default function MyQRScreen({ token, campaignId, onBack }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  async function loadQR() {
    setError('');
    try {
      const r = await callFn('generatePlayerQR', { token, campaign_id: campaignId });
      const d = r?.data ?? r;
      if (!d?.payload) throw new Error('no payload');
      const url = await QRCode.toDataURL(d.payload, {
        width: 280,
        margin: 2,
        color: { dark: '#ffffff', light: '#1a1a2e' },
      });
      setQrDataUrl(url);
      setExpiresAt(d.expires_at);
    } catch {
      setError('שגיאה בטעינת ה-QR');
    }
  }

  useEffect(() => {
    loadQR();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const s = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s === 0) { clearInterval(timerRef.current); loadQR(); }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [expiresAt]);

  return (
    <div className="min-h-dvh bg-hm-bg flex flex-col items-center px-6 pt-6 gap-4" dir="rtl">
      <button onClick={onBack} className="self-start text-hm-muted text-sm">← חזרה</button>
      <h1 className="text-2xl font-black text-hm-white text-right w-full">ה-QR שלי</h1>

      {error ? (
        <div className="text-red-400 text-center mt-8">{error}</div>
      ) : qrDataUrl ? (
        <>
          <div className="bg-hm-card rounded-2xl p-4 shadow-lg">
            <img src={qrDataUrl} alt="QR" width={280} height={280} />
          </div>
          {secondsLeft > 0 && (
            <div className="text-hm-muted text-sm">מתחדש בעוד {secondsLeft} שניות</div>
          )}
        </>
      ) : (
        <div className="text-hm-muted mt-8">טוען...</div>
      )}

      <p className="text-hm-muted text-sm text-center mt-2">
        הצג את הקוד לנציג המסעדה לאימות הרמה שלך
      </p>
    </div>
  );
}
