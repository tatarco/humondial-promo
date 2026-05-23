# Humondial promo PWA — designer asset brief

**Audience:** Graphic / motion / illustration / brand designers  
**Repo:** `humondial-promo` (Vite/React PWA, RTL Hebrew UI)  
**Viewport baseline:** Primary mobile widths **390–430 CSS px** (“CSS logical pixels”; safe areas on iPhone). Export rasters **@2×** minimum; supply **@3×** optional for raster hero PNG/WebP strips.

Stakeholder threads (Nov 2025 feedback + Gemini rollup) merged into actionable deliverables. Items marked **engineering** are *not* new pixels but tracked so design knows they exist.

---

## Brand / UI tokens (for alignment)

| Token | HEX / note |
|--------|------------|
| Background | `#060202` (`--hm-bg`), global dark |
| Primary red | `#D63A36` (`--red`) |
| Gold | `#F4C15D` (`--gold`) |
| Accent green | `#35D26F` (`--green`) |
| Card fill | `#1c0606` ~88% opaque over photo (`--card-bg` feel) |
| Typography today | **System stack only** (`-apple-system`, `Segoe UI`, etc.) — **headline font is an open gap** |

---

## Master checklist (what to ship)

| ID | Deliverable | Where it lands in UI (screens) | Format / size | Variants |
|----|-------------|------------------------------|---------------|----------|
| **ART-01** | **Opening splash video** (new trophy) | `SplashScreen` — full-bleed background video | **MP4 (H.264)** primary; optional **WebM**; **muted**, `playsInline` | Vertical-first **1080 × 1920** (or 1125 × 2436); keep file small for LTE (target **&lt; 4–8 MB**, compress). Length ~same as today’s clip (~same UX). Poster frame: JPG/WebP ART-01b |
| **ART-01b** | Splash **poster image** | First frame fallback while video buffers | WebP @2× + JPG fallback **1170 × 2532** (or crop of video 9:16) | One |
| **ART-02** | **Campaign hero banner** (“יהודה” graphic) | **Home** → between app header (“HUMONDIAL”) and **`HeroCard`** (personal summary). *File `public/assets/humondial-banner.jpeg` exists but is **not wired** in UI yet — this slot is explicitly reserved.* | **WebP** + PNG fallback; primary width **780 px** (@2× of 390) height **~200–260 px** adjustable; SVG if flat vector | Provide **RTL-safe** composition (subject not cropped on right-edge safe area); dark bottom fade optional to blend into card |
| **ART-03** | **Display / headline Hebrew typeface family** licensed for web | **Global:** home hero taglines (`HeroCard`), page titles (“המשחקים”, “אזור אישי”), buttons where “black” weights used | **WOFF2** per weight used (prefer **two weights**: Bold/Black ~700–900 + Regular 400 for body if needed); **subset Hebrew + Latin digits** | If variable font OK, specify axis + static instances |
| **ART-04** | **Tier medallic icons** (official look) | **Everywhere tier appears:** Home `HeroCard` (large + small chip), Personal area tier chip + ladders, Leaderboard rows + podium, My QR indirectly via tier context later | **`hm-tier-{slug}.svg`** in `public/` — **square artwork** See §Tier pack | **5 assets:** `bronze`, `silver`, `gold`, `legend`, `custom` (fallback for unknown tiers) |
| **ART-05** | **Achievement “badge” visuals** *(optional uplift)* | Personal area achievements strip (`b.badge` from API is often **emoji** today) — product may switch to PNG/SVG per achievement id later | Recommendation: **SVG 64×64** artboard × N types + **PNG @2×** raster if textured | Locked vs unlocked palettes; **coordinate with BA** on “יותר הישגים ותימחור נקודות” (economy ≠ pure design) |
| **ART-06** | **Info / help glyph** (“איך מחושב הניקוד”) | Personal area **“צפי סיום / בקצב הנוכחי”** row (`PersonalAreaScreen` trajectory chip) — add inline **ⓘ** control | SVG **24×24** (+ **20×20** instance) monocolor + optional filled circle BG | RTL mirror not required for “i”; keep 44×44 tap target via padding in UI |
| **ART-07** | **Premium match frame / glow kit** (“משחק חם”) | **Home** → `MatchCard` when flagged `marquee_highlight` (**gold frame** `.hm-match-marquee**) or **`live`** (cyan-ish glow `.hm-match-live-glow`) | Prefer **CSS spec** designers document (colors, blur, radii); if bitmap: **9-slice PNG** corners + edges **minimum 240 px tall card** scalable | Variants: **A)** marquee “event” highlight **B)** live broadcast halo **C)** positive prediction flash (engineering may tune) |
| **ART-08** | **Nation flags** polish | Match rows + expandable **“הקש לניחוש”** predictor | Today: **CDN** PNG `flagcdn.com` when ISO code exists else **emoji** map in code — stakeholder wants **consistent quality** → choose: **maintain ISO `home_flag` / `away_flag` from API + designer QC sizes** OR **ship local sprite** (engineering effort) | If local: **rounded rect 80×53 @1×**, **160×106 @2×** PNG/WebP atlas + JSON map — **coordinate list of FIFA / campaign country codes** |
| **ART-09** | **Gamified slider / progress motifs** (“כדורגל במקום נקודה”) | **Leaderboard** “מסלול לשיפור” bar; **What-if** sliders (`WhatIfCard`); **Home** tier progress bar (today uses **⚽** Unicode as knob) | SVG **32×32** ball icon (knob) + optional **track texture** under CSS `linear-gradient` | **3 semantic colors** if matching three challenge types: predictions / table / delivery |
| **ART-10** | **What-if category icons** | Leaderboard expanded challenges — replace **⚽ / 🍽️ / 🛵** emoji in cards | **SVG 28–32 px** or **PNG @2×** | Three distinct icons in style of ART-09 |
| **ART-11** | **Podium crown** (optional) | Leaderboard top-1 column | SVG **~40 px** wide gold crown | One |
| **ART-12** | **Stadium background photo** refresh | Global `stadium-bg` (`index.css` `.stadium-bg::before`) | JPEG/WebP **wide** min **1920 × 1080**, darkened in CSS | One |
| **ART-13** | **Quick-action tile icons** (optional) | Home row: “הטבות שלי”, “קיבלת משלוח?”, “הגעתי לסניף” — emoji today | Outline icon set **32 px** RTL-aware | Three |

**engineering (no new artifact):** Faster path **splash → home** — already improved via prefetch; further gains are caching/API, not art.

---

## Tier icon pack (**ART-04**) — filenames & QA

Deliver final SVG as (replace placeholder art, keep filenames):

- `public/hm-tier-bronze.svg`
- `public/hm-tier-silver.svg`
- `public/hm-tier-gold.svg`
- `public/hm-tier-legend.svg`
- `public/hm-tier-custom.svg`

**Artboard:** **512 × 512 px** (or vector equivalent), **40–60 px** margin safe area so downscaling to **16–56 px** on screen stays crisp.  
**Style:** Silhouette / medal readable at **16 px**; avoid hairline strokes &lt; 2 px at export size.  
**Use map (code today):**

| Render size (px) | Location |
|------------------|----------|
| **56** | Home `HeroCard` top-left |
| **26** | Home `HeroCard` tier row |
| **28 / 22** | Personal area tier strip (earned vs future) |
| **22** | Personal area expanded tier header |
| **18** | Leaderboard podium chips |
| **20** | Leaderboard “me” card chip |
| **16** | Leaderboard list rows |

---

## Typography (**ART-03**)

Problems called out: “**חסרים פונטים בכותרות**” — today everything uses system fonts.

**Designer / legal:** Provide font family name, **WOFF2** files per weight, and confirm **commercial web embedding**.  
Engineering hooks: Tailwind (`tailwind.config.js` → `theme.extend.fontFamily.sans`) + `body` in `index.css`.

---

## Splash / banner / video (**ART-01**, **ART-01b**, **ART-02**)

- Video path in app: **`/assets/splash.mp4`** (`SplashScreen.jsx`).  
- New trophy creative = **producer + motion** owns ART-01; export match **aspect ratio** and **bitrate** budgets above.  
- **ART-02** banner: safe text zones — nothing critical in corners that conflict with curved phone corners/notch.

---

## Match UX notes tied to stakeholder copy (guides design, not pixel list)

These drive **layout + motion** briefing; some are UX copy/engineering tasks **with** designer specs:

| Topic | Desired behavior |
|--------|-------------------|
| **Live status** (“חי”) | Live = match started; clarify in UI shorter copy; scores update when **`live_*_score`** change from backend (polling / refresh semantics — engineering). |
| **Phase line length** | For **live**: short label (phase / round only). For **open** (pre-kickoff): add **explicit date/time** lines (designer specs typographic hierarchy). |
| **Dropdown guess panel** | Add **both flags**, stronger **positive/negative** color feedback for prediction vs result (greens/reds harmonized with tokens). |

---

## ACH / economy (**ART-05** disclaimer)

“We need more achievements and point pricing” = **campaign config + gameplay design** (`promo_campaigns.achievement_templates` in backend). Designers deliver **badge art** tied to **`id`** when product freezes the spreadsheet.

---

## Handoff checklist

For each raster: name `art/{id}/filename@2x.webp` (+ `@3x` if applicable).  
For each SVG: **flatten** obscure filters or outline strokes for mobile SVG performance.  
Supply **Figma link** optional with labeled frames matching ART ids.

Companion **HTML placement mock + palette/tier examples + delivery tree**: [`docs/DESIGNER_ASSET_BRIEF.html`](./DESIGNER_ASSET_BRIEF.html) (open locally in a browser).
