export default function AchievementsScreen({ achievements = [], onBack }) {
  const isAchUnlocked = (a) => !!(a.unlocked || a.unlocked_at);

  const unlockedAchievements = achievements
    .filter(isAchUnlocked)
    .sort((a, b) => new Date(b.unlocked_at || 0).getTime() - new Date(a.unlocked_at || 0).getTime());
  const lockedAchievements = achievements
    .filter(a => !isAchUnlocked(a))
    .sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
  const achievementsOrdered = [...unlockedAchievements, ...lockedAchievements];

  return (
    <div className="hm-achievements-bg" dir="rtl">
      <div className="h-dvh overflow-y-auto pb-8">
        <header className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="text-xs px-3 py-2.5 rounded-full border min-h-[44px] flex items-center"
            style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
          >← חזרה</button>
          <div className="text-base font-black" style={{ color: 'var(--text)' }}>הישגים 🏅</div>
          <div style={{ width: 64 }} />
        </header>

        <div className="px-4 space-y-3 mt-2">
          {achievementsOrdered.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-sec)' }}>
              <div className="text-4xl mb-3">🏅</div>
              <div className="text-sm">אין הישגים מוגדרים עדיין</div>
            </div>
          )}
          {achievementsOrdered.map((b) => {
            const done = isAchUnlocked(b);
            return (
              <div
                key={b.id}
                className="flex items-center gap-4 px-4 py-4 rounded-2xl"
                style={{
                  background: done ? 'rgba(244,193,93,0.32)' : 'rgba(255,255,255,0.10)',
                  border: `1px solid ${done ? 'rgba(244,193,93,0.65)' : 'rgba(255,255,255,0.15)'}`,
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  opacity: done ? 1 : 0.75,
                }}
              >
                <span className="text-4xl leading-none flex-shrink-0">{b.badge}</span>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-base font-bold leading-tight" style={{ color: done ? 'var(--gold)' : 'var(--text-sec)' }}>
                    {b.label_he}
                  </div>
                  {b.description_he && (
                    <div className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-sec)' }}>
                      {b.description_he}
                    </div>
                  )}
                  {done && b.bonus_points > 0 && (
                    <div className="text-xs mt-1.5 font-bold" style={{ color: 'var(--gold)' }}>+{b.bonus_points} נ׳ בונוס</div>
                  )}
                  {done && b.unlocked_at && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--text-sec)', opacity: 0.6 }}>
                      {new Date(b.unlocked_at).toLocaleDateString('he-IL')}
                    </div>
                  )}
                </div>
                {done && (
                  <span className="text-xl flex-shrink-0" style={{ color: 'var(--gold)' }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
