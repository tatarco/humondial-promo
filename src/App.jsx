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
import LeaderboardScreen from './screens/LeaderboardScreen.jsx';
import BranchBookingScreen from './screens/BranchBookingScreen.jsx';
import LedgerScreen from './screens/LedgerScreen.jsx';

const SCREEN = {
  SPLASH:  'splash',
  LOADING: 'loading',
  CONFIG_INVALID: 'config_invalid',
  PHONE:   'phone',
  OTP:     'otp',
  LEGAL:   'legal',
  SHELL:         'shell',
  PERSONAL_AREA: 'personal_area',
  VENUE_CODE:    'venue_code',
  MY_QR:         'my_qr',
  LEADERBOARD:      'leaderboard',
  BRANCH_BOOKING:   'branch_booking',
  LEDGER:           'ledger',
};

async function fetchSession(campaignId) {
  if (!isLoggedIn()) return { nextScreen: SCREEN.PHONE, playerId: null };
  try {
    const payload = { token: getToken() };
    if (campaignId) payload.campaign_id = campaignId;
    const { valid, playerId, termsAccepted } = await callFn('promoValidateSession', payload);
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
  const [configBrokenReason, setConfigBrokenReason] = useState('');
  const [pendingVenueCode, setPendingVenueCode] = useState('');
  const [pendingCid, setPendingCid]   = useState('');
  const [bookingContext, setBookingContext]       = useState(null);
  const [venueCodeEntryContext, setVenueCodeEntryContext] = useState('neutral');

  const UUID_CTX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function openBranchBooking(ctx) {
    if (
      ctx &&
      typeof ctx === 'object' &&
      typeof ctx.matchId === 'string' &&
      UUID_CTX.test(ctx.matchId.trim())
    ) {
      const mid = ctx.matchId.trim();
      let kick = ctx.matchKickoffUtc;
      if (kick != null && typeof kick !== 'string') kick = null;
      setBookingContext({ matchId: mid, matchKickoffUtc: kick || null });
    } else {
      setBookingContext(null);
    }
    setScreen(SCREEN.BRANCH_BOOKING);
  }

  async function handleSplashDone() {
    const urlParams = new URLSearchParams(window.location.search);
    const vc = urlParams.get('venue_code');
    const cid = urlParams.get('cid');
    if (vc) { setPendingVenueCode(vc); setPendingCid(cid || ''); }
    history.replaceState(null, '', window.location.pathname);
    setScreen(SCREEN.LOADING);
    let cfg = null;
    try {
      cfg = await loadConfig();
      setConfigBrokenReason('');
      setConfig(cfg);
    } catch (e) {
      setConfig(null);
      const msg = e instanceof Error ? e.message : String(e || 'campaign_config_invalid');
      setConfigBrokenReason(msg || 'campaign_config_invalid');
      setScreen(SCREEN.CONFIG_INVALID);
      return;
    }
    const sessionResult = await fetchSession(cfg.id).catch(() => ({ nextScreen: SCREEN.PHONE, playerId: null }));
    if (sessionResult.nextScreen === SCREEN.LEGAL) {
      setTokenState(getToken());
      setPlayer(sessionResult.playerId);
    } else if (sessionResult.nextScreen === SCREEN.SHELL) {
      setPlayer(sessionResult.playerId);
    }
    if (vc && sessionResult.nextScreen === SCREEN.SHELL) {
      setVenueCodeEntryContext('neutral');
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
    setScreen(SCREEN.PERSONAL_AREA);
  }

  const inner = (() => {
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
          token={getToken()}
          campaignId={config?.id}
          onBack={() => setScreen(SCREEN.SHELL)}
          onLeaderboard={() => setScreen(SCREEN.LEADERBOARD)}
          onLedger={() => setScreen(SCREEN.LEDGER)}
        />
      );
    }
    if (screen === SCREEN.LEDGER) {
      return (
        <LedgerScreen
          token={getToken()}
          campaignId={config?.id}
          onBack={() => setScreen(SCREEN.PERSONAL_AREA)}
        />
      );
    }
    if (screen === SCREEN.VENUE_CODE) {
      return (
        <VenueCodeScreen
          token={getToken()}
          campaignId={config?.id || pendingCid}
          prefillCode={pendingVenueCode}
          entryContext={venueCodeEntryContext}
          onBack={() => { setPendingVenueCode(''); setVenueCodeEntryContext('neutral'); setScreen(SCREEN.SHELL); }}
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
    if (screen === SCREEN.LEADERBOARD) {
      return (
        <LeaderboardScreen
          token={getToken()}
          campaignId={config?.id}
          onBack={() => setScreen(SCREEN.SHELL)}
          onBranchBooking={openBranchBooking}
        />
      );
    }
    if (screen === SCREEN.BRANCH_BOOKING) {
      return (
        <BranchBookingScreen
          token={getToken()}
          campaignId={config?.id}
          tableBookingPoints={config?.table_booking_points}
          bookingContext={bookingContext}
          onBack={() => { setBookingContext(null); setScreen(SCREEN.SHELL); }}
        />
      );
    }
    return <HomeScreen
      playerId={player}
      onLogout={handleLogout}
      onPersonalArea={handlePersonalArea}
      onVenueCode={(ctx = 'neutral') => {
        setVenueCodeEntryContext(
          ctx === 'delivery' ? 'delivery' : ctx === 'venue' ? 'venue' : 'neutral',
        );
        setPendingVenueCode('');
        setScreen(SCREEN.VENUE_CODE);
      }}
      onMyQR={() => setScreen(SCREEN.MY_QR)}
      onBranchBooking={openBranchBooking}
    />;
  })();

  if (screen === SCREEN.CONFIG_INVALID) {
    return (
      <div className="min-h-dvh bg-hm-bg flex flex-col items-center justify-center gap-4 px-6 text-center" dir="rtl">
        <div className="text-lg font-black" style={{ color: 'var(--text, #fff)' }}>לא ניתן לטעון את הגדרות הקמפיין</div>
        <div className="text-sm max-w-md break-words" style={{ color: 'var(--text-sec, rgba(246,239,237,0.65))' }}>{configBrokenReason}</div>
        <button type="button" className="hm-btn-primary px-8 py-2.5 text-sm font-bold" onClick={() => window.location.reload()}>
          נסה שוב
        </button>
      </div>
    );
  }

  return <ConfigProvider config={config}>{inner}</ConfigProvider>;
}
