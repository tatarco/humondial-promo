import { useEffect, useRef } from 'react';

export default function SplashScreen({ onDone }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const fallback = setTimeout(onDone, 8000);
    return () => clearTimeout(fallback);
  }, [onDone]);

  return (
    <div className="min-h-dvh relative overflow-hidden bg-black">
      <video
        ref={videoRef}
        src="/assets/splash.mp4"
        autoPlay
        muted
        playsInline
        onEnded={onDone}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
