import { useEffect } from 'react';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="min-h-dvh relative overflow-hidden">
      <img
        src="/assets/splash.jpg"
        alt="HUMONDIAL 2026"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
