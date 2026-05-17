import { useEffect } from 'react';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="min-h-dvh bg-hm-bg flex items-center justify-center relative overflow-hidden">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-tight text-hm-white">
          HUMON<span className="text-hm-red">DIAL</span>
        </h1>
        <p className="text-hm-muted text-lg mt-2 tracking-widest">2026</p>
      </div>
    </div>
  );
}
