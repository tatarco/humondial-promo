# Tier crest copy (Humondial 2026 ladder)

Source: WhatsApp hero pack dated 2026-05-23 (mapped under `public/tier-hero/tier-{1–5}.jpeg`).

Campaign **API ids remain** `bronze`, `silver`, `gold`, `legend`, and **`custom`** fallback for unmatched IDs. Update **`label_he` / `label_en`** only in BizFlow **HumondialCampaignConfig → רמות** (promo Postgres `promo_campaigns.tiers`), not the stable ids:

| Step | Recommended id/key | Hebrew label (`label_he`) | English shorthand |
|:---:|:---|:---|:---|
| 1 | bronze | שחקן ספסל | Bench player |
| 2 | silver | פותח בהרכב | Starter |
| 3 | gold | חלוץ חוד | Striker |
| 4 | legend | מלך השערים | Top scorer |
| 5 top | *(custom slug or duplicate)* | אלוף | Champion |

Frontend reference: [`src/lib/tierCatalog.js`](../src/lib/tierCatalog.js) (`TIER_HERO_LADDER_MARKETING`). Art path resolver: [`src/lib/tierStyle.js`](../src/lib/tierStyle.js) → `tierIconSrc`.
