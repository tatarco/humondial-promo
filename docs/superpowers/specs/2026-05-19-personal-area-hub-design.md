# Personal Area Hub — Design Spec

## Overview

Redesign `PersonalAreaScreen` from a long scrollable dump of everything into a focused hub: the player's status at a glance, their achievements, a mini podium, and navigation to two deeper screens.

Two new screens are added:
- **LedgerScreen** — point history (the "why I got points" analytics)
- Achievements data is inline on PersonalAreaScreen, not a separate screen

---

## Screen 1 — PersonalAreaScreen (hub)

### Layout (top to bottom)

**Header**
- Back button (← חזרה) on right
- HUMONDIAL logo (Option A CSS text) centered
- Empty spacer on left for balance

**Block 1 — My Stats** (`hm-card`, red border)
- Large rank number (`#N`) in red on the right
- Points + tier badge to the left
- Tier progress bar below: fill % = `myPts / nextTier.min_points`
- Label: "X נקודות עד [next tier]"

**Block 2 — Trajectory chip**
- Slim gold-tinted bar: label "צפי סיום / 19.7.26 בקצב הנוכחי" + projected points value in gold

**Block 3 — הישגים (achievements)**
- Section label: "הישגים 🏅"
- Horizontal scrolling row of badge tiles
- Each tile: large emoji + short label
- Earned = gold tint background; locked = dimmed (opacity 0.4)
- Badge set — derived from ledger aggregates + tier:

| Badge | Emoji | Unlock condition |
|-------|-------|-----------------|
| Silver Member | 🥈 | tier.key === 'silver' |
| Gold Member | 🥇 | tier.key === 'gold' |
| Legend | 🏆 | tier.key === 'legend' |
| הזמנה ראשונה | 🛵 | ≥1 `delivery` ledger row |
| מסעדה ראשונה | 🍽️ | ≥1 `table_booking` ledger row |
| ביקור ראשון | 🏟️ | ≥1 `venue_visit` ledger row |
| 5 ניחושים נכונים | ⚽ | ≥5 `prediction_participation` rows |
| 10 ניחושים נכונים | 🔥 | ≥10 `prediction_participation` rows |

- Achievements data is computed client-side from existing `getLeaderboard` response (`me.tier`) + a new field `ledger_counts` added to `getLeaderboard` (see backend section).

**Block 4 — 3 המובילים (mini podium)**
- Section label: "3 המובילים"
- Same podium component as current, but only top3 — no scrollable rows below
- Display order: 2nd left, 1st center (with crown), 3rd right
- Each: avatar initial circle, nickname, points

**Block 5 — Navigation**
- Section label: "ניווט"
- **Primary button (red):** 🏆 לוח האלופים — navigates to existing `LeaderboardScreen`
- **Secondary button (neutral):** 📊 הניקוד שלי — navigates to new `LedgerScreen`

### Data

Uses existing `getLeaderboard` call (already in the component). Add `ledger_counts` to the response (see backend). Remove calls to `getPlayerCampaignConfig` — tier perks and what-if sliders are removed from this screen.

---

## Screen 2 — LedgerScreen (new)

### Purpose
Show the player their full point history — every row in `promo_ledger` for their player_id, most recent first.

### Layout (top to bottom)

**Header**
- ← חזרה back button
- Title: "הניקוד שלי 📊"

**Summary bar**
- Total points (large, gold) + count of events

**List — ledger rows**
- Each row: icon + reason label (Hebrew) + date + points amount in gold
- Grouped by date (today / yesterday / date string)
- Reason → Hebrew label + emoji map:

| reason | display |
|--------|---------|
| `prediction_participation` | ⚽ ניחוש |
| `delivery` | 🛵 משלוח |
| `table_booking` | 🍽️ הזמנת שולחן |
| `venue_visit` | 🏟️ ביקור |
| `achievement` | 🏅 הישג |

### Data

New backend function `getPlayerLedger`:
- Auth: token + campaign_id (same pattern as `getLeaderboard`)
- Query: `promo_ledger WHERE player_id=? AND campaign_id=? ORDER BY created_at DESC`
- Returns: `{ rows: [{ id, reason, points, created_at, note }], total_points }`

---

## Backend change — getLeaderboard

Add `ledger_counts` to the existing `getLeaderboard` response:

```typescript
// alongside the existing ledgerRows fetch, count by reason:
const counts: Record<string, number> = {};
for (const r of ledgerRows) {
  counts[r.reason] = (counts[r.reason] ?? 0) + 1;
}
// add to response:
me: { ..., ledger_counts: counts }
```

This costs nothing extra (ledgerRows already fetched). No new DB call needed.

---

## Navigation (App.jsx)

Add `SCREEN.LEDGER` to the SCREEN enum. Add `LedgerScreen` import. Wire:
- `PersonalAreaScreen` gets `onLedger` prop → `setScreen(SCREEN.LEDGER)`
- `LedgerScreen` gets `onBack` → `setScreen(SCREEN.PERSONAL_AREA)`
- Keep existing `onLeaderboard` prop on `PersonalAreaScreen` pointing to `SCREEN.LEADERBOARD`

---

## What's removed from PersonalAreaScreen

- What-if sliders (WhatIfCard) — removed
- Full tier benefits list — removed
- Tier perks display — removed
- `getPlayerCampaignConfig` call — removed
- All rows below top-3 in podium — removed (top3 only)

These lived in the old screen because it was the only deep-dive page. With LedgerScreen for analytics and LeaderboardScreen for the full table, they are no longer needed here.

---

## Files changed

| File | Change |
|------|--------|
| `src/screens/PersonalAreaScreen.jsx` | Full rewrite per spec |
| `src/screens/LedgerScreen.jsx` | New file |
| `src/App.jsx` | Add SCREEN.LEDGER, wire LedgerScreen |
| `base44/functions/getLeaderboard/entry.ts` | Add ledger_counts to me response |
| `base44/functions/getPlayerLedger/entry.ts` | New function |
| `base44/functions/getPlayerLedger/function.jsonc` | New function config |
