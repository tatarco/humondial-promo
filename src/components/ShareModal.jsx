import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { drawShareCard, fillTemplatePlaceholders } from '../lib/shareCard.js';
import { useShareBonus } from '../lib/useShareBonus.js';

export default function ShareModal({ context, cardData, token, campaignId, eventId, onClose }) {
  const shareBonus = useShareBonus(context, { token, campaignId, eventId });
  const {
    shareEnabled, bonusPoints, template,
    hasAttemptedShare, markAttempted,
    claim, claiming, claimed, alreadyClaimed, pointsGranted,
  } = shareBonus;

  const [cardBlobUrl, setCardBlobUrl] = useState(null);
  const [sharing, setSharing]         = useState(false);
  const blobRef = useRef(null);

  useEffect(() => {
    if (!shareEnabled) return;
    drawShareCard(context, cardData, template).then(blob => {
      blobRef.current = blob;
      setCardBlobUrl(URL.createObjectURL(blob));
    }).catch(() => {});
    return () => {
      if (cardBlobUrl) URL.revokeObjectURL(cardBlobUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (claimed) {
      const t = setTimeout(() => onClose?.(), 2200);
      return () => clearTimeout(t);
    }
  }, [claimed, onClose]);

  async function handleShare() {
    if (sharing || !blobRef.current) return;
    setSharing(true);
    try {
      const headline = fillTemplatePlaceholders(template.headline_he || 'הומונדיאל', cardData);
      const hashtags = template.hashtags || '';
      const file = new File([blobRef.current], 'humondial-share.png', { type: 'image/png' });
      await navigator.share({ files: [file], title: headline, text: hashtags });
    } catch {
      // user cancelled or share not supported — still mark attempted
    } finally {
      markAttempted();
      setSharing(false);
    }
  }

  if (!shareEnabled) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      dir="rtl"
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-5 flex flex-col gap-4 relative"
        style={{ background: 'var(--bg, #1a1a2e)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.2)' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-xl leading-none"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >✕</button>

        {/* Card preview */}
        {cardBlobUrl ? (
          <img
            src={cardBlobUrl}
            alt="כרטיס שיתוף"
            style={{
              width: '40%',
              height: 'auto',
              borderRadius: 12,
              display: 'block',
              margin: '0 auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <div
            className="rounded-2xl flex items-center justify-center text-2xl animate-pulse mx-auto"
            style={{ width: '40%', aspectRatio: '9/16', background: 'rgba(255,255,255,0.05)' }}
          >
            📤
          </div>
        )}

        {/* Success / already-claimed state */}
        {claimed ? (
          <div className="text-center py-2 font-bold text-lg" style={{ color: alreadyClaimed ? '#9ca3af' : '#f4c15d' }}>
            {alreadyClaimed
              ? 'כבר קיבלת נקודות על שיתוף היום'
              : `+${pointsGranted} נקודות נוספו! 🎉`}
          </div>
        ) : (
          <>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-4 rounded-2xl font-black text-base"
              style={{
                background: sharing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(to left, var(--red, #d63a36), #b02020)',
                color: '#fff',
              }}
            >
              {sharing ? 'פותח שיתוף...' : '📱 שתף לאינסטגרם / ווצאפ'}
            </button>

            <button
              onClick={claim}
              disabled={!hasAttemptedShare || claiming}
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{
                background: hasAttemptedShare ? '#f4c15d' : 'rgba(255,255,255,0.06)',
                color: hasAttemptedShare ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
                cursor: hasAttemptedShare && !claiming ? 'pointer' : 'not-allowed',
              }}
            >
              {claiming ? 'שומר...' : `✓ שתפתי — תן לי +${bonusPoints} נקודות!`}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
