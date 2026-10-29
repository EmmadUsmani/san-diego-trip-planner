# Design brief v2 — San Diego Trip Planner (shared by all design workers)

You are redesigning MOCKUP artboards for a Claude Design canvas. Each artboard is ONE self-contained `.dc.html` file in
`/Users/emmad/projects/san-diego-trip-planner/design/canvas/project/`.
Write ONLY the files assigned to you. Do not publish, do not git commit (the orchestrator does both).

## What the user said about v1 (fix all of it)
- Too busy: too many elements, words, chips, labels. Needs simplicity, clarity, whitespace.
- Too clinical/corporate/B2B UI-library vibe. Wanted: relaxed, a bit playful, still sleek, minimalist.
- Drop monospace fonts entirely.
- Sloppy: elements on cards didn't line up, heights all over the place. Every screen must pass a careful audit (below).
- The Flagship Harbor Tour is BOOKED with a fixed time, but NOT locked — they may skip it. Show it as "booked" (sunshine color, ticket icon) with a Skip/remove affordance; only check-in and check-out are locked.
- Places: a full detail PAGE, not a drawer.
- Remove "intelligence": no smart nudges, no suggestions, no recommended swaps, no auto-arrange, no "combine prayers" advice, no "suggested charging stop" ghost, no "rain plan". Keep only plain, deterministic facts: times, addresses, distances/drive times, weather numbers, prayer times, a battery % estimate computed from miles, a 20% low-battery line.

## Visual language — copy from the reference
READ `design/canvas/project/Kit.dc.html` FIRST and reuse its exact header/nav markup, fonts, colors, radii, buttons, chips, block styles. Summary:
- Fonts: `Bricolage Grotesque` 700 for display/titles (letter-spacing -0.02/-0.03em), `Figtree` 400–700 for everything else. `font-variant-numeric: tabular-nums` on root. NO monospace anywhere.
- Page `#F7F6F3`; cards `#FFFFFF`, radius 20px, padding 24px, no borders, no heavy shadows. Hairline `#ECEAE6` only where needed.
- Ink `#1F2328`; muted text `#5F656D`; links `#2C6E91`.
- Categories (pastel fill, ink text): Activity seafoam `#D9F2EA`; Food peach `#FFE3D3`; Booked sunshine `#FFF0C2` + ticket icon; Fixed (check-in/out only) ink fill, white text, lock icon; Prayer lavender line `#7B6FDB` with pill `#ECE9FB`/`#4A3FB0` for Fajr/Dhuhr/Maghrib, faint dashed line + plain small label for Asr/Isha; Sky `#DCEBFF`/`#24518F` for rain & charging; rain wash `rgba(76,141,235, 0.06–0.24)` by probability. Sunset `#FF7A59` only as a tiny highlight (a dot, the today marker) — never text.
- Drive/travel between events: no box — a quiet row with a small car icon and "24 min" in muted text.
- Buttons: pill. Primary ink bg/white; secondary white with `#DCD9D3` 1px border. Toggle chips: active ink, inactive `#EFEDE9`.
- Icons: inline stroke SVG, stroke 1.8, round caps; never emoji. Little friendly touches welcome (the sun+waves logo, a wavy divider, a small illustrated weather icon), but sparingly.
- Copy: short, sentence case, friendly. No ALL-CAPS eyebrow labels. No "nudges". Fewer words everywhere. Don't repeat a fact twice on one screen.
- Desktop is primary (1440 PAGE, content max-width 1360, side padding 40px). Pages must still not break at 390px (wrap rows, scroll wide grids inside `overflow-x:auto`). Mobile artboards: fixed root width 390.

## Audit — MANDATORY before you report back
Render and screenshot every file you write:
`cd /Users/emmad/projects/san-diego-trip-planner/design && node tools/shot.mjs <File>.dc.html` (desktop, uses $preview width)
`node tools/shot.mjs <File>.dc.html 390` (desktop pages: check they don't break at phone width)
`node tools/shot.mjs <File>.dc.html 1440 --state '{"someStateKey":value}' --suffix name` renders an interactive state (requires state read via this.state).
It prints JSON (rendered height, runtime errors, clipped text, overflow) and writes a PNG to `design/.shots/`. LOOK at the PNG with the Read tool (zoom by re-reading — it's full page). Then fix and re-render until clean. Check:
1. Zero runtime/console errors; no unresolved `{{holes}}`.
2. Alignment: items in a row share top edges and baselines; cards in the same row are equal height (`align-items: stretch` + inner flex column with the variable part flex-grown); consistent paddings (24 card, 16 gaps); left edges line up down the page.
3. No awkward wraps (a single orphan word, a label wrapping beside a number), no clipped or overlapping text, no element past the right edge.
4. Visual calm: if a card has more than ~5 distinct pieces of info, cut. Remove anything that is decoration-without-purpose.
5. Set `$preview` height (and the root min-height if you use one) to the actual rendered height at 1440 (or the mobile height) — the report shows `renderedHeight`.
6. 390px pass for desktop pages: nothing broken (it may be long).
Do at least 2 render→fix cycles. In your report: filenames, final heights, what you checked/fixed, and anything you were unsure about.

## FORMAT RULES (Claude Design `.dc.html`) — they fail silently
- Keep `<script src="./support.js"></script>` exactly. Fonts `<link>` + small `<style>` go inside `<helmet>` (copy Kit's helmet).
- Close every element; quote every attribute. Inline `style="…"` for styling.
- `{{hole}}` = dotted lookup into renderVals() only (no expressions). `<sc-for list="{{xs}}" as="x" hint-placeholder-count="3">`, `<sc-if value="{{flag}}" hint-placeholder-val="{{ true }}">`. Events: `onClick="{{fn}}"` with fn from renderVals; per-item handlers via map. State: `constructor(props){super(props); this.state={…}}`.
- Precompute per-item style strings in renderVals and bind `style="{{x.style}}"`.
- Don't put `<sc-for>`/`<sc-if>` directly inside `<table>`/`<tr>` (use div grids). Avoid `<dc-import>`.
- All UI is markup; no innerHTML; no network except Google Fonts; no iframes; no emoji. Real `<button>`, `<a href>`, `<input>`+`<label>`; `aria-label` on icon-only buttons; text contrast ≥ 4.5:1.
- `data-props` single-quoted JSON: `{"$preview":{"width":1440,"height":N}}` plus at most 1–2 tweaks.
- Maps: no tiles. Draw a simple, soft illustrated map in inline SVG (calm land `#EFEDE6`, water `#D6E8F2`, a few thin roads `#FFFFFF`, a handful of area labels). Note in a small footnote that the real app uses OpenStreetMap tiles.

## DATA (real; don't invent facts — rough distances may be marked "~")
Travelers: Emmad (driver, Valencia: 27579 N Weeping Willow Dr) and Ömer (Sylmar: 16638 Nicklaus Dr, Unit 98). ~13 mi / 20 min apart.
Airbnb: 3225 Idlewild Way, San Diego, CA 92117 (Clairemont). Door code 8038. Host Anthony. Check-in after 3:00 PM Sat 10/31 (locked). Check-out before 10:00 AM Tue 11/3 (locked). Sylmar → Airbnb ≈ 135 mi.
DST ends Sun Nov 1, 2:00 AM (clocks fall back; Sat is PDT, Sun–Tue PST). Show calmly: a small "Clocks fall back 1 hr" note on Sunday.

Prayer times (La Jolla, ISNA):
- Sat 10/31: Fajr 5:57a · Dhuhr 12:32p · Asr 3:36p · Maghrib 5:58p · Isha 7:08p
- Sun 11/1: Fajr 4:58a · Dhuhr 11:32a · Asr 2:36p · Maghrib 4:58p · Isha 6:07p
- Mon 11/2: Fajr 4:58a · Dhuhr 11:32a · Asr 2:35p · Maghrib 4:57p · Isha 6:06p
- Tue 11/3: Fajr 4:59a · Dhuhr 11:32a · Asr 2:34p · Maghrib 4:56p · Isha 6:05p

Weather (Open-Meteo, local time, DST-corrected):
- Sat: Cloudy 71°/63°, 69% max. Hourly: ≤5% until 11a, 19% 12–5p, 69% 6p–midnight.
- Sun: Rain 69°/61°, 87% max (~0.37 in). Hourly: 87% 12–4a, 84% 5–10a, 53% 11a–4p, 25% 5–10p.
- Mon: Sunny 79°/64°, 11% max (≈0–2% daytime).
- Tue: Mostly sunny 80°/67°, 5%.

Itinerary:
- SAT: 9:30a leave Valencia · 9:55a pick up Ömer (Sylmar) · drive ~2h30 · 12:30–1:45p Brunch Sugar and Scribe (7660 Fay Ave Unit I, La Jolla) · 2:00–3:30p Sea Cliff Coastal Bluff Trail (100 8th St, Del Mar) · 4:00p Check-in (locked) · 7:00–8:30p Dinner Zoya (1000 Prospect St, La Jolla; halal)
- SUN: 9:00–10:00a Brunch Fig Tree Cafe (5119 Cass St, Pacific Beach) · 10:15a–1:45p Birch Aquarium (2300 Expedition Way; 9a–5p) · 4:15–5:15p Flagship South Harbor Tour (990 N Harbor Dr; BOOKED, arrive 3:45) · 6:15–7:30p Dinner Aladdin Cafe (5420 Clairemont Mesa Blvd; halal; 3 mi from Airbnb)
- MON: 9:00–10:00a Brunch Shorehouse Kitchen (2236 Avenida De La Playa, La Jolla) · 10:30a–3:00p San Diego Zoo · 3:15–4:30p Balboa Park museum (tentative) · 5:30–7:00p Dinner Sultan Baklava (El Cajon; ~18 mi from Balboa Park)
- TUE: before 10:00a Check-out (locked) · 10:15–11:15a Brunch · ~11:45a drive home · ~2:15p drop Ömer · ~2:40p home

Backups — activities: Rose Canyon Open Space Park (hike, 8 min from Airbnb) · Coast Walk Trail La Jolla (Scripps Park, Shell Beach, La Jolla Cove, tide pools) · Scripps Coastal Meander Trail (near Birch) · Museum of Contemporary Art San Diego · UCSD Geisel Library · Kingdom of Padel (pickleball) · Little Italy (food tour: pizza, gelato) · Devil's Dozen Donuts (Little Italy).
Backups — food: Akhi's Authentic Shawarma & Kebab (747 Turquoise St, halal) · Urban Skillet (9254 Scranton Rd, halal, 8 mi) · Khyber Pass Zarparan (University Ave; halal unconfirmed) · George's at the Cove (La Jolla) · Urbane Cafe (La Jolla, banh mi). Brunch spots: Sugar and Scribe (closes 2:30p) · Fig Tree Cafe (closes 3p) · Shorehouse Kitchen (closes 2:30p weekdays, 3:30p weekends).
Superchargers: Liberty Park Plaza, 4340 Genesee Ave (~1.5 mi from Airbnb, 8 stalls) · Villa La Jolla, 8657 Villa La Jolla Dr (5 mi, in a mall) · Independence Square, 7373 Clairemont Mesa Blvd · Kearny Office Park, 8344 Clairemont Mesa Blvd · Fashion Valley, 7007 Friars Rd (48 stalls) · Morena Blvd, 845 Morena Blvd.

Car: 2026 Tesla Model 3 Standard RWD — EPA 321 mi, ~69.5 kWh, ~24 kWh/100 mi. Plan as currently scheduled (with a Monday charge stop the user added manually at Liberty Park Plaza, 20%→80%): start 90% Sat → ~38% Sat night → ~25% Sun night → 80% after Mon charge → ~62% Mon night → ~12% arriving home Tue (below the 20% line; just show it in the low color, no advice text). Without the Mon charge it would go below 0 — the Range screen may show that as a plain toggle "Include Monday charge".
