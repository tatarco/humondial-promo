import { useState, useEffect, useRef } from 'react';
import { getToken, setToken, clearToken, isLoggedIn } from './lib/session.js';
import { callFn } from './lib/api.js';
import { loadConfig, PROMO_CAMPAIGN_ID } from './lib/config.js';
import { authenticatedRouteFromHash } from './lib/hashRoute.js';
import { resolveBookingBranchesForCampaign } from './lib/bookingBranches.js';
import { startListMatchesWarm } from './lib/warmListMatches.js';
import { startHomeAuthenticatedWarm } from './lib/warmHomeAuthenticated.js';
import { ConfigProvider } from './contexts/ConfigContext.jsx';
import SplashScreen from './screens/SplashScreen.jsx';
import PhoneScreen from './screens/PhoneScreen.jsx';
import OtpScreen from './screens/OtpScreen.jsx';
import LegalScreen from './screens/LegalScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import PersonalAreaScreen from './screens/PersonalAreaScreen.jsx';
import VenueCodeScreen from './screens/VenueCodeScreen.jsx';
import MyQRScreen from './screens/MyQRScreen.jsx';
import LeaderboardScreen from './screens/LeaderboardScreen.jsx';
import BranchBookingScreen from './screens/BranchBookingScreen.jsx';
import CampaignHeaderBrand from './components/CampaignHeaderBrand.jsx';
import ExistingMemberModal from './components/ExistingMemberModal.jsx';

const SCREEN = {
  SPLASH: 'splash',
  LOADING: 'loading',
  CONFIG_INVALID: 'config_invalid',
  SESSION_RETRY: 'session_retry',
  PHONE: 'phone',
  OTP: 'otp',
  LEGAL: 'legal',
  SHELL: 'shell',
  PERSONAL_AREA: 'personal_area',
  VENUE_CODE: 'venue_code',
  MY_QR: 'my_qr',
  LEADERBOARD: 'leaderboard',
  BRANCH_BOOKING: 'branch_booking',
  LEDGER: 'ledger',
};

const UUID_CTX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchSession() {
  if (!isLoggedIn()) return { nextScreen: SCREEN.PHONE, playerId: null };
  try {
    const body = await callFn('promoValidateSession', {
      token: getToken(),
      campaign_id: PROMO_CAMPAIGN_ID,
    });
    const { valid, playerId, termsAccepted } = body;
    if (!valid) return { nextScreen: SCREEN.PHONE, playerId: null };
    if (!termsAccepted) return { nextScreen: SCREEN.LEGAL, playerId };
    return { nextScreen: SCREEN.SHELL, playerId };
  } catch (e) {
    return {
      nextScreen: SCREEN.SESSION_RETRY,
      playerId: null,
      error: e instanceof Error ? e.message : String(e ?? ''),
    };
  }
}

export default function App() {
  const [screen, setScreen] = useState(SCREEN.SPLASH);
  const [phone, setPhone] = useState('');
  const [token, setTokenState] = useState('');
  const [player, setPlayer] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [config, setConfig] = useState(null);
  const [configBrokenReason, setConfigBrokenReason] = useState('');
  const [sessionRetryReason, setSessionRetryReason] = useState('');
  const [pendingVenueCode, setPendingVenueCode] = useState('');
  const [bookingContext, setBookingContext] = useState(null);
  const [venueCodeEntryContext, setVenueCodeEntryContext] = useState('neutral');
  const [memberWelcome, setMemberWelcome] = useState(null);
  const splashBootRef = useRef(null);

  useEffect(() => {
    if (screen !== SCREEN.SPLASH) return;
    if (splashBootRef.current) return;
    splashBootRef.current = Promise.allSettled([loadConfig(), fetchSession()]);
    startListMatchesWarm();
    void (async () => {
      try {
        const settled = await splashBootRef.current;
        const cfg = settled[0].status === 'fulfilled' ? settled[0].value : null;
        if (!isLoggedIn() || !cfg?.id) return;
        startHomeAuthenticatedWarm(cfg.id, getToken());
      } catch {
        return;
      }
    })();
  }, [screen]);

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

  function applyAuthenticatedHashRoute(vcProvided) {
    if (vcProvided) return;
    const route = authenticatedRouteFromHash();
    switch (route.key) {
      case 'leaderboard':
        setBookingContext(null);
        setScreen(SCREEN.LEADERBOARD);
        break;
      case 'personal_area':
        setBookingContext(null);
        setScreen(SCREEN.PERSONAL_AREA);
        break;
      case 'ledger':
        setBookingContext(null);
        setScreen(SCREEN.LEDGER);
        break;
      case 'venue_code':
        setVenueCodeEntryContext('neutral');
        setBookingContext(null);
        setScreen(SCREEN.VENUE_CODE);
        break;
      case 'my_qr':
        setBookingContext(null);
        setScreen(SCREEN.MY_QR);
        break;
      case 'branch_booking':
        setBookingContext(route.bookingContext);
        setScreen(SCREEN.BRANCH_BOOKING);
        break;
      default:
        setBookingContext(null);
        setScreen(SCREEN.SHELL);
    }
  }

  async function handleSplashDone() {
    const urlParams = new URLSearchParams(window.location.search);
    const vc = urlParams.get('venue_code');
    if (vc) {
      setPendingVenueCode(vc);
    }
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash || ''}`);
    setScreen(SCREEN.LOADING);
    const settledPromise =
      splashBootRef.current ??
      Promise.allSettled([loadConfig(), fetchSession()]);
    splashBootRef.current = null;
    const settled = await settledPromise;

    const cfgOutcome = settled[0];
    const sessOutcome = settled[1];

    if (cfgOutcome.status === 'rejected') {
      const e = cfgOutcome.reason;
      setConfig(null);
      const msg =
        e instanceof Error ? e.message : String(e || 'campaign_config_invalid');
      setConfigBrokenReason(msg || 'campaign_config_invalid');
      setScreen(SCREEN.CONFIG_INVALID);
      return;
    }

    const cfg = cfgOutcome.value;
    setConfigBrokenReason('');
    setConfig(cfg);

    let sessionResult =
      sessOutcome.status === 'fulfilled'
        ? sessOutcome.value
        : {
            nextScreen: SCREEN.SESSION_RETRY,
            playerId: null,
            error:
              sessOutcome.reason instanceof Error
                ? sessOutcome.reason.message
                : String(sessOutcome.reason ?? ''),
          };

    if (sessionResult.nextScreen === SCREEN.SESSION_RETRY) {
      setSessionRetryReason(sessionResult.error || '');
      setScreen(SCREEN.SESSION_RETRY);
      return;
    }

    if (sessionResult.nextScreen === SCREEN.LEGAL) {
      setTokenState(getToken());
      setPlayer(sessionResult.playerId);
    } else if (sessionResult.nextScreen === SCREEN.SHELL) {
      setPlayer(sessionResult.playerId);
    }

    if (vc && sessionResult.nextScreen === SCREEN.SHELL) {
      setVenueCodeEntryContext('neutral');
      setScreen(SCREEN.VENUE_CODE);
    } else if (sessionResult.nextScreen === SCREEN.SHELL) {
      applyAuthenticatedHashRoute(false);
    } else {
      setScreen(sessionResult.nextScreen);
    }
  }

  async function retryValidateSessionOnly() {
    if (!config) return;
    setScreen(SCREEN.LOADING);
    setSessionRetryReason('');
    const sessionResult = await fetchSession().catch(() => ({
      nextScreen: SCREEN.SESSION_RETRY,
      playerId: null,
      error: 'כללית.',
    }));

    if (sessionResult.nextScreen === SCREEN.SESSION_RETRY) {
      setSessionRetryReason(sessionResult.error || '');
      setScreen(SCREEN.SESSION_RETRY);
      return;
    }

    if (sessionResult.nextScreen === SCREEN.LEGAL) {
      setTokenState(getToken());
      setPlayer(sessionResult.playerId);
      setScreen(SCREEN.LEGAL);
      return;
    }

    if (sessionResult.nextScreen === SCREEN.PHONE) {
      setScreen(SCREEN.PHONE);
      return;
    }

    setPlayer(sessionResult.playerId ?? null);
    applyAuthenticatedHashRoute(false);
  }

  useEffect(() => {
    if (
      screen === SCREEN.SPLASH ||
      screen === SCREEN.LOADING ||
      screen === SCREEN.CONFIG_INVALID ||
      screen === SCREEN.SESSION_RETRY
    )
      return;

    let pathSeg = '/home';
    switch (screen) {
      case SCREEN.PHONE:
        pathSeg = '/phone';
        break;
      case SCREEN.OTP:
        pathSeg = '/otp';
        break;
      case SCREEN.LEGAL:
        pathSeg = '/legal';
        break;
      case SCREEN.PERSONAL_AREA:
        pathSeg = '/me';
        break;
      case SCREEN.LEDGER:
        pathSeg = '/ledger';
        break;
      case SCREEN.VENUE_CODE:
        pathSeg = '/venue-code';
        break;
      case SCREEN.MY_QR:
        pathSeg = '/qr';
        break;
      case SCREEN.LEADERBOARD:
        pathSeg = '/leaderboard';
        break;
      case SCREEN.BRANCH_BOOKING:
        pathSeg = '/booking';
        break;
      default:
        pathSeg = '/home';
    }

    let q = '';
    if (
      screen === SCREEN.BRANCH_BOOKING &&
      bookingContext?.matchId &&
      UUID_CTX.test(String(bookingContext.matchId))
    ) {
      q =
        '?matchId=' +
        encodeURIComponent(String(bookingContext.matchId).trim());
      if (bookingContext.matchKickoffUtc != null && typeof bookingContext.matchKickoffUtc === 'string') {
        q +=
          '&matchKickoffUtc=' +
          encodeURIComponent(bookingContext.matchKickoffUtc);
      }
    }

    const want = `#${pathSeg}${q}`;
    if (window.location.hash !== want) {
      window.history.replaceState(null, '', want);
    }
  }, [screen, bookingContext]);

  function handlePhoneSuccess(normalizedPhone, newUser) {
    setPhone(normalizedPhone);
    setIsNewUser(newUser);
    setScreen(SCREEN.OTP);
  }

  function handleOtpSuccess(playerId, tok, memberWelcomeData) {
    setPlayer(playerId);
    setTokenState(tok);
    if (memberWelcomeData && !localStorage.getItem(`club_welcomed_${playerId}`)) {
      setMemberWelcome(memberWelcomeData);
    }
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
    setBookingContext(null);
    setScreen(SCREEN.PHONE);
  }

  function handlePersonalArea() {
    setScreen(SCREEN.PERSONAL_AREA);
  }

  const bookingBranchesResolved = resolveBookingBranchesForCampaign(config);

  const inner = (() => {
    if (screen === SCREEN.SPLASH) {
      return <SplashScreen onDone={handleSplashDone} />;
    }
    if (screen === SCREEN.LOADING) {
      return (
        <div className="min-h-dvh bg-hm-bg flex items-center justify-center">
          <div className="animate-pulse">
            <CampaignHeaderBrand maxLogoHeight={36} titleSizePx={26} />
          </div>
        </div>
      );
    }
    if (screen === SCREEN.SESSION_RETRY) {
      return (
        <div
          className="min-h-dvh bg-hm-bg flex flex-col items-center justify-center gap-4 px-6 text-center"
          dir="rtl"
        >
          <div className="text-lg font-black text-hm-white">
            בעיית חיבור בהתחברות
          </div>
          <p className="text-sm text-hm-muted max-w-md">
            לא הצלחנו לוודא את החשבון מול השרת. האינטרנט אולי התנתק — זה לא
            בהכרח «ניתוק מהקמפיין».
          </p>
          {sessionRetryReason ? (
            <p className="text-xs text-white/35 max-w-full break-all" dir="ltr">
              {sessionRetryReason}
            </p>
          ) : null}
          <button
            type="button"
            className="hm-btn-primary px-8 py-2.5 text-sm font-bold"
            onClick={() => retryValidateSessionOnly()}
          >
            נסה שוב
          </button>
          <button
            type="button"
            className="text-xs text-white/55 underline px-4"
            onClick={() => {
              clearToken();
              setSessionRetryReason('');
              setBookingContext(null);
              setScreen(SCREEN.PHONE);
            }}
          >
            התחילו מסך התחברות מחדש
          </button>
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
          onBack={() => {
            setTokenState('');
            setScreen(SCREEN.PHONE);
          }}
        />
      );
    }
    if (screen === SCREEN.PERSONAL_AREA) {
      return (
        <PersonalAreaScreen
          token={getToken()}
          campaignId={PROMO_CAMPAIGN_ID}
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
          campaignId={PROMO_CAMPAIGN_ID}
          onBack={() => setScreen(SCREEN.PERSONAL_AREA)}
        />
      );
    }
    if (screen === SCREEN.VENUE_CODE) {
      return (
        <VenueCodeScreen
          token={getToken()}
          campaignId={PROMO_CAMPAIGN_ID}
          prefillCode={pendingVenueCode}
          entryContext={venueCodeEntryContext}
          onBack={() => {
            setPendingVenueCode('');
            setVenueCodeEntryContext('neutral');
            setScreen(SCREEN.SHELL);
          }}
        />
      );
    }
    if (screen === SCREEN.MY_QR) {
      return (
        <MyQRScreen
          token={getToken()}
          campaignId={PROMO_CAMPAIGN_ID}
          onBack={() => setScreen(SCREEN.SHELL)}
        />
      );
    }
    if (screen === SCREEN.LEADERBOARD) {
      return (
        <LeaderboardScreen
          token={getToken()}
          campaignId={PROMO_CAMPAIGN_ID}
          onNavigateHome={() => setScreen(SCREEN.SHELL)}
          onBranchBooking={openBranchBooking}
        />
      );
    }
    if (screen === SCREEN.BRANCH_BOOKING) {
      return (
        <BranchBookingScreen
          token={getToken()}
          campaignId={PROMO_CAMPAIGN_ID}
          tableBookingPoints={config?.table_booking_points}
          branches={bookingBranchesResolved}
          bookingContext={bookingContext}
          onBack={() => {
            setBookingContext(null);
            setScreen(SCREEN.SHELL);
          }}
        />
      );
    }
    return (
      <HomeScreen
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
      />
    );
  })();

  if (screen === SCREEN.CONFIG_INVALID) {
    return (
      <div
        className="min-h-dvh bg-hm-bg flex flex-col items-center justify-center gap-4 px-6 text-center"
        dir="rtl"
      >
        <div className="text-lg font-black" style={{ color: 'var(--text, #fff)' }}>
          לא ניתן לטעון את הגדרות הקמפיין
        </div>
        <div className="text-sm max-w-md break-words" style={{ color: 'var(--text-sec, rgba(246,239,237,0.65))' }}>
          {configBrokenReason}
        </div>
        <button
          type="button"
          className="hm-btn-primary px-8 py-2.5 text-sm font-bold"
          onClick={() => window.location.reload()}
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <ConfigProvider config={config}>
      <>
        {inner}
        {memberWelcome && (
          <ExistingMemberModal
            bonusPoints={memberWelcome.bonusPoints}
            tierName={memberWelcome.tierName}
            onClose={() => {
              localStorage.setItem(`club_welcomed_${player}`, '1');
              setMemberWelcome(null);
            }}
          />
        )}
      </>
    </ConfigProvider>
  );
}
