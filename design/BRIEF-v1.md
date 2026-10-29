# San Diego Trip Planner — Design Exploration Brief (shared by all design workers)

You are producing MOCKUP artboards for a design canvas (Claude Design). NOT the real app. Each artboard is ONE self-contained `.dc.html` file.
Write ONLY the files assigned to you, into:
`/private/tmp/claude-502/-Users-emmad-projects-san-diego-trip-planner/c666b51c-d728-420a-b6e5-978883e59d8c/scratchpad/canvas/project/<Name>.dc.html`
Do NOT publish, do NOT open a browser, do NOT screenshot or verify. Just write the file(s) carefully and report back the file name(s), the final pixel height of each artboard at its width, and a 3–6 line summary of the design ideas in it.

## The product
A trip planner web app (React, Cloudflare Workers + D1 later) for two friends — Emmad (driver, lives in Valencia, CA) and Ömer (lives in Sylmar, CA) — going to La Jolla / San Diego Sat Oct 31 → Tue Nov 3, 2026. Desktop-first (primary editing experience, 1440 wide). Mobile (390 wide) is mainly a quick-viewing experience with light edits.
Core concepts:
- **Places/Activity cards** (DB entity): every activity, restaurant, home, Airbnb, supercharger has a name, ADDRESS, category, notes, links, est. duration, hours, tags (halal, indoor/outdoor, rain-safe), status: scheduled | backup/idea.
- **Schedule**: Google-Calendar-style week view (Sat–Tue). Drag cards in/out of the schedule from a side "idea tray"/backlog; rearrange; remove back to backlog.
- **Fixed events** (locked, can't drag; show a lock): Airbnb check-in after 3:00 PM Sat 10/31; check-out before 10:00 AM Tue 11/3; booked Harbor Tour 4:15–5:15 PM Sun (arrive 3:45).
- **Prayer times** (fixed, overlaid). Emphasized (stronger): Fajr, Dhuhr, Maghrib. Lighter/faded: Asr, Isha. (They may combine prayers while traveling — e.g. Dhuhr+Asr, Maghrib+Isha.)
- **Weather**: per-day high/low, icon, overall precip chance; inside the day columns an hourly precipitation-probability band so rainy hours are obvious.
- **Auto travel blocks**: drive time between consecutive events auto-inserted (toggle on/off in quick settings). Heuristic from distance (no paid traffic API).
- **EV range**: 2026 Tesla Model 3 Standard RWD (EPA 321 mi, ~69.5 kWh usable, ~24 kWh/100mi). Track estimated battery % over the trip, warn and suggest Supercharger stops.
- **Map**: all places (home, Airbnb, scheduled, backups, superchargers), per-day route A→B→C with numbered stops, click a place → distance/time from Airbnb, measure tool between two points.
- **List view**: sections — Scheduled (grouped by day), Backup activities, Backup restaurants (halal tags), Superchargers; swap in/out actions.

## REAL DATA (use it; don't invent other facts)
Homes: Emmad — 27579 N Weeping Willow Dr, Valencia CA. Ömer — 16638 Nicklaus Dr, Unit 98, Sylmar CA (~13 mi from Emmad, ~20 min).
Airbnb: 3225 Idlewild Way, San Diego CA 92117 (Clairemont, near La Jolla). Door code: 8038. Host: Anthony (has guidebook). Sylmar → Airbnb ≈ 135 mi, ~2h20–2h40.
DST ENDS Sun Nov 1 at 2:00 AM (clocks fall back 1 hr; Sunday has 25 hours, 1:00–2:00 AM happens twice). CRITICAL: everything Sat is PDT (UTC−7), everything from Sun 2 AM on is PST (UTC−8). Prayer times below are already correct per day. Sunset/Maghrib jumps from 5:58p Sat to 4:58p Sun — evenings get dark an hour earlier. Surface this prominently (e.g. a 'Clocks fall back' marker on Sat/Sun boundary, PDT/PST labels in day headers).

### Prayer times (La Jolla, ISNA)
Sat 10/31 (PDT): Fajr 5:57a · Dhuhr 12:32p · Asr 3:36p · Maghrib 5:58p · Isha 7:08p
Sun 11/1 (PST): Fajr 4:58a · Dhuhr 11:32a · Asr 2:36p · Maghrib 4:58p · Isha 6:07p
Mon 11/2 (PST): Fajr 4:58a · Dhuhr 11:32a · Asr 2:35p · Maghrib 4:57p · Isha 6:06p
Tue 11/3 (PST): Fajr 4:59a · Dhuhr 11:32a · Asr 2:34p · Maghrib 4:56p · Isha 6:05p

### Weather (Open-Meteo forecast for La Jolla, fetched 10/28)
Sat 10/31: Cloudy, H 71° / L 63°, precip 69% max. Hourly rain chance: ≤5% until 11a, 19% 12–5p, 69% 6p–midnight (rain moving in Sat evening).
Sun 11/1 (25-hour day; all times PST, DST-corrected): Rain, H 69° / L 61°, precip 87% max, ~0.37 in. Hourly: 87% midnight–4a, 84% 5a–10a (heaviest 6–8a), 53% 11a–4p (showers tapering), 25% 5p–10p, clearing by evening.
Mon 11/2: Sunny, H 79° / L 64°, precip 11% (0–2% daytime).
Tue 11/3: Mostly sunny, H 80° / L 67°, precip 5%.
Sunset ≈ 5:58p Sat, 4:57p Sun–Tue (after DST).

### Draft itinerary (current plan; times are suggestions)
SAT 10/31
- 9:30a leave Valencia → 9:55a pick up Ömer (Sylmar) [drive 13 mi / 20 min]
- 10:00a–12:25p drive to Del Mar (~125 mi)
- 12:30–1:45p Brunch — Sugar and Scribe, 7660 Fay Ave Unit I, La Jolla (closes 2:30p)  [or swap]
- 2:00–3:30p Hike — Sea Cliff Coastal Bluff Trail, 100 8th St, Del Mar (11 mi from Airbnb; train-view bluffs). Alternatives: Rose Canyon Open Space Park, Museum of Contemporary Art San Diego
- 4:00p Check-in Airbnb (FIXED, after 3p)
- 5:58p Maghrib
- 7:00–8:30p Dinner — Zoya, 1000 Prospect St, La Jolla (halal; reserve via Google; 5 mi). Rain 69% evening → indoor, fine.
SUN 11/1 (fall back)
- 9:00–10:00a Brunch — Fig Tree Cafe, 5119 Cass St, Pacific Beach (closes 3p; 5 mi)
- 10:15a–1:45p Birch Aquarium, 2300 Expedition Way, La Jolla (9–5) — indoor, perfect for the rainy morning. Dhuhr 11:32 here.
- 2:00–3:30p optional: Little Italy / Devil's Dozen Donuts (backup) on the way
- 3:45p arrive → 4:15–5:15p Flagship South Harbor Tour, 990 N Harbor Dr (FIXED; 15 mi from Birch). ⚠ Maghrib 4:58p falls DURING the tour → flag a conflict; suggest combining Maghrib+Isha after.
- 6:15–7:30p Dinner — Aladdin Cafe (halal), 5420 Clairemont Mesa Blvd (3 mi from Airbnb)
MON 11/2 (sunny, 79°)
- 9:00–10:00a Brunch — Shorehouse Kitchen, 2236 Avenida De La Playa, La Jolla (close to Airbnb; closes 2:30p weekdays / 3:30p weekends)
- 10:30a–3:00p San Diego Zoo, Balboa Park
- 3:15–4:30p Balboa Park museum (tentative: Modern Art or Natural History)
- 5:30–7:00p Dinner — Sultan Baklava, El Cajon (18 mi from Balboa; far — may skip museum for it)
TUE 11/3
- before 10:00a Check-out (FIXED)
- 10:15–11:15a Brunch (e.g. Shorehouse Kitchen or Sugar and Scribe)
- Dhuhr 11:32 before leaving
- 11:45a–2:15p drive home, drop Ömer in Sylmar, ~2:40p home Valencia

### Backup / idea pool
Activities: Rose Canyon Open Space Park (hike, 8 min from Airbnb); Coast Walk Trail La Jolla (Ellen Browning Scripps Park, Shell Beach, La Jolla Cove, concrete steps to beach, tide pools, La Jolla Heights Natural Park); Scripps Coastal Meander Trailhead (near Birch); UCSD Geisel Library; Kingdom of Padel (pickleball); Little Italy (Airbnb food tour: pizza, gelato); Devil's Dozen Donuts (Little Italy); Museum of Contemporary Art San Diego.
Restaurants: Sultan Baklava (El Cajon); Khyber Pass Zarparan (University Ave near Balboa Park, halal unconfirmed); Akhi's Authentic Shawarma & Kebab, 747 Turquoise St Unit 200 (south La Jolla/PB); Urban Skillet (halal), 9254 Scranton Rd #105 (8 mi); George's at the Cove (La Jolla); Urbane Cafe (La Jolla, banh mi sandwiches).
Brunch spots: Sugar and Scribe; Fig Tree Cafe; Shorehouse Kitchen.

### Superchargers (Tesla; from DCFC Tracker)
- Villa La Jolla — 8657 Villa La Jolla Dr (in mall w/ shops & restaurants; 5 mi / ~10 min from Airbnb)
- Liberty Park Plaza — 4340 Genesee Ave, 92117 (8 stalls, 250 kW; ~1.5 mi from Airbnb — closest)
- Independence Square — 7373 Clairemont Mesa Blvd (12 stalls, 250 kW)
- Kearny Office Park — 8344 Clairemont Mesa Blvd (16 stalls)
- Fashion Valley Mall — 7007 Friars Rd (48 stalls, 250 kW)
- Morena Blvd — 845 Morena Blvd (16 stalls, 325 kW)

### EV range estimate (illustrative, for mockups)
Start 90% (~289 mi) Sat 9:30a. After Valencia→Sylmar→Del Mar→La Jolla, Sat night ≈ 38%. Sun (~40 mi) → ≈ 25%. Suggest charge: Mon morning at Villa La Jolla during brunch or Liberty Park Plaza 20→80% (~25 min). Mon (~55 mi incl. El Cajon) → ≈ 62%. Tue drive home ~150 mi needs ≥ 55% + buffer → arrive Valencia ≈ 12%. Show a warning style if any point dips below 20%.

## DESIGN SYSTEM — "Harbor Chart" (use exactly; all workers must match)
Feel: crisp nautical-chart / field-guide utility. Clean, information-dense, calm. Not cream, no gradients washes, no emoji, no left-border-accent cards.
Fonts (Google Fonts via one `<link>` in `<helmet>`):
`<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`
- Display/headings: Space Grotesk 600/700. Body/UI: Inter 400/500/600. Times, distances, %, numbers: JetBrains Mono.
Colors:
- Ground `#F3F6F7` (sea-fog), Surface `#FFFFFF`, Surface-2 `#E8EEF0`, Hairline `#D3DDE1`
- Ink `#0E2530` (harbor navy), Ink-2 `#3F5864`, Ink-3 (labels, must stay ≥4.5:1 on white) `#56707C`
- Accent / buoy orange `#D9541E` (primary actions, current-time line, warnings) ; orange-tint `#FCE9DF`
- Teal `#11707F` (scheduled activities, links) ; teal-tint `#DDF0F2`
- Categories (event block fills are tints w/ darker text): Activity teal `#DDF0F2`/`#0B5562`; Food `#FBEBD3`/`#8A4B07`; Drive/travel striped neutral `#EEF1F3`/`#3F5864` (diagonal hatch); Fixed/booked navy `#0E2530` fill w/ white text + lock icon; Prayer indigo `#4B4FC4` (emphasized: solid 2px line + label chip; light ones: 35% opacity dashed line); Charging `#2F6FDB` blue; Rain: blue `#2F6FDB` at alpha proportional to probability (e.g. rgba(47,111,219,0.06–0.30)) as a band in the hour gutter or a background wash in the day column.
- Range: battery chip in mono; ≥50% teal, 20–50% amber `#B7791F`, <20% orange-red `#C2410C`.
Radius 10px cards, 8px blocks, 999px chips. Shadows: very subtle `0 1px 2px rgba(14,37,48,.06), 0 4px 12px rgba(14,37,48,.05)`.
Icons: inline stroke SVG (1.75 stroke, currentColor), never emoji. Decorative SVG `aria-hidden="true"`.
App chrome (desktop): left nav rail OR top bar with: logo wordmark "La Jolla '26" (or "Tide & Trip"), nav tabs: Today, Schedule, Map, Places, Range; trip pill "Oct 31 – Nov 3 · 2 travelers (E, Ö avatars)"; a "synced" indicator. Use the same chrome across desktop artboards so they look like one product.

## FORMAT RULES (Claude Design `.dc.html`) — follow exactly, they fail silently
Skeleton:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Schedule — week</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link ...fonts...>
<style>
body{margin:0}
a{color:#11707F}a:hover{color:#0B5562}
</style>
</helmet>
<div style="...root...">
  ...markup...
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1440,"height":1100}}'>
class Component extends DCLogic {
  renderVals() {
    return { ... };
  }
}
</script>
</body>
</html>
```
- Keep `<script src="./support.js"></script>` EXACTLY. Close every non-void element; quote every attribute.
- Desktop screens are PAGES: fluid root (no fixed px width on root; use `max-width` container, %, fr, rem; px heights OK). Must not break at phone width (wrap rows; wide grids inside `overflow-x:auto` box). `$preview` width 1440 and height = the real content height at 1440.
- Mobile screens: FIXED root `width:390px; height:844px` (or taller if scrolling content, e.g. 390×1400), no fake status bar.
- Styling: inline `style="…"` on elements. `<helmet><style>` only for body basics, `a` colors, and small things like hatch patterns / keyframes / :hover.
- `{{hole}}` is a dotted lookup ONLY into renderVals() (no expressions). Loops: `<sc-for list="{{days}}" as="d" hint-placeholder-count="4">…{{d.label}}…</sc-for>`. Conditionals: `<sc-if value="{{showTravel}}" hint-placeholder-val="{{ true }}">…</sc-if>`. Events: `onClick="{{toggleTravel}}"` where renderVals returns a function; per-item handlers attached in renderVals via map. State: `this.state` / `this.setState`, init with `constructor(props){super(props); this.state={...}}` or `state = {...}` class field.
- Computed styles per item: compute a string in renderVals (e.g. `item.style = "top:120px;height:60px;background:#DDF0F2"`) and bind `style="{{item.style}}"`. That's fine and recommended for calendar block positioning.
- All UI is markup — never innerHTML/appendChild. No network except the Google Fonts link. No iframes. No emoji. Real `<button>`, `<a href>`, `<input>`+`<label>`; `aria-label` on icon-only buttons. Text contrast ≥4.5:1.
- `data-props` is single-quoted JSON; declare at most 1–3 meaningful tweaks (e.g. a boolean `showTravel`, `density` enum) — not copy.
- Copy that is just text should be literal markup where practical; data-driven repeated items (events, cards) via renderVals arrays is fine.
- Maps: no tiles allowed (no network). Draw a STYLIZED chart-style map with inline SVG: coastline shape (Pacific on the west, La Jolla peninsula, Mission Bay, San Diego Bay), a few major roads (I-5, I-805, SR-52, I-8, SR-163) as light lines, labelled neighborhoods (La Jolla, Pacific Beach, Clairemont, Del Mar, Downtown, Balboa Park, El Cajon, Little Italy). Pins and route lines as SVG/positioned elements. Mark it in a footnote that the built app will use real OpenStreetMap tiles (Leaflet/MapLibre). Approx geography (x→east, y→south): Del Mar far north on coast; La Jolla on coastal bulge; UCSD/Birch just north of La Jolla; Clairemont (Airbnb) inland east of Pacific Beach; Mission Bay south of PB; Downtown/Harbor south-southeast at San Diego Bay; Balboa Park just NE of Downtown; El Cajon far east.
Make it look real, polished and dense with the real data above. Over-tall beats clipped.
