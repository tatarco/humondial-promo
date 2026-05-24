export default function TierRequirementBars({ requirements, density = 'default' }) {
  const rows = (requirements || []).filter((x) => x.required > 0);
  if (!rows.length) return null;
  const tight = density === 'tight';

  return (
    <div className={tight ? 'space-y-1.5 mt-2' : 'space-y-2.5 mt-3'} dir="rtl">
      {rows.map((r, i) => {
        const req = Math.max(1, r.required);
        const cur = Math.max(0, typeof r.current === 'number' ? r.current : 0);
        const p = Math.min(100, Math.round((cur / req) * 100));
        const leftGrow = Math.max(0, 100 - p);
        return (
          <div key={r.key ?? i}>
            <div className={`flex flex-row-reverse items-baseline justify-between gap-2 ${tight ? 'mb-0.5' : 'mb-1'}`}>
              <span className={`font-bold truncate text-right flex-1 min-w-0 ${tight ? 'text-[9px]' : 'text-[10px]'}`} style={{ color: 'var(--text)' }}>
                {r.label_he}
              </span>
              <span
                dir="ltr"
                className={`tabular-nums shrink-0 font-black ${tight ? 'text-[9px]' : 'text-[10px]'}`}
                style={{ color: r.satisfied ? 'rgb(74,222,128)' : 'rgb(253,224,71)' }}
              >
                {cur}/{r.required}{r.satisfied ? ' ✓' : ''}
              </span>
            </div>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full"
              dir="ltr"
              lang="en"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <div className="absolute inset-0 flex flex-row" dir="ltr">
                  <div style={{ flex: `${leftGrow} 0 0px`, minHeight: '100%' }} aria-hidden />
                  <div
                    style={{
                      flex: `${p} 0 0px`,
                      minHeight: '100%',
                      borderRadius: 9999,
                      background: 'linear-gradient(to right, var(--red), var(--gold))',
                    }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
