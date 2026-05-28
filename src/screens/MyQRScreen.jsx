import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { callFn } from '../lib/api.js';
import { useConfig } from '../contexts/ConfigContext.jsx';
import { tierPerkDisplayRows } from '../lib/tierPerks.js';
import { tierCardAccentClassesFromCampaignTier } from '../lib/tierVisual.js';

export default function MyQRScreen({ token, campaignId, onBack }) {
  const config = useConfig();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const [playerPoints, setPlayerPoints] = useState(0);
  const timerRef = useRef(null);

  async function loadQR() {
    setError('');
    try {
      const r = await callFn('generatePlayerQR', { token, campaign_id: campaignId });
      const d = r?.data ?? r;
      if (!d?.payload) throw new Error('no payload');
      const staffUrl = `https://humondial-promo.pages.dev/staff?qr=${d.payload}`;
      const url = await QRCode.toDataURL(staffUrl, {
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
    callFn('getLeaderboard', { campaign_id: campaignId, token })
      .then(r => {
        const d = r?.data ?? r;
        setPlayerPoints(d?.me?.total_points ?? 0);
      })
      .catch(() => {});
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

  const sortedTiers = [...(config?.tiers ?? [])].sort((a, b) => a.min_points - b.min_points);
  const currentTier = sortedTiers.filter(t => t.min_points <= playerPoints).at(-1);
  const eligibleTiers = currentTier
    ? sortedTiers.filter(t => t.min_points <= currentTier.min_points).reverse()
    : [];

  return (
    <div className="min-h-dvh bg-hm-bg flex flex-col items-center px-6 pt-6 gap-4 pb-8" dir="rtl">
      <button onClick={onBack} className="self-start text-hm-muted text-sm">← חזרה</button>
      <h1 className="text-2xl font-black text-hm-white text-right w-full">ההטבות שלי</h1>

      {error ? (
        <div className="text-red-400 text-center mt-8">{error}</div>
      ) : qrDataUrl ? (
        <>
          <div className="bg-hm-card rounded-2xl p-4 shadow-lg">
            <img src={qrDataUrl} alt="QR" width={280} height={280} />
          </div>
        </>
      ) : (
        <div className="text-hm-muted mt-8">טוען...</div>
      )}

      <p className="text-hm-muted text-sm text-center mt-2">
        הצג למלצרית
      </p>

      {eligibleTiers.length > 0 && (
        <div className="w-full flex flex-col gap-3 mt-2">
          <h2 className="text-lg font-bold text-hm-white text-right">ההטבות שלך</h2>
          {eligibleTiers.map((tier, idx) => {
            const isActive = tier.id === currentTier?.id;
            const colorClass = tierCardAccentClassesFromCampaignTier(tier);
            return (
              <div
                key={tier.id}
                className={`rounded-xl p-4 border ${isActive ? 'border-2' : 'border opacity-70'} ${colorClass}`}
              >
                <div className="font-bold text-base text-right mb-2">{tier.label_he ?? tier.label ?? tier.name}</div>
                <ul className="flex flex-col gap-1">
                  {tierPerkDisplayRows(tier).map(row => (
                    <li key={row.key} className="text-sm text-right flex items-start gap-2 justify-end">
                      <span>{row.text}</span>
                      <span className="mt-0.5">•</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
