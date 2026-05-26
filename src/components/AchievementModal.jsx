import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConfig } from '../contexts/ConfigContext.jsx';
import ShareModal from './ShareModal.jsx';

export default function AchievementModal({ achievement, token, campaignId, onClose }) {
  const config = useConfig();
  const mc = config?.modal_copy ?? {};
  const isTierUpgrade = achievement?.type === 'tier_reached';
  const [showShare, setShowShare] = useState(false);

  const title = isTierUpgrade
    ? (mc.tier_upgrade_title_he || 'עלית לדרגה!')
    : (mc.achievement_title_he || 'הישג חדש!');
  const body = isTierUpgrade
    ? (mc.tier_upgrade_body_he || 'גישה להטבות הכי שוות של הומונדיאל')
    : (mc.achievement_body_he || 'כל הכבוד, המשך כך!');
  const shareCta = mc.share_cta_he || '📱 שתף ברשתות חברתיות';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (showShare) {
    return (
      <ShareModal
        context={isTierUpgrade ? 'tier_upgrade' : 'achievement_share'}
        eventId={isTierUpgrade ? (achievement.tier ?? null) : null}
        cardData={{ badge: achievement.badge, label: achievement.label_he }}
        token={token}
        campaignId={campaignId}
        onClose={onClose}
      />
    );
  }

  if (isTierUpgrade) {
    // Full-screen tier upgrade
    return createPortal(
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-5 py-8"
        style={{
          background: 'radial-gradient(ellipse at 50% 25%, rgba(214,58,54,0.3) 0%, #1a1a2e 65%)',
          zIndex: 9999,
        }}
        dir="rtl"
      >
        <div className="text-6xl mb-2">{achievement.badge ?? '🏅'}</div>
        <div className="text-lg tracking-widest mb-3 opacity-60">✨✨✨</div>
        <div className="text-white/55 text-xs mb-1">{title}</div>
        {achievement.tier && (() => {
          const tierLabel = (config?.tiers ?? []).find(t => t.id === achievement.tier)?.label_he;
          return tierLabel ? (
            <div className="text-yellow-400 font-black text-2xl mb-2 tracking-wide">{tierLabel}</div>
          ) : null;
        })()}
        <div className="text-white/45 text-xs mb-4 text-center">{body}</div>
        {(achievement.bonus_points ?? 0) > 0 && (
          <div
            className="rounded-lg px-4 py-2 mb-4 text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            +{achievement.bonus_points} נקודות בונוס
          </div>
        )}
        <button
          onClick={() => setShowShare(true)}
          className="w-full max-w-xs py-3 rounded-2xl font-black text-sm text-white mb-3"
          style={{ background: 'linear-gradient(to left, #d63a36, #b02020)' }}
        >
          {shareCta}
        </button>
        <button onClick={onClose} className="text-white/30 text-xs">המשך</button>
      </div>,
      document.body,
    );
  }

  // Center modal — generic achievement
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      dir="rtl"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-3 relative"
        style={{ background: '#1e1e35', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-base"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >✕</button>

        <div className="text-5xl mt-2">{achievement.badge ?? '🏆'}</div>

        <div
          className="text-xs font-bold px-3 py-0.5 rounded-full"
          style={{
            background: 'rgba(244,193,93,0.15)',
            color: '#f4c15d',
            border: '1px solid rgba(244,193,93,0.3)',
          }}
        >
          {title}
        </div>

        <div className="text-white font-bold text-base text-center">{achievement.label_he}</div>
        <div className="text-white/45 text-xs text-center">{body}</div>

        {(achievement.bonus_points ?? 0) > 0 && (
          <div
            className="font-bold text-xl px-4 py-1.5 rounded-lg"
            style={{ background: 'rgba(244,193,93,0.1)', color: '#f4c15d' }}
          >
            +{achievement.bonus_points} נקודות
          </div>
        )}

        <button
          onClick={() => setShowShare(true)}
          className="w-full py-3 rounded-2xl font-black text-sm text-white"
          style={{ background: 'linear-gradient(to left, #d63a36, #b02020)' }}
        >
          {shareCta}
        </button>

        <button onClick={onClose} className="text-white/30 text-xs">המשך</button>
      </div>
    </div>,
    document.body,
  );
}
