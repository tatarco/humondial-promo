# Personal Area Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign PersonalAreaScreen into a focused hub (stats → trajectory → achievements → mini podium → nav), add LedgerScreen for point history, and wire both into App.jsx.

**Architecture:** PersonalAreaScreen is a full rewrite — same `getLeaderboard` data source but slimmer presentation. A new `getPlayerLedger` backend function feeds a new `LedgerScreen`. `getLeaderboard` gains a `ledger_counts` field (counts by reason) to drive the achievements block; this reuses data already fetched, so no extra DB round-trip.

**Tech Stack:** React 18 + Vite, Tailwind CSS, Vitest + Testing Library, Deno/TypeScript backend functions on Base44, Supabase (promo_ledger, promo_sessions, promo_campaigns tables).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `base44/functions/getLeaderboard/entry.ts` | Add `ledger_counts` to `me` response |
| Create | `base44/functions/getPlayerLedger/function.jsonc` | Function metadata |
| Create | `base44/functions/getPlayerLedger/entry.ts` | Token auth → ledger rows for player |
| Rewrite | `src/screens/PersonalAreaScreen.jsx` | Hub layout (5 blocks) |
| Create | `src/screens/LedgerScreen.jsx` | Point history, grouped by date |
| Modify | `src/App.jsx` | Add SCREEN.LEDGER, remove scrollToTier, wire new props |
| Create | `src/tests/PersonalAreaScreen.test.jsx` | Vitest component tests |
| Create | `src/tests/LedgerScreen.test.jsx` | Vitest component tests |

---

## Task 1: getLeaderboard — add ledger_counts

**Files:**
- Modify: `base44/functions/getLeaderboard/entry.ts`

Currently line 76 fetches ledger with `select=points` only. We need to also select `reason` so we can count by event type.

- [ ] **Step 1: Change ledger fetch to include `reason`**

In `base44/functions/getLeaderboard/entry.ts`, change the ledgerResp URL from:
```
/rest/v1/promo_ledger?player_id=eq.${playerId}&campaign_id=eq.${campaign_id}&select=points
```
to:
```
/rest/v1/promo_ledger?player_id=eq.${playerId}&campaign_id=eq.${campaign_id}&select=points,reason
```

- [ ] **Step 2: Update the ledgerRows type and add counts computation**

Change line 83 type annotation and add counts after the reduce:
```typescript
    const ledgerRows: Array<{ points: number; reason: string }> = await ledgerResp.json();

    const myPoints = ledgerRows.reduce((s, r) => s + (r.points ?? 0), 0);
    const ledgerCounts: Record<string, number> = {};
    for (const r of ledgerRows) {
      if (r.reason) ledgerCounts[r.reason] = (ledgerCounts[r.reason] ?? 0) + 1;
    }
```

- [ ] **Step 3: Add ledger_counts to the me response**

In the `return Response.json({...})` block, change the `me` object:
```typescript
      me: {
        player_id: playerId,
        nickname: myRow?.nickname ?? null,
        total_points: myPoints,
        rank: myRank,
        tier: myTier,
        ledger_counts: ledgerCounts,
      },
```

- [ ] **Step 4: Commit (do NOT push yet — push together with Task 2)**

```bash
cd /Users/galtidhar/PycharmProjects/bizflow-erp
git add base44/functions/getLeaderboard/entry.ts
git commit -m "feat(promo): getLeaderboard — add ledger_counts to me response"
```

---

## Task 2: getPlayerLedger — new backend function

**Files:**
- Create: `base44/functions/getPlayerLedger/function.jsonc`
- Create: `base44/functions/getPlayerLedger/entry.ts`

- [ ] **Step 1: Create function.jsonc**

```json
{
  "name": "getPlayerLedger",
  "description": "Player: returns full point ledger history for the current player in a campaign, ordered newest first.",
  "auth": "api_key"
}
```

Save to `base44/functions/getPlayerLedger/function.jsonc`.

- [ ] **Step 2: Create entry.ts**

Save to `base44/functions/getPlayerLedger/entry.ts`:

```typescript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY')!;

function sbh() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function sha256hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    createClientFromRequest(req);

    const { token, campaign_id } = body;
    if (!token || !campaign_id) {
      return Response.json({ error: 'token_and_campaign_id_required' }, { status: 400 });
    }

    const tokenHash = await sha256hex(String(token));
    const now = new Date().toISOString();
    const sessResp = await fetch(
      `${SUPABASE_URL}/rest/v1/promo_sessions?token_hash=eq.${tokenHash}&expires_at=gt.${now}&select=player_id&limit=1`,
      { headers: sbh() }
    );
    if (!sessResp.ok) throw new Error(await sessResp.text());
    const [session] = await sessResp.json();
    if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 });
    const playerId = session.player_id;

    const ledgerResp = await fetch(
      `${SUPABASE_URL}/rest/v1/promo_ledger?player_id=eq.${playerId}&campaign_id=eq.${campaign_id}&select=id,reason,points,created_at,note&order=created_at.desc`,
      { headers: sbh() }
    );
    if (!ledgerResp.ok) throw new Error(await ledgerResp.text());
    const rows: Array<{ id: string; reason: string; points: number; created_at: string; note: string | null }> =
      await ledgerResp.json();

    const total_points = rows.reduce((s, r) => s + (r.points ?? 0), 0);

    return Response.json({ rows, total_points });
  } catch (err) {
    console.error('getPlayerLedger error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
```

- [ ] **Step 3: Commit and push both backend changes**

```bash
cd /Users/galtidhar/PycharmProjects/bizflow-erp
git add base44/functions/getPlayerLedger/
git commit -m "feat(promo): add getPlayerLedger function"
git push origin main
```

Base44 auto-deploys within ~10 seconds of push to main.

---

## Task 3: Verify backend deployment

- [ ] **Step 1: Wait ~30 seconds for deployment, then curl-test getLeaderboard**

You need a valid token and campaign_id. Get them from the deployed app session or use existing test values. Replace `<TOKEN>` and `<CAMPAIGN_ID>` with real values:

```bash
curl -s -X POST https://app.base44.com/api/functions/getLeaderboard \
  -H "Content-Type: application/json" \
  -H "api_key: $VITE_BASE44_API_KEY" \
  -d '{"token":"<TOKEN>","campaign_id":"<CAMPAIGN_ID>"}' \
  | python3 -m json.tool | grep -A5 '"me"'
```

Expected: `me` object includes `"ledger_counts": { "prediction_participation": N, ... }`.

- [ ] **Step 2: Curl-test getPlayerLedger**

```bash
curl -s -X POST https://app.base44.com/api/functions/getPlayerLedger \
  -H "Content-Type: application/json" \
  -H "api_key: $VITE_BASE44_API_KEY" \
  -d '{"token":"<TOKEN>","campaign_id":"<CAMPAIGN_ID>"}' \
  | python3 -m json.tool | head -30
```

Expected: `{ "rows": [...], "total_points": N }`. Each row has `id`, `reason`, `points`, `created_at`, `note`.

---

## Task 4: PersonalAreaScreen rewrite

**Files:**
- Rewrite: `src/screens/PersonalAreaScreen.jsx`
- Create: `src/tests/PersonalAreaScreen.test.jsx`

- [ ] **Step 1: Write the failing tests first**

Create `src/tests/PersonalAreaScreen.test.jsx`:

```jsx
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));

import PersonalAreaScreen from '../screens/PersonalAreaScreen.jsx';
import { callFn } from '../lib/api.js';

const MOCK_DATA = {
  top50: [
    { player_id: 'p1', nickname: 'רון',  total_points: 380, rank: 1 },
    { player_id: 'p2', nickname: 'דוד',  total_points: 310, rank: 2 },
    { player_id: 'p3', nickname: 'יוסי', total_points: 280, rank: 3 },
  ],
  me: {
    player_id: 'me',
    nickname: 'גל',
    total_points: 240,
    rank: 4,
    tier: { id: 'silver', key: 'silver', label_he: 'Silver', min_points: 100 },
    ledger_counts: { prediction_participation: 9, delivery: 2, venue_visit: 1, table_booking: 0 },
  },
  trajectory: { projected_points: 420, days_remaining: 61, end_date: '2026-07-19' },
  tiers: [
    { id: 'bronze', key: 'bronze', label_he: 'Bronze', min_points: 0 },
    { id: 'silver', key: 'silver', label_he: 'Silver', min_points: 100 },
    { id: 'gold',   key: 'gold',   label_he: 'Gold',   min_points: 300 },
  ],
  whatif: {},
};

describe('PersonalAreaScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows rank and points', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText('#4')).toBeTruthy());
    expect(screen.getByText('240 נקודות')).toBeTruthy();
  });

  it('shows tier label and progress text', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText('Silver')).toBeTruthy());
    expect(screen.getByText(/Gold/)).toBeTruthy();
  });

  it('shows trajectory projection', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/420/)).toBeTruthy());
  });

  it('shows achievements section header', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/הישגים/)).toBeTruthy());
  });

  it('shows top-3 leader nicknames in podium', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText('רון')).toBeTruthy());
    expect(screen.getByText('דוד')).toBeTruthy();
    expect(screen.getByText('יוסי')).toBeTruthy();
  });

  it('has leaderboard and ledger nav buttons', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/לוח האלופים/)).toBeTruthy());
    expect(screen.getByText(/הניקוד שלי/)).toBeTruthy();
  });

  it('calls onLeaderboard when leaderboard button clicked', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    const onLeaderboard = vi.fn();
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={onLeaderboard} onLedger={() => {}} />);
    await waitFor(() => screen.getByText(/לוח האלופים/));
    screen.getByText(/לוח האלופים/).closest('button').click();
    expect(onLeaderboard).toHaveBeenCalledOnce();
  });

  it('calls onLedger when analytics button clicked', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    const onLedger = vi.fn();
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={onLedger} />);
    await waitFor(() => screen.getByText(/הניקוד שלי/));
    screen.getByText(/הניקוד שלי/).closest('button').click();
    expect(onLedger).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (component not rewritten yet)**

```bash
cd /Users/galtidhar/PycharmProjects/humondial-promo
npm test -- PersonalAreaScreen
```

Expected: tests fail because PersonalAreaScreen doesn't accept `onLeaderboard`/`onLedger` yet and renders different content.

- [ ] **Step 3: Rewrite PersonalAreaScreen.jsx**

Replace the entire contents of `src/screens/PersonalAreaScreen.jsx` with:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { callFn } from '../lib/api.js';

const TIER_CSS = {
  bronze: 'tier-bronze',
  silver: 'tier-silver',
  gold:   'tier-gold',
  legend: 'tier-legend',
};

function tierCss(key) {
  return TIER_CSS[key] || 'tier-bronze';
}

const BADGES = [
  { id: 'silver',    emoji: '🥈', label: 'Silver Member',    check: (t, c) => ['silver','gold','legend'].includes(t) },
  { id: 'gold',      emoji: '🥇', label: 'Gold Member',      check: (t, c) => ['gold','legend'].includes(t) },
  { id: 'legend',    emoji: '🏆', label: 'Legend',           check: (t, c) => t === 'legend' },
  { id: 'delivery1', emoji: '🛵', label: 'הזמנה ראשונה',    check: (t, c) => (c.delivery ?? 0) >= 1 },
  { id: 'table1',    emoji: '🍽️',label: 'מסעדה ראשונה',    check: (t, c) => (c.table_booking ?? 0) >= 1 },
  { id: 'visit1',    emoji: '🏟️', label: 'ביקור ראשון',     check: (t, c) => (c.venue_visit ?? 0) >= 1 },
  { id: 'pred5',     emoji: '⚽', label: '5 ניחושים',       check: (t, c) => (c.prediction_participation ?? 0) >= 5 },
  { id: 'pred10',    emoji: '🔥', label: '10 ניחושים',      check: (t, c) => (c.prediction_participation ?? 0) >= 10 },
  { id: 'achieve1',  emoji: '🏅', label: 'הישג',            check: (t, c) => (c.achievement ?? 0) >= 1 },
];

function MiniPodium({ top3 }) {
  const ORDER = [2, 1, 3];
  const META = {
    1: { cls: 'w-10 h-10 text-base', standH: 54, standBg: 'rgba(244,193,93,0.18)', crown: true },
    2: { cls: 'w-8 h-8 text-sm',     standH: 40, standBg: 'rgba(255,255,255,0.07)', crown: false },
    3: { cls: 'w-8 h-8 text-sm',     standH: 30, standBg: 'rgba(255,255,255,0.05)', crown: false },
  };
  return (
    <div className="flex items-end justify-center gap-3 py-3">
      {ORDER.map(rank => {
        const p = top3.find(r => r.rank === rank);
        if (!p) return <div key={rank} className="w-14" />;
        const m = META[rank];
        return (
          <div key={rank} className="flex flex-col items-center gap-1">
            {m.crown && <div className="text-sm">👑</div>}
            <div
              className={`${m.cls} rounded-full flex items-center justify-center font-black`}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text)' }}
            >
              {(p.nickname || '?')[0].toUpperCase()}
            </div>
            <div className="text-[9px] font-bold text-center max-w-[56px] truncate" style={{ color: 'var(--text)' }}>
              {p.nickname}
            </div>
            <div className="text-[8px]" style={{ color: 'var(--text-sec)' }}>{p.total_points} נ׳</div>
            <div
              className="w-12 rounded-t-md flex items-center justify-center text-xs font-black"
              style={{ height: m.standH, background: m.standBg, color: 'rgba(255,255,255,0.3)' }}
            >
              {rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PersonalAreaScreen({ token, campaignId, onBack, onLeaderboard, onLedger }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callFn('getLeaderboard', { token, campaign_id: campaignId });
      setData(result);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [token, campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-dvh stadium-bg flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse" style={{ color: 'var(--red)' }}>טוען...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-dvh stadium-bg flex flex-col items-center justify-center gap-4 p-6">
        <div style={{ color: 'var(--text-sec)' }}>{error}</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { top50 = [], me = {}, trajectory = {}, tiers: dataTiers = [] } = data || {};
  const top3    = top50.filter(r => r.rank <= 3);
  const myPts   = me.total_points ?? 0;
  const myTier  = me.tier || null;
  const tierKey = myTier?.key || myTier?.id || '';
  const counts  = me.ledger_counts ?? {};

  const nextTier = (() => {
    const sorted = [...dataTiers].sort((a, b) => a.min_points - b.min_points);
    return sorted.find(t => t.min_points > myPts) || null;
  })();
  const progPct = nextTier ? Math.min(100, Math.round((myPts / nextTier.min_points) * 100)) : 100;
  const badges  = BADGES.map(b => ({ ...b, unlocked: b.check(tierKey, counts) }));

  return (
    <div className="min-h-dvh stadium-bg overflow-y-auto pb-8" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >← חזרה</button>
        <div className="flex flex-col items-center leading-none">
          <span className="font-black" style={{ fontSize: 18, color: '#fff', textShadow: '0 0 16px rgba(214,58,54,0.4)', letterSpacing: 3 }}>
            HUMON<span style={{ color: 'var(--red)' }}>DIAL</span>
          </span>
          <span dir="ltr" className="font-black" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 3, marginTop: 1 }}>
            2 0 2 6
          </span>
        </div>
        <div style={{ width: 64 }} />
      </header>

      <div className="px-4 space-y-3">
        {/* Block 1 — My Stats */}
        <div className="hm-card p-4" style={{ borderColor: 'var(--red)', borderWidth: 2 }}>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-black" style={{ color: 'var(--red)' }}>
              {me.rank ? `#${me.rank}` : '—'}
            </div>
            <div>
              <div className="text-base font-black" style={{ color: 'var(--text)' }}>{myPts} נקודות</div>
              {myTier && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierCss(tierKey)}`}>
                  {myTier.label_he}
                </span>
              )}
            </div>
          </div>
          {nextTier && (
            <div className="mt-3">
              <div className="hm-progress-bg h-1.5">
                <div className="hm-progress-fill h-1.5" style={{ width: `${progPct}%` }} />
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-sec)' }}>
                {nextTier.min_points - myPts} נקודות עד {nextTier.label_he}
              </div>
            </div>
          )}
        </div>

        {/* Block 2 — Trajectory */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'rgba(244,193,93,0.06)', border: '1px solid rgba(244,193,93,0.18)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-sec)' }}>
            צפי סיום<br />
            <span className="text-[10px]">{trajectory.end_date || '19.7.26'} בקצב הנוכחי</span>
          </div>
          <div className="text-2xl font-black tabular-nums" style={{ color: 'var(--gold)' }}>
            ~{trajectory.projected_points ?? myPts} נ׳
          </div>
        </div>

        {/* Block 3 — הישגים */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>הישגים 🏅</div>
          <div className="hm-card p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {badges.map(b => (
                <div
                  key={b.id}
                  className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
                  style={{
                    background: b.unlocked ? 'rgba(244,193,93,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${b.unlocked ? 'rgba(244,193,93,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    opacity: b.unlocked ? 1 : 0.38,
                    minWidth: 60,
                  }}
                >
                  <span className="text-xl leading-none">{b.emoji}</span>
                  <span
                    className="text-[8px] font-bold text-center leading-tight"
                    style={{ color: b.unlocked ? 'var(--gold)' : 'var(--text-sec)' }}
                  >
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Block 4 — Mini podium */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>3 המובילים</div>
          <div className="hm-card">
            <MiniPodium top3={top3} />
          </div>
        </div>

        {/* Block 5 — Navigation */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-sec)' }}>ניווט</div>
          <button
            onClick={onLeaderboard}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-2 font-bold text-sm text-white"
            style={{ background: 'var(--red)' }}
          >
            <div>
              <div className="text-[9px] mb-0.5" style={{ opacity: 0.7 }}>כל 50 השחקנים</div>
              🏆 לוח האלופים
            </div>
            <span style={{ opacity: 0.5 }}>←</span>
          </button>
          <button
            onClick={onLedger}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <div>
              <div className="text-[9px] mb-0.5" style={{ opacity: 0.5 }}>מאיפה הגיעו הנקודות</div>
              📊 הניקוד שלי
            </div>
            <span style={{ opacity: 0.4 }}>←</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /Users/galtidhar/PycharmProjects/humondial-promo
npm test -- PersonalAreaScreen
```

Expected: all 7 tests pass.

- [ ] **Step 5: Run full test suite — no regressions**

```bash
npm test
```

Expected: all existing tests still pass.

---

## Task 5: LedgerScreen — new screen

**Files:**
- Create: `src/screens/LedgerScreen.jsx`
- Create: `src/tests/LedgerScreen.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/LedgerScreen.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));

import LedgerScreen from '../screens/LedgerScreen.jsx';
import { callFn } from '../lib/api.js';

const TODAY = new Date().toISOString();

const MOCK_LEDGER = {
  total_points: 170,
  rows: [
    { id: 'r1', reason: 'delivery',                 points: 80, created_at: TODAY, note: null },
    { id: 'r2', reason: 'prediction_participation', points: 10, created_at: TODAY, note: null },
    { id: 'r3', reason: 'table_booking',            points: 20, created_at: TODAY, note: null },
    { id: 'r4', reason: 'venue_visit',              points: 50, created_at: TODAY, note: null },
    { id: 'r5', reason: 'achievement',              points: 10, created_at: TODAY, note: 'הישג מיוחד' },
  ],
};

describe('LedgerScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows total points in summary bar', async () => {
    callFn.mockResolvedValue(MOCK_LEDGER);
    render(<LedgerScreen token="t" campaignId="c" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText(/170/)).toBeTruthy());
  });

  it('shows Hebrew label for delivery', async () => {
    callFn.mockResolvedValue(MOCK_LEDGER);
    render(<LedgerScreen token="t" campaignId="c" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('משלוח')).toBeTruthy());
  });

  it('shows Hebrew label for prediction_participation', async () => {
    callFn.mockResolvedValue(MOCK_LEDGER);
    render(<LedgerScreen token="t" campaignId="c" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('ניחוש')).toBeTruthy());
  });

  it('shows Hebrew label for achievement', async () => {
    callFn.mockResolvedValue(MOCK_LEDGER);
    render(<LedgerScreen token="t" campaignId="c" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('הישג')).toBeTruthy());
  });

  it('shows note when present', async () => {
    callFn.mockResolvedValue(MOCK_LEDGER);
    render(<LedgerScreen token="t" campaignId="c" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('הישג מיוחד')).toBeTruthy());
  });

  it('shows empty state when no rows', async () => {
    callFn.mockResolvedValue({ total_points: 0, rows: [] });
    render(<LedgerScreen token="t" campaignId="c" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText(/אין פעילות/)).toBeTruthy());
  });

  it('groups todays rows under היום', async () => {
    callFn.mockResolvedValue(MOCK_LEDGER);
    render(<LedgerScreen token="t" campaignId="c" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('היום')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- LedgerScreen
```

Expected: fail — file doesn't exist yet.

- [ ] **Step 3: Create LedgerScreen.jsx**

Create `src/screens/LedgerScreen.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { callFn } from '../lib/api.js';

const REASON_MAP = {
  prediction_participation: { label: 'ניחוש',       emoji: '⚽' },
  delivery:                 { label: 'משלוח',        emoji: '🛵' },
  table_booking:            { label: 'הזמנת שולחן', emoji: '🍽️' },
  venue_visit:              { label: 'ביקור',        emoji: '🏟️' },
  achievement:              { label: 'הישג',         emoji: '🏅' },
};

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'היום';
  if (d.toDateString() === yesterday.toDateString()) return 'אתמול';
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
}

function groupByDate(rows) {
  const groups = [];
  const seen = new Map();
  for (const row of rows) {
    const label = formatDate(row.created_at);
    if (!seen.has(label)) {
      seen.set(label, []);
      groups.push({ label, rows: seen.get(label) });
    }
    seen.get(label).push(row);
  }
  return groups;
}

export default function LedgerScreen({ token, campaignId, onBack }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callFn('getPlayerLedger', { token, campaign_id: campaignId });
      setData(result);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [token, campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-dvh stadium-bg flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse" style={{ color: 'var(--red)' }}>טוען...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-dvh stadium-bg flex flex-col items-center justify-center gap-4 p-6">
        <div style={{ color: 'var(--text-sec)' }}>{error}</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  const { rows = [], total_points = 0 } = data || {};
  const groups = groupByDate(rows);

  return (
    <div className="min-h-dvh stadium-bg overflow-y-auto pb-8" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="text-base font-black" style={{ color: 'var(--text)' }}>הניקוד שלי 📊</div>
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >← חזרה</button>
      </header>

      <div
        className="mx-4 mb-4 flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: 'rgba(244,193,93,0.06)', border: '1px solid rgba(244,193,93,0.18)' }}
      >
        <div className="text-sm" style={{ color: 'var(--text-sec)' }}>סה״כ</div>
        <div className="text-2xl font-black tabular-nums" style={{ color: 'var(--gold)' }}>
          {total_points} נ׳
        </div>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-sec)' }}>
          עדיין אין פעילות
        </div>
      )}

      {groups.map(group => (
        <div key={group.label} className="mb-4">
          <div
            className="text-[10px] font-bold uppercase tracking-wider px-4 mb-1.5"
            style={{ color: 'var(--text-sec)' }}
          >
            {group.label}
          </div>
          <div className="mx-4 hm-card overflow-hidden">
            {group.rows.map((row, i) => {
              const meta = REASON_MAP[row.reason] || { label: row.reason, emoji: '•' };
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < group.rows.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{meta.label}</div>
                    {row.note && (
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-sec)' }}>{row.note}</div>
                    )}
                  </div>
                  <div className="text-sm font-black tabular-nums" style={{ color: 'var(--gold)' }}>
                    +{row.points}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- LedgerScreen
```

Expected: all 7 tests pass.

---

## Task 6: App.jsx — wire navigation

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add SCREEN.LEDGER and import LedgerScreen**

At the top of `src/App.jsx`, add the import after the existing LeaderboardScreen import:
```jsx
import LedgerScreen from './screens/LedgerScreen.jsx';
```

In the SCREEN constant object, add:
```js
LEDGER: 'ledger',
```

- [ ] **Step 2: Remove scrollToTier state and handlers**

Remove these lines from App.jsx:
```js
const [scrollToTier, setScrollToTier] = useState(false);
```
```js
function handlePersonalAreaTier() {
  setScrollToTier(true);
  setScreen(SCREEN.PERSONAL_AREA);
}
```

Change `handlePersonalArea` to simply:
```js
function handlePersonalArea() {
  setScreen(SCREEN.PERSONAL_AREA);
}
```

- [ ] **Step 3: Update PersonalAreaScreen mount — add onLeaderboard and onLedger props, remove old ones**

Replace the existing `screen === SCREEN.PERSONAL_AREA` block:
```jsx
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
```

Note: `playerId`, `config`, and `scrollToTier` props are removed — the new component doesn't use them.

- [ ] **Step 4: Add LedgerScreen mount**

Add after the LEADERBOARD block:
```jsx
if (screen === SCREEN.LEDGER) {
  return (
    <LedgerScreen
      token={getToken()}
      campaignId={config?.id}
      onBack={() => setScreen(SCREEN.PERSONAL_AREA)}
    />
  );
}
```

- [ ] **Step 5: Remove onPersonalAreaTier from HomeScreen mount**

Find the HomeScreen mount at the bottom of App.jsx and remove the `onPersonalAreaTier` prop line.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all tests pass. If App.test.jsx fails because it references `scrollToTier`, update the test to remove that expectation.

- [ ] **Step 7: Commit**

```bash
cd /Users/galtidhar/PycharmProjects/humondial-promo
git add src/screens/PersonalAreaScreen.jsx src/screens/LedgerScreen.jsx src/App.jsx src/tests/PersonalAreaScreen.test.jsx src/tests/LedgerScreen.test.jsx
git commit -m "feat(promo): personal area hub redesign + ledger screen"
```

---

## Task 7: Deploy and smoke test

- [ ] **Step 1: Push to main**

```bash
cd /Users/galtidhar/PycharmProjects/humondial-promo
git push origin main
```

Cloudflare Pages deploys in ~30 seconds.

- [ ] **Step 2: Open deployed app on mobile**

URL: `https://biz-flow-erp-6829504d.base44.app` (or the humondial-promo Cloudflare URL).

Log in, tap the 👤 button on the home screen.

- [ ] **Step 3: Verify each block renders correctly**

Check:
- [ ] My rank (`#N`) and points show in red card
- [ ] Tier badge + progress bar visible
- [ ] Trajectory chip shows projected points in gold
- [ ] Achievements row scrolls horizontally — earned badges are bright, locked are dimmed
- [ ] Mini podium shows 3 players with crown on #1
- [ ] "לוח האלופים" button (red) navigates to full leaderboard
- [ ] "הניקוד שלי" button navigates to ledger screen
- [ ] Ledger screen shows rows grouped by date with Hebrew labels and `+N` points
- [ ] Back button on ledger returns to personal area
