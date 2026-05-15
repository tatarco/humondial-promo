import { useState, useEffect } from 'react';
import { getToken, isLoggedIn } from './lib/session.js';
import { callFn } from './lib/api.js';
import PhoneScreen from './screens/PhoneScreen.jsx';
import OtpScreen   from './screens/OtpScreen.jsx';
import ShellScreen from './screens/ShellScreen.jsx';

const SCREEN = {
  LOADING:  'loading',
  PHONE:    'phone',
  OTP:      'otp',
  SHELL:    'shell',
};

export default function App() {
  const [screen, setScreen]   = useState(SCREEN.LOADING);
  const [phone,  setPhone]    = useState('');
  const [player, setPlayer]   = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) { setScreen(SCREEN.PHONE); return; }
    callFn('promoValidateSession', { token: getToken() })
      .then(({ valid, playerId }) => {
        if (valid) { setPlayer(playerId); setScreen(SCREEN.SHELL); }
        else       { setScreen(SCREEN.PHONE); }
      })
      .catch(() => setScreen(SCREEN.PHONE));
  }, []);

  function handlePhoneSuccess(normalizedPhone) {
    setPhone(normalizedPhone);
    setScreen(SCREEN.OTP);
  }

  function handleOtpSuccess(playerId) {
    setPlayer(playerId);
    setScreen(SCREEN.SHELL);
  }

  function handleLogout() {
    setPlayer(null);
    setPhone('');
    setScreen(SCREEN.PHONE);
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

  return <ShellScreen playerId={player} onLogout={handleLogout} />;
}
