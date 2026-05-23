# HUMONDIAL 2026 Promo PWA

Vite/React PWA that talks to BizFlow/Base44 promo functions (`getPlayerLedger`, `recordTableBooking`, venue/delivery redemption, etc.).

## Single promotion — not multi-campaign

Humondial runs as **one** operator-facing promo. Players never pick among campaigns. Backend functions still take `campaign_id` because the DB row keys off that UUID. The canonical id for this deployment is the constant `PROMO_CAMPAIGN_ID` in `src/lib/config.js`: every client calls include it; `getPlayerCampaignConfig` is invoked with `{ campaign_id: PROMO_CAMPAIGN_ID }`; `loadConfig()` rejects with `campaign_id_mismatch` if the server returns a different row id. If ops ever recreate the `promo_campaigns` row, update that constant to match the new primary key.

## Pending table-booking points (UX summary)

Booking CTAs register **pending** ledger lines. Those points are **not** included in leaderboard or tier until the player visits Humongous and enters the **daily venue code** on “הגעת לסניף?”.

While the splash video plays, **`loadConfig`**, **`promoValidateSession`**, and **`listMatches`** are kicked off concurrently so startup work overlaps the clip instead of starting only after it ends.

The app surfaces this consistently on the home hero, match cards with booking, branch booking screen, personal area, and ledger — approved total vs pending booking stash, plus the concrete next step (venue code).

For backend keys and idempotency (`general` vs per `match_id`), see **`docs/HUMONDIAL-BOOKING-VISIT-SPEC.md`** in the `bizflow-erp` repo.
