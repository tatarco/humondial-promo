# Tier crest copy (Humondial 2026 ladder)

Source: WhatsApp hero pack dated 2026-05-23 (`public/tier-hero/tier-{1–5}.jpeg`). **Runtime sprites** are regenerated **RGBA PNGs** at `tier-hero/tier-{n}.png` (JPEG matte knocked out offline via `scripts/knockout_tier_png.py`). **Hero art is keyed by positional slot** (`tier.hero_slot` ∈ 1–5), not by tier id.

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

Frontend: [`src/lib/tierCatalog.js`](../src/lib/tierCatalog.js) (`TIER_HERO_LADDER_MARKETING` — canonical copy for slot-derived labels). Resolver: [`src/lib/tierVisual.js`](../src/lib/tierVisual.js) (`tierIconSrcFromCampaignTier`, `tierChipClassFromCampaignTier`).

## Product rules (enforced end-to-end)

- **Exactly five tiers** map to crest slots **1 … 5** (`tier-{slot}.png`). The player PWA [`validatePlayerCampaignConfig`](../src/lib/campaignConfigStrict.js) and Base44 **`saveCampaignConfig`** both reject **more than five** tiers.
- **`hero_slot`** values must be **unique** across the ladder (one crest PNG per tier row).

## Quick DB sanity check

```sql
SELECT
  id,
  jsonb_array_length(COALESCE(tiers, '[]'::jsonb)) AS tier_count,
  tiers
FROM public.promo_campaigns
WHERE jsonb_array_length(COALESCE(tiers, '[]'::jsonb)) > 0
ORDER BY updated_at DESC
LIMIT 3;
```

For Humondial you expect **`tier_count = 5`**. Inspect `tiers` JSON: **`hero_slot`** should be **`1`** through **`5`** with no repeats; **`chip_variant`** in the six allowed palette ids.
