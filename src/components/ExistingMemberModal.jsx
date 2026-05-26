import { createPortal } from 'react-dom';
import { useConfig } from '../contexts/ConfigContext.jsx';

export default function ExistingMemberModal({ bonusPoints, tierName, onClose }) {
  const config = useConfig();
  const mc = config?.modal_copy ?? {};

  const title = mc.existing_member_title_he || 'ברוך הבא בחזרה!';
  const body = mc.existing_member_body_he
    || `זיהינו שאתה כבר חבר מועדון KOMO. כאות הוקרה — אתה מתחיל מדרגת ${tierName || 'כסף'} עם בונוס נקודות!`;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', zIndex: 9999 }}
      dir="rtl"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-3"
        style={{ background: '#1e1e35', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="text-5xl mt-2">🤝</div>

        <div
          className="text-xs font-bold px-3 py-0.5 rounded-full"
          style={{
            background: 'rgba(52,199,89,0.15)',
            color: '#34c759',
            border: '1px solid rgba(52,199,89,0.3)',
          }}
        >
          חבר KOMO מוכר
        </div>

        <div className="text-white font-black text-lg text-center">{title}</div>
        <div className="text-white/50 text-sm text-center leading-relaxed">{body}</div>

        {bonusPoints > 0 && (
          <div
            className="w-full rounded-xl p-3 flex items-center justify-center gap-3"
            style={{ background: 'rgba(244,193,93,0.1)', border: '1px solid rgba(244,193,93,0.25)' }}
          >
            <span className="text-2xl">🥈</span>
            <div className="text-right">
              <div className="text-yellow-400 font-black text-xl">+{bonusPoints} נקודות</div>
              <div className="text-white/40 text-xs">מתחיל מדרגת {tierName}</div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-black text-sm text-white mt-1"
          style={{ background: 'linear-gradient(to left, #d63a36, #b02020)' }}
        >
          יאללה נתחיל! 🚀
        </button>
      </div>
    </div>,
    document.body,
  );
}
