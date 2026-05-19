import { useState } from 'react';
import { getToken, setToken, clearToken, isLoggedIn } from './lib/session.js';
import { callFn } from './lib/api.js';
import { loadConfig } from './lib/config.js';
import { ConfigProvider } from './contexts/ConfigContext.jsx';
import SplashScreen from './screens/SplashScreen.jsx';
import PhoneScreen  from './screens/PhoneScreen.jsx';
import OtpScreen    from './screens/OtpScreen.jsx';
import LegalScreen  from './screens/LegalScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import PersonalAreaScreen from './screens/PersonalAreaScreen.jsx';
import VenueCodeScreen from './screens/VenueCodeScreen.jsx';
import MyQRScreen from './screens/MyQRScreen.jsx';

const SCREEN = {
  SPLASH:  'splash',
  LOADING: 'loading',
  PHONE:   'phone',
  OTP:     'otp',
  LEGAL:   'legal',
  SHELL:         'shell',
  PERSONAL_AREA: 'personal_area',
  VENUE_CODE:    'venue_code',
  MY_QR:         'my_qr',
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
  const [screen,     setScreen]      = useState(SCREEN.SPLASH);
  const [phone,      setPhone]       = useState('');
  const [token,      setTokenState]  = useState('');
  const [player,     setPlayer]      = useState(null);
  const [isNewUser,  setIsNewUser]   = useState(false);
  const [config, setConfig]           = useState(null);
  const [pendingVenueCode, setPendingVenueCode] = useState('');
  const [pendingCid, setPendingCid]   = useState('');
  const [scrollToTier, setScrollToTier] = useState(false);

  async function handleSplashDone() {
    const urlParams = new URLSearchParams(window.location.search);
    const vc = urlParams.get('venue_code');
    const cid = urlParams.get('cid');
    if (vc) { setPendingVenueCode(vc); setPendingCid(cid || ''); }
    history.replaceState(null, '', window.location.pathname);
    setScreen(SCREEN.LOADING);
    const [sessionResult, cfg] = await Promise.all([
      fetchSession().catch(() => ({ nextScreen: SCREEN.PHONE, playerId: null })),
      loadConfig().catch(() => null),
    ]);
    setConfig(cfg);
    if (sessionResult.nextScreen === SCREEN.LEGAL) {
      setTokenState(getToken());
      setPlayer(sessionResult.playerId);
    } else if (sessionResult.nextScreen === SCREEN.SHELL) {
      setPlayer(sessionResult.playerId);
    }
    if (vc && sessionResult.nextScreen === SCREEN.SHELL) {
      setScreen(SCREEN.VENUE_CODE);
    } else {
      setScreen(sessionResult.nextScreen);
    }
  }

  function handlePhoneSuccess(normalizedPhone, newUser) {
    setPhone(normalizedPhone);
    setIsNewUser(newUser);
    setScreen(SCREEN.OTP);
  }

  function handleOtpSuccess(playerId, tok) {
    setPlayer(playerId);
    setTokenState(tok);
    setScreen(SCREEN.SHELL);
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

  function handlePersonalArea() {
    setScrollToTier(false);
    setScreen(SCREEN.PERSONAL_AREA);
  }

  function handlePersonalAreaTier() {
    setScrollToTier(true);
    setScreen(SCREEN.PERSONAL_AREA);
  }

  function handleBackFromPersonalArea() {
    setScreen(SCREEN.SHELL);
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
          isNewUser={isNewUser}
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
    if (screen === SCREEN.PERSONAL_AREA) {
      return (
        <PersonalAreaScreen
          playerId={player}
          token={getToken()}
          campaignId={config?.id}
          config={config}
          onBack={handleBackFromPersonalArea}
          scrollToTier={scrollToTier}
        />
      );
    }
    if (screen === SCREEN.VENUE_CODE) {
      return (
        <VenueCodeScreen
          token={getToken()}
          campaignId={config?.id || pendingCid}
          prefillCode={pendingVenueCode}
          onBack={() => { setPendingVenueCode(''); setScreen(SCREEN.SHELL); }}
        />
      );
    }
    if (screen === SCREEN.MY_QR) {
      return (
        <MyQRScreen
          token={getToken()}
          campaignId={config?.id}
          onBack={() => setScreen(SCREEN.SHELL)}
        />
      );
    }
    return <HomeScreen
      playerId={player}
      onLogout={handleLogout}
      onPersonalArea={handlePersonalArea}
      onPersonalAreaTier={handlePersonalAreaTier}
      onVenueCode={() => { setPendingVenueCode(''); setScreen(SCREEN.VENUE_CODE); }}
      onMyQR={() => setScreen(SCREEN.MY_QR)}
    />;
  })();

  return <ConfigProvider config={config}>{body}</ConfigProvider>;
}
