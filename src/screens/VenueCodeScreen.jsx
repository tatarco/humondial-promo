import { useState, useEffect } from 'react';
import { callFn } from '../lib/api.js';

function AchievementToast({ achievement, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-hm-card border border-hm-red rounded-2xl px-5 py-4 shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
      <span className="text-3xl">{achievement.badge}</span>
      <div>
        <p className="text-hm-white font-bold text-sm">הישג חדש!</p>
        <p className="text-hm-muted text-xs">{achievement.label_he}</p>
        {achievement.bonus_points > 0 && (
          <p className="text-hm-red text-xs font-bold">+{achievement.bonus_points} נקודות</p>
        )}
      </div>
    </div>
  );
}

export default function VenueCodeScreen({ token, campaignId, prefillCode, onBack }) {
  const [code, setCode] = useState(prefillCode || '');
  const [status, setStatus] = useState('idle');
  const [pointsGranted, setPointsGranted] = useState(0);
  const [pendingAchievements, setPendingAchievements] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (code.length !== 6) return;
    setStatus('loading');
    try {
      const r = await callFn('redeemVenueCode', { token, campaign_id: campaignId, code });
      const d = r?.data ?? r;
      if (d?.success) {
        setPointsGranted(d.points_granted ?? 0);
        setStatus('success');
        const unlocked = d.achievements_unlocked ?? [];
        if (unlocked.length) setPendingAchievements(unlocked);
      } else if (d?.already_redeemed) {
        setStatus('already_redeemed');
      } else {
        setStatus('invalid_code');
      }
    } catch {
      setStatus('invalid_code');
    }
  }

  return (
    <div className="min-h-dvh bg-hm-bg flex flex-col items-center justify-center px-6 gap-6" dir="rtl">
      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievement={pendingAchievements[0]}
          onClose={() => setPendingAchievements(prev => prev.slice(1))}
        />
      )}
      <button onClick={onBack} className="self-start text-hm-muted text-sm">← חזרה</button>

      <h1 className="text-2xl font-black text-hm-white text-right w-full">הזן קוד ביקור</h1>

      {status === 'success' && (
        <div className="w-full bg-green-900/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-hm-white text-xl font-bold">קיבלת {pointsGranted} נקודות!</div>
        </div>
      )}

      {status === 'already_redeemed' && (
        <div className="w-full bg-yellow-900/50 rounded-xl p-4 text-center">
          <div className="text-hm-white">כבר קיבלת נקודות ביקור היום</div>
        </div>
      )}

      {status !== 'success' && status !== 'already_redeemed' && (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setStatus('idle'); }}
            placeholder="000000"
            className="w-full text-center text-4xl font-mono tracking-widest bg-hm-card border border-hm-muted rounded-xl px-4 py-5 text-hm-white"
          />
          {status === 'invalid_code' && (
            <div className="text-red-400 text-center text-sm">קוד שגוי — נסה שוב</div>
          )}
          <button
            type="submit"
            disabled={code.length !== 6 || status === 'loading'}
            className="w-full bg-hm-red text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50"
          >
            {status === 'loading' ? 'בודק...' : 'שלח'}
          </button>
        </form>
      )}
    </div>
  );
}
