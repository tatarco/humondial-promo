# HUMONDIAL 2026 Promo PWA

Vite/React PWA that talks to BizFlow/Base44 promo functions (`getPlayerLedger`, `recordTableBooking`, venue/delivery redemption, etc.).

## Single promotion — not multi-campaign

Humondial runs as **one** operator-facing promo. Players never pick among campaigns. Backend reads still accept `campaign_id` for flexibility, but **`listMatches`**, **`getPlayerCampaignConfig`**, **`getCampaignConfig`**, **`getPromoReporting`**, **`syncLiveFixtureScores`**, **`syncPromoFixtureSchedule`**, **`seedHumondialUiDemoMatches`** resolve the **`promo_campaigns`** row via **body `campaign_id`** → env **`HUMONDIAL_PROMO_CAMPAIGN_ID`** → fallback UUID **`bf987a45-9783-4507-9a26-acfd5f145473`** (same as **`PROMO_CAMPAIGN_ID`** in `src/lib/config.js`). Older **`limit=1&order=id.asc`** lookups are gone — multiple DB rows previously made **`getLeaderboard.tiers`** and BizFlow tier editor disagree.

The BizFlow admin UI passes that UUID (`src/constants/humondialPromoCampaign.js`). If **`promo_campaigns`** is ever recreated, update **PWA** `config.js`, **BizFlow** constant/env, **and** fallback strings in **`base44/functions/*/entry.ts`** (search **`HUMONDIAL_PROMO_ROW_ID_DEFAULT`**), or rely on **`HUMONDIAL_PROMO_CAMPAIGN_ID`** env only.

The collapsed tier strip shows **five columns** (`grid grid-cols-5`) whenever the API sends five tiers so the fifth crest is never off-screen-only.

## Pending table-booking points (UX summary)

Booking CTAs register **pending** ledger lines. Those points are **not** included in leaderboard or tier until the player visits Humongous and enters the **daily venue code** on “הגעת לסניף?”.

While the splash video plays, **`loadConfig`**, **`promoValidateSession`**, **`listMatches`**, **`listMyPredictions`**, and **`getLeaderboard`** (when a session cookie exists) are started so homepage work overlaps the clip instead of starting only after it ends.

The app surfaces this consistently on the home hero, match cards with booking, branch booking screen, personal area, and ledger — approved total vs pending booking stash, plus the concrete next step (venue code).

For backend keys and idempotency (`general` vs per `match_id`), see **`docs/HUMONDIAL-BOOKING-VISIT-SPEC.md`** in the `bizflow-erp` repo.
