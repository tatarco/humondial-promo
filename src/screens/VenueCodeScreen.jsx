import { useState, useEffect } from 'react';
import { callFn } from '../lib/api.js';
import ShareModal from '../components/ShareModal.jsx';
import AchievementModal from '../components/AchievementModal.jsx';

const VENUE_CODE_COPY = {
  neutral: {
    heading: 'הזן קוד ביקור',
    subtitle: 'הזינו כאן את שש הספרות מהסניף או מתוך אישור סיום ההזמנה למשלוח.',
  },
  delivery: {
    heading: 'קוד אחרי משלוח',
    subtitle: 'אחרי שההזמנה הגיעה — הזינו את הקוד שקיבלתם מתוך אישור המשלוח או מתוך פרטי ההזמנה באפליקציה.',
  },
  venue: {
    heading: 'הגעתי לסניף',
    subtitle: 'הזינו את קוד הביקור שהמארח או ההזמנה קיבלה בסניף יומנגס.',
  },
};


export default function VenueCodeScreen({ token, campaignId, prefillCode, entryContext = 'neutral', onBack }) {
  const [code, setCode] = useState(prefillCode || '');
  const [status, setStatus] = useState('idle');
  const [pointsGranted, setPointsGranted] = useState(0);
  const [bookingReleased, setBookingReleased] = useState(0);
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [shareData, setShareData] = useState(null);
  const [showShare, setShowShare] = useState(false);

  const copy = VENUE_CODE_COPY[entryContext] ?? VENUE_CODE_COPY.neutral;

  useEffect(() => {
    setCode(prefillCode || '');
  }, [prefillCode]);

  useEffect(() => {
    setStatus('idle');
  }, [entryContext]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (code.length !== 6) return;
    setStatus('loading');
    try {
      const r = await callFn('redeemVenueCode', { token, campaign_id: campaignId, code });
      const d = r?.data ?? r;
      if (d?.success) {
        const earned = d.points_granted ?? 0;
        setPointsGranted(earned);
        setBookingReleased(d.booking_points_released ?? 0);
        setStatus('success');
        const unlocked = d.achievements_unlocked ?? [];
        if (unlocked.length) setPendingAchievements(unlocked);
        callFn('getLeaderboard', { token, campaign_id: campaignId })
          .then(lr => {
            const ld = lr?.data ?? lr;
            setShareData({
              points_earned: earned,
              points: ld?.me?.total_points ?? 0,
              rank: ld?.me?.rank ?? null,
              tier_name: ld?.me?.tier?.label_he ?? '',
            });
            setShowShare(true);
          })
          .catch(() => setShowShare(true));
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
      {showShare && (
        <ShareModal
          context={entryContext === 'delivery' ? 'delivery' : 'venue_visit'}
          cardData={shareData || { points_earned: pointsGranted, points: pointsGranted }}
          token={token}
          campaignId={campaignId}
          onClose={() => setShowShare(false)}
        />
      )}
      {pendingAchievements.length > 0 && (
        <AchievementModal
          achievement={pendingAchievements[0]}
          token={token}
          campaignId={campaignId}
          onClose={() => setPendingAchievements(prev => prev.slice(1))}
        />
      )}
      <button type="button" onClick={onBack} className="self-start text-hm-muted text-sm">← חזרה</button>

      <div className="w-full space-y-2">
        <h1 className="text-2xl font-black text-hm-white text-right w-full">{copy.heading}</h1>
        <p className="text-sm text-hm-muted text-right leading-snug">{copy.subtitle}</p>
      </div>

      {status === 'success' && (
        <div className="w-full bg-green-900/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-hm-white text-xl font-bold">קיבלת {pointsGranted} נקודות ביקור!</div>
          {bookingReleased > 0 && (
            <div className="text-hm-muted text-sm mt-2">+{bookingReleased} נק׳ מהזמנת השולחן הופעלו עכשיו</div>
          )}
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
            dir="ltr"
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
