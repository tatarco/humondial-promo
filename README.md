# HUMONDIAL 2026 Promo PWA

Vite/React PWA that talks to BizFlow/Base44 promo functions (`getPlayerLedger`, `recordTableBooking`, venue/delivery redemption, etc.).

## Single promotion — not multi-campaign

Humondial runs as **one** operator-facing promo. Players never pick among campaigns. Functions still take **`campaign_id`** because the Base44/Supabase model stores that row as a campaign record — it is the canonical id for this event, not tenant switching. The live id is always **`config.id`** from `getPlayerCampaignConfig` (via `loadConfig()`). A legacy **`?cid=`** query param may appear on some deep links; **`config.id`** is the source of truth once config has loaded.

## Pending table-booking points (UX summary)

Booking CTAs register **pending** ledger lines. Those points are **not** included in leaderboard or tier until the player visits Humongous and enters the **daily venue code** on “הגעת לסניף?”.

The app surfaces this consistently on the home hero, match cards with booking, branch booking screen, personal area, and ledger — approved total vs pending booking stash, plus the concrete next step (venue code).

For backend keys and idempotency (`general` vs per `match_id`), see **`docs/HUMONDIAL-BOOKING-VISIT-SPEC.md`** in the `bizflow-erp` repo.
