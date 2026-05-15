import { useState } from 'react';
import { getToken, setToken, clearToken, isLoggedIn } from './lib/session.js';
import { callFn } from './lib/api.js';
import { loadConfig } from './lib/config.js';
import { ConfigProvider } from './contexts/ConfigContext.jsx';
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

async function fetchSession() {
  if (!isLoggedIn()) return { nextScreen: SCREEN.PHONE, playerId: null };
  try {
    const { valid, playerId, termsAccepted } = await callFn('promoValidateSession', { token: getToken() });
    if (!valid)         return { nextScreen: SCREEN.PHONE, playerId: null };
    if (!termsAccepted) return { nextScreen: SCREEN.LEGAL, playerId };
    return { nextScreen: SCREEN.SHELL, playerId };
  } catch {
    return { nextScreen: SCREEN.PHONE, playerId: null };
  }
}

export default function App() {
  const [screen, setScreen]     = useState(SCREEN.SPLASH);
  const [phone,  setPhone]      = useState('');
  const [token,  setTokenState] = useState('');
  const [player, setPlayer]     = useState(null);
  const [config, setConfig]     = useState(null);

  async function handleSplashDone() {
    setScreen(SCREEN.LOADING);
    let sessionResult = { nextScreen: SCREEN.PHONE, playerId: null };
    let cfg = null;
    try {
      [sessionResult, cfg] = await Promise.all([fetchSession(), loadConfig()]);
    } catch {
      // config or session failed — fall through with defaults (phone screen, no config)
    }
    setConfig(cfg);
    if (sessionResult.nextScreen === SCREEN.LEGAL) {
      setTokenState(getToken());
      setPlayer(sessionResult.playerId);
    } else if (sessionResult.nextScreen === SCREEN.SHELL) {
      setPlayer(sessionResult.playerId);
    }
    setScreen(sessionResult.nextScreen);
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
    clearToken();
    setPlayer(null);
    setPhone('');
    setTokenState('');
    setScreen(SCREEN.PHONE);
  }

  const body = (() => {
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
          onBack={() => { setTokenState(''); setScreen(SCREEN.PHONE); }}
        />
      );
    }
    return <ShellScreen playerId={player} onLogout={handleLogout} />;
  })();

  return <ConfigProvider config={config}>{body}</ConfigProvider>;
}
