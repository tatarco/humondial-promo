import { useEffect } from 'react';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="min-h-dvh bg-hm-bg flex items-center justify-center">
      <img
        src="/humondial-splash.jpg"
        alt="Humondial 2026"
        className="w-full h-full object-cover absolute inset-0"
      />
    </div>
  );
}
