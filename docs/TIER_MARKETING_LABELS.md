# Tier crest copy (Humondial 2026 ladder)

Source: WhatsApp hero pack dated 2026-05-23 (`public/tier-hero/tier-{1–5}.jpeg`). **Hero art is keyed by positional slot** (`tier.hero_slot` ∈ 1–5), not by tier id.

Campaign **tier ids** are whatever BizFlow persists in Postgres `promo_campaigns.tiers[].id`; marketing labels are **`label_he` / `label_en`** edited in BizFlow **HumondialCampaignConfig → רמות**.

**Presentation (chips / CSS)** is keyed by **`tier.chip_variant`**, one of `copper`, `mist`, `golden`, `ruby`, `lavender`, `violet` — configurable per row in the same backoffice UI. The PWA does **not** map ladder ids to colors or hero filenames.

Suggested default ladder (matches seed migration naming):

| Slot | Typical id examples | Hebrew label hints |
|:---:|:---|:---|
| 1 | `bench` … | Bench player tier |
| 2 | `starter` … | Starter |
| 3 | `striker` … | Striker |
| 4 | `top_scorer` … | Top scorer |
| 5 | `champion` … | Champion |

Frontend: [`src/lib/tierCatalog.js`](../src/lib/tierCatalog.js) (`TIER_HERO_LADDER_MARKETING` — editorial only). Resolver: [`src/lib/tierVisual.js`](../src/lib/tierVisual.js) (`tierIconSrcFromCampaignTier`, `tierChipClassFromCampaignTier`).
