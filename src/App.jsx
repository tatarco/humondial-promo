import { useState } from 'react';
import { getToken, setToken, isLoggedIn } from './lib/session.js';
import { callFn } from './lib/api.js';
import SplashScreen from './screens/SplashScreen.jsx';
import PhoneScreen  from './screens/PhoneScreen.jsx';
import OtpScreen    from './screens/OtpScreen.jsx';
import LegalScreen  from './screens/LegalScreen.jsx';
import ShellScreen  from './screens/ShellScreen.jsx';

const SCREEN = {
  SPLASH:  'splash',
  LOADING: 'loading',
  PHONE:   'phone',
  OTP:     'otp',
  LEGAL:   'legal',
  SHELL:   'shell',
};

export default function App() {
  const [screen, setScreen]     = useState(SCREEN.SPLASH);
  const [phone,  setPhone]      = useState('');
  const [token,  setTokenState] = useState('');
  const [player, setPlayer]     = useState(null);

  function validateSession() {
    if (!isLoggedIn()) { setScreen(SCREEN.PHONE); return; }
    callFn('promoValidateSession', { token: getToken() })
      .then(({ valid, playerId, termsAccepted }) => {
        if (!valid)         { setScreen(SCREEN.PHONE); return; }
        if (!termsAccepted) { setTokenState(getToken()); setPlayer(playerId); setScreen(SCREEN.LEGAL); return; }
        setPlayer(playerId);
        setScreen(SCREEN.SHELL);
      })
      .catch(() => setScreen(SCREEN.PHONE));
  }

  function handleSplashDone() {
    setScreen(SCREEN.LOADING);
    validateSession();
  }

  function handlePhoneSuccess(normalizedPhone) {
    setPhone(normalizedPhone);
    setScreen(SCREEN.OTP);
  }

  function handleOtpSuccess(playerId, tok) {
    setPlayer(playerId);
    setTokenState(tok);
    setScreen(SCREEN.LEGAL);
  }

  function handleLegalSuccess() {
    setScreen(SCREEN.SHELL);
  }

  function handleLogout() {
    setPlayer(null);
    setPhone('');
    setTokenState('');
    setScreen(SCREEN.PHONE);
  }

  if (screen === SCREEN.SPLASH) {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  if (screen === SCREEN.LOADING) {
    return (
      <div className="min-h-dvh bg-hm-bg flex items-center justify-center">
        <div className="text-hm-red text-2xl font-black tracking-tight animate-pulse">
          HUMON<span className="text-hm-white">DIAL</span>
        </div>
      </div>
    );
  }

  if (screen === SCREEN.PHONE) {
    return <PhoneScreen onSuccess={handlePhoneSuccess} />;
  }

  if (screen === SCREEN.OTP) {
    return (
      <OtpScreen
        phone={phone}
        onSuccess={handleOtpSuccess}
        onBack={() => setScreen(SCREEN.PHONE)}
      />
    );
  }

  if (screen === SCREEN.LEGAL) {
    return (
      <LegalScreen
        token={token}
        onSuccess={handleLegalSuccess}
        onBack={() => setScreen(SCREEN.PHONE)}
      />
    );
  }

  return <ShellScreen playerId={player} onLogout={handleLogout} />;
}
