# Buenos Aires Program — Student App

## Overview

A mobile-first web app for Pepperdine University's Buenos Aires Program students. It provides quick access to class schedules, the semester calendar, announcements, health providers, local churches, recommended apps, and FAQ entries. The app reads all content from a Google Sheet, so the Program Director can update information without touching code. A localStorage stale-while-revalidate cache makes repeat opens essentially instant.

Live URL: https://baprogram.vercel.app/

## Architecture

```
Google Sheet (source of truth)
        ↓
   Apps Script Web App ←→ CacheService (1-hour TTL)
        ↓                  (or fallback: 15 parallel gviz CSV fetches)
   fetchAllData()  ←→  localStorage cache (stale-while-revalidate)
        ↓
   React app (Vite build)
        ↓
   Vercel (hosting)
```

The app is a single-page React application built with Vite. On every open it reads localStorage synchronously during first render to display cached content instantly, then kicks off a background fetch in the background. When the fetch returns, it silently swaps in fresh data and updates the cache. If the fetch fails, the cached data stays on screen; if no cache exists yet (first-ever open), the app falls back to hardcoded default data embedded in the code.

The background fetch has two paths. By default it hits a single Apps Script Web App endpoint that returns all 15 sheet tabs as one JSON blob; the script caches its response for 1 hour via `CacheService`, so most opens never re-read the spreadsheet. If that endpoint is unreachable, returns a non-200, or returns non-JSON (e.g. a Google login page when deploy permissions are wrong), the app silently falls back to the legacy path: 15 parallel gviz CSV fetches, one per tab. Both paths feed the same `normalizeData()` function, so the rendered output is identical.

## Key Files

| File | Location in Repo | Purpose |
|------|------------------|---------|
| `App.jsx` | `src/App.jsx` | The entire app; all components, data fetching, cache layer, brand tokens, and default data |
| `vite.config.js` | Root | Vite build config; includes the `vite-plugin-pwa` setup that generates the service worker |
| `index.html` | Root | Entry point; includes preconnect hints, font stylesheet, PWA manifest, apple-touch-icon, and favicon links. The plugin auto-injects the service worker registration here at build time |
| `manifest.json` | `public/` | PWA configuration (app name, theme color, icons) |
| `apple-touch-icon.png` | `public/` | iOS home screen icon (180×180, BAP logo on Pep Blue background) |
| `icon-192.png` | `public/` | PWA icon (192×192, BAP logo on Pep Blue background) |
| `icon-512.png` | `public/` | PWA icon (512×512, BAP logo on Pep Blue background) |
| `favicon.ico` | `public/` | Browser tab icon (contains 16×16 and 32×32) |
| `favicon-32x32.png` | `public/` | Browser tab icon (32×32) |
| `favicon-16x16.png` | `public/` | Browser tab icon (16×16) |

The `index.html` `<head>` includes these performance and asset tags:

```html
<link rel="preconnect" href="https://docs.google.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=EB+Garamond:wght@400;700&family=Roboto:wght@400;500;700&display=swap">
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
```

The preconnect hints start TLS handshakes to Google's servers before the JS bundle parses, shaving 100–300ms off cold loads. The font stylesheet is loaded in parallel with the bundle rather than waiting for React to mount and inject it. `App.jsx` also injects the font link via `useEffect` as a safety net; the browser dedupes duplicate `<link>` tags, so this is harmless.

## Google Sheet

**Sheet ID:** `1Bn1wpsKr6-3eXRZtH-_6IxmTiQA4I157-nt-0tdmyaA`

**Requirements for the sheet to work:**

- Must be **published to the web** (File > Share > Publish to web > Entire Document > CSV)
- Must be **shared publicly** (Share button > General access > "Anyone with the link" > Viewer)
- Both steps are required; publishing alone is not enough

**How the app fetches data:**

The app has two fetch paths, controlled by the `APPS_SCRIPT_URL` constant in `App.jsx`. The consolidated path is preferred; the per-tab path is the fallback.

**Consolidated path (preferred).** When `APPS_SCRIPT_URL` is set, the app makes a single GET request to a deployed Apps Script Web App that returns every tab as one JSON blob. The script reads the spreadsheet via `SpreadsheetApp` and caches its response for 1 hour using Apps Script `CacheService`, so most opens hit the script's in-memory cache instead of re-reading the sheet. This is the path students actually take 99% of the time. See "Apps Script Endpoint" below for deploy details.

**Per-tab fallback path.** If `APPS_SCRIPT_URL` is empty, the consolidated request fails outright (network error, non-200), or the response isn't valid JSON (e.g. an HTML login page from a misconfigured deploy), the app silently falls back to fetching each tab individually using:

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB_NAME}
```

It fetches all 15 tabs in parallel using `Promise.all`, parses each as CSV with PapaParse, and feeds them through the same normalization function the consolidated path uses. Slower, but it has no script-deploy dependency, so it's the safety net.

Both paths funnel into a shared `normalizeData(raw)` helper that turns the per-tab arrays into the app's data shape, so the UI behavior is identical regardless of which path served the data.

### Tab Structure

Column headers must be **lowercase** and **exactly as shown**. Tab names are case-sensitive.

**Settings**

| Key | Value |
|-----|-------|
| semester | Summer 2026 |
| last_updated | 2026-04-28 |
| finals_window_start | 2026-08-29 |
| finals_window_end | 2026-08-29 |

The `finals_window_start` and `finals_window_end` keys define the program-wide final-exam window (typically a single day for Summer terms; 2-3 days for Fall and Spring). The app uses the window in two places: it gates when the Finals UI surfaces (the FinalsCard on the Schedule tab and the Finals coming up tile on Today both appear 14 days before `finals_window_start`), and it provides the "TBD · {window}" copy on per-class rows whose individual `final_date` hasn't been assigned yet. Both keys must be `YYYY-MM-DD`. Leaving them blank disables the finals UI entirely.

**Classes**

| Column | Example | Required |
|--------|---------|----------|
| code | SPAN 350 | Yes |
| title | Advanced Conversation | Yes |
| professor | Castro | Yes |
| honorific | Prof. | No |
| firstname | María | No |
| days | Mon, Tue, Wed, Thu | Yes |
| time | 9:00–10:50 | Yes |
| location | Cuyo | Yes |
| color | #00205B | Yes |
| email | mcastro@pepperdine.edu | No |
| start_date | 2026-05-11 | No |
| end_date | 2026-08-28 | No |
| final_date | 2026-08-29 | No |
| final_time | 9:00–11:00 | No |

Notes on the `time` field: Classes with variable schedules across days use this format: `Mon 16:30–19:30; Tue 13:40–17:15; Thu 17:10–19:30`. The app parses this and shows only the relevant time slot for each day in the week view. Simple times like `9:00–10:50` are shown as-is on all days.

Notes on `days`: Accepts two formats. Either comma-separated three-letter abbreviations (`Mon, Tue, Wed, Thu, Fri`) or a single concatenated string of single-letter day codes (`MTWR` = Mon/Tue/Wed/Thu; `R` stands for Thursday to avoid collision with Tuesday). The `parseDays()` helper detects which format is in use.

Notes on `honorific`, `firstname`, `email`: Used in the "All Courses" view. When `honorific` and `firstname` are both present, the professor line reads "Prof. María Castro"; otherwise it falls back to the bare surname. When `email` is present, a tappable "Email Prof. Castro" button appears on the card.

Notes on `color`: Hex color code used for the left accent bar on class cards. The current scheme uses three colors to distinguish class groups:

- **GE classes:** Sky `#6CACE4` (ARTH 251, HIST 270, HUM 200, INTS 350, NUTR 210, NUTR 210 Lab, PE 193, SPAN 121, SPAN 251)
- **UD classes:** Pepperdine Blue `#00205B` (SPAN 350, SPAN 380, SPAN 440)
- **Combined:** Pepperdine Orange `#E35205` (HUM 295/296)

An earlier scheme used Ocean (`#0057B8`) for GE and Pep Blue (`#00205B`) for UD, but the two blues were hard to distinguish as thin border accents. Sky provides much stronger contrast against the dark navy. Full brand palette available in the `Branding_Guidelines` project knowledge file.

Notes on `start_date` and `end_date` (added 2026-04-28): Both `YYYY-MM-DD`, both optional. They bracket the regular meeting period for the class. Outside `[start_date, end_date]` (inclusive) the class is suppressed from the Today tab's activity card and the Schedule tab's Weekly Overview. The Class Schedule (Mon–Fri grid) and Courses (alphabetical list) sub-views always show the full catalog regardless. Either value blank means "no gate on that side." Implementation lives in `isClassActive(c, dateStr)` and `filterActiveClassesForDate(classes, dateStr)`. Set `end_date` to the last regular session, not the final exam date.

Notes on `final_date` and `final_time` (added 2026-04-28): `final_date` is `YYYY-MM-DD`; `final_time` is a free-form time-range string like `9:00–11:00`. Both optional and typically left blank at the start of the term, then filled in row-by-row as the registrar publishes the schedule. Effects: (a) the Today tab's `<TodayFinalsTile>` and the Schedule tab's `<FinalsCard>` switch from "TBD · {finals window}" to the concrete date+time for that row; (b) on the day itself, `getTodayItems` replaces the regular class meeting on Today's activity card with a "Final" entry (Pep Orange pill via `kind: "final"`); (c) `WeeklyOverviewView` does the same swap on the matching day card with a Pep Orange highlighted card. Implementation: `getStudentFinals`, `getFinalForDate`.

**Calendar**

| Column | Example | Required |
|--------|---------|----------|
| date | 2026-05-11 | Yes |
| title | UD Arrival Day | Yes |
| type | milestone | Yes |
| description | UD students arrive at EZE | Yes |
| end_date | 2026-05-13 | No |
| start_time | 10:00 | No |
| end_time | 13:00 | No |
| visibility | both | No |

The `type` field must be exactly one of: `program`, `academic`, `excursion`, `holiday`, `orientation`. Each type has a distinct color and icon in the app:

- **program**: Parchment-orange background, Pep Orange border, ★ (the most prominent treatment; flags program-office-curated entries like arrival days, asados, faculty visits)
- **academic**: Ice background, Ocean border, ◆
- **excursion**: Pale green background, forest green border, ▲
- **holiday**: Pale pink background, red border, ●
- **orientation**: Ice background, Sky border, ⬟

The `milestone` type that previously carried the Pep Orange treatment was retired on 2026-05-11b; its visual was reassigned to `program` because the two had drifted into operational overlap (both surfaced Director-curated date entries and students never reliably distinguished them when filtering). Any legacy `milestone` rows still in the sheet fall through `EVENT_STYLES.academic` and render as Academic cards until the Director relabels them to `program`.

Date format must be `YYYY-MM-DD`. If using Google Sheets date cells, ensure they export in this format (plain text cells are safest).

The optional `end_date` column supports multi-day events. When present (and later than `date`), the event displays as a single card with a date range label (e.g., "May 22–25") and a day count (e.g., "3 days") rather than duplicating across multiple days. The `end_date` value is normalized to the first 10 characters to handle timestamp artifacts from CSV export.

The optional `start_time` and `end_time` columns (24-hour format, e.g. `10:00`, `13:00`) display a time range under the event title on the Weekly Overview and are used to sort events within a single day. Events without a `start_time` appear first for that day (treated as all-day or flexible items), followed by timed events in chronological order.

The optional `visibility` column controls where the event appears:

- `both` (default if blank) — appears in both the Semester Calendar and the Weekly Overview
- `week` — appears only in the Weekly Overview (e.g., routine weekly items like the Friday asado that would clutter the semester view)
- `semester` — appears only in the Semester Calendar (e.g., semester-level milestones that shouldn't appear on a given week)

**Birthdays**

| Column | Example | Required |
|--------|---------|----------|
| name | María García | Yes |
| date | 05-12 (or 5-12, or 2003-05-12) | Yes |
| role | student, staff, faculty | No |

This tab is optional. When present, the Today tab renders a celebratory birthday card on any day where one or more rows match today's MM-DD. The card sits between the announcement banner and the holiday card.

The `date` column is parsed via `parseBirthdayMD()` and accepts three formats: `MM-DD` (e.g., `05-12`), `M-D` (e.g., `5-12`), or full `YYYY-MM-DD` (e.g., `2003-05-12`). When a full date is provided, the year is intentionally stripped during parsing. **The app never displays or computes age.** This is a deliberate privacy choice — students share their birthday, not their age.

The `role` column accepts `student`, `staff`, `faculty` (or any free-form value) but is captured-but-unused in v1. Reserved for future filtering or visual differentiation.

**Privacy guidance:** Only add students who've affirmatively opted in. The card displays publicly to all app users. A simple consent checkbox during orientation works well — "Would you like the program to surface your birthday on the app?" Staff and faculty are typically lower-stakes since the audience is a closed cohort, but their preference still rules.

**UI tiers based on count:**
- **1 person:** "¡Feliz cumple, María!"
- **2 people:** "¡Feliz cumple a María y Carlos!"
- **3+ people:** "¡Feliz cumple!" header, with names listed in a single comma-joined line beneath

The card is Spanish-only by design — the names themselves carry the bicultural feeling, and the Spanish reads warmer without an English echo underneath.

**Feb 29 birthdays:** In non-leap years, anyone born on February 29 won't be matched. The program office can manually adjust their date row to `02-28` or `03-01` for that calendar year as preferred.

**Holidays**

| Column | Example | Required |
|--------|---------|----------|
| date | 2026-05-25 | Yes |
| name_es | Día de la Revolución de Mayo | Yes (or name_en) |
| name_en | May Revolution Day | Yes (or name_es) |
| cancels_classes | TRUE | Yes |
| observance_type | national | No |
| description_es | Aniversario de la Revolución de Mayo de 1810... | No |
| description_en | Anniversary of the May Revolution of 1810... | No |

This tab is optional but recommended. When present, it becomes the source of truth for which days suppress classes and what the Today holiday card displays. When absent, the app falls back to calendar events tagged `type: "holiday"` (legacy behavior; treats every holiday-typed event as class-cancelling).

The `cancels_classes` flag is parsed via `parseBoolean()` which accepts `TRUE`, `true`, `yes`, `y`, `1`, `x`, `✓`, `sí`, `si` as truthy and anything else as falsy. National feriados, Semana Santa, and días no laborables con fines turísticos should be `TRUE`; cultural observances like Día del Maestro, Día del Estudiante, Día de la Tradición, and Día Internacional de la Mujer should be `FALSE`.

The `observance_type` column is free-form but values like `national`, `religious`, `cultural`, and `provincial` are conventional. Reserved for future filtering work; the app currently doesn't read it.

The Today holiday card renders bilingual content: Spanish title and description primary, English in italic EB Garamond underneath. Class-cancelling holidays get a red feriado treatment (`#FCE4EC` bg, `#C62828` stripe, "Feriado / Holiday" label); cultural observances get a quieter Ocean treatment (`C.ice` bg, `C.ocean` stripe, "Día especial / Cultural day" label). Weekly Overview day cards inherit the same visual distinction in a more compact form.

**Announcements**

| Column | Example | Required |
|--------|---------|----------|
| message | Add/Drop deadline is Friday | Yes |
| type | info | No |
| start_date | 2026-05-15 | Yes |
| end_date | 2026-05-18 | Yes |
| link | https://example.com/form | No |

This tab is optional. The app fetches it with a try/catch wrapper, so the app will not break if the tab does not exist.

The `type` field accepts `info` or `urgent` (defaults to `info` if blank):
- **Info**: Ice Blue background, BAP Blue accent stripe, `<MegaphoneIcon>` glyph, "Aviso / Notice" label.
- **Urgent**: Parchment background, Pep Orange accent stripe, `<AlertIcon>` triangle glyph, "Importante / Important" label, plus a small Pep Orange pulsing dot pinned to the right of the label (`.bap-pulse-dot-orange`).

Announcements are filtered client-side: only rows where today falls within the `start_date`/`end_date` range (inclusive) are shown. Multiple active announcements stack vertically on the Today tab between the quick-stats row and today's activity card.

Per the 2026-04-26 redesign, announcements are not user-dismissible: they auto-clear once the `end_date` passes, so the program office controls the lifecycle entirely from the sheet. Each banner shows a bilingual DM Mono label, the message body in 14 px Roboto, an italic "Hasta el viernes" / "Hasta el 4 de mayo" Spanish gloss when the announcement runs ≤21 days (so students know when it'll auto-disappear), and a "Más info →" CTA pill in the accent color when `link` is set. The previous `icon` column is no longer read; the type-driven glyph replaces it.

**Health**

| Column | Example | Required |
|--------|---------|----------|
| name | Clínica Zabala (Swiss Medical) | Yes |
| type | Hospital/Clinic | No |
| address | Av. Cabildo 1295, Belgrano | No |
| phone | +54 11 5236-8500 | No |
| notes | 24hr emergency; Swiss Medical Group | No |
| link | https://www.swissmedical.com.ar/clinewsite/zabala/ | No |
| insurance | bcbs | No |
| category | facility | No |
| location_note | 24/7 Telehealth Therapy | No |

The `link` column is optional per row. If present, the app shows a tappable button. Link types auto-detected:

- `https://wa.me/...` → shows "WhatsApp" button
- `https://...instagram.com/...` → shows "Instagram" button
- Any other URL → shows "Visit website" button

WhatsApp link format: `https://wa.me/` followed by phone number with country code, no spaces or punctuation. Example: `+54 9 11 4419-7092` becomes `https://wa.me/5491144197092`.

The optional `insurance` column, when set to `bcbs` (case-insensitive), shows a small BCBS/GeoBlue logo next to the provider name to signal in-network status for students on the Pepperdine GeoBlue plan.

The optional `category` column overrides the automatic facility-vs-person detection. Valid values are `facility` or `person`. When a row is a facility (either by category or by type match against `hospital|clinic|clínica|sanatorio|laboratory|lab|pharmacy|farmacia|emergency|isos|imaging|diagnóstico`), the card gets an Ice-blue background to visually separate it from individual practitioners. Use `category: person` to force a named-facility row like "Dr. Smith Clinic" to render as a person, or `category: facility` to force a row whose type isn't in the pattern list.

The optional `location_note` column is for providers whose "location" isn't a real street address: telehealth services ("24/7 Telehealth Therapy"), home-visit practitioners ("Casa (on-site)"), or providers where the location line carries reference data ("Member Num: 11BCAS525378") instead of a physical address. Unlike `address`, it renders as plain italic gray text with no 📍 pin and no Google Maps link. If a row has both `address` and `location_note`, the address appears first (linked), then the note below as unlinked context.

**Churches**

| Column | Example |
|--------|---------|
| name | Saddleback Buenos Aires |
| denomination | Non-denom. |
| address | Mario Bravo 559 |
| location_note | Meets in rotating member homes |
| service | 11AM, 5PM, 7PM (Spanish & English) |
| notes | 35 mins by subte/bus |
| link | https://saddleback.com/visit/locations/buenos-aires |

Same `link` behavior as Health tab. The `location_note` column follows the same rules as on the Health tab: plain italic gray text, no pin, no map link; used for churches whose gathering location isn't a single fixed street address.

**Explore**

| Column | Example |
|--------|---------|
| name | MALBA |
| type | Museum |
| description | Premier Latin American art museum |
| address | Av. Figueroa Alcorta 3415, Palermo |
| location_note | Multiple locations citywide |
| hours | Thu–Mon 12–8pm |
| link | https://www.malba.org.ar |

Displayed as the third sub-tab under Local. Addresses are rendered as clickable Google Maps links (see `AddressLink` below). The `location_note` column follows the same rules as on Health and Churches: plain italic gray text, no pin, no map link; useful for entries like neighborhoods or city-wide attractions where a single street address would be misleading.

**Contacts**

| Column | Example |
|--------|---------|
| name | Buenos Aires Program |
| role | Program Office |
| phone | +5491151561793 |
| whatsapp | https://wa.me/5491151561793 |
| email | buenosaires@pepperdine.edu |
| address | 11 de Septiembre de 1888 955, CABA |
| maps | https://maps.app.goo.gl/HQt8A6ZQABrhL7rG7 |
| type | office |

The `type` column controls how the contact is grouped and styled:
- `office` — the Program Office card at the top (shows address, Call, Open in Maps, and Email buttons)
- `emergency` — amber-accented emergency card (shows Call and WhatsApp buttons)
- `staff` — individual staff cards (shows Call, WhatsApp, Email buttons; address is not rendered here)

The `maps` column is optional. When present on an `office` row, its URL is used for the address link; otherwise a Google Maps URL is auto-generated from the `address` field.

**Resources**

| Column | Example |
|--------|---------|
| name | U.S. Embassy Buenos Aires |
| detail | Av. Colombia 4300, Palermo |
| phone | +54 11 5777-4533 |
| url | https://ar.usembassy.gov/ |

Optional tab. Displayed in the Contacts view under the "Additional Resources" header, below the Local Emergency Numbers block. Each row renders as a card with a Call button (when `phone` is set) and a Website button (when `url` is set). The app wraps the fetch in a try/catch so a missing Resources tab will not break data loading.

**FAQ**

| Column | Example |
|--------|---------|
| title | Independent Travel |
| content | Students may travel independently on weekends… |
| link | https://example.com/handbook/travel-policy |

FAQ entries display as expandable accordion cards. If a `link` is present, a "View full details" button appears below the summary text. The button renders as `display: flex` with `width: fit-content` so it always starts on its own line. The sheet tab was previously called "Policies"; the columns and behavior are unchanged.

**Apps**

| Column | Example | Required |
|--------|---------|----------|
| name | Google Maps | Yes |
| category | Navigation | No |
| description | Maps, transit, and walking directions. | No |
| ios_url | https://apps.apple.com/app/google-maps/id585027354 | No |
| android_url | https://play.google.com/store/apps/details?id=com.google.android.apps.maps | No |
| web_url | https://dolarhoy.com | No |
| priority | essential | No |

Optional tab. Displayed as the Apps sub-tab inside the Local view. The app wraps the fetch in a try/catch so a missing Apps tab will not break data loading.

Filter pills above the list filter by `category` (e.g., Navigation, Transportation, Food & Delivery, Finance, Comms). Pills only appear when there is more than one unique category.

Apps are sorted with `priority: essential` first, then alphabetically by name. Essential apps get a subtle Ice-blue card background and a small Pep Orange dot next to the name to visually cluster them.

Each card shows name, category badge, description, and up to three tappable buttons. The render logic: if `ios_url` is set, show a "📱 iOS" button; if `android_url` is set, show a "🤖 Android" button. If neither store URL is set but `web_url` is set, show a "🌐 Website" button as a fallback. `web_url` is ignored when a store URL is present.

The `priority` value is case-insensitive; only `essential` triggers the visual treatment. Any other value (e.g., `recommended`, or blank) renders as a regular card.

**Tips**

| Column | Example | Required |
|--------|---------|----------|
| text | *Dale* is yes, no, sure, ok, and "let's go," all at once. | Yes |
| category | phrases | No |

Optional tab. Powers the rotating tip card on the Loading screen (the only screen students see when they open the app for the first time, before any cache exists). The app wraps the fetch in a try/catch so a missing Tips tab will not break data loading.

The `text` column supports markdown-style asterisk emphasis: any text wrapped in single asterisks (e.g., `*subte*`, `*che*`, `*re bueno*`) renders as italic EB Garamond inline. This is parsed by the `renderTip()` helper using a simple split on `*`; there is no HTML evaluation, so the field is XSS-safe. Use this for Spanish words, place names, or any phrase that benefits from a small typographic emphasis. Plain text without asterisks renders as-is.

The `category` column is purely for the Director's organizational use (e.g., `transit`, `food`, `phrases`, `culture`, `city`). The app does not currently filter by category; it cycles randomly-then-sequentially through the full list, advancing every 4 seconds with a 320ms cross-fade.

Tips are kept short (rule of thumb: under 20 words) so they're readable in a single glance during the loading interval. When the Tips tab is empty or missing, the LoadingScreen falls back to a small built-in set of three tips so the first-ever load is never blank.

**Events**

| Column | Example | Required |
|--------|---------|----------|
| title | Lulu Sandri en Niceto | Yes |
| category | music | Yes |
| description | Argentine alt-folk; doors at 21:00 | Yes |
| start_date | 2026-04-26 | Yes |
| end_date | 2026-04-30 | No |
| time | 21:00 | No |
| venue | Niceto Club | No |
| neighborhood | Palermo | No |
| address | Av. Niceto Vega 5510 | No |
| link | https://nicetoclub.com/... | No |
| cost | $8.000 ARS | No |

Optional tab. Powers the "This Week" sub-tab in Local (the leftmost sub-tab) and the "Esta semana / This Week in BA" tile on Today. Updated weekly by the Director; no rebuild needed.

The `category` field must match one of: `music`, `theater`, `film`, `exhibit`, `dance`, `festival`, `food`, `talk`, `service`, or `other`. Anything else falls through to `other`. Each category carries a distinct color and an SVG glyph rendered inside a 44 px colored circle on the event card:

- **music**: Pep Orange, music-note glyph
- **theater**: Pep Blue, theater-mask glyph
- **film**: Mountain, film-reel glyph
- **exhibit**: Sky, picture-frame glyph
- **dance**: Pep Orange, tango-shoe glyph
- **festival**: Pep Orange, sparkle glyph
- **food**: Ocean, fork-and-plate glyph
- **talk**: Mountain, microphone glyph
- **service**: BAP Blue, hands-cradling-heart glyph (volunteering, service learning, giving back to the community)
- **other**: Stone, pin glyph

`start_date` and `end_date` use `YYYY-MM-DD`. `end_date` is optional and only used for multi-day runs (festivals, exhibitions); single-day events leave it blank. The app auto-hides events whose last day is before today, so old entries stay in the sheet without cluttering the app — useful for archiving past picks. Events are sorted chronologically (by `start_date`, then by `time` when same-day; untimed entries lead the day).

Within the sub-tab, events are split into two groups: "This week / Esta semana" (today through +7 days) and "Coming up / Próximamente" (anything later). Filter pills above the list let students narrow by category, and only appear when 2+ categories are present in the data. When no events are upcoming at all, the sub-tab shows a friendly "Nothing curated yet" empty state pointing to Explore BA for evergreen recommendations.

`link` accepts any URL (website, Instagram profile, ticket page). The app renders it as a tappable "Open Link →" button using the existing `<LinkButton>` helper. `address` is rendered through `<AddressLink>` and opens Google Maps. `cost` is a free-text field; conventions like "Free", "$8.000 ARS", "$15 USD", "Suggested $5.000" all render fine.

## Apps Script Endpoint

The app reads from two Apps Script Web Apps, each bound to its own spreadsheet for permission isolation: this section covers the **content endpoint** (class schedules, calendar, contacts, etc.); the parallel **Roster Auth Endpoint** (see next section) handles per-user identification. Splitting the two means the content script literally has no read access to the Roster, and the auth script literally has no read access to the content sheet, so a bug in either can't leak data from the other.

The content Apps Script Web App reads every tab the app needs from the content spreadsheet and returns one JSON blob keyed by tab name (each tab is an array of header-keyed row objects). As of 2026-05-03 it is also the cohort-level auth boundary: every request must carry a `?token=` query parameter matching the `COHORT_TOKEN` entry in Script Properties, or the script returns `{ error: "unauthorized" }` with no data.

**Deployed URL location.** Stored in `App.jsx` as the `APPS_SCRIPT_URL` constant in the CONFIGURATION section.

**Source.** The Apps Script lives bound to the spreadsheet (Extensions > Apps Script from the sheet's menu). The single source file is `Code.gs`, also kept in the repo root as the canonical reference. The repo copy and the script editor have to be kept in sync manually after any edit.

**Caching.** The script caches its JSON response for 1 hour via `CacheService.getScriptCache()` under the key `bap_app_data_v1`. Sheet edits therefore take up to 1 hour to appear via this endpoint. Append `?bust=1` to the Web App URL (alongside `&token=…`) when manually verifying an edit; that query param skips the cache for one request and re-reads the spreadsheet. The Today pull-to-refresh gesture also threads `?bust=1` through `fetchAllData({ token, bust: true })`. The cache key is intentionally versioned (`_v1`); bump the suffix in `Code.gs` if the script's output shape ever changes incompatibly.

**Manual cache reset.** Run the `clearCache()` function from the Apps Script editor to drop the cached value without bumping the key.

**Deploy procedure (first-time):**

1. Open the spreadsheet, then Extensions > Apps Script.
2. Paste in the contents of `Code.gs`. Save.
3. Project Settings (gear icon, left sidebar) > Script Properties > Add property: `COHORT_TOKEN` = the cohort passcode (e.g., `asado-summer-26`).
4. Run `testReadAllTabs()` once from the editor to authorize the spreadsheet read scope and confirm tab counts in the execution log.
5. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
6. Copy the deployed URL into `App.jsx` as `APPS_SCRIPT_URL`. Commit, push, Vercel rebuilds.

**Re-deploy after script edits.** Apps Script Web Apps freeze at the version they were deployed at. Editing the script doesn't affect production until a new deployment is created (Deploy > Manage deployments > pencil icon > Version: New version). The URL stays the same across re-deployments of an existing deployment slot, which is what you want.

**Cohort token rotation.** Edit the `COHORT_TOKEN` Script Property and save. **No re-deploy is needed for token rotation** — Script Properties are read at request time, not at deploy time. The next student fetch will fail with AuthError, the app will clear the stale token from localStorage automatically, and the gate will re-prompt for the new code. Combine the rotation with a WhatsApp-group announcement of the new code so students know what to type.

**Failure mode.** When the script is reachable but rejects auth, the app returns to the passcode gate with a "Wrong code" message. When the script is unreachable (network error, deploy expired), `App.jsx` keeps cached content on screen and downgrades the status pill to "Saved version (offline)" — same behavior as before. There is no longer a fallback path; the gviz CSV approach was removed on 2026-05-03 because it was the only remaining auth-free door into the data.

## Roster Auth Endpoint

A second Apps Script Web App, bound to a separate "BAP App Roster" spreadsheet, handles per-user identification AND per-student data collection (prompts + responses, see "Prompts and Responses" below). Same shape as the content endpoint (Apps Script returning JSON over a Web App URL with `?token=…`), different concern (validates a CWID + birthday against the Roster tab, returns the matched user's curated row, serves prompt definitions, accepts submissions back).

**Deployed URL location.** Stored in `App.jsx` as the `AUTH_SCRIPT_URL` constant in the CONFIGURATION section, alongside `APPS_SCRIPT_URL`.

**Source.** `AuthCode.gs`, kept in the repo root as the canonical reference. Lives bound to the Roster spreadsheet (Extensions > Apps Script from the Roster sheet's menu). The repo copy and the script editor have to be kept in sync manually after any edit, same convention as `Code.gs`.

**Endpoint shapes:**

```
GET ?action=identify&token=<cohort>&cwid=<cwid>&birthday=<MM-DD>
  → { user: { cwid, first_name, last_name, preferred_name, pronouns,
              role, email, whatsapp, housing_assignment, tshirt_size,
              tshirt_fit, dietary_restrictions, food_allergies,
              program_status } }
  → { error: "unauthorized" }   // bad cohort token
  → { error: "no_match" }       // cwid not found, birthday mismatch, or program_status not active
  → { error: "bad_request" }    // missing/unparseable params

GET ?action=prompts&token=<cohort>&cwid=<cwid>&birthday=<MM-DD>
  → { prompts: [ {
        prompt_id, title_es, title_en, description_es, description_en,
        category, surface, start_date, end_date,
        fields: [ { field_id, field_order, label_es, label_en,
                    field_type, options[], option_labels_es[],
                    option_labels_en[], required, placeholder_es,
                    placeholder_en } ],
        responses: { field_id: storedValue, ... },   // pre-filled
        submitted_at: "2026-05-09T...Z"               // most recent
      } ] }
  → { error: "unauthorized" | "no_match" | "bad_request" }

POST  (Content-Type: text/plain;charset=utf-8, JSON body)
  { action: "submit", token, cwid, birthday,
    prompt_id, fields: { field_id: value, ... } }
  → { prompt: { ... }, ... }    // refreshed prompt after upsert
  → { error: "validation_failed", details: "missing_field:fid" | "bad_value:fid" }
  → { error: "not_found" | "audience_mismatch" | "prompt_inactive" | "lock_failed" }
  → { error: "unauthorized" | "no_match" | "bad_request" }
```

The `birthday` field is intentionally omitted from the identify response — the student already knows it; echoing back is a small leak surface for nothing. Tier-C fields (medical notes, passport, emergency contacts) are deliberately not in the Roster sheet at all and not in `CURATED_FIELDS`; they belong to Pepperdine's existing intake systems, not to this app.

**POST shape rationale.** Submit is POST (not GET) because (a) write actions belong on POST, (b) multi-field payloads are awkward in URL params and can hit length limits, and (c) `text/plain` content-type avoids the CORS preflight that `application/json` would trigger — Apps Script Web Apps don't implement `doOptions`, so preflight requests fail. The script parses `e.postData.contents` as JSON internally.

**Cohort token shared with the content script.** The auth script reads `COHORT_TOKEN` from its own Script Properties; the value should match the content script's `COHORT_TOKEN`. Rotation is two 30-second copies — once per Script Property. **No re-deploy is needed for token rotation** (Script Properties are read at request time).

**Lookup logic.** `findRosterRow(cwid)` reads the Roster tab via `getDataRange().getValues()`, finds the row whose `cwid` column matches after `normalizeCwid()`, and returns the row as a header-keyed object. `normalizeCwid()` strips non-digits and leading zeros, so input variations (`"0123456789"`, `"123-456-789"`, `" 123456789 "`) all collapse to the same canonical form. CWIDs are conventionally 9-digit numerics with no leading zeros, but the lookup is lenient on input variation; `validateRoster()` flags non-conforming rows in the editor.

**Birthday matching.** `parseBirthdayMD()` mirrors `App.jsx`'s parser: accepts `MM-DD`, `M-D`, or full `YYYY-MM-DD`, returns canonical `MM-DD`. Both sides of the comparison are canonicalized before matching, so a sheet row entered as `2005-05-12` still matches a front-end submission of `05-12`.

**`program_status` gate.** If the matched row's `program_status` is anything other than `active` (case-insensitive), the script returns `no_match` instead of the user record. Blank is treated as `active`. This means a student who has `program_status: withdrawn` can't sign back in mid-cohort; the Director controls re-enabling them by editing the cell.

**No response caching at the script layer.** Identify happens roughly once per device per cohort, and prompts/submit need to reflect Director edits and student writes immediately, so neither uses `CacheService`. Direct sheet reads are negligible at cohort scale. (The front end has its own per-cwid 10-min `bap-prompts-cache` so repeat opens render instantly without re-fetching.)

**Editor helpers in `AuthCode.gs`:**

- `testReadRoster()` — run once after pasting the script in to trigger the OAuth scope prompt. Logs the row count and headers to the execution log.
- `validateRoster()` — flag duplicate CWIDs (raw and normalized), missing required fields, unrecognized roles (anything not in `student | staff | faculty`), malformed birthdays, malformed emails, CWIDs containing non-digit characters, CWIDs that aren't exactly 9 digits, and CWIDs with leading zeros. Run anytime you've meaningfully edited the Roster.
- `validatePrompts()` — flag duplicate `prompt_id` values in `Prompts`, fields referencing an unknown `prompt_id`, duplicate `(prompt_id, field_id)` pairs in `PromptFields`, missing or unrecognized `field_type` values, select fields with no options, mismatched `option_labels_es` / `option_labels_en` counts, malformed `start_date` / `end_date`, end-before-start windows, prompts with no fields defined, unrecognized `surface` values (anything other than `today` / `profile` / `both`), and audience tokens that aren't `all` / a role / a CWID-shaped string. Run after any meaningful edit to the Prompts or PromptFields tabs.

**Deploy procedure (first-time):**

1. Open the Roster spreadsheet, then Extensions > Apps Script.
2. Paste in the contents of `AuthCode.gs`. Save.
3. Project Settings > Script Properties > Add property: `COHORT_TOKEN` = the same value used in the content script's properties.
4. Run `testReadRoster()` once from the editor to authorize the spreadsheet read scope.
5. Run `validateRoster()` to confirm the seeded data has no warnings.
6. Deploy > New deployment > Web app. Execute as: Me. Who has access: **Anyone** (not "Anyone within Pepperdine University" — that requires a `@pepperdine.edu` Google sign-in in the calling browser, which breaks for students using Safari without a signed-in Workspace session).
7. Copy the URL into `App.jsx` as `AUTH_SCRIPT_URL`. Commit, push, Vercel rebuilds.

**Re-deploy after script edits.** Same convention as the content script: Apps Script Web Apps freeze at the version they were deployed at. Editing `AuthCode.gs` doesn't affect production until a new deployment is created (Deploy > Manage deployments > pencil icon > Version: New version). The URL stays the same across re-deployments.

## Cohort Auth

The cohort passcode is the single credential gating the app. Same string serves three roles: (1) the API token the Apps Script validates on every request, (2) the localStorage entry the app reads to decide whether to render the gate or the main UI, and (3) the code the program office hands out at orientation in the WhatsApp group.

**How auth flows on a cold open.** The Apps Script reads the expected token from Script Properties at request time. The app reads the user's token from localStorage at mount; if it's missing, `<PasscodeGate>` renders in place of the main UI. The gate's submit handler fires a probe `fetchAllData({ token: candidate })` against the Apps Script. On success the resolved data is handed up via `onAuth(token, data)`, which saves the token to localStorage, primes `data`/`status`/the localStorage cache, and dismounts the gate; the post-auth render's data-fetch effect short-circuits via the `justAuthed` ref so the probe's payload isn't immediately re-fetched. On failure the gate distinguishes auth failure (bilingual "Código incorrecto / Wrong code", input clears, focus returns) from network failure ("Couldn't connect. Try again.") so a wrong code doesn't read as a flaky network and vice versa.

**How auth flows on background fetches.** Every `fetchAllData()` call threads the token from `cohortToken` state. If the script returns `{ error: "unauthorized" }` (e.g., the cohort code was rotated since the student last opened the app), the App's data-fetch effect catches the AuthError, clears the bad token from localStorage via `clearCohortToken()`, and sets `cohortToken` to empty — which triggers an early-return back to the gate on the next render. Same handling applies in `refreshAllData()` (the pull-to-refresh path).

**Storage shape:**

As of 2026-05-09b the token lives in a JSON envelope at the localStorage key `bap-cohort-token`:

```json
{ "token": "asado-summer-26", "savedAt": 1715000000000 }
```

`loadCohortToken()` checks `Date.now() - savedAt` against `AUTH_TTL_MS` (60 days) and treats older values as missing — so a student who hasn't opened the app for two months gets re-prompted at the cohort gate even if their browser hasn't evicted localStorage. Backward compatibility: the legacy plain-string format (anything stored before this commit) is still accepted as valid on load; the next save upgrades it to the envelope, after which the TTL kicks in. Profile and data cache live at separate keys (`bap-profile`, `bap-app-cache`), so wiping the cohort token doesn't disturb a student's enrolled-classes selections or their cached content.

**Helpers in `App.jsx`:**

- `class AuthError extends Error` — thrown by `fetchAllData()` when the script rejects the token. Lets the App-level catch distinguish auth failure from generic fetch failure without string-matching error messages.
- `loadCohortToken()` / `saveCohortToken(token)` / `clearCohortToken()` — three small wrappers around `localStorage.getItem/setItem/removeItem` for the `bap-cohort-token` key, each try/catch-wrapped for environments with disabled storage.
- `<PasscodeGate onAuth />` — bilingual full-screen gate component. EB Garamond title pair ("Buenos Aires Program" / "Programa de Buenos Aires"), DM Mono "Código de acceso / Access code" label above a single text input, "Continuar / Continue" button, italic helper line at the bottom ("¿No tenés el código? Pedíselo al equipo del programa"). Probes the Apps Script with the entered token; on success calls `onAuth(token, data)` with the resolved data. Differentiates wrong-code from network-error in the inline error treatment (Pep Orange–accented rejection panel for both, but distinct copy). Reuses the App's `SouthernCrossDecoration` and `LOGO_URI` so the visual identity matches the header. Auto-focuses the input on mount.

**What the gate does not do.** It doesn't gate by user identity (everyone in the cohort uses the same code). It doesn't sync across devices — each device gets its own gate experience until the code is entered there too. It doesn't survive a browser "Clear site data" action; in that case the student re-enters the code on next open, same as the first open. iOS Safari can evict localStorage from installed PWAs after ~7 days of non-use, so a long-quiet student may be re-prompted occasionally; this is iOS behavior, not a bug.

**Threat model.** The gate is calibrated to "keep the URL out of search engines and out of strangers' hands while the cohort is in session." It is not a defense against device theft (anyone with the unlocked phone can read localStorage and the cached app), against a student deliberately sharing the code outside the cohort (which would be an honor-code matter, not a technical one), or against a determined actor with network-monitoring tools (the token is sent in the URL query; on the wire it's TLS-encrypted, but it's visible to anyone who shares the device's network at the OS level). The data the app surfaces is mostly low-stakes (class schedules, public healthcare addresses, opt-in birthdays without years), so this calibration is appropriate; if the data ever grew more sensitive the calibration should be revisited.

## User Auth

The cohort passcode is layer 1 ("are you in this cohort?"); per-user identification via CWID + birthday is layer 2 ("which person in the cohort are you?"). Layer 1 is a security boundary; layer 2 is identification, not authentication — the cohort passcode is doing the security lifting, and the user gate is calibrated to "tell us which row in the Roster you are" so future features can be person-specific (RSVPs, t-shirt sizes, role-gated views, dinner menu choices, and so on).

**How auth flows on a cold open.** After `<PasscodeGate>` succeeds and the cohort token is stashed, `<App>` early-returns `<UserGate>` if `currentUser` is null. The gate's submit handler fires `identifyUser({ token: cohortToken, cwid, birthday })` against the Roster Auth Endpoint. On success the curated user record is handed up via `onAuth(user, birthday)`, which augments the record with the entered birthday and saves it to localStorage at `bap-user`, then dismounts the gate; the main UI renders immediately with content data already primed by the cohort gate's probe fetch. The birthday is included in the stored envelope so the prompts/submit endpoints can re-validate identity on every call without re-prompting (see "Prompts and Responses" below); without it, every prompts call would force a re-entry of CWID + birthday. On `NoMatchError` the gate shows a bilingual "We couldn't find you. Verify CWID and birthday" panel and the fields stay populated for editing. On `AuthError` (the cohort token was rotated mid-session, between the cohort gate succeeding and the user gate submitting), the gate calls `onCohortReset` which clears the cohort token; the next render bounces to `<PasscodeGate>` instead of showing a misleading wrong-credentials message in the user gate. On any other error the gate shows "Couldn't connect."

**How auth flows on background fetches.** No identify call happens on background fetches — once `currentUser` is in localStorage it persists until cleared (sign out, AuthError on a content fetch, or manual site-data clear). The data-fetch effect's `AuthError` handler now clears `currentUser` alongside the cohort token, so a rotated cohort code resets both gates in lockstep rather than letting a stale identity from a previous cohort silently persist across the rotation.

**Storage shape:**

As of 2026-05-09c the curated user record is wrapped in a JSON envelope at the localStorage key `bap-user` and now also carries the birthday the student typed at the user gate (so prompts/submit can re-validate without re-prompting):

```json
{
  "value": {
    "cwid": "123456789",
    "birthday": "05-12",
    "first_name": "María",
    "last_name": "García",
    "preferred_name": "Mari",
    "pronouns": "she/her",
    "role": "student",
    "email": "mgarcia@pepperdine.edu",
    "whatsapp": "+5491144197092",
    "housing_assignment": "Homestay – Recoleta (Familia López)",
    "tshirt_size": "M",
    "tshirt_fit": "women's",
    "dietary_restrictions": "vegetarian",
    "food_allergies": "",
    "program_status": "active"
  },
  "savedAt": 1715000000000
}
```

`loadUser()` checks `Date.now() - savedAt` against `AUTH_TTL_MS` (60 days, shared with the cohort token) and returns `null` for older values, so a quiet student gets re-prompted at the user gate. **Birthday is required on-device:** records without it (anything saved before 2026-05-09c, including the legacy flat format) are treated as missing on load, forcing a one-time re-prompt at the user gate; the next save includes the birthday and the record persists normally. The legacy flat format (no envelope) is also still accepted at load time when it carries both `cwid` and `birthday`. No version field on the stored user; the auth script's `CURATED_FIELDS` projection plus the birthday field is the source of truth for shape. If a field is later removed from `CURATED_FIELDS`, old localStorage entries still load fine — extra fields are ignored at read time.

**Threat-model note on storing birthday.** The original 2026-05-09 design intentionally omitted birthday from localStorage so that an attacker with cohort-token + device access still couldn't re-authenticate without separately knowing the student's birthday. The 2026-05-09c expansion to enable prompts/submit accepts a small weakening of that posture: birthday now lives alongside cwid in the envelope, so a determined attacker with localStorage access can act as the student against the auth script. The trade is justified by the prompts feature's value (no re-prompting per submit), and is consistent with the threat model already articulated for the user gate ("identification, not authentication; calibrated to low-stakes data within the cohort").

**Helpers in `App.jsx`:**

- `class NoMatchError extends Error` — thrown by `identifyUser()` when the auth script returns `{ error: "no_match" }`. Distinct from `AuthError` so the gate can show the right message for the right failure (wrong-credentials vs. stale-cohort-token).
- `loadUser()` / `saveUser(user)` / `clearUser()` — three small wrappers around `localStorage.getItem/setItem/removeItem` for the `bap-user` key, each try/catch-wrapped. `loadUser` returns `null` (not an empty object) on any malformed or missing entry — the App's gate logic uses `null` as the trigger to show `<UserGate>`.
- `identifyUser({ token, cwid, birthday })` — async function next to `fetchAllData`. Calls `AUTH_SCRIPT_URL`, parses the response, and throws `AuthError` / `NoMatchError` / generic `Error` so the gate can branch cleanly. CWID is sent as the digit-stripped form from the input; birthday is sent as `MM-DD`.
- `isStaffOrFaculty(user)` — returns `true` when `user.role` is `staff` or `faculty` (case-insensitive). Single source of truth for any role-gated UI surface added later. Returns `false` on null/missing user so preview mode (no SHEET_ID, no auth) reads as "student" for safety — a future staff-only view stays hidden in preview.
- `<UserGate cohortToken onAuth onCohortReset />` — bilingual full-screen gate component. Visual identity matches `<PasscodeGate>` (same gradient, same logo, same EB Garamond title-pair pattern, same DM Mono caption, same Pep Orange–accented error panel, same submit button style). Microline reads "Buenos Aires Program" instead of "Pepperdine University" to signal continuation from the cohort gate. Title pair: "¡Hola! / Hello!" (warmer than the cohort gate's institutional title). Caption: "Decinos quién sos / Tell us who you are." Two fields: a 9-digit CWID input (`inputMode="numeric"`, `maxLength={9}`, onChange strips non-digits so a paste like `"123-456-789"` cleans up automatically) and a birthday two-dropdown row (Spanish-primary month labels via `MONTH_OPTIONS`, day options re-cap when month changes via `daysInMonthMD()` — Feb=29 for leap-year support, Apr/Jun/Sep/Nov=30, others=31). Helper line at the bottom with a mailto link to `buenosaires@pepperdine.edu`. Auto-focuses the CWID input on mount. Reuses `SouthernCrossDecoration` and `LOGO_URI`.
- `<App>` state additions: `const [currentUser, setCurrentUser] = useState(() => loadUser())`. New callbacks: `handleUserAuth(user, birthday)` (augment user with birthday, stash, dismount gate); `handleCohortReset()` (clear cohort token, bounce to cohort gate); `handleSignOut()` (clear user AND prompts cache — see "Prompts and Responses" below — leaves cohort token AND profile intact, so signing back in restores everything). Three-state early-return: no SHEET_ID → preview; no cohort token → `<PasscodeGate>`; cohort token + no user → `<UserGate>`; both → main UI.

**ProfileModal integration.** The "First name" text input is gone (name comes from the roster, not user input). In its place is a read-only "Logged in as" card showing preferred-or-first name + last name, role (capitalized), email, and a confirmed "Cerrar sesión / Sign out" button below. Sign out clears `currentUser` only — leaves the cohort token AND the profile (`enrolledClasses`, `filterEnabled`) intact, so the next sign-in restores the student's settings without making them re-tick courses.

**Constants used by `<UserGate>`:**

- `MONTH_OPTIONS` — array of `{ value, es, en }` objects for the month dropdown; Spanish primary, English secondary in the option labels.
- `daysInMonthMD(monthStr)` — pure function returning days available in the day dropdown for a given month. Returns 31 when month is unset so the day dropdown is fully populated until a month is chosen.
- `SELECT_CHEVRON` — inline SVG data URI used as the right-side affordance on the month/day selects (since we strip native appearance to match the CWID input's visual styling).

**What the gate does not do.** It doesn't authenticate the user against an institutional identity provider (no Google sign-in, no Pepperdine SSO; that's a Phase-3-roadmap option held until the data grows sensitive enough to warrant it). It doesn't sync identity across devices — each device gets its own gate experience. It doesn't survive a "Clear site data" action; in that case the student re-enters CWID + birthday on next open. The cohort gate continues to do the actual security work; this gate just records who's using the app.

**Threat model.** Per-user identification, not authentication. Within a cohort, a student could enter another student's CWID + birthday and get into the app as that person. For the use cases the gate enables (RSVPs, dinner menus, t-shirt sizes, role-based UI), this is calibrated correctly: low-stakes data, closed cohort, honor-code expectations. If the app ever exposes anything individually sensitive (grades, medical info, financial details), this calibration should be revisited and Google sign-in via `@pepperdine.edu` becomes the right next step.

## Prompts and Responses

A generalized per-student data-collection primitive: the Director defines a prompt in a sheet, the app surfaces it to the right students, students submit answers, responses land back in the sheet. Once this primitive exists, every future use case (t-shirt sizes, meal RSVPs, activity sign-ups, evaluation surveys, weekly check-ins) is just a row in the `Prompts` tab — no code change.

**Architecture.** Two new tabs in the existing Roster spreadsheet (extends the auth permission boundary that already protects PII; avoids spinning up a third spreadsheet/script):

- **`Prompts` tab** — one row per logical question. Schema:

  | Column | Notes |
  |---|---|
  | `prompt_id` | Stable string. Director-controlled; used as the join key. |
  | `title_es`, `title_en` | Bilingual headline shown on the Today card / ProfileModal row and as the BottomSheet title. |
  | `description_es`, `description_en` | Optional context shown above the fields. |
  | `audience` | `all` (or blank) → everyone; `student` / `staff` / `faculty` (or comma-list) → role-gated; or a comma-list of CWIDs for narrow targeting. Mix freely. Case-insensitive. |
  | `start_date`, `end_date` | Optional `YYYY-MM-DD` window. Both blank → always active (used by evergreen profile prompts). Inclusive on both ends. |
  | `end_time` | Optional `HH:mm` (24-hour). Tightens the close on `end_date` from end-of-day to a specific time of day — useful for "RSVP closes at 8 PM" style cutoffs. Blank keeps the end-of-day default. Only meaningful when `end_date` is also set. |
  | `category` | `profile` / `meal` / `activity` / `feedback` (free-form; reserved for future grouping). |
  | `surface` | `today` (default) / `profile` / `both`. Drives where the prompt renders in the app. |

- **`PromptFields` tab** — one row per input box, joined to `Prompts` by `prompt_id`. Schema:

  | Column | Notes |
  |---|---|
  | `prompt_id` | Foreign key to `Prompts`. |
  | `field_id` | Stable string within the prompt (e.g. `appetizer`, `main`, `dessert`, `comments`, `size`). |
  | `field_order` | Integer; controls render order top-to-bottom. |
  | `label_es`, `label_en` | Bilingual field label. |
  | `field_type` | One of: `short_text` / `long_text` / `single_select` / `multi_select` / `number` / `boolean`. |
  | `options` | Semicolon-delimited for select types: `XS;S;M;L;XL;2XL`. |
  | `option_labels_es`, `option_labels_en` | Optional bilingual labels parallel to `options`. |
  | `required` | TRUE/FALSE — per field, not per prompt. Lets a meal RSVP require selections but leave the comments box optional. |
  | `placeholder_es`, `placeholder_en` | Optional hint text shown inside the input. |

  A single-field prompt is just the degenerate case (one `PromptFields` row). A meal RSVP with appetizer/main/dessert/comments is one `Prompts` row + four `PromptFields` rows.

- **`Responses` tab** — one row per `(cwid, prompt_id, field_id)`. Auto-created by the auth script on first submit, so a fresh deploy doesn't need a manual setup step. Schema:

  | Column |
  |---|
  | `submitted_at` |
  | `cwid` |
  | `prompt_id` |
  | `field_id` |
  | `value` |

  Upserts are keyed on the `(cwid, prompt_id, field_id)` triple. A submission updates `value` + `submitted_at` for existing rows and appends new rows for never-answered fields. multi_select values are stored semicolon-joined; booleans as `TRUE` / `FALSE` (matching `parseBoolean` convention used elsewhere in the project).

**How prompts flow on a cold open.** Once both gates are clear, the App's prompts effect fires `fetchPrompts({ token, cwid, birthday })` against the Roster Auth Endpoint. The lazy-init in `useState` already populated `prompts` from the per-cwid cache (`bap-prompts-cache`, 10-min TTL) so repeat opens render the previous list instantly; the background fetch refreshes silently. The script does the audience filter and active-window check on its side, and pre-fills any existing responses for this user, so the front end mostly just renders.

**How submit flows.** When the student opens a prompt and taps Submit, `<PromptForm>` calls `onSubmit({ promptId, fields })` → App's `handleSubmitPrompt` → `submitResponse({ token, cwid, birthday, prompt_id, fields })` → POST text/plain JSON body to the auth script. The script re-validates identity, runs each field through `validateSubmissionValues` against its declared type and required flag, upserts responses under a `LockService` script lock, and returns the refreshed prompt object. App splices it into local state and rewrites the per-cwid cache so both surfaces re-render in sync; PromptForm closes.

**Surfaces.** Two places in the app render prompts:

- **Today tab** — `<PromptCard>` renders between the activity card and `<TodayFinalsTile>`. Lists prompts whose `surface` is `today` or `both`. Pep Orange left stripe + "Pendientes / For you" header. Each row shows the prompt title with a small Pep Orange dot if any required field is unanswered (Parchment background, "Completar →" / "Responder →" CTA), or the calmer Ice background and "Editar →" CTA once the student has saved a complete response.
- **ProfileModal** — `<PromptProfileSection>` renders right after the "Logged in as" card. Lists prompts whose `surface` is `profile` or `both`. Each row shows a comma-joined preview of saved values for at-a-glance recall, or italic "Sin respuesta / No answer yet" when nothing has been submitted yet. Used for evergreen prompts the student should be able to revisit anytime (t-shirt size, dietary preferences, contact corrections).

Tapping a row from either surface bubbles up to App's `selectedPrompt` state, which renders `<PromptForm>` as a slide-up `<BottomSheet>` over either surface. The form sheet is rendered at App level (rather than inside Today or ProfileModal) so it stacks cleanly above either and shares one state — closing the sheet returns to whichever surface opened it.

**Cache layer (`bap-prompts-cache`).** Separate from the content-data cache (`bap-app-cache`) and the user record (`bap-user`). Keyed by `cwid` so a sign-out / sign-in on the same device doesn't surface the previous user's pending forms in the brief window before `fetchPrompts` repopulates state. 10-min TTL is intentional: prompts are Director-edited in Sheets and need to propagate fast — the auth script intentionally doesn't cache its responses, and the front-end TTL trades a bit of API chatter for snappier visibility into Director edits. Cleared by sign-out, by both AuthError handlers (data-fetch and refresh), and by the prompts-fetch effect when it sees `AuthError` / `NoMatchError`.

**Helpers in `App.jsx`:**

- `class SubmitError extends Error` — thrown by `submitResponse()` for non-auth failures (validation_failed, prompt_inactive, audience_mismatch, lock_failed, etc.). Carries `.code` and `.details` so `<PromptForm>` can branch on the error type to show a useful inline message. Distinct from `AuthError` so the gate flow isn't triggered on a normal validation failure.
- `fetchPrompts({ token, cwid, birthday })` — async function next to `identifyUser`. Calls the auth script's `?action=prompts` endpoint and returns the array. Throws `AuthError` / `NoMatchError` / generic `Error` so the App's effect can branch cleanly.
- `submitResponse({ token, cwid, birthday, prompt_id, fields })` — async function. POSTs text/plain JSON to avoid CORS preflight against Apps Script. Throws `AuthError` / `NoMatchError` / `SubmitError` / generic `Error`. Returns the refreshed prompt on success.
- `loadPromptsCache(cwid)` / `savePromptsCache(cwid, prompts)` / `clearPromptsCache()` — wrappers around `localStorage.getItem/setItem/removeItem` for the `bap-prompts-cache` key, each try/catch-wrapped. `loadPromptsCache` returns `null` when the entry is missing, malformed, expired, or keyed to a different `cwid`.
- `filterPromptsBySurface(prompts, target)` — returns prompts whose `surface` matches `target` (or `both`). Used by `<PromptCard>` (target `today`) and `<PromptProfileSection>` (target `profile`).
- `isPromptPending(prompt)` — true when at least one required field has no stored response. Drives the orange "needs answering" treatment vs. the calmer "edit anytime" affordance.
- `formatPromptCutoff(prompt, now)` — returns `{ es, en }` strings for the subtle "closes at…" caption rendered beneath a prompt's title when `end_time` is set; returns `null` otherwise. Three proximity tiers: "Cierra hoy a las 20:00" (today), "Cierra mañana a las 20:00" (tomorrow), "Cierra el 15 de mayo a las 20:00" (further out). Past the cutoff, returns `Cerrado / Closed` so a stale cached entry doesn't claim the form is still open in the brief window before the next prompts fetch drops it.
- `initFormFromPrompt(prompt)` — builds the local form-state object from a prompt's stored responses, normalizing each field by type (multi_select → array, boolean → bool, others → string). Ensures controlled inputs stay defined.
- `formatPromptSavedAt(iso)` — bilingual relative-time label for the form footer ("hace 5 min / 5m ago"), falls back to a date label after 24h.

**Components in `App.jsx`:**

- `<PromptFieldInput field value onChange />` — renders one field per `field_type`. Selects render as tappable cards with ✓ (multi) / • (single) and bilingual EB Garamond labels (vs. a native `<select>`, which is cramped on mobile and doesn't support bilingual options well). Boolean is a Sí/Yes vs. No pill pair. Numbers use `inputMode="decimal"` with digit-only sanitization. short_text/long_text are styled inputs with optional placeholder. Required fields show a small Pep Orange dot beside the label. Unknown types render a defensive placeholder rather than crashing the form.
- `<PromptForm open onClose prompt onSubmit />` — bottom-sheet wrapper using the existing `<BottomSheet>` component. Sticky-ref pattern (`lastPromptRef`) preserves the prompt object during the BottomSheet's 260ms close animation so the form doesn't flash an empty fallback during exit. `useEffect` deps include only `promptKey` (the `prompt_id`) so a background prompts refresh while the form is open won't wipe the student's in-progress edits. Maps `SubmitError.code` to bilingual inline error panels (Pep Orange–striped Parchment background): `validation_failed` → "Falta completar: ${label} / Missing: ${label}" or "Valor inválido: ${label} / Invalid value: ${label}"; `prompt_inactive` → "Este formulario ya cerró"; `audience_mismatch` → "No tenés acceso"; `lock_failed` → "La planilla está ocupada. Reintentá"; AuthError / NoMatchError → corresponding "Sesión expirada" / "Tu usuario ya no es reconocido" copy. Submit button label shifts: "Enviar / Submit" first time, "Actualizar / Update" once a prior submission exists. Footer shows the relative-time label of the most recent save.
- `<PromptCard prompts onOpenPrompt />` — Today tile listing prompts with `surface=today/both`. Renders `null` when no such prompts exist (so the Today layout stays clean for students whose Director hasn't queued anything). Each row is a `<button>` that calls `onOpenPrompt(p)` to open the form sheet for that prompt.
- `<PromptProfileSection prompts onOpenPrompt />` — list block inside `<ProfileModal>` rendering prompts with `surface=profile/both`. Same row shape as `<PromptCard>` but with a comma-joined preview of saved values per row. Renders `null` when no profile-surface prompts exist.

**`<App>` state additions:**

- `prompts` (lazy-init from `loadPromptsCache(currentUser?.cwid)`) — the array of prompt objects.
- `selectedPrompt` — the prompt currently being edited in the form sheet; `null` when the sheet is closed. Set via `handleOpenPrompt(p)`, cleared via `handleClosePrompt()`.
- `handleSubmitPrompt({ promptId, fields })` — async callback passed to `<PromptForm>`. On success, splices the refreshed prompt into local state and rewrites the cache. On `AuthError` / `NoMatchError`, clears the relevant credentials and lets the gate flow take over. Re-throws the error so the form can branch on `SubmitError.code` for inline copy.
- Background prompts effect — runs whenever `cohortToken`, `currentUser.cwid`, or `currentUser.birthday` changes. Best-effort: network failures are logged and swallowed, leaving whatever's in state (cache or empty).

**What the prompts feature does not do.** It doesn't sync state across devices — each device hits the auth script on open, so prompts and responses are consistent within a few seconds, but two devices won't push to each other in real time. It doesn't support file uploads (no image, no PDF). It doesn't support cross-prompt logic (e.g. "show field X only if field Y = 'yes'") — every field renders unconditionally. It doesn't support per-field `placeholder` values that vary by language separately from `placeholder_es`/`placeholder_en` (it picks Spanish-first, falls back to English if Spanish is blank). And it doesn't write to the content spreadsheet — submissions live entirely on the Roster side, by design (the content script literally has no read access to the Roster, the auth script literally has no read access to the content sheet).

**Threat model.** Submissions are authenticated by the same cohort-token + cwid + birthday triple the rest of the user-auth surface uses. The auth script re-validates identity on every submit (looking the row up in the Roster), so a stolen cohort token alone can't write submissions. Within the cohort, a student who knows another student's CWID + birthday could submit on behalf of them — same calibration as the user gate. For the data this primitive collects (sizes, meal preferences, RSVPs), this is the right calibration; if a future prompt collects something individually sensitive (grades, financials, anything FERPA-touching), the cohort+CWID+birthday triple becomes the wrong gate and the system should move to Google sign-in.

## Local Cache

The app uses a stale-while-revalidate pattern backed by `localStorage` so repeat opens render content instantly instead of showing a loading screen.

**How it works:**

1. On mount, `useState` reads from `localStorage` synchronously during the first render. If a cached payload is found, it's used as the initial `data` state and status starts as `refreshing`.
2. Independent of cache, a background fetch to the Google Sheet kicks off via `useEffect`.
3. When the fetch resolves, fresh data replaces the cached data on screen and the cache is rewritten with a new timestamp; status becomes `live`.
4. If the fetch fails and cached data was already on screen, it stays on screen; status downgrades to `cached` ("Saved version (offline)"). If no cache existed and the fetch fails, the app falls back to hardcoded `DEFAULT_DATA`; status becomes `fallback`.

**Storage shape:**

```json
{
  "version": 2,
  "data": { /* full normalized data object */ },
  "timestamp": 1745001234567
}
```

Stored under the localStorage key `bap-app-cache`.

**CACHE_VERSION:**

The constant `CACHE_VERSION` in `App.jsx` is the cache key version. Whenever the data shape changes (renamed columns the app reads, new fields, removed fields, new sheet tabs the app consumes), this number must be incremented. On the next open, the app sees the version mismatch and ignores the old cache; the next successful fetch then writes a fresh cache at the new version. This prevents students from seeing broken renders against stale data shapes.

**Helpers in `App.jsx`:**

- `loadCache()` — reads and parses the cached payload. Returns `null` if absent, malformed, or version-mismatched.
- `saveCache(data)` — writes the data with the current version and timestamp. Wrapped in try/catch so quota errors or disabled storage are silently ignored.

**What the cache does not do:**

As of 2026-04-26, the cache layer has a service-worker companion (see "PWA" section below) that precaches the JS bundle, fonts, icons, and HTML. With the SW installed, the app does provide true offline mode for the shell + cached content. The localStorage cache continues to handle the *content* layer (sheet data, weather, dólar); the SW handles the *shell* layer. Together they mean a student on the subte or in a dead zone gets the full app, including layout and content from the last successful fetch.

The cache itself does not eliminate the underlying network fetch entirely; it just makes the second-and-onward opens feel instant by serving cached data while the network round trip happens in the background. The fetch itself was sped up substantially by the consolidated Apps Script endpoint (see above), which collapses 15 round trips into one and serves most opens from the script's own 1-hour CacheService cache.

## Student Profile

The app supports per-student personalization via a small profile stored locally in the browser. The profile is optional: students who never open Settings see exactly the same app every other student does. Director use is unaffected; the filter is off by default and only takes effect when explicitly enabled.

The profile is distinct from `currentUser` (the User Auth section above). The roster row identified at sign-in is the authoritative source for *who the student is* (first name, role, email, t-shirt size, etc.); the profile holds *what the student has chosen on this device* (which courses they're enrolled in, whether the filter is on). They live at separate localStorage keys (`bap-profile` vs. `bap-user`) so each can be cleared independently — sign out wipes identity but preserves course selections, while a profile reset clears selections but leaves identity untouched.

**What's customizable:**

- **Enrolled courses.** A multi-select list of every course currently in the Classes tab. Each row shows the course code and title with the same color accent used elsewhere in the app.
- **Show only my classes (toggle).** When on, the Today tab's "Today's Activity" card and the Schedule tab's Class Schedule and Courses sub-tabs filter to only the ticked courses. The Weekly Overview is unaffected because it shows calendar events, not classes; calendar events are never filtered by profile.
- **Persistent announcement dismissals.** The × on an announcement now sticks across sessions instead of returning every time the app reloads. Tracked by a stable `djb2` hash of the message text, so editing an announcement in the sheet effectively resurfaces it as new.

The "First name" field that used to live here was removed in v2: the Today greeting now reads from `currentUser.preferred_name || currentUser.first_name` (the authoritative roster identity) instead of a student-typed string. Existing v1 profiles are migrated by `loadProfile()` rather than nuked — `enrolledClasses` and `filterEnabled` are salvaged so a student who already personalized doesn't lose course selections on the deploy that introduces the user gate.

**Access:** A small gear icon in the top-right of the header opens the Settings modal. The modal is full-screen within the 480px column. At the top is a read-only "Logged in as" card (preferred-or-first name + last name, role, email, plus a confirmed "Cerrar sesión / Sign out" button) sourced from `currentUser`; below it are the toggle, course checklist, and "Reset profile" button. Changes save immediately to localStorage on every interaction; the "Done" button just closes the modal. Sign out clears `currentUser` only — leaves the cohort token AND the rest of the profile intact, so signing back in restores everything.

**Filter affordance:** When the filter is active, an inline pill at the top of the Schedule sub-tabs (Class Schedule and Courses) reads "My classes only — Showing N of M. Tap to change." Tapping it reopens the Settings modal. The pill does not appear on the Weekly Overview (calendar-only) or on the Today tab (where the filter is visible implicitly through the activity card).

**Auto-enable on first selection:** As of 2026-04-26, ticking the first class in the profile editor's course checklist automatically flips `filterEnabled` from false to true. This means a student doesn't have to remember to also toggle "Show only my classes" — selecting their courses is intent enough. Subsequent toggling of `filterEnabled` (off and back on) respects the user's deliberate choice; the auto-enable only fires on the empty-to-non-empty transition.

**Class display gating on Today and Weekly Overview:** Also as of 2026-04-26, classes only render on the Today tab activity card and inside the Calendar tab's Weekly Overview day cards when `shouldFilterClasses(profile)` is true. Without personalization, the Today activity card shows only events (or the "¡Día libre!" empty state); Weekly Overview day cards show only events. The Schedule tab's Mon–Fri Class Schedule grid is intentionally exempt — it's the unfiltered browseable view of the program's classes, and a student should be able to see all classes there regardless of personalization.

**Holiday-aware suppression:** On any day with a calendar event of `type: "holiday"`, classes are suppressed on both Today and Weekly Overview, even when the student has personalized. On Today this triggers a small holiday card above the activity card (parchment treatment, `#C62828` accent stripe, bilingual "Feriado / Holiday" DM Mono label, the event title in italic EB Garamond, and the event description in Roboto); the activity card's "¡Día libre!" empty state is suppressed because the holiday card already explains the open day.

**Storage shape:**

```json
{
  "version": 2,
  "enrolledClasses": ["SPAN 350", "HUM 295"],
  "filterEnabled": false,
  "dismissedAnnouncements": []
}
```

Stored under the localStorage key `bap-profile`, separate from `bap-app-cache` and from `bap-user`. This separation is intentional: bumping `CACHE_VERSION` (which happens when the Google Sheet data shape changes) wipes the data cache but leaves the profile intact, so students don't lose their settings every time the schema evolves; signing out clears `bap-user` but leaves the profile alone, so re-signing-in restores course selections without making the student re-tick anything.

The `dismissedAnnouncements` array is a legacy field kept in the schema for backwards compatibility with previously stored profiles. As of the 2026-04-26 announcement-banner redesign, announcements are no longer user-dismissible (the program office controls lifecycle via `end_date`), so this field is neither read nor written anymore. It will simply remain at `[]` for new profiles and stay frozen at whatever value existing profiles had.

The `name` field that lived in v1 was removed in v2 — see the "Logged in as" card discussion above.

**PROFILE_VERSION:**

The constant `PROFILE_VERSION` in `App.jsx` is the profile-shape version (currently 2). Bump it only when the profile shape itself changes (new field, renamed field, removed field). On next open, the version mismatch causes `loadProfile()` to return `EMPTY_PROFILE` for any version it doesn't recognize, and the next save writes a fresh profile at the new version. The v1 → v2 transition is special-cased: rather than nuking, `loadProfile()` salvages `enrolledClasses` and `filterEnabled` from old v1 profiles so course selections survive the deploy that introduces the user gate. Future migrations should follow the same pattern when there's value in preserving carryover state.

**Helpers in `App.jsx`:**

- `loadProfile()` — reads and parses the profile from `localStorage`, normalizing array fields and applying defaults. Returns a fresh `EMPTY_PROFILE` clone if absent, malformed, or version-mismatched.
- `saveProfile(profile)` — writes the profile with the current `PROFILE_VERSION`. Wrapped in try/catch so quota errors or disabled storage are silently ignored.
- `shouldFilterClasses(profile)` — returns `true` only when the profile has `filterEnabled: true` AND at least one entry in `enrolledClasses`. The two-condition gate means the filter never accidentally hides everything for a student who turned it on before ticking any courses. As of 2026-04-26 this helper is also the gate for whether classes appear on Today and Weekly Overview at all (not just whether they're filtered) — a student without personalization sees no classes in those views.
- `filterClassesByProfile(classes, profile)` — returns `classes` unchanged when `shouldFilterClasses` is false, otherwise returns the subset whose `code` is in `enrolledClasses`. Used by `getTodayItems()`, `WeeklyOverviewView`, and `ClassScheduleView`.

**What the profile does not do:**

It does not sync across devices. A student who installs the app on both their phone and laptop will have two independent profiles. Cross-device sync would require a backend, which this project doesn't have. It also does not survive a "Clear site data" action in browser settings; in that case the student re-enters the profile the next time they open the app.

## Brand Identity

The app follows the BAP Brand Identity Guide (see separate `Branding_Guidelines` project knowledge file for the full guide). Key tokens are defined in the `C` object in `App.jsx`:

| Token | Hex | Usage |
|-------|-----|-------|
| bapBlue | #64B5F6 | Primary BAP color; "Pepperdine University" label, active tab dot |
| pepBlue | #00205B | Header gradient, headlines, nav active state |
| pepOrange | #E35205 | Sparingly; milestone event accents, urgent announcement accent |
| ocean | #0057B8 | Links, badges, header gradient end, info announcement accent |
| sky | #6CACE4 | Supporting accent |
| fog | #B9D9EB | Borders, dividers |
| mountain | #425563 | Body text, secondary content |
| stone | #7A99AC | Tertiary text, labels, inactive nav |
| pepBlack | #1D252D | Primary text |
| ice | #E3F2FD | Light backgrounds, pill buttons, info announcement background |
| parchment | #F5F3F0 | Main page background, urgent announcement background |

**Typography:**

- Headlines: EB Garamond (Bold 700)
- Body: Roboto (Regular 400)
- Labels, metadata, times: DM Mono (Regular 400)

All loaded from Google Fonts via a `<link>` in `index.html`.

**Logo:** The BAP circular logo is served as a static asset at `/logo.png` (160×160 PNG with a transparent background and a circular alpha mask, ~47KB on disk, 2× retina for the 80px CSS display). The `LOGO_URI` constant in `App.jsx` is just the path string `"/logo.png"`; the three header `<img>` sites reference it unchanged. Prior to 2026-05-16 the same image lived as a ~63KB base64 string inlined directly in `App.jsx`, which added that weight to the JS bundle the phone had to parse before first paint; moving it to a static asset both shrinks the bundle and lets the SW precache the image alongside the rest of the shell. PWA home screen icons use a separate version with a solid Pep Blue (`#00205B`) background.

Source images are available in the project files:
- `LOGO_Buenos_Aires_Program_BAP_App__Transparent_Background.png` (for in-app header)
- `LOGO_Buenos_Aires_Program_BAP_App__PepBlue_Background.png` (for PWA/home screen icons)

## Deployment

**Platform:** Vercel (free tier)
**Repo:** GitHub (the user manages this manually)
**Auto-deploy:** Yes; any commit to the GitHub repo triggers a Vercel rebuild (typically ~60 seconds)

**To update the app code:**

1. Download the updated `App.jsx` from Claude
2. Go to the GitHub repo > `src` > `App.jsx`
3. Click the pencil icon to edit
4. Select all, delete, paste new content
5. Click "Commit changes"
6. Vercel auto-deploys

**To update content (classes, calendar, announcements, health, churches, apps, FAQ):**
Just edit the Google Sheet. The app fetches fresh data on each page load; cached students see new content the next time their background fetch succeeds.

## PWA (Add to Home Screen + Offline Mode)

The app includes a `manifest.json`, `apple-touch-icon.png`, and a Workbox-based service worker so students can install it to their phone's home screen and run it offline. It appears as a standalone app with the BAP logo as the icon, the Pep Blue theme color, and "Buenos Aires Program" as the app name.

Students do this by opening the URL in their browser and tapping:

- **iOS Safari:** Share button > "Add to Home Screen"
- **Android Chrome:** Three-dot menu > "Add to Home Screen" or "Install app"

Note: iOS aggressively caches `apple-touch-icon.png`. Students who already have the app on their home screen may need to remove and re-add it to pick up a new icon.

**Service worker (offline mode):**

The service worker is generated at build time by `vite-plugin-pwa` (configured in `vite.config.js`). It precaches the app shell on first install (JS bundle, CSS, fonts, icons, HTML, manifest) so subsequent opens launch with zero network: useful on the subte where there's no signal, in a hostel with flaky Wi-Fi, on flights, or for students rationing a US data plan.

Two layers of caching now stack:

1. **Service worker precache.** The shell. Once the SW installs, every JS chunk, every font file, every icon, and the HTML itself live in the browser's CacheStorage and load from disk on every open.
2. **localStorage data cache (`bap-app-cache`).** The content. Class schedules, calendar events, contacts, and so on. Stale-while-revalidate, refreshed in the background on every successful fetch.

Together they mean a student opening the app on the subte with no signal sees their full app: shell, fonts, icons, schedule, calendar, contacts, the works. The Today tile's live data (weather, dólar, current temperature) falls back to whatever was last seen, since those calls require network and are not cached at the SW layer.

**Why those calls are not in the SW cache.** The Apps Script endpoint, Open-Meteo, and dolarapi.com all already have their own purpose-built localStorage caches in `App.jsx` (`bap-app-cache` for sheet data, `bap-today-cache` for weather and dólar, both with explicit TTLs and version keys). Adding a Workbox runtime cache on top of those would create two parallel cache layers with different staleness semantics, producing surprising bugs (e.g., the SW serving a 6-hour-old dólar to a function that thinks it just got fresh data). The localStorage caches are the source of truth for those endpoints; the SW handles only the shell.

**What the SW does cache at runtime:**

- **Google Fonts CSS** (`fonts.googleapis.com`): `StaleWhileRevalidate` with a one-year max age. The CSS file is small, occasionally updated, and gets quietly refreshed in the background.
- **Google Fonts WOFF2 files** (`fonts.gstatic.com`): `CacheFirst` with a one-year max age. Font files are content-addressed and effectively immutable; first download, lifetime cache.

**Update lifecycle:**

The plugin runs with `registerType: 'autoUpdate'`, plus Workbox's `clientsClaim: true` and `skipWaiting: true`. When a new build is deployed, the SW detects the update on the next open, the new version takes over immediately, and the student sees the new build with no in-app prompt. There is no "tap to refresh" banner; updates are silent and seamless. This matches the rest of the app's UX philosophy: students never have to think about it.

iOS quirk: on home-screen-installed PWAs, iOS WebKit can take a second cold open before a fresh SW activates. This is iOS behavior, not a bug; the second open always picks it up.

**Build output:**

`vite-plugin-pwa` adds two files to `dist/` at build time: `sw.js` (the service worker itself) and `workbox-*.js` (the Workbox runtime, hashed filename). Both are served by Vercel from the site root. Vercel's default cache headers are appropriate for both; no `vercel.json` overrides needed in the common case. If updates ever seem to propagate slowly after a deploy, the suspect is usually browser-side SW caching, which can be cleared with a hard reload (Cmd-Shift-R / Ctrl-Shift-R) or by closing and reopening the home-screen app entirely.

**Verifying offline mode:**

In Chrome DevTools, Application > Service Workers shows the registered SW for `baprogram.vercel.app`. Application > Cache Storage shows the precache (named with the build hash) and the two `bap-google-fonts-*` runtime caches. Toggle DevTools > Network > Offline, refresh the page, and the app should load fully from the precache.

## App Features

**Today tab (default):**

The leftmost tab and the default view on every app open. A daily-snapshot dashboard built to make the app a daily-open habit instead of a reference manual. Top to bottom:

- **Greeting strip.** Time-of-day gradient (BAP Blue → Sky → Ocean → Pep Blue across the day, deep navy at night), Spanish greeting (`Buen día` / `Buenas tardes` / `Buenas noches`) in 26 px EB Garamond, italic Spanish date below (e.g., "Lunes, 28 de abril"). A slow-rotating sun glyph fills the top-right during day hours; a crescent moon (`<MoonIcon>`) takes its place from 19:00 to 06:00. Sun rotation is `bap-sun-spin` (80 s linear infinite); suppressed under `prefers-reduced-motion`.
- **Quick-stats row.** Two equal tiles, both tappable as of 2026-04-27. **Weather** (Open-Meteo): a small `<WeatherIcon>` keyed off `weather_code` and `is_day`, current temperature in Fahrenheit (DM Mono, 22 px) as the headline, today's high/low in Fahrenheit on a small mono line below (e.g., `↑ 78°  ↓ 65°`), and a one-line bilingual dress hint ("Un sweater / A sweater"). When the next 48 hours of hourly data show something disruptive (thunderstorm, heavy rain, freezing temps, strong wind, or notable rain at high probability), a single-line bilingual alert renders below the dress hint on a Pep Orange–striped Parchment background: Spanish in 11.5 px Roboto medium weight, a small slash separator in stone gray, then English in italic EB Garamond — same pattern as the dress hint right above it. Underlying values stay in Celsius so the dress-hint thresholds keep working; conversion to Fahrenheit happens at display time via `cToF()`. Tapping the tile opens `<WeatherSheet>` (see below). **Dólar** (dolarapi.com): Blue `compra` rate as `$1.250` in DM Mono as the headline (the rate a casa pays you per dollar — what students actually transact at when cashing USD), with `MEP $1.220` and `Oficial $1.000` shown as two small DM Mono lines below. Tapping the tile opens `<DolarSheet>`, the bidirectional currency calculator. Both tiles fall back to an em-dash placeholder when the fetch fails; the secondary lines fall back to `MEP —` / `Oficial —` independently when one of them is unavailable. Empty-state placeholder tiles render as plain divs (no false tap affordance); populated tiles render as `<button>` elements with the existing `bap-press` scale-on-tap feedback.
- **Weather sheet.** Slide-up bottom sheet (`<BottomSheet>`) opened by tapping the weather tile. Two stacked sections. Top: a horizontal "Próximas 12 horas / Next 12 hours" strip, each card showing time label ("Ahora" for the current hour, then "14h", "15h", etc.), `<WeatherIcon>` with day/night derived from the hour-of-day in the ISO timestamp, Fahrenheit temp, and rain probability when ≥40 %. Sourced from the existing 48-hour hourly slice already in the weather object — no extra fetch. Bottom: a 7-day "Próximos 7 días / Next 7 days" list, one row per day with weekday label (Spanish primary, English italic gloss; today shows "Hoy / Today"), `<WeatherIcon>` (always day-side), bilingual condition descriptor from `getWeatherLabel(code)`, and high/low temps. Rain probability (`☂ 60 %`) and max wind gusts (`≈ 45 km/h`) appear as compact DM Mono captions only when meaningful (rain prob ≥25 %, gust ≥30 km/h) so quiet days stay clean. Dress hint is intentionally kept on the Today tile only, not duplicated here. The dolar tile and weather tile are independent; opening one doesn't affect the other.
- **Currency calculator sheet.** Slide-up bottom sheet (`<BottomSheet>`) opened by tapping the dólar tile. A direction toggle at the top (Pesos → Dólares / Dólares → Pesos) defaults to ARS → USD because students are usually computing what a peso price means in dollars. A large input field accepts decimal input (commas auto-normalized to dots for Argentine convention); a row of quick-pick chips below the input fills common amounts (1.000, 5.000, 10.000, 50.000 ARS in ARS-source mode; 5, 20, 50, 100 USD in USD-source mode). The headline result is computed at the Blue compra rate. Below, an "All rates / Comparación" strip shows the same input converted at all four rates: Blue compra (highlighted on Ice background as the primary), Blue venta, MEP, and Oficial; each row displays the rate itself in small DM Mono (`1 US$ = $1.250`) and the converted amount aligned right. A small bilingual footnote at the bottom of the sheet explains the spread: `compra` is what a cueva pays you per dollar; `venta` is what they charge when you're the buyer.
- **Pull-to-refresh.** Standard mobile gesture: pull down from the top of the Today tab to force-refresh all live data in parallel — weather (bypassing the 30-min TTL on `bap-today-cache`), dólar (same), and the consolidated sheet data (bypassing the Apps Script's 1-hour `CacheService` entry via `?bust=1`). The Director can pull down on Today after editing the spreadsheet and see the change immediately, instead of having to hit the Apps Script URL with `?bust=1` in a separate browser tab. Touch handlers live on the `<TodayView>` root and walk up to the closest scrollable ancestor on first touch; the gesture only activates when that container is at `scrollTop === 0`. Raw touch delta is dampened by 0.55 for a weighted feel; visual pull is capped at 110 px; trigger threshold is 70 px on release. Indicator is a 28 px circular spinner (Fog ring with a Pep Blue top segment when triggered or refreshing) sitting in a slot above the greeting strip; the whole content block translates down with the pull and snaps back via a 280 ms cubic-bezier transition. The gesture is suppressed when either bottom sheet (Weather or Dólar) is open. `overscroll-behavior-y: contain` on the App-level content scroll container prevents the browser's own pull-to-refresh from firing alongside ours. Other tabs don't carry the gesture; the Today tab serves as the canonical "give me the freshest everything" entry point.
- **Active announcements.** The existing `<AnnouncementBanner>` renders here when an active announcement exists; otherwise nothing renders. Moved from Weekly Overview to Today.
- **Today's activity card.** Combines today's classes (filtered to today's day-of-week from `data.classes`) and today's calendar events (filtered via `eventOverlaps()` on `data.calendarEvents`, excluding semester-only). Sorted untimed-first, then by minutes-since-midnight. A "Próximo en X min" pill with the green pulse dot sits in the top-right of the card and auto-updates every minute (`setInterval` in `<TodayView>`). The next upcoming item is bolded and its time tinted Ocean; items already in the past dim to 0.55 opacity. Class location renders beneath each title.
- **Empty state.** When today has no items, the activity card flips to a "¡Día libre!" treatment: a 48 px mate gourd with two faint steam wisps animating up (`bap-steam`, 3.5 s ease-in-out infinite, with a 1.7 s delay on the second wisp), the line "Nada en agenda hoy. Date una vuelta; Buenos Aires te espera," and an "Explorar BA →" button that jumps to the Local tab. The button uses the `onJumpToTab` callback wired from the App component.
- **Esta semana / This Week in BA tile.** Surfaces the next 1-2 upcoming events from the Events sheet (today through +7 days). Each row shows a 30 px colored category circle with the category glyph, the title, and a date+time+neighborhood line. A "+N more this week" line appears at the bottom when more events are queued. The tile renders nothing when no events are upcoming, so weeks without curated content stay clean. Tapping the tile jumps to Local > This Week. Component: `<EventsTodayTile>`.
- **Tip card.** Rotates through entries from the Tips sheet (or the built-in `FALLBACK_TIPS` when the sheet is empty), 15-second rotation with a 320 ms cross-fade. Header reads "¿Sabías que…?" in DM Mono uppercase. Body uses `renderTip()` so `*italic*` markdown segments still render in EB Garamond italic.

**Live data sources used by Today:**

- Weather: `https://api.open-meteo.com/v1/forecast?latitude=-34.6037&longitude=-58.3816&current=temperature_2m,weather_code,is_day,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_gusts_10m_max&hourly=temperature_2m,weather_code,precipitation,precipitation_probability,wind_gusts_10m&forecast_days=7&timezone=America/Argentina/Buenos_Aires` — free, no API key, CORS-enabled. The `daily=` block now returns 7 days of high/low temps, daytime weather codes, max precipitation probability, and max wind gusts (each as a 7-element array, today first); these power the 7-day list in `<WeatherSheet>`. The `hourly=` block returns 48 hours from the current hour onward and powers both the impending-weather alert and the 12-hour strip in `<WeatherSheet>`.
- Dólar Blue: `https://dolarapi.com/v1/dolares/blue` — free, no API key, CORS-enabled.
- Dólar MEP (bolsa): `https://dolarapi.com/v1/dolares/bolsa` — same provider, same shape; secondary line on the dólar tile.
- Dólar Oficial: `https://dolarapi.com/v1/dolares/oficial` — same provider, same shape; tertiary line on the dólar tile, below MEP.

Both responses are cached in `localStorage` under the key `bap-today-cache` with a 30-minute TTL (`TODAY_CACHE_TTL = 30 * 60 * 1000`). The cache is keyed independently from the main sheet cache (`bap-app-cache`); failures in either fetch are silent and the previous cached value remains on screen until the next attempt. When the cache shape evolves (new fields added to weather or dólar), old cached values render gracefully — missing fields just don't show — and self-refresh on the existing 30-minute TTL, so most students see the new data within half an hour without any forced invalidation. As of 2026-04-27, `<TodayView>`'s effect also runs an explicit completeness check on the cached weather (`c.weather.daily && Array.isArray(c.weather.daily.time)`) and force-fetches when the daily block is absent, so the 7-day modal is never empty on first open after a deploy.

**Schedule tab:**

- Weekly Overview: scrollable week-by-week view of the semester. Each day card shows that day's calendar events (filtered via `eventOverlaps()`), the student's enrolled classes for that day-of-week (when personalization is on), and any finals scheduled for that date, all interleaved chronologically by start time. As of 2026-05-14 the three were merged into a single `dayItems` list sorted untimed-first then by minutes-since-midnight (matching `getTodayItems` on Today), so a 9 AM class now appears above a 3 PM excursion instead of always sitting below all events. Each entry tags its `kind` so the render keeps the kind-specific card styling — events keep their `EVENT_STYLES` type-driven bg/border, finals keep the Pep Orange "Final" pill, classes keep the thinner secondary row with the Fog left border. Classes are suppressed on any day with a holiday event that cancels classes. Empty days render the `<EmptyDay>` mate-gourd card. **Navigation is bounded** (as of 2026-05-11) to a tight personal window: one week prior, the current week (the default landing), and up to two weeks ahead. The chevron buttons render disabled (40 % opacity, stone color, `not-allowed` cursor) at the bounds and the click handler is a no-op so a stuck tap can't push past `MIN_WEEK_OFFSET` (-1) / `MAX_WEEK_OFFSET` (+2); `setWeekOffset` calls also wrap in `Math.max` / `Math.min` as a belt-and-suspenders clamp. The window is calibrated to "what's relevant to a student right now" — they don't need to browse the entire semester from this view (the Semester Calendar already does that), and capping the range keeps the navigation feeling intentional rather than open-ended. Today's day card is visually highlighted (Ice-tinted background, BAP Blue border, Pep Blue date circle, inline "TODAY" badge next to the weekday name) so students can spot it while scanning the week, but the previous "↓ TODAY" scroll-to-today button was removed on 2026-04-26 — the dedicated Today tab is now the canonical entry point for today-of-day context. The `<TodayHero>` card that previously anchored this view was removed when the Today tab landed.
- Class Schedule (Week View): Shows classes grouped by day (Mon–Fri), sorted by start time for that specific day. Variable-schedule classes show only the relevant time slot per day.
- Courses (All Courses): Shows every course as a full card with complete schedule info. Professor names render as "Prof. María Castro" when `honorific` and `firstname` are both present in the sheet; otherwise the bare surname is used. When `email` is set, each card shows a tappable "Email Prof. Castro" button.

**Calendar tab:**

- Semester events grouped by month, filterable by type (milestone, academic, excursion, holiday, program, orientation).
- Color-coded event cards with date and day-of-week.
- Multi-day events display as a single card with a date range (e.g., "May 22–25") and day count (e.g., "3 days").
- The optional `visibility` column on each event controls where it appears: `both` (default) shows in both views, `week` limits to the Weekly Overview, and `semester` limits to the Semester Calendar.

**Announcements:**

- Data-driven banner rendered on the Today tab between the quick-stats row and today's activity card.
- Two visual tiers: info (BAP Blue accent, `<MegaphoneIcon>` glyph) and urgent (Pep Orange accent, `<AlertIcon>` triangle glyph plus a small Pep Orange pulsing dot).
- Bilingual DM Mono label across both tiers: "Aviso / Notice" or "Importante / Important".
- Soft accent gradient stripe on the left edge replaces the hard left border of the previous design.
- Italic Spanish "Hasta el viernes" / "Hasta el 4 de mayo" gloss appears at the bottom when the announcement runs ≤21 days, so students see when it'll auto-disappear; suppressed when the end date is further out (the gloss would just be noise).
- Optional "Más info →" CTA pill in the accent color when `link` is set.
- Automatically activates and deactivates based on the `start_date`/`end_date` range in the Google Sheet.
- Not user-dismissible (per the 2026-04-26 redesign): the program office controls the banner's lifecycle entirely from the sheet, by editing the date range or removing the row.
- Renders nothing when no announcements are active.

**Local tab:**

- Five sub-tabs in this order: This Week, Explore BA, Healthcare, Churches, Apps. Pills are arranged in two fixed rows (This Week + Explore BA on top; Healthcare, Churches, Apps below) so all five fit on the screen at once without horizontal scroll.
- Default sub-tab is dynamic: when at least one event is upcoming this week, Local opens to "This Week"; otherwise it opens to Healthcare so muscle memory for existing flows is preserved.
- This Week sub-tab pulls from the Events sheet (see Tab Structure above). Past events auto-hide, remaining events are sorted chronologically and split into two groups with bilingual headers: "This week / Esta semana" (today through +7 days) and "Coming up / Próximamente." Filter pills above the list narrow by category and only appear when 2+ categories are present in the upcoming pool. Empty state: a friendly "Nothing curated yet" card pointing students to Explore BA for evergreen recommendations.
- Each event card has a 44 px colored category circle (color and glyph from `EVENT_CATEGORIES`), the title in EB Garamond, a date+time pill on the right, an optional description, venue + neighborhood line, address (tappable, opens Google Maps), an optional cost pill, and an external link button when `link` is set. The same pill style and address treatments are reused from elsewhere in the app for visual consistency.
- Filter pills above each sub-tab: This Week filters by event `category`, Healthcare filters by `type`, Churches by `denomination`, Apps by `category`, Explore BA by `type`. Pills only appear when there is more than one unique value to filter on.
- Health sub-tab distinguishes facilities (hospitals, clinics, pharmacies, labs, ISOS, imaging centers) from individual practitioners by rendering facility cards with an Ice-blue background. The distinction is auto-detected from `type` and can be overridden by the `category` column.
- When a Health provider has `insurance: bcbs`, a small BCBS/GeoBlue logo appears next to the provider name.
- Apps sub-tab sorts essential apps (`priority: essential`) to the top with an Ice-blue background and a Pep Orange dot next to the name; other apps render as standard cards below.
- Each card shows name, type/denomination/category, address, phone/hours, notes.
- Addresses are tappable and open Google Maps (see `AddressLink` below).
- Tappable link buttons (website, WhatsApp, Instagram) when a link is provided in the spreadsheet. Apps cards render "📱 iOS", "🤖 Android", or "🌐 Website" buttons depending on which URLs are set.

**Contacts tab:**

- Program Office card, Emergency section, Staff cards, Local Emergency Numbers (107/911/100), and optional Additional Resources.
- Office and staff cards surface Call, WhatsApp, Email, and Maps buttons when the corresponding fields are populated.

**FAQ tab:**

- Expandable accordion cards (formerly the Policies tab).
- Optional "View full details" link per entry.
- Page title: "Frequently Asked Questions".

**Status indicator:**
The header shows a small badge indicating data source and freshness. The badge is rendered in the synced (blue) visual state for both `live` and `refreshing`; the muted (white-translucent) state covers everything else. In the synced state, a small mint-green dot appears beside the label and softly pulses (`@keyframes bap-pulse` in the injected stylesheet) to signal liveness; the dot disappears in non-synced states. Pulse animation is suppressed under `prefers-reduced-motion: reduce`.

**Personality Moves (cross-cutting):**

The app's chrome carries a small set of intentional personality moments layered on top of the institutional palette. Each move is reversible and respects accessibility constraints.

- **Editorial section titles.** Every main view (except Today, where the greeting strip is the page anchor) opens with a `<SectionTitle>` pairing an English headline in EB Garamond at 28 px with a small Spanish gloss in DM Mono uppercase below it (e.g., "Program Schedule" + "CRONOGRAMA"). Pulled from the `TAB_TITLES` constant.
- **Pulsing synced dot.** A 6×6 mint-green dot sits before the "Synced" label and softly throbs while live data is on screen. Implemented as the `.bap-pulse-dot` class via the injected `bap-personality-styles` block. Reused on the Today activity card's "Próximo" countdown pill.
- **Loading screen with rotating tips.** First-paint loading view (`<LoadingScreen>`) shows a spinning ring, a "Cargando…" label, and a card cycling through Argentine-flavored tips from the Tips sheet. New tip every 4 seconds with a 320 ms cross-fade. Falls back to a built-in 3-tip array when no Tips sheet exists.
- **Whimsical empty days.** In the Weekly Overview, any day with no events renders the `<EmptyDay>` card: a small mate-gourd SVG, "¡Día libre!" in italic EB Garamond, and "Nada en agenda hoy." beneath. The Today tab carries the same motif at a larger scale with steaming animation.
- **Press feedback on actions.** Buttons that drive real interactions (filter pills, bottom-nav tabs, FAQ accordion headers, class cards, Today's quick-stats tiles, Today's "Explorar BA" button) carry the `.bap-press` class, which scales them to 0.97× on tap.
- **Header constellation.** The header's faint top-right circle is replaced with `<SouthernCrossDecoration>`: five BAP Blue dots arranged in the Southern Cross pattern with thin connecting lines, set at 55 % opacity. Decorative; sits behind the logo + content row.
- **Animated bottom nav with per-tab color identity.** Each tab in the `TABS` array has its own `color` property: Today = BAP Blue, Schedule = Pep Blue, Calendar = Ocean, Local = Sky, FAQ = Mountain, Contacts = Pep Orange. The active tab's icon and label adopt that color and the icon lifts 3 px (`.bap-nav-icon.lifted`). A 44 × 4 px pill (`.bap-nav-pill`) slides between tabs via CSS transform, adopting the active tab's color. Pill positioning is computed in a `useEffect` that runs on tab change and on window resize, measuring the active button via a ref-keyed map (`navBtnRefs.current`). Local shifted from BAP Blue to Sky when Today claimed BAP Blue as its marquee color.
- **Dot-grid pattern fill on the Apps section header.** A two-radial-gradient pattern (`.bap-dot-pattern`) at very low opacity behind the Apps section header gives the surface texture without affecting contrast on the type above it. Currently scoped to one surface; can be reused on other section headers if texture becomes a recurring motif.
- **Apps grouped by transport vs daily life.** When the Apps filter is set to "All", apps are split into "Getting around / Transporte" (matching `/navigation|transport|transit/i` on the category) and "Daily life / Día a día" (everything else), each preceded by a `<SectionDivider>` with a glyph (colectivo and palm respectively). When a single category filter is selected, the dividers disappear and apps render in a flat list; the user has explicitly narrowed the scope, so additional grouping would just add noise. Within each group, the existing essentials-first then alphabetical sort is preserved.

The CSS for these moves lives in a single `<style id="bap-personality-styles">` element injected once via `useEffect` in the App component. Idempotent (bails if already present); no new dependencies. All animations honor `prefers-reduced-motion: reduce`.

| Status | Label | Meaning |
|--------|-------|---------|
| `live` | Synced | Fresh data just loaded successfully |
| `refreshing` | Refreshing... | Cached data is on screen; background fetch in flight |
| `loading` | Loading... | First-ever open, no cache yet, fetch in flight |
| `cached` | Saved version (offline) | Fetch failed but cached data is still available |
| `fallback` | Using saved data (sheet unavailable) | Fetch failed and no cache; hardcoded defaults shown |
| `default` | Preview mode | No SHEET_ID configured |

## Helper Functions

Key utility functions in `App.jsx`:

- **`loadCache()`** — synchronously reads and parses the localStorage payload at key `bap-app-cache`. Returns `{ data, timestamp }` if the cache is present and the version matches `CACHE_VERSION`; returns `null` otherwise (missing, malformed, or stale version). Called during `useState` lazy initialization to make first paint use cached content.
- **`saveCache(data)`** — writes the full normalized data object to localStorage with the current `CACHE_VERSION` and timestamp. Wrapped in try/catch so quota-exceeded errors or disabled storage are silently ignored.
- **`parseDays(raw)`** — normalizes the `days` field from either comma-separated abbreviations (`"Mon, Tue, Thu"`) or a concatenated single-letter string (`"MTR"`) into an array of three-letter day names. Uses `DAY_LETTER_MAP = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" }`.
- **`toMinutes(timeStr)`** — parses a time string (`"8:00"`, `"08:00"`, `"8:00:00"`, `"8:00 AM"`, `"20:30"`) into minutes-since-midnight. Returns `null` for empty or unparseable input. Used by the Weekly Overview to sort events chronologically within a day; a direct `localeCompare` on raw time strings would incorrectly put `9:00` after `10:00`.
- **`eventOverlaps(event, rangeStart, rangeEnd)`** — returns `true` if an event's date range overlaps with a given window. Used by the Weekly Overview to catch multi-day events that span into the visible week.
- **`dateRangeLabel(startDate, endDate)`** — produces a compact label like "May 22–25" (same month) or "May 30 – Jun 2" (cross-month).
- **`countDays(startDate, endDate)`** — returns the number of days in a range, inclusive.
- **`EVENT_CATEGORIES`** — constant config mapping each Events category key (`music`, `theater`, `film`, `exhibit`, `dance`, `festival`, `food`, `talk`, `other`) to `{ label, es, color, Icon }`. The `color` is a hex from the BAP palette and the `Icon` is a category glyph component that accepts a `color` prop. Single source of truth for category visuals; adding a new category here also surfaces it as a filter pill automatically.
- **`getEventCategory(key)`** — safe lookup against `EVENT_CATEGORIES`, falling back to the `other` entry when the sheet contains a category Claude doesn't recognize. Prevents crashes when the Director introduces tentative new categories.
- **`filterUpcomingEvents(events, todayStr)`** — filters out past events. Honors `end_date` for multi-day runs; single-day events are kept on their date.
- **`sortEventsChronological(events)`** — sorts by `start_date` then by `time` within the same day. Untimed events lead the day so all-day rows come first.
- **`getThisWeekEvents(data)`** — returns events whose date range intersects today through today+7 days, already sorted chronologically. Used by both `<EventsTodayTile>` (preview on Today) and `<EventsView>` (group split in Local).
- **`eventDateLabel(event)`** — compact date label for an event card. Single-day events render as `"Mon, May 4"`; multi-day runs reuse `dateRangeLabel()` for `"May 22–25"` or `"May 30 – Jun 2"`.
- **`<EventsView events activeFilter onFilterChange categoriesPresent />`** — the "This Week" sub-tab content under Local. Filters out past events, applies the active category filter, and splits the remaining list into `This week` (today to +7d) and `Coming up` (later) groups. Renders a "Nothing curated yet" empty state when no events are upcoming.
- **`<EventCard event />`** — the per-event card. Colored category circle, title, date pill, description, venue + neighborhood, address (via `<AddressLink>`), cost pill, and external link button (via `<LinkButton>`). All optional fields render only when present.
- **`<EventsTodayTile data onJumpToTab />`** — the Today dashboard preview tile for upcoming events. Shows the next 1-2 events with a 30 px category circle and a date+time+neighborhood line. Renders `null` when no events are upcoming this week, so the Today tab stays clean on quiet weeks. Tapping the tile calls `onJumpToTab("local")` which routes to the Local tab; the default `initialSub` logic in `<LocalView>` then opens directly to "This Week".
- **`isFacility(provider)`** — returns `true` when a health provider is a facility rather than an individual. Honors the `category` column if set; otherwise matches the `type` field against `hospital|clinic|clínica|sanatorio|laboratory|lab|pharmacy|farmacia|emergency|isos|imaging|diagnóstico`. Facility cards get an Ice-blue background.
- **`<AddressLink address mapsUrl />`** — renders an address as a tappable link with a 📍 pin icon prefix. When `mapsUrl` is provided (e.g., from the `maps` column in the Contacts tab) it is used as the `href`; otherwise the address is URL-encoded into `https://www.google.com/maps/search/?api=1&query=...`. On mobile this opens the native Google Maps app when installed; on desktop it opens maps.google.com. Used in HealthView, ChurchesView, ExploreView, and the Office card of ContactsView.
- **`<LocationNote note />`** — renders non-address location info as plain italic gray text with no pin and no link. Used for the `location_note` column in Health, Churches, and Explore. Companion to `AddressLink`; both may appear on the same card, with the address linked first and the note below as unlinked context.
- **`renderTip(text)`** — small inline parser that renders a tip string with markdown-style `*italic*` segments. Splits the input on asterisks and alternates between regular `<span>` text and italic EB Garamond `<em>` elements. Safe by construction (no `dangerouslySetInnerHTML`, no HTML evaluation). Used by `LoadingScreen` to render tips from the Tips sheet.
- **`<MateGourdIcon size />`** — inline SVG of a mate gourd with bombilla. Six paths, BAP Blue body, mountain-color details, soft white highlight stroke. Used as the visual anchor of the empty-day card in the Weekly Overview. Inherits brand color tokens directly so a future palette tweak propagates automatically.
- **`<EmptyDay />`** — the whimsical empty-state card shown in each empty day row of the Weekly Overview. Pairs a small mate gourd with the headline "¡Día libre!" and the subtitle "Nada en agenda hoy." One uniform treatment for all empty days; no special-casing of "today."
- **`<SectionTitle tabKey />`** — the bilingual section heading at the top of every main view. Renders the English title in EB Garamond at 28 px, with a small Argentine-Spanish gloss below in DM Mono uppercase (e.g., "Program Schedule" + "CRONOGRAMA"). Pulls strings from the `TAB_TITLES` constant; adding a new tab requires both a `TABS` entry and a `TAB_TITLES` entry.
- **`<LoadingScreen tips />`** — the first-paint loading view shown only when there is no cache and no SHEET_ID is missing. A spinning ring, "Cargando…", and a card showing one rotating tip every 4 seconds with a 320 ms cross-fade. Reads from `data.tips`; falls back to a built-in 3-tip array (`FALLBACK_TIPS`) when the Tips sheet is empty or missing. Animations honor `prefers-reduced-motion`.
- **`TAB_TITLES`** — constant object mapping each tab key to `{ en, es }` strings used by `SectionTitle`. Single source of truth for the bilingual headlines.
- **`<TodayView data onJumpToTab profile />`** — the Today tab itself. Greeting strip, weather + dólar quick-stats row, active announcements, today's activity card with a live "Próximo en X min" countdown, and a rotating tip card. Drives a one-minute clock tick (`setInterval`) so the countdown stays accurate without keeping the user's tab open re-rendering everything. Receives `setTab` as `onJumpToTab` so the empty-state "Explorar BA →" button can route to the Local tab. Reads weather and dólar from a separate localStorage cache (`bap-today-cache`) with a 30-minute TTL.
- **`getGreeting(hour)` / `getGreetingGradient(hour)` / `getDressHint(temp, code)` / `formatPesos(n)` / `formatCountdown(targetMin, nowMin)`** — small pure functions used by `TodayView` for the greeting copy, time-of-day gradient, bilingual dress hint based on temperature and weather code, peso formatting (`$1.250` with Spanish-locale separators), and the human-readable countdown to the next item.
- **`fetchWeather()` / `fetchDolar()` / `cToF(c)`** — async fetches against Open-Meteo (Buenos Aires lat/lon hardcoded as `BA_LAT = -34.6037` and `BA_LON = -58.3816`) and dolarapi.com. No API keys; both endpoints are CORS-enabled. `fetchWeather()` pulls `current=temperature_2m,weather_code,is_day,wind_speed_10m`, a 7-day `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_gusts_10m_max` block, and a 48-hour `hourly=` block (temp, weather_code, precipitation, precip prob, wind gusts), and returns `{ temp, code, isDay, tempMax, tempMin, hourly: { time, temp, code, precip, precipProb, windGust }, daily: { time, tempMax, tempMin, code, precipProbMax, windGustMax }, ts }` with all temps in Celsius. The `hourly` block is sliced to start at the current hour (`startIdx` computed via ISO-prefix comparison) so the next-12-hour and weather-alert paths both see "now-aware" data. `fetchDolar()` pulls Blue (`/v1/dolares/blue`), MEP (`/v1/dolares/bolsa`), and Oficial (`/v1/dolares/oficial`) in parallel via `Promise.allSettled` and returns `{ venta, compra, mep, oficial, ts }`; only throws when Blue itself fails, so a failed MEP or Oficial call still leaves the others on screen. `cToF(c)` is a tiny pure helper that rounds `(c × 9/5) + 32`; used at display time so the underlying Celsius values are preserved for the bilingual dress hint thresholds.
- **`loadTodayCache()` / `saveTodayCache(payload)`** — read and write the `bap-today-cache` localStorage entry. Stores `{ weather: { temp, code, isDay, tempMax, tempMin, hourly, daily, ts }, dolar: { venta, compra, mep, oficial, ts } }`. `TODAY_CACHE_TTL = 30 * 60 * 1000` is checked per-entry, so weather and dólar refresh independently if one falls stale before the other. Wrapped in try/catch so quota errors are silently ignored. Old cached values missing newer fields (e.g., `tempMax`, `tempMin`, `mep`, `oficial`) render gracefully and self-refresh within half an hour; no version bump is needed when fields are added. The 2026-04-27 `daily` addition is also guarded by an explicit completeness check in `<TodayView>`'s effect so the 7-day modal works immediately after a deploy without waiting for the TTL to lapse.
- **`getWeatherLabel(code)` / `formatHourLabel(iso, isFirst)` / `getShortDayLabel(iso, today)` / `formatUsd(n)`** — small helpers used by `<WeatherSheet>` and `<DolarSheet>`. `getWeatherLabel` maps a WMO code to a `{ es, en }` short condition descriptor that mirrors the state grouping in `<WeatherIcon>` so icon and label always agree. `formatHourLabel` returns `"Ahora"` for the first slot in the hourly strip and `"14h"`/`"15h"` for subsequent hours (Argentine 24-hour convention). `getShortDayLabel` returns a `{ es, en }` weekday label from an Open-Meteo daily ISO string, with `Hoy / Today` for the current day. `formatUsd` renders dollar amounts with two decimals under $100 and rounded thousands-separated whole dollars otherwise.
- **`<BottomSheet open onClose titleEs titleEn children />`** — generic slide-up bottom-sheet modal used by `<WeatherSheet>` and `<DolarSheet>`. Mounts the backdrop and sheet on `open=true`, animates in with a backdrop fade and a 280 ms `cubic-bezier(0.4, 0, 0.2, 1)` translateY, locks `document.body.style.overflow` while open to prevent iOS scroll-bounce behind the backdrop, and unmounts after the slide-down completes. Backdrop tap closes; a × button in the header (Ice background, Fog border) also closes. Header pairs an EB Garamond English headline with a DM Mono Spanish gloss in the same pattern as `<SectionTitle>`. Body scrolls internally with `WebkitOverflowScrolling: "touch"`. Distinct from `<ProfileModal>`, which is full-screen and styled as a dedicated settings page; `<BottomSheet>` is a lighter content-detail sheet.
- **`<WeatherSheet open onClose weather />`** — detail view for the Today weather tile. Renders a 12-hour horizontal strip from `weather.hourly` (each card: time label, day/night-aware `<WeatherIcon>`, Fahrenheit temp, optional rain prob ≥40 %) and a 7-day daily list from `weather.daily` (each row: weekday label, daytime `<WeatherIcon>`, bilingual condition label from `getWeatherLabel`, optional rain prob ≥25 % and wind gust ≥20 mph shown as compact DM Mono captions, and high/low temps). Wind gusts are converted from Open-Meteo's km/h to mph at display time via `kmhToMph(kmh)` (the underlying value stays in km/h in the cached weather payload, so no version bump is needed). Renders a placeholder line when the daily block hasn't loaded yet. No additional fetch — the existing weather object carries everything.
- **`kmhToMph(kmh)`** — pure converter, returns `Math.round(kmh * 0.621371)` or `null` for non-numeric input. Used only for display; the cached weather payload keeps the raw km/h values from Open-Meteo so we can change the threshold or units later without rerouting fetches.
- **`isWeatherStale(weather)` / `WEATHER_STALE_MS`** — staleness gate for the Today weather tile. `WEATHER_STALE_MS = 6 * 60 * 60 * 1000` (six hours). Returns `true` when the cached weather payload's `ts` is older than that. When stale, the weather tile dims and a tap fires `refetchWeatherForStaleTap` (a foreground re-fetch) instead of opening `<WeatherSheet>` directly; on success the tile ungrays and the modal opens, on failure it stays grayed.
- **`isDolarStale(dolar)` / `DOLAR_STALE_MS`** — same pattern for the Today dólar tile, at the tighter `DOLAR_STALE_MS = 3 * 60 * 60 * 1000` (three hours) threshold because Blue/MEP/Oficial can drift 5–10 % over a single trading day, making a stale rate more misleading at the calculator than a stale weather card. When stale, the dólar tile dims and a tap fires `refetchDolarForStaleTap` (a foreground re-fetch) instead of opening `<DolarSheet>`; on success the tile ungrays and the modal opens, on failure it stays grayed. `dolarRefetching` state in `<TodayView>` is tracked separately from `weatherRefetching` so a refetch on one tile doesn't dim the unrelated one.
- **`parseArsAmount(costStr)`** — pulls an Argentine-peso integer out of a free-text cost string. Used by `<EventCard>` to append a USD parenthetical to event prices (e.g. `$8.000 ARS · ~$6 USD`). Skips strings that already cite USD/US$/U$S so amounts already in dollars aren't double-converted. Honors the Argentine `.` thousands convention: `$8.000` → 8000. Rejects sub-10-peso amounts so a comma-decimal misparse like `$5,50` (which the regex truncates to `$5`) doesn't render a meaningless `~$0.00 USD` annotation. Returns `null` when no parse is possible.
- **Tile dim/offline/stale states** — both Today tiles (weather and dólar) accept a `dimmed` parameter on `statTile()` that lowers opacity to 55 % and switches the background from white to Ice. Triggers feed `dimmed` per tile: `isRefreshing` (during pull-to-refresh) and `!isOnline` apply to both tiles symmetrically; the weather tile additionally dims on `isWeatherStale(weather)` or `weatherRefetching`; the dólar tile additionally dims on `isDolarStale(dolar)` or `dolarRefetching`. While `dimmed` is true, taps that would normally open the sheet are suppressed. The exception is the stale-tile case (weather or dólar): `dimmed` is true but `onClick` is wired to the matching `refetch…ForStaleTap` handler, so the tile reads as "waiting" rather than "interactive" but still does something useful when tapped — on success the tile ungrays and the corresponding sheet opens; on failure it stays dimmed. `isOnline` is initialized from `navigator.onLine !== false` (lenient default for environments where the property is unavailable) and updated via `useEffect`-attached `online` / `offline` listeners that clean up on unmount.
- **`isClassActive(c, dateStr)` / `filterActiveClassesForDate(classes, dateStr)`** — class date-gating helpers (added 2026-04-28). `isClassActive` returns `true` when `dateStr` is within `[c.start_date, c.end_date]` (inclusive); blank bounds are treated as "no gate on that side." `filterActiveClassesForDate` is a thin `Array.filter` wrapper. Used by the Today tab's activity card and the Schedule tab's Weekly Overview to suppress class meetings outside the regular meeting window. Class Schedule (Mon–Fri grid) and Courses (alphabetical list) bypass these helpers because they're catalogs.
- **`getStudentFinals(data, profile)` / `getFinalForDate(data, profile, dateStr)` / `shouldShowFinalsUI(data, profile, today)` / `daysUntil(targetDateStr, today)` / `formatFinalDate(dateStr)` / `formatFinalsWindow(startStr, endStr)`** — the finals helper set (added 2026-04-28). `getStudentFinals` returns the personalized class list with `final_date` and `final_time` projected onto each row, sorted by `final_date+final_time` (assigned first, TBD last by `code`). `getFinalForDate` filters that list to a single date for the Today-tab class-replacement logic. `shouldShowFinalsUI` is the gate that controls whether `<TodayFinalsTile>` and `<FinalsCard>` render: true when the student has personalized AND either we're within 14 days of `data.finals_window_start` OR at least one enrolled class has a `final_date` populated. `daysUntil` computes day offsets in BA-local terms via `T12:00:00` anchoring. `formatFinalDate` produces a `"Sat, Aug 29"` label for assigned dates. `formatFinalsWindow` renders the program-wide window as either `"Aug 29"` (single day) or `"Aug 29–31"` / `"Jul 30 – Aug 1"` (multi-day, same-month or cross-month).
- **`<TodayFinalsTile data profile now onJumpToTab />`** — Today-dashboard tile that mirrors `<EventsTodayTile>`'s shape but with a Pep Blue accent for academic context. Returns `null` unless `shouldShowFinalsUI(data, profile, now)`. Shows the first 3 enrolled-class finals as colored-stripe rows with `code · title` and either `formatFinalDate · final_time` or `TBD · {finals window}`. Tap routes to the Schedule tab via `onJumpToTab("schedule")`, where the fuller `<FinalsCard>` is the primary anchor. Inserted in `<TodayView>`'s render between `activityCard` and `<EventsTodayTile>`.
- **`<FinalsCard data profile today />`** — Pinned at the top of the Schedule tab, above all three sub-pills (Weekly Overview, Class Schedule, Courses). Returns `null` unless `shouldShowFinalsUI`. Same data as `<TodayFinalsTile>` but laid out as a stationary, more-detailed reference: each row shows `code · title`, the assigned `final_date · final_time` or a TBD pill, plus the `location` underneath when present. Each row carries a 4 px left stripe in the class's `color` so it visually pairs with the Class Schedule cards below. Renders the program-wide finals window as a small Ocean pill in the top-right of the header.
- **`getTodayItems(data, profile)`** — combines today's classes, today's finals, and today's calendar events. Class meetings are gated by (a) `shouldFilterClasses(profile)`, (b) the holiday-cancels-classes check from `findHolidayContext()`, (c) `isClassActive(c, todayStr)` so out-of-range courses are dropped, and (d) `todaysFinals.length === 0` so a final-exam day replaces the regular meeting entirely. Today's finals come from `getFinalForDate(data, profile, todayStr)` and are emitted as `kind: "final"` items, which the activity card renders with a small Pep Orange "Final" pill prefixed to the title. All three lists are merged and sorted untimed-first then by `sortMin`.
- **`<DolarSheet open onClose dolar />`** — currency calculator for the Today dólar tile. Direction toggle (default ARS → USD), sanitized decimal input (commas auto-normalized to dots), quick-pick chips (1.000/5.000/10.000/50.000 ARS or 5/20/50/100 USD depending on direction), primary result computed at Blue compra, comparison strip showing the same input converted at all four rates (compra highlighted on Ice as the primary), and a small bilingual footnote explaining the compra/venta spread. Pure client-side math; no fetch. Reuses `formatPesos` for ARS output and the new `formatUsd` for USD output.
- **`formatSpanishDate(d)`** — formats a `Date` as Argentine Spanish: capitalized weekday, numeric day, lowercase month, "de" connector. Example: "Lunes, 28 de abril". Driven by the `SPANISH_WEEKDAYS` and `SPANISH_MONTHS` constants.
- **`<SunIcon />`, `<MoonIcon />`, `<WeatherIcon code isDay />`, `<ColectivoIcon />`, `<ObeliscoIcon />`, `<TangoShoeIcon color />`, `<PalmIcon />`, `<RioWaveIcon />`, `<MusicNoteIcon color />`, `<TheaterMaskIcon color />`, `<FilmReelIcon color />`, `<PictureFrameIcon color />`, `<SparkleIcon color />`, `<ForkPlateIcon color />`, `<MicrophoneIcon color />`, `<PinIcon color />`, `<HandsHeartIcon color />`** — inline SVG glyphs in the BAP palette, alongside the existing `<MateGourdIcon />`. All accept a `size` prop (default 36 px for the standalone glyphs, 30 px for `WeatherIcon`). Glyphs used in Events also accept a `color` prop so the rendered shape matches the category accent. `<WeatherIcon>` picks one of six states (clear, partly cloudy, cloudy, rain, snow, thunder) keyed off the WMO weather code, with day/night variants for the first two states. Currently in active use: sun and moon (Today greeting strip), weather glyph (Today quick-stats), mate (Weekly Overview empty days and Today empty state), colectivo and palm (Apps section dividers), río wave (Today tip card watermark), and the ten event-category glyphs (music note, theater mask, film reel, picture frame, tango shoe, sparkle, fork-and-plate, microphone, hands cradling heart, pin) on the This Week sub-tab and the Today events tile. Defined-but-unused: obelisco; available as a one-line drop for a future view.
- **`<SouthernCrossDecoration />`** — the header decoration that replaces the previous faint circle. Five BAP Blue dots in the Southern Cross arrangement at 55 % opacity, with thin 35 %-opacity connecting lines. Absolutely positioned in the top-right of the header gradient. Decorative only; sits behind the logo + content row.
- **`<SectionDivider icon en es />`** — bilingual section header used inside grouped lists. A 36 × 36 Ice-fill rounded container holding a glyph, paired with an English serif headline and a Spanish DM Mono gloss. Currently used to break the Apps view into "Getting around / Transporte" and "Daily life / Día a día" groups when no category filter is active.

## Troubleshooting

**App shows default/placeholder data instead of Google Sheet data:**

1. Check that the SHEET_ID is correctly pasted between the quotes in `App.jsx`
2. Verify the sheet is published to the web (File > Share > Publish to web)
3. Verify the sheet is shared publicly (Share > Anyone with the link > Viewer)
4. Check that tab names match exactly: Settings, Classes, Calendar, Announcements, Health, Churches, Explore, FAQ, Contacts, Resources, Apps, Tips
5. Check that column headers in row 1 are lowercase and match the expected names

**App shows stale data after a sheet update:**

The localStorage cache shows whatever was last successfully fetched. On next open the app displays cached data instantly while a background fetch refreshes it; that fetch only succeeds on a working network. Possible causes:

1. The student's network is blocking or slow on the docs.google.com fetch. The status pill will read "Saved version (offline)". Cached data persists until the next successful fetch.
2. The data shape changed (new column, renamed field) but `CACHE_VERSION` was not incremented. Old caches keep loading the old shape. Fix: bump `CACHE_VERSION` and redeploy.
3. The student has an unusually old cache on their device. Force a cold cache by bumping `CACHE_VERSION`, or have the student clear site data via their browser settings (iOS Safari: Settings > Safari > Advanced > Website Data; Android Chrome: site info > Cookies and site data).

**Build fails on Vercel:**
Check the build logs for syntax errors. The most common issue is the SHEET_ID being pasted outside the quotation marks rather than between them.

**Classes not sorting correctly:**
The time field must start with a parseable time (e.g., `9:00` or `Mon 14:00–17:15`). Times like "TBD" sort to the bottom.

## Technical Notes

- Canva logo exports come through as JPEGs even when the filename says `.png`. If re-exporting from Canva in the future, verify the actual format with `file` or check the file header. True PNGs start with `iVBORw0KGgo` in base64; JPEGs start with `/9j/`.
- The transparent banner logo was created by applying a circular PIL alpha mask to the Canva export (margin of 8px at 500px scale). If the logo design changes, this mask approach can be reused.
- The `AnnouncementBanner` component is self-contained and receives announcements as a prop. It could be reused in other views (e.g., the Semester Calendar) by passing the same `data.announcements` array.
- If more than two or three announcements are active simultaneously, consider limiting the render to the most recent ones to avoid visual heaviness.
- The font `<link>` is duplicated (once in `index.html`, once injected via `useEffect` in `App.jsx`). The browser dedupes identical link tags so this is harmless; the `index.html` location ensures fonts start downloading before React mounts, the `useEffect` is a safety net in case `index.html` is ever out of sync with the bundle.

## Roadmap

Future ideas, no particular order:

- **Push notifications** for calendar events. *Considered and deferred 2026-05-02.* The PWA half is essentially free — the existing `vite-plugin-pwa` service worker just needs a `push` event handler and a `Notification.requestPermission()` flow. The cost lives in the backend half, which would be the first feature to break the project's "no real backend" architecture. Three viable paths: (1) **all-Google** — Apps Script + a Subscriptions sheet tab storing endpoints + a time-driven trigger that reads Calendar/Classes and fires VAPID-signed pushes via `UrlFetchApp`. Fits the architecture and adds no new bills, but implementing the Web Push protocol's VAPID signing (ECDSA + JWT + payload encryption) in Apps Script with no first-class library is non-trivial — roughly 2–3 days. (2) **Vercel serverless function + Vercel Cron + a small KV store** (Upstash Redis free tier or Vercel KV) using the `web-push` npm package. Standard and well-trodden, ~1 day, but introduces a new deploy surface and a vendor footprint. (3) **OneSignal or Firebase Cloud Messaging** — fastest to ship but adds a third-party SDK and a glue layer to schedule per-event pushes from the sheet. **iOS caveat:** Web Push on iOS only fires for PWAs added to the home screen on iOS 16.4+, so the install-to-home-screen step becomes load-bearing rather than purely enhancement. Held until there's a concrete daily-use case the current pull-based model genuinely can't serve (per-class meeting reminders, urgent-announcement push on top of the Today banner, finals-day morning-of nudge).
- **Spanish UI toggle** with Argentine `vos` forms; English remains the default.
- **Custom domain** (e.g., `app.buenosaires.pepperdine.edu`) via Vercel's domain settings.
- **Semester switching** (multiple sheets, one per semester).
- **Quick-action "Contact Staff" section** on the home screen.

### Personality / UX moves not yet shipped

Five "small moves" landed on 2026-04-25: editorial section titles with Spanish gloss, pulsing synced dot, rotating loading tips, whimsical empty days in the Weekly Overview, and press feedback on actions. Five medium-scope moves landed later the same day: Today hero in the Weekly Overview, mini-illustration library, Southern Cross constellation in the header, animated bottom nav with per-tab color identity, and dot-grid pattern fill on the Apps section header. Later that same day, the Today dashboard also shipped as a dedicated tab (the leftmost, default-on-open tab), bringing with it a time-of-day greeting strip, live weather and dólar blue tiles, a live "Próximo en X min" countdown, a steaming mate empty state, and a rotating tip card. Documented under their respective sections above.

The candidates below were considered alongside them and held for later. None require new dependencies.

**Bigger scope (brand-shifting, worth a pre-build conversation):**

- **Bolder color confidence — phase 2.** Phase 1 shipped 2026-05-01b (BAP Blue accent rule on every section title, 4 px BAP Blue left stripe on Today's activity + tip cards, soft white-to-Ice gradient on the quick-stat tiles). Phase 2 is the deeper move that still needs a mockup pass: pushing BAP Blue into card *backgrounds* across the app (today's class cards, schedule rows, section header bands) and inverting white-as-secondary. Identity-shifting; harder to dial in without seeing it side-by-side with the current palette first.
- **Spanish UI toggle** (also listed in the general Roadmap above). Biggest personality jump because the bicultural identity becomes load-bearing rather than decorative. Translation work plus a settings persistence layer; affects copy on every screen, including buttons, empty states, status labels, and tab names.
- **Phrase of the Day tile on Today.** A dedicated tile on the Today dashboard surfacing one curated Argentine *vos* phrase per day with a one-line gloss. Could either reuse the existing Tips sheet (with a `featured: true` flag on rows curated for daily exposure) or live in a new `Phrases` tab. Today already shows a rotating Tips card, so this would be a sibling tile dedicated to language acquisition rather than a replacement.

## Changelog

| Date | Changes |
|------|---------|
| 2026-05-16 | **Performance audit pass: three concrete wins.** (1) **Logo out of the JS bundle.** The 160×160 BAP header logo (previously inlined as a ~63KB base64 string in `App.jsx` as `LOGO_URI`) moved to `public/logo.png` and is now served as a static asset. The base64 blob was adding ~63KB to the JS the phone had to parse before first paint; pulling it out drops the bundled JS by the same amount (production build went from ~386KB raw to 323.54KB / 91.28KB gzipped) and lets the asset cache independently. The SW precache picks it up alongside the rest of the shell. `LOGO_URI` is still the constant referenced at the three header `<img>` sites; only its value changed from `data:image/png;base64,...` to `"/logo.png"`. (2) **Today tab clock-tick memoization.** The 1-minute `setInterval` in `<TodayView>` previously caused `getTodayItems` (`eventOverlaps` over every calendar event + holiday lookup + class day-of-week filter + finals merge + time-sort), `<TodayFinalsTile>` (`shouldShowFinalsUI` + `getStudentFinals` + `formatFinalsWindow`), `<EventsTodayTile>` (`getThisWeekEvents` = filter + chronological sort), and `computeWeatherAlert` (48-hour hourly scan) to all re-run on every tick — even though none of them produce different output until the calendar day rolls over or the underlying data changes. Each is now wrapped in `useMemo` keyed on the actual inputs (`data` / `profile` / `todayStr` or `data` / `profile` / `weather`). `<EventsTodayTile>` gained a `todayStr` prop from `<TodayView>` so its memo key matches the rest of the tile family. Also lifted the per-render `loadTodayCache()` call (a `JSON.parse` of the cached weather/dólar blob) into a lazy `useState` initializer so it runs once on mount rather than every tick. Hooks-rule check: `<TodayFinalsTile>`'s early returns now sit AFTER its three `useMemo` calls so hooks are called unconditionally on every render. (3) **Hot view filter/sort memoization.** `<WeeklyOverviewView>` previously ran 7 nested filters per render to build `eventsByDate` / `activeClassesByDate` / `finalsByDate` (each chevron tap re-did the full pipeline before any visual change); the whole pre-compute block is now memoized on `[data, profile, weekOffset, todayStr]`. `<CalendarView>`'s filter → sort → group-by-month pipeline memoized on `[data.calendarEvents, filter]`. `<EventsView>`'s upcoming → category-filter → split-by-week pipeline memoized on `[events, activeFilter, todayStr]`; its `loadTodayCache()` call (which was running on every filter-pill tap just to pluck the Blue compra rate for ARS→USD pricing) lifted into a lazy `useState` initializer. **Net effect:** the most-trafficked re-render paths (Today every minute, WeeklyOverview / Calendar / Events filter taps) collapse from full pipeline recompute per render to nearly free after the first paint, and the bundle shrinks by ~63KB. Added `useMemo` to the React imports. No data-shape change; no `CACHE_VERSION` bump; no sheet edits required; no new dependencies; no Apps Script cutover. Front-end-only change |
| 2026-05-15 | **Three small security hardening passes from an audit.** None of them change the product's behavior for a normal student; they tighten three specific defensive layers. (1) **`AuthCode.gs` no longer leaks stack traces.** The catch-alls in `doGet` and `doPost` used to return `{ error: "internal_error", message, stack }` so any runtime exception echoed the full stack — function names, line numbers, internal logic — back to the client. Now they return `{ error, message }` only; the stack still gets `Logger.log`'d so it lands in the Apps Script execution log (Director-only). Diagnosis path unchanged for the Director; attack surface shrunk for everyone else. (2) **URL-scheme guard on every spreadsheet-sourced `<a href>`.** New `safeExternalUrl(url)` helper above `<AddressLink>` returns the trimmed URL when its scheme is `http:` / `https:` / `tel:` / `mailto:` / `sms:`, and returns `""` for anything else (`javascript:`, `data:`, `file:`, `vbscript:`, custom schemes). React does NOT sanitize href attributes, so without this a Director paste-mishap or a malicious URL accidentally landed in the sheet would fire as script when a student taps the button. Applied at every site that took a sheet column straight into an `<a href>`: `<LinkButton>` (Health/Churches/Explore/Events link columns), `<AddressLink>`'s `mapsUrl` override (Contacts.maps), `<ActionBtn>` (Contacts.maps + Contacts.whatsapp + Resources.url), `<AnnouncementBanner>`'s CTA (Announcements.link), `<AppsView>` cards (Apps.ios_url / android_url / web_url), `<FaqView>` accordion (FAQ.link). Internally-constructed schemes (`tel:${o.phone}`, `mailto:${o.email}`) trivially pass the allowlist, so the change is invisible for those. An unsafe URL silently renders as no-button rather than a broken button; the Director can fix the sheet and the next refresh restores the affordance. (3) **`vercel.json` at the repo root sets defensive HTTP response headers.** `Referrer-Policy: strict-origin-when-cross-origin` (tightens the small risk of leaking the SPA's referrer when a student taps an external link), `X-Frame-Options: DENY` (prevents clickjacking by iframing the app on a hostile page), `X-Content-Type-Options: nosniff` (denies MIME sniffing), `Permissions-Policy` denying camera / microphone / geolocation / payment / usb / midi / magnetometer / gyroscope (the app uses none of these powerful browser APIs). `Content-Security-Policy` was considered but deferred — it needs careful tuning against `script.google.com`, `fonts.googleapis.com`, `open-meteo.com`, `dolarapi.com` and a careless first pass would lock the app out of its own data sources. **Manual cutover:** re-paste `AuthCode.gs` into the Apps Script editor and re-deploy as a New Version (the only manual step; the front-end and Vercel-config changes ship with the next push to `main`). No `CACHE_VERSION` bump |
| 2026-05-14 | **Weekly Overview day cards now interleave events, finals, and personal classes chronologically by start time** instead of always bucketing classes below events. Previously each day rendered three sequential blocks (`dayEvents.map` → `dayFinals.map` → `dayClasses.map`), so a 9 AM class always sat below an untimed program event or an afternoon excursion, which made the day card read in stacking order rather than time order. **Implementation** in `<WeeklyOverviewView>`'s per-day render: after `dayEvents`, `dayFinals`, and `dayClasses` are computed (filters unchanged — class-personalization gate, holiday-cancels-classes gate, per-class `start_date` / `end_date` window, and the final-on-this-date class-replacement still apply), they're flattened into a single `dayItems` array where each entry carries `kind` (`event` / `final` / `class`), `sortMin` (minutes since midnight; `null` for untimed), a stable `key`, and the original payload. Sort uses the same untimed-first-then-chronological pattern as `getTodayItems` on Today (null sortMin sorts first; otherwise ascending number). Final-time and class-time strings are split on a dash so a range like `9:00–11:00` or `9:00–10:50` yields the start half for sorting. The three render blocks collapsed into one map over `dayItems` with a kind-switch — event cards keep their `EVENT_STYLES` type-driven bg / border + multi-day range badge, final cards keep the Pep Orange "Final" pill treatment + location line, class rows keep the thinner secondary row with the Fog left border. The legacy-holiday-event skip (drop calendar holiday events when a Holidays-tab row is already driving the banner) moved up from the events render-time filter to the `dayItems` build step so the unified pipeline never carries the duplicate. `hasContent` is now `dayItems.length > 0 || !!holidayContext`, matching the simplification. No data-shape change; no `CACHE_VERSION` bump |
| 2026-05-11b | **Calendar event types consolidated: `milestone` removed and its visual reassigned to `program`.** Rationale: the two had drifted into operational overlap — both surfaced Director-curated date entries (arrival days, asados, faculty visits, etc.) and students never reliably distinguished them when filtering. Collapsing them removes a filter pill, simplifies the sheet-side decision for the Director (one fewer "which type does this belong to?" judgment call per row), and frees the eye-catching Pep Orange treatment (`#FFF3E0` bg, Pep Orange border, ★ icon) to flag program-curated entries broadly rather than just the calendar's marquee moments. The `program` pill also moved to the first slot after `All` in the CalendarView filter row, since it's now the largest and most prominent category. **Implementation:** `EVENT_STYLES` in `App.jsx` had its `milestone` key deleted and `program` restyled in place (bg / border / icon swap; label stays "Program"); `program` was hoisted to the first key in the object so `Object.keys(EVENT_STYLES)` iteration order puts it right after `all` in the filter pills (the iteration order is the source of truth for pill order, not a separate constant). The legacy `milestone` seed row in `DEFAULT_DATA.calendarEvents` was rewritten to `type: "program"` so the preview mode (no `SHEET_ID`) still renders the arrival-day card with the now-correct styling. `CACHE_VERSION` stays at 6 — the data shape is unchanged; the `type` field is still a string, just with one fewer accepted value. The fallback in `CalendarView` and `WeeklyOverviewView` already routes unknown types through `EVENT_STYLES.academic`, so any legacy rows still typed `milestone` in the live sheet render as Academic-styled cards until the Director relabels them (separate operations-side cleanup; not blocking) |
| 2026-05-11 | **Weekly Overview navigation now bounded** to a tight personal window: one week prior, the current week (the default landing), and up to two weeks ahead. The Semester Calendar tab already covers the "browse the whole term" use case; this view is calibrated to "what's relevant to a student right now," so an uncapped horizon was just noise. Implementation in `<WeeklyOverviewView>`: two consts `MIN_WEEK_OFFSET` (-1) and `MAX_WEEK_OFFSET` (+2) plus `canGoBack` / `canGoForward` booleans derived from the current `weekOffset`. The chevron buttons render disabled at the bounds (40 % opacity, stone color instead of Pep Blue, `not-allowed` cursor, `aria-label` + `disabled` attribute), and the click handler is a no-op past the bounds; `setWeekOffset` calls also wrap in `Math.max` / `Math.min` as a belt-and-suspenders clamp. The "← Back to This Week" pill that appears when `weekOffset !== 0` is unchanged and continues to one-tap back to the current week. Default landing on offset 0 also unchanged. Retires the 2026-04-16 "Weekly Overview: removed the one-week-ahead cap on forward navigation" change — that one removed an asymmetric cap (one week forward, infinite back) in favor of fully uncapped; this one reintroduces caps symmetrically and intentionally. No sheet schema changes; no `CACHE_VERSION` bump |
| 2026-05-09d | **Optional per-prompt `end_time` cutoff.** New optional `end_time` column on the `Prompts` tab (HH:mm 24h, e.g. `20:00`) tightens the close on `end_date` from end-of-day to a specific time of day — useful for "RSVP closes at 8 PM" style cutoffs on dinners and excursions. Blank `end_time` keeps the prior end-of-day-on-`end_date` behavior unchanged. **Server side:** `promptIsActive` adds a same-day time-of-day check (when `today === end_date` and `now (HH:mm) > end_time` → not active); `buildPromptResponse` projects the new field; `validatePrompts` flags malformed `end_time` values (must match `HH:mm`) and `end_time` set without `end_date` (no effect). **Front side:** new `formatPromptCutoff(prompt, now)` helper returns bilingual closes-at copy with three proximity tiers — "Cierra hoy a las 20:00" when `end_date` is today, "Cierra mañana a las 20:00" when it's tomorrow, "Cierra el 15 de mayo a las 20:00" otherwise. Degrades to "Cerrado / Closed" once the cutoff has passed (so a stale cached entry doesn't claim the form is still open in the brief window before the next prompts fetch drops it). `<PromptCard>` rows on Today and `<PromptProfileSection>` rows in the gear modal both render the cutoff as a small DM Mono caption (`fontSize: 10`, `C.stone`) beneath the title; rows without an `end_time` render unchanged. Import xlsx regenerated with `end_time` populated on the welcome_dinner (`20:00`) and tigre_excursion (`18:00`) examples so the demo data showcases the feature out of the box. **Manual cutover:** (a) add an `end_time` column header to the existing `Prompts` tab in the Roster spreadsheet (just type the header in the next blank column; existing rows can stay blank unless you want to set cutoffs), (b) re-paste `AuthCode.gs` into the Apps Script editor and re-deploy as New Version. `CACHE_VERSION` stays at 6; `PROMPTS_CACHE_TTL` stays at 10 min so a Director-edited `end_time` propagates to students within ~10 minutes |
| 2026-05-09c | **Per-student data collection via prompts + responses.** Generalized "Director defines a prompt in a sheet → app surfaces it to the right students → students submit → responses land back in a sheet" primitive. Once it exists, every future use case (t-shirt sizes, meal RSVPs, activity sign-ups, evaluation surveys, weekly check-ins) is just a row in the `Prompts` tab — no code change. **Two new tabs in the existing Roster spreadsheet** (extends the auth permission boundary that already protected PII; avoids spinning up a third spreadsheet/script): `Prompts` (one row per logical question with `prompt_id`, `title_es/en`, `description_es/en`, `audience`, `start_date`, `end_date`, `category`, `surface`) and `PromptFields` (one row per input box, joined to `Prompts` by `prompt_id`; carries `field_id`, `field_order`, `label_es/en`, `field_type`, `options` [semicolon-delimited], `option_labels_es/en`, `required`, `placeholder_es/en`). The `Responses` tab (auto-created on first submit) is one row per `(cwid, prompt_id, field_id)` plus `value` + `submitted_at`. The two-tab split handles multi-field prompts cleanly — a meal RSVP with appetizer/main/dessert/comments is 1 `Prompts` row + 4 `PromptFields` rows; a t-shirt size is 1 + 1. **`surface` column** (`today` / `profile` / `both`) chooses where each prompt renders: time-bounded prompts on Today, evergreen ones inside `<ProfileModal>`. **`AuthCode.gs` gains two new actions:** GET `?action=prompts` (re-validates identity, returns active prompts for the user with responses pre-filled, audience-filtered, date-window-gated) and POST submit (text/plain JSON body to avoid CORS preflight against Apps Script — `application/json` would trigger preflight and Apps Script doesn't implement `doOptions`). Submit re-validates identity on every call, runs each field through `validateSubmissionValues` against its declared type + required flag, upserts under a `LockService` script lock keyed on `(cwid, prompt_id, field_id)`, and returns the refreshed prompt object so the front end can update local state without a follow-up fetch. **Field types in v1:** `short_text`, `long_text`, `single_select`, `multi_select`, `number`, `boolean` (date deferred until a concrete need shows up). **Editor helper `validatePrompts()`** in `AuthCode.gs` flags duplicate `prompt_id` values, fields pointing at unknown prompts, missing or unrecognized `field_type`, select fields with no options, malformed `start_date`/`end_date`, audience tokens that aren't `all` / role / CWID, mismatched option_labels counts, etc. — same shape and Logger.log output as the existing `validateRoster()`. **New App.jsx machinery:** `class SubmitError extends Error` (carries `.code` + `.details` so `<PromptForm>` can branch on `validation_failed` / `prompt_inactive` / `audience_mismatch` / `lock_failed` for inline error copy); `fetchPrompts` and `submitResponse` async functions next to `identifyUser`, mirroring its `AuthError` / `NoMatchError` throw conventions; `PROMPTS_CACHE_KEY` (`bap-prompts-cache`) with a 10-min TTL keyed by `cwid` (so a sign-out / sign-in on the same device doesn't surface the previous user's pending forms); `filterPromptsBySurface` and `isPromptPending` helpers. **Birthday now lives in the `bap-user` envelope** alongside the rest of the curated user record — small expansion of the threat-model trade (birthday on-device matches what's already stored: cwid, name, role, email — and the prompts/submit endpoints re-validate identity on every call so the credential is needed in localStorage). Legacy records without birthday force a one-time re-prompt at the user gate via `loadUser` returning null when birthday is missing. **New components:** `<PromptFieldInput>` (renders one field per `field_type` — selects as tappable cards with ✓ for multi / • for single and bilingual EB Garamond labels, boolean as Sí/Yes vs. No pill pair, number with `inputMode='decimal'` and digit-only sanitization, short_text/long_text as styled inputs with placeholder support); `<PromptForm>` (bottom-sheet wrapper, sticky-ref pattern preserves the prompt object across the BottomSheet's 260ms close animation so the form doesn't flash an empty fallback during exit, useEffect deps include only `promptKey` so a background prompts refresh while editing doesn't wipe in-progress edits, maps `SubmitError.code` to bilingual inline error panels); `<PromptCard>` (Today tile listing pending/answered prompts with `surface=today/both`, Pep Orange left stripe + "Pendientes / For you" header, per-row Pep Orange dot + Parchment bg for unanswered required-fields prompts, calmer Ocean dot + Ice bg for fully-answered, CTA shifts "Responder →" / "Completar →" / "Editar →" based on state); `<PromptProfileSection>` (renders inside `<ProfileModal>` after the Logged-in-as card, lists `profile/both` prompts with a comma-joined preview of saved values for at-a-glance recall, italic "Sin respuesta / No answer yet" fallback). Form sheet rendered at App level (above ProfileModal in the JSX so it stacks correctly), `selectedPrompt` state held in App; `<PromptCard>` and `<PromptProfileSection>` both bubble taps up via `onOpenPrompt` → `setSelectedPrompt`. **`handleSubmitPrompt`** updates prompts state in place after a successful submit (the script returns the refreshed prompt with new responses + `submitted_at`) and rewrites the per-cwid cache so both surfaces re-render in sync. **Background prompts effect** runs once both gates are clear and the user has cwid + birthday, populating prompts state from the server and refreshing the cache. AuthError on any prompts call clears cohort token + user + prompts cache in lockstep (matches the existing sheet-data AuthError handler — same root cause, same response). NoMatchError on prompts/submit clears just the user (their roster row was likely removed mid-cohort). Sign out now also wipes the prompts cache and any open form. **Two-spreadsheet permission isolation preserved:** content script still has no read access to the Roster, auth script still has no read access to the content sheet, prompts/responses live entirely on the Roster side under the same auth boundary as the per-user identity check. `CACHE_VERSION` stays at 6 — content data shape unchanged; prompts payload is its own cache layer. **Manual cutover after this commit lands:** (a) add `Prompts` and `PromptFields` tabs to the Roster spreadsheet (`Responses` auto-creates on first submit), (b) re-deploy `AuthCode.gs` (Apps Script editor → Deploy → Manage deployments → pencil icon → New version), (c) seed at least one `Prompts` row + its matching `PromptFields` rows (e.g. `tshirt_size_2026` as a single-field profile-surface single_select with options `XS;S;M;L;XL;2XL`), (d) run `validatePrompts()` from the editor to confirm no warnings, (e) commit + push, (f) existing students get a one-time CWID + birthday re-prompt on next open as legacy user records without birthday are discarded |
| 2026-05-09b | **60-day expiry on stored auth credentials.** Both `bap-cohort-token` and `bap-user` localStorage entries now wrap their value in a `{ value/token, savedAt }` JSON envelope; `loadCohortToken` and `loadUser` treat anything older than `AUTH_TTL_MS` (60 days) as missing and the student gets re-prompted at the appropriate gate. Soft floor against a phone passed to someone else who never signs out, and stays well outside the typical "I forgot my code" window. **Backward-compatible:** the legacy plain-string cohort token and the legacy flat user record (both shipped earlier today) are still accepted as valid on load; the next save upgrades each to the envelope format, after which the TTL kicks in. Detection heuristic for cohort token: `raw.charAt(0) === '{'` flags the envelope so we don't pay JSON.parse on plain-string legacy values. New constant: `AUTH_TTL_MS`. No new dependencies; no schema versioning needed (the envelope shape is content-detected, not version-keyed). `CACHE_VERSION` stays at 6 — content data shape unchanged |
| 2026-05-09 | **Per-user identification via CWID + birthday gate.** Two-layer auth model now: cohort passcode is layer 1 (security boundary, "are you in this cohort?"), CWID + birthday is layer 2 (identification, "which person in the cohort are you?"). New `<UserGate>` renders after `<PasscodeGate>` succeeds; new `currentUser` state in `<App>` lazy-init from localStorage at key `bap-user`. Three-state early-return: no SHEET_ID → preview; cohort token missing → `<PasscodeGate>`; cohort token + no user → `<UserGate>`; both → main UI. **Two-spreadsheet permission isolation.** A separate "BAP App Roster" Google Sheet holds the cohort roster (cwid, first_name, last_name, preferred_name, pronouns, birthday, role, email, whatsapp, housing_assignment, tshirt_size, tshirt_fit, dietary_restrictions, food_allergies, program_status); a second Apps Script (`AuthCode.gs`, canonical in repo root) is bound to that sheet and exposes `?action=identify&token=…&cwid=…&birthday=…` returning a curated user record on match. The content script literally has no read access to the Roster, and the auth script literally has no read access to the content sheet, so a bug in either can't leak data from the other. New `AUTH_SCRIPT_URL` constant alongside `APPS_SCRIPT_URL`; same `COHORT_TOKEN` value lives in both Script Properties (rotation is two 30-second copies). **CWID handling lenient on input variation.** `normalizeCwid()` strips non-digits and leading zeros so `123456789`, `0123456789`, `123-456-789`, and ` 123456789 ` all collapse to the same canonical form for comparison; doesn't pad short values, so `12345` and `123456789` stay distinct. CWIDs are conventionally 9-digit numerics with no leading zeros; `validateRoster()` flags non-conforming rows in the editor. **Birthday matching** via `parseBirthdayMD()` — accepts MM-DD, M-D, or YYYY-MM-DD on the sheet side, MM-DD from the front-end dropdowns; both canonicalized to MM-DD before comparing. **`program_status` gate** — non-active rows return `no_match` so a withdrawn or completed student can't sign in. **`<UserGate>` component.** Two fields: 9-digit CWID input (`inputMode=numeric` for iOS keypad, `maxLength=9`, onChange digit-strip so a paste like `123-456-789` cleans up automatically) and birthday two-dropdown row (Spanish-primary month labels via `MONTH_OPTIONS`, day options re-cap when month changes via `daysInMonthMD` — Feb=29 for leap-year support, Apr/Jun/Sep/Nov=30, others=31). Visual identity matches `<PasscodeGate>`; title pair shifts to "¡Hola! / Hello!" with caption "Decinos quién sos / Tell us who you are." `NoMatchError` → "We couldn't find you" panel; `AuthError` (cohort code rotated mid-session) → calls `onCohortReset` to bounce back to `<PasscodeGate>` without a misleading wrong-credentials message; other errors → "Couldn't connect." Helper line at the bottom with mailto to `buenosaires@pepperdine.edu`. **Cohort rotation now resets both gates in lockstep** — `AuthError` handlers in the data-fetch and `refreshAllData` paths clear `currentUser` alongside the cohort token. **`PROFILE_VERSION` 1 → 2.** Profile shape lost its `name` field (identity now comes from `currentUser.preferred_name || currentUser.first_name`, the authoritative roster identity). `loadProfile` gains a v1 → v2 migration that salvages `enrolledClasses` and `filterEnabled` rather than nuking the profile, so a student who already personalized doesn't lose course selections on this deploy. **`<ProfileModal>` redesign.** "Name" input replaced with a read-only "Logged in as" card showing preferred-or-first name + last name, role (capitalized), email, and a confirmed "Cerrar sesión / Sign out" button. `handleSignOut` clears `currentUser` only — leaves cohort token AND profile intact, so signing back in restores everything. New helpers: `class NoMatchError`; `identifyUser({ token, cwid, birthday })`; `loadUser` / `saveUser` / `clearUser` at `USER_KEY` ("bap-user"); `isStaffOrFaculty(user)` for future role-gating (no callers yet); `MONTH_OPTIONS`; `daysInMonthMD`; `SELECT_CHEVRON`. New components: `<UserGate>`. New App-level callbacks: `handleUserAuth`, `handleCohortReset`, `handleSignOut`. `AuthCode.gs` ships with `testReadRoster()` (one-shot OAuth + sanity log) and `validateRoster()` (flags duplicate CWIDs, missing required fields, unrecognized roles, malformed birthdays/emails, non-9-digit CWIDs, leading-zero CWIDs). `CACHE_VERSION` stays at 6 because the content data shape didn't change. **Manual cutover steps after this commit lands:** (a) populate the Roster sheet with the actual cohort, (b) confirm `COHORT_TOKEN` matches in both Script Properties, (c) run `validateRoster()` to confirm no warnings, (d) commit + push, (e) announce to students that the app now asks for CWID + birthday after the access code |
| 2026-05-08 | **Fix: timed events rendered as `1899-12-30` everywhere a time was shown.** The 2026-05-04 Date-handling fix in `Code.gs` formatted every Date cell with `Utilities.formatDate(cell, tz, "yyyy-MM-dd")`. That works for date-only cells, but Google Sheets stores time-only cells as Date objects anchored to its serial-date epoch of December 30, 1899 — so `Calendar.start_time` / `Calendar.end_time` and `Events.time` (which the user routinely enters into time-formatted cells) all came through as the string `"1899-12-30"` instead of `"10:00"`. Visible fallout: the Schedule tab's Weekly Overview showed time pills like `1899-12-30–1899-12-30` next to every program-scheduled event; the Local > This Week sub-tab and the Today "Esta semana" tile did the same; chronological event sort within a day silently degraded because `toMinutes("1899-12-30")` returns null and untimed-first sorting kicked in for everything. **Fix:** in `Code.gs` `readAllTabs()`, branch on `cell.getFullYear() === 1899` for Date cells: format as `HH:mm` for the 1899 sentinel, keep the existing `yyyy-MM-dd` for real dates. Heuristic is safe by construction — Sheets' time epoch is a fixed sentinel, not a real date anyone stores in this app. After re-deploying, run `clearCache()` from the Apps Script editor (or hit the URL once with `?token=…&bust=1`) so the bad cached payload is dropped. No `App.jsx` change; no `CACHE_VERSION` bump; no sheet schema change required (the operations-side workflow doesn't change either — time cells can stay time-formatted) |
| 2026-05-03 | **Lock down the app behind a cohort passcode.** Three coordinated changes that close the "anyone with the URL gets the data" hole. (1) **Search-engine hygiene.** New `<meta name="robots" content="noindex, nofollow" />` in `index.html` and a new `public/robots.txt` that disallows everything, so the app drops out of Google/Bing indexing entirely and nobody stumbles onto it via search. (2) **Auth gate at the data layer.** `Code.gs` now reads a `COHORT_TOKEN` from `PropertiesService.getScriptProperties()` and rejects any request whose `?token=` query param doesn't match — the script always returns JSON 200 (`doGet` can't set status codes), so a rejection comes back as `{ error: "unauthorized" }` and is detected as such by the client. New `class AuthError extends Error` makes that detection explicit at the `App.jsx` layer instead of relying on string-matching error messages. (3) **UI gate that uses the same token.** New `<PasscodeGate>` component renders before any data is fetched or any cached data is shown — pure gate, no app chrome behind it. Bilingual full-screen treatment (BAP Blue → Ocean → Pep Blue gradient, EB Garamond title pair "Buenos Aires Program" / "Programa de Buenos Aires", DM Mono "Código de acceso / Access code" label, single text input, "Continuar / Continue" button, `<SouthernCrossDecoration>` reused from the header). Submission probes the Apps Script with the entered token via `fetchAllData({ token: candidate })`; success → token saved at `localStorage` key `bap-cohort-token`, data primed via `handleAuth` (`justAuthed` ref short-circuits the would-be-redundant background fetch on the post-auth render), gate dismounts. Failure → bilingual "Código incorrecto / Wrong code" message in a Pep Orange–accented panel, input clears, focus returns. Network errors get their own "No se pudo conectar / Couldn't connect" message so they don't read as a wrong passcode and vice versa. The token is threaded through every `fetchAllData()` and `refreshAllData()` call from `cohortToken` state; AuthError on either path clears the bad token via `clearCohortToken()` and sets `cohortToken` to empty, which triggers an early-return back to the gate on the next render — so a rotated cohort code re-prompts automatically without any explicit logout flow. **The gviz CSV fallback path is gone.** `fetchAllDataConsolidated`, `fetchAllDataPerTab`, `sheetURL`, `fetchTab`, and the `papaparse` import are all removed; `fetchAllData` is now a single auth-aware fetcher against the Apps Script. The `papaparse` dependency was dropped from `package.json` to keep the bundle clean. Preview mode (no `SHEET_ID`) bypasses the gate so the hardcoded `DEFAULT_DATA` preview is still reachable. New helpers: `loadCohortToken`, `saveCohortToken`, `clearCohortToken`, `class AuthError`. New constant: `COHORT_TOKEN_KEY`. New component: `<PasscodeGate>`. The `index.html` preconnect to `docs.google.com` was swapped for `script.google.com` since gviz is no longer hit. **Manual cutover steps after this commit lands:** (a) set `COHORT_TOKEN` in Apps Script Project Settings → Script Properties to the cohort code, (b) re-deploy a new version of the script (URL stays the same), (c) unpublish the spreadsheet (File → Share → Publish to web → Stop) and tighten Share to Restricted, (d) drop the cohort code in the WhatsApp group. **Token rotation each cohort** is just a Script Property edit; no re-deploy. `CACHE_VERSION` stays at 6 because the data shape didn't change |
| 2026-05-02 | **Three small upgrades.** (1) **Dólar tile gains a 3-hour staleness gate** parallel to the existing 6-hour weather gate. New `DOLAR_STALE_MS = 3 * 60 * 60 * 1000` and `isDolarStale(dolar)` helper sit next to their weather equivalents. New `dolarRefetching` state in `<TodayView>` is tracked separately from `weatherRefetching` so a refetch on one tile doesn't dim the other. New `refetchDolarForStaleTap` handler mirrors `refetchWeatherForStaleTap` exactly: when the cached dólar's `ts` is older than 3 hours and the tile is tapped, a foreground `fetchDolar()` runs; on success state and cache update and `<DolarSheet>` opens (the tap signaled the user wanted the modal); on failure the tile stays dimmed. The threshold is tighter than weather's because Blue/MEP/Oficial can drift 5–10 % over a single trading day, so an aging rate is genuinely misleading at the calculator. (2) **Event cost pills auto-append a USD parenthetical** when the cost string is parseable as ARS and the cached Blue compra rate is available: `$8.000 ARS` renders as `$8.000 ARS · ~$6 USD`. New `parseArsAmount(costStr)` helper sits next to `formatUsd`; conservative parse — skips strings that already cite USD/US$/U$S, requires a `$` prefix, treats `.` as the Argentine thousands separator, and rejects amounts under 10 pesos so a comma-decimal misparse like `$5,50` (regex truncates to `$5`) never renders a meaningless `~$0.00 USD`. `<EventsView>` reads the rate once via `loadTodayCache()` at render and threads it down to each `<EventCard>` as a `dolarCompra` prop, so each card doesn't repeat the localStorage read. Compra (not venta) is used because that's the rate students actually transact at when cashing USD — the same rate the dólar tile and `<DolarSheet>`'s primary result already use. (3) **Reset profile button gains a bilingual `window.confirm()`** before wiping name + enrolled classes + filter toggle, so a fat-finger no longer costs a student five minutes of re-ticking courses. No new dependencies, no sheet schema changes, no `CACHE_VERSION` bump |
| 2026-05-01b | **Bolder color confidence + río wave goes live as a Today tip-card watermark.** Five small, reversible visual moves bundled together. (1) `<SectionTitle>` now carries a 28×2 px BAP Blue accent rule above the bilingual headline (rounded 1 px corner, 10 px gap below it). Threads BAP Blue through every main view's chrome consistently — the smallest possible change that reads everywhere. (2) Today's activity card and (3) the rotating tip card both adopt a 4 px BAP Blue left stripe (`borderLeft: 4px solid C.bapBlue`) on top of the existing 1 px Fog border. Same accent pattern as the announcement banner; visually pairs them with the per-class color stripes elsewhere instead of reading as generic white cards. The empty-state "¡Día libre!" mate-gourd card keeps its plain Fog border on purpose — the empty state should feel quieter, not more visually loaded. (4) Quick-stat tiles (weather, dólar) on Today switch from solid white to a 135° linear-gradient from white to Ice Blue (`#E3F2FD`). Keeps text readable but warms them with BAP Blue tone. The dimmed/offline/stale state (solid Ice + 0.55 opacity) is unchanged so the dim affordance still reads cleanly. (5) `<RioWaveIcon>` (defined since the 2026-04-25 mini-illustration expansion but never wired into a view) goes live as a low-opacity (18 %) decorative glyph absolutely positioned in the top-right of Today's tip card, with `pointer-events: none` so it doesn't intercept taps. An obelisco-glyph `<SectionDivider>` was prototyped at the top of Local > Explore BA but pulled before ship — the divider read as visually clunky on the existing card list, so obelisco stays in the defined-but-unused bucket pending a better surface. No new dependencies, no sheet schema changes, no `CACHE_VERSION` bump |
| 2026-05-01 | **Fix: Today tab rendered a blank Agenda card on class-cancelling holidays with nothing else scheduled.** On feriados that suppress classes (e.g. Día del Trabajador on May 1), `getTodayItems` correctly returned `items = []` plus the holiday context, and the holiday card rendered above the activity card. But the activity-card branch only handled two cases — `items > 0` (render the agenda list) and `items === 0 && !suppressEmptyForHoliday` (render the "¡Día libre!" empty state). The `items === 0 && suppressEmptyForHoliday` case fell through to the agenda-list else, mapping over an empty array and producing a card shell with just the "Agenda" header and no rows beneath it. The comment block at that branch had described the intended third case ("no activityCard at all — holiday card alone is enough; '¡Día libre!' would be redundant") but the code never implemented it. Added the missing branch so `activityCard` is set to `null` when items are empty AND a class-cancelling holiday is present. Days with at least one event still render the Agenda card normally — events ignore the class-suppression gate, so the holiday + events combination (e.g. an asado on a feriado) still surfaces them. No data-shape change, no `CACHE_VERSION` bump |
| 2026-04-28b | **Hotfix: Schedule tab rendered a white screen.** The 2026-04-28 build replaced `<WeeklyOverviewView>`'s old `classesByDow` pre-compute (a flat `{Mon: [...], Tue: [...], ...}` lookup) with `activeClassesByDate` (a per-date map that applies the personalization, per-class date-range, AND day-of-week filters in one pass). The new pre-compute landed correctly, but the day-card render block inside the weekDates map still read from the old `classesByDow[dow]` name. `classesByDow` was undefined at render time, the property access threw on the first iteration, the error bubbled past the implicit error boundary inside `<ScheduleView>`, and the entire Schedule tab unmounted to a blank white screen. Mechanism check: this didn't surface in the dev parser pass because `classesByDow` is a plain identifier reference inside a function body — JavaScript treats that as a runtime ReferenceError, not a parse error. **Fix:** collapse the three-step filter chain (`dayClassesAll` → `isClassActive` filter → not-final-today filter) down to a single filter on `activeClassesByDate[ds]` (which already has the first two filters baked in) that just drops classes whose final lands on that date. No data-shape change, no `CACHE_VERSION` bump, no sheet edits required |
| 2026-04-28 | **Today tile loading/offline/stale states + class date gating + finals UI.** *Tiles*: both Today tiles (weather and dólar) accept a `dimmed` flag on `statTile()` that drops opacity to 55 % and switches the background from white to Ice; tap is suppressed in that state. Triggers: pull-to-refresh in flight (`isRefreshing`), `!isOnline` (tracked via `navigator.onLine` plus `online`/`offline` listeners on `window`), and — for the weather tile only — `isWeatherStale(weather)` (true when the cached payload's `ts` is older than `WEATHER_STALE_MS = 6 * 60 * 60 * 1000`). The stale-weather case is special-cased so the dimmed tile is still tappable: the tap fires `refetchWeatherForStaleTap` (a foreground re-fetch) instead of opening `<WeatherSheet>`; on success the tile ungrays and the modal opens, on failure it stays grayed. *Wind units*: WeatherSheet's 7-day list now displays gusts in mph (`kmhToMph(kmh)`) with a ≥20 mph display threshold (was ≥30 km/h); raw values stay in km/h in the cached payload, so no version bump for the unit change alone. *Class date gating*: Classes tab gains `start_date` and `end_date` columns (both `YYYY-MM-DD`, both optional). Outside `[start_date, end_date]`, the class is suppressed from the Today tab activity card and the Schedule tab's Weekly Overview; Class Schedule (Mon–Fri grid) and Courses (alphabetical list) sub-views always show the full catalog regardless. New helpers `isClassActive(c, dateStr)` and `filterActiveClassesForDate(classes, dateStr)`. *Per-class final exams*: Classes tab additionally gains `final_date` (`YYYY-MM-DD`) and `final_time` (free-form, e.g. `9:00–11:00`). Settings tab gains `finals_window_start` and `finals_window_end` (program-wide window; typically a single day for Summer terms). On a class's `final_date`, `getTodayItems` replaces the regular meeting on Today's activity card with a `kind: "final"` item rendered with a Pep Orange "Final" pill prefixed to the title; `WeeklyOverviewView` swaps the regular class card for a Pep Orange highlighted final card on the matching day. *Finals UI*: new `<TodayFinalsTile data profile now onJumpToTab />` component renders on Today between the activity card and `<EventsTodayTile>` when `shouldShowFinalsUI(data, profile, today)` returns true (gating: student has personalized AND we're within 14 days of `finals_window_start` OR at least one enrolled class has a `final_date`). Shows up to 3 enrolled-class finals as colored-stripe rows with `code · title · {date+time | TBD}`; tap routes to the Schedule tab. New `<FinalsCard data profile today />` pinned at the top of `<ScheduleView>` (visible across all three sub-pills) under the same gating, laid out as a stationary, more-detailed reference with a TBD pill on rows whose final hasn't been assigned and the program-wide window shown as an Ocean pill in the header. New helpers: `getStudentFinals`, `getFinalForDate`, `shouldShowFinalsUI`, `daysUntil`, `formatFinalDate`, `formatFinalsWindow`. `DEFAULT_DATA` updated with `finals_window_start`, `finals_window_end`, and the new per-class fields populated for Summer 2026 (start `2026-05-11`, end `2026-08-28`, finals window `2026-08-29`); `final_date` and `final_time` left blank to demonstrate the TBD state. `Code.gs` got a documentation-only update describing the new sheet keys and a reminder to `?bust=1` after schema changes. **`CACHE_VERSION` bumped 5 → 6** because the data shape gained `finals_window_start`, `finals_window_end`, and the four per-class date/finals fields; old caches invalidate automatically on the next open |
| 2026-04-27b | **Hotfix: hourly forecast was anchored to UTC instead of BA local time.** `fetchWeather` had been computing the slice's startIdx by string-comparing `new Date().toISOString().slice(0, 13)` (UTC) against `hourly.time` entries that arrive in BA local format because the API call uses `timezone=America/Argentina/Buenos_Aires`. Buenos Aires is UTC-3, so the comparison drifted forward by exactly 3 hours: the next-12-hours strip in `<WeatherSheet>` showed a window starting ~3h in the future, the "Ahora" label sat over the wrong tile, and the hour sequence appeared to jump (visually "out of order" around midnight when labels wrapped 22h → 23h → 0h → 1h instead of representing the actual current and next hours). The same off-by-3-hours error silently affected `computeWeatherAlert`, which had been scanning the wrong 48-hour window. **Fix:** anchor the slice to the API's own `current.time` field, which arrives in the same BA-local format as `hourly.time`, so a plain `YYYY-MM-DDTHH` string comparison works without any timezone math. Defensive `Intl.DateTimeFormat` fallback (`timeZone: "America/Argentina/Buenos_Aires"`, `hourCycle: "h23"`) covers the edge case where `current.time` is ever missing. **Cache invalidation for already-affected students:** the weather return shape gained a `hourlySliceVersion: 2` marker, and `<TodayView>`'s completeness check was extended to require that marker (in addition to the existing `daily` shape gate). Cached weather objects from the buggy build are missing the marker and get force-refreshed on next open instead of having to wait out the 30-min TTL. No sheet schema changes; `CACHE_VERSION` stays at 5 because the main sheet cache is untouched |
| 2026-04-27 | **Pull-to-refresh on Today, plus tappable tiles opening a 7-day weather forecast and a currency calculator.** Pulling down from the top of the Today tab now force-refreshes all live data in parallel: weather (bypassing the 30-min `bap-today-cache` TTL), dólar (same), and the consolidated sheet data (bypassing the Apps Script's 1-hour `CacheService` entry via a new `?bust=1` flag threaded through `fetchAllData({ bust: true })` → `fetchAllDataConsolidated({ bust })`). The Director can pull down after editing the sheet and see the change immediately, retiring the previous workaround of opening the Apps Script URL with `?bust=1` in a separate browser tab. Gesture wiring: TodayView root carries `onTouchStart`/`Move`/`End`/`Cancel`, walks up to the closest scrollable ancestor on first touch (so it works whether scroll is on `window` or on the App content container), only activates when `scrollTop === 0`, applies 0.55 resistance to the raw delta, caps visual pull at 110 px, fires on release past 70 px, and is suppressed when either bottom sheet is open. Indicator is a 28 px circular spinner reusing the existing `bap-spin` keyframe and the loading-screen ring style: Fog ring, Pep Blue top segment past trigger / during refresh; opacity ramps in with the pull. The whole TodayView content translates down with the pull and snaps back via a 280 ms cubic-bezier transition. `overscroll-behavior-y: contain` on the App content scroll container prevents the browser's own pull-to-refresh from firing alongside ours. New App-level callback `refreshAllData()` set status to `refreshing` so the header pill matches the in-progress state. **Also in this build: tappable Today tiles.** Weather tile → `<WeatherSheet>` with a 12-hour hourly strip and a 7-day daily list (rain probability shown when ≥25 %, max wind gust when ≥30 km/h, otherwise hidden). Dólar tile → `<DolarSheet>`, a bidirectional currency calculator (default ARS → USD), with quick-pick chips, a primary result computed at Blue compra, an all-rates comparison strip (Blue compra highlighted, Blue venta, MEP, Oficial), and a bilingual footnote on the spread. **Dólar tile headline switched from `venta` to `compra`** since that's the rate students actually transact at when cashing USD; `venta` is now visible only inside the calculator's comparison strip. **`fetchWeather` extended:** `forecast_days` 3 → 7, daily block now also requests `weather_code`, `precipitation_probability_max`, `wind_gusts_10m_max`; return shape gained a `daily: { time, tempMax, tempMin, code, precipProbMax, windGustMax }` sub-object. `<TodayView>`'s effect runs an explicit completeness check (`c.weather.daily && Array.isArray(c.weather.daily.time)`) and force-fetches when the daily block is absent so the 7-day modal works on first open after deploy. New shared `<BottomSheet>` component (slide-up from bottom, drag-handle affordance, body scroll lock, brand-aligned EB Garamond / DM Mono header) used by both new sheets; distinct from the heavier full-screen `<ProfileModal>`. New helpers: `getWeatherLabel(code)`, `formatHourLabel(iso)`, `getShortDayLabel(iso)`, `formatUsd(n)`. `statTile` accepts an optional `onClick`: populated tiles render as `<button>` with `bap-press` press-feedback; placeholder em-dash tiles render as plain divs (no false tap affordance). Dress hint stays exclusively on the Today tile. Roadmap entries "Pull-to-refresh on Today" retired. No sheet schema changes; no Apps Script changes; `CACHE_VERSION` stays at 5 because no sheet-data shape changed | Pulling down from the top of the Today tab now force-refreshes all live data in parallel: weather (bypassing the 30-min `bap-today-cache` TTL), dólar (same), and the consolidated sheet data (bypassing the Apps Script's 1-hour `CacheService` entry via a new `?bust=1` flag threaded through `fetchAllData({ bust: true })` → `fetchAllDataConsolidated({ bust })`). The Director can pull down after editing the sheet and see the change immediately, retiring the previous workaround of opening the Apps Script URL with `?bust=1` in a separate browser tab. Gesture wiring: TodayView root carries `onTouchStart`/`Move`/`End`/`Cancel`, walks up to the closest scrollable ancestor on first touch (so it works whether scroll is on `window` or on the App content container), only activates when `scrollTop === 0`, applies 0.55 resistance to the raw delta, caps visual pull at 110 px, fires on release past 70 px, and is suppressed when either bottom sheet is open. Indicator is a 28 px circular spinner reusing the existing `bap-spin` keyframe and the loading-screen ring style: Fog ring, Pep Blue top segment past trigger / during refresh; opacity ramps in with the pull. The whole TodayView content translates down with the pull and snaps back via a 280 ms cubic-bezier transition. `overscroll-behavior-y: contain` on the App content scroll container prevents the browser's own pull-to-refresh from firing alongside ours. New App-level callback `refreshAllData()` set status to `refreshing` so the header pill matches the in-progress state. **Also in this build: tappable Today tiles.** Weather tile → `<WeatherSheet>` with a 12-hour hourly strip and a 7-day daily list (rain probability shown when ≥25 %, max wind gust when ≥30 km/h, otherwise hidden). Dólar tile → `<DolarSheet>`, a bidirectional currency calculator (default ARS → USD), with quick-pick chips, a primary result computed at Blue compra, an all-rates comparison strip (Blue compra highlighted, Blue venta, MEP, Oficial), and a bilingual footnote on the spread. **Dólar tile headline switched from `venta` to `compra`** since that's the rate students actually transact at when cashing USD; `venta` is now visible only inside the calculator's comparison strip. **`fetchWeather` extended:** `forecast_days` 3 → 7, daily block now also requests `weather_code`, `precipitation_probability_max`, `wind_gusts_10m_max`; return shape gained a `daily: { time, tempMax, tempMin, code, precipProbMax, windGustMax }` sub-object. `<TodayView>`'s effect runs an explicit completeness check (`c.weather.daily && Array.isArray(c.weather.daily.time)`) and force-fetches when the daily block is absent so the 7-day modal works on first open after deploy. New shared `<BottomSheet>` component (slide-up from bottom, drag-handle affordance, body scroll lock, brand-aligned EB Garamond / DM Mono header) used by both new sheets; distinct from the heavier full-screen `<ProfileModal>`. New helpers: `getWeatherLabel(code)`, `formatHourLabel(iso)`, `getShortDayLabel(iso)`, `formatUsd(n)`. `statTile` accepts an optional `onClick`: populated tiles render as `<button>` with `bap-press` press-feedback; placeholder em-dash tiles render as plain divs (no false tap affordance). Dress hint stays exclusively on the Today tile. Roadmap entries "Pull-to-refresh on Today" retired. No sheet schema changes; no Apps Script changes; `CACHE_VERSION` stays at 5 because no sheet-data shape changed |
| 2026-04-26 | **Service worker shipped: true offline mode.** Added `vite-plugin-pwa` as a devDependency and configured it in `vite.config.js` with `registerType: 'autoUpdate'`, `injectRegister: 'auto'`, `manifest: false`, and Workbox precaching of the JS bundle, fonts, icons, HTML, and manifest. Combined with the localStorage stale-while-revalidate cache already in place, the app now launches with zero network on subsequent opens, including in the subte, in low-signal neighborhoods, on flights, or when a student is on a US data plan and metering carefully. The localStorage cache continues to handle the *content* layer (sheet data, weather, dólar); the SW handles the *shell* layer (JS bundle, fonts, icons, HTML). Two layers stack cleanly without overlap. `manifest: false` keeps `public/manifest.json` as the single source of truth for home-screen install behavior, so installed-app appearance is identical. Two Workbox runtime caching rules cover Google Fonts: `StaleWhileRevalidate` for the stylesheets at `fonts.googleapis.com` and `CacheFirst` for the WOFF2 files at `fonts.gstatic.com`, both with one-year expirations. The Apps Script endpoint, Open-Meteo, and dolarapi.com are intentionally NOT cached at the SW layer; they already have purpose-built localStorage caches in `App.jsx` with explicit TTLs and version keys, and a second SW cache layer would create surprising staleness. `clientsClaim: true` and `skipWaiting: true` mean a freshly deployed build activates on the next open with no in-app prompt or refresh banner; updates are silent and seamless. `injectRegister: 'auto'` wires registration into `index.html` automatically, so `main.jsx` and `App.jsx` need no SW-specific code; the only `App.jsx` change is a `BUILD_VERSION` bump. iOS quirk: on home-screen-installed PWAs, iOS WebKit can take a second cold open before a fresh SW activates; this is iOS behavior, not a bug. Roadmap entry "Service worker for full offline mode and PWA caching" retired. `CACHE_VERSION` stays at 5 because no data shape changes |
| 2026-04-26 | **Today tile polish + Birthday card Spanish-only.** Tip card cycle on Today slowed from 7s to 15s so students have time to actually read each tip before it fades; the LoadingScreen tip card (separate component, only seen on first-ever load) stays at 4s. Weather alert collapsed from a two-row stacked block (Spanish primary + English italic underneath) into a single-line bilingual treatment that matches the dress-hint pattern right above it: Spanish in 11.5 px Roboto medium weight, slash separator in C.stone, English in italic EB Garamond inline. Wraps naturally when the bilingual phrase is long, saves a row of vertical space when it isn't. Padding nudged from `5px 8px` to `4px 8px` to match. **Dólar Oficial added** as a third small line below MEP on the dólar tile, giving students the full Blue / MEP / Oficial picture at a glance for currency decisions. `fetchDolar()` now hits `/v1/dolares/blue`, `/v1/dolares/bolsa`, and `/v1/dolares/oficial` in parallel via `Promise.allSettled`, so any one rate failing still leaves the others on screen; return shape gained an `oficial` field. The dólar object lives in `bap-today-cache` (separate from the main sheet cache, 30-min TTL); old cached entries missing `oficial` render with `Oficial —` and self-refresh within half an hour, so no `CACHE_VERSION` bump was needed. Roadmap entry "Dólar oficial alongside Blue and MEP on Today" retired. **Birthday card stripped of its English subtitle.** The card is now Spanish-only — the names themselves carry the bicultural feeling, and the Spanish reads warmer without the English echo underneath. The `titleEn` variable, the second EB Garamond render block, and the redundant render path were dropped from `<BirthdayCard>`. The `joinEnglish(items)` helper was removed since `<BirthdayCard>` was its only caller; the comment on the surviving `joinSpanish(items)` was retuned to drop its now-misleading "both variants are exposed" claim. The card's three layout tiers (1 / 2 / 3+ people), parchment + Pep Orange treatment, italic EB Garamond at 18 px, and 44 px `<CupcakeIcon>` are all unchanged |
| 2026-04-26 | **Apps Script consolidated data endpoint (transport-only).** New top-level `fetchAllData()` tries a single Apps Script Web App URL that returns all 15 tabs as one JSON blob, replacing the legacy 15 parallel gviz CSV fetches. The script caches its response for 1 hour via `CacheService` so most opens hit the script's in-memory cache rather than re-reading the spreadsheet. On any failure (network error, non-200, non-JSON response, or empty `APPS_SCRIPT_URL`), the app silently falls back to the legacy per-tab gviz path; both paths feed the same `normalizeData(raw)` function so rendered output is identical. New constant `APPS_SCRIPT_URL` in the CONFIGURATION section. New helpers: `fetchAllDataConsolidated()`, `fetchAllDataPerTab()` (the original `fetchAllData` body), and `normalizeData(raw)` (the shared normalization logic, keyed by sheet tab name). Cache bust at the script layer: append `?bust=1` to the URL when manually verifying a sheet edit. Expected impact: 5–10x faster fetch on slow connections (one round trip with pre-parsed JSON instead of 15 round trips and client-side PapaParse); negligible on fast connections but still cleaner. The companion `Code.gs` source is in project knowledge. Data shape unchanged, so `CACHE_VERSION` stays at 5; existing student localStorage caches roll over to the faster path silently. Roadmap entry retired |
| 2026-04-26 | **Birthday card on Today.** New optional `Birthdays` sheet tab (`name`, `date`, `role`) drives a celebratory card on any day matching one or more rows. Card sits between the announcement banner and the holiday card. Three layout tiers based on count: 1 person gets a personalized title ("¡Feliz cumple, María!"), 2 people get joined names with proper Spanish/English conjunctions ("María y Carlos" / "María and Carlos"), 3+ people get a generic "¡Feliz cumple!" header with names listed beneath in a comma-joined line. Bilingual treatment: Spanish title in italic EB Garamond primary, English in smaller serif italic underneath; Parchment background with a Pep Orange left stripe so the warmth reads without going saccharine. New `<CupcakeIcon>` SVG glyph at 44 px in the existing 64×64 viewBox style: BAP Blue fluted wrapper with white pinstripe lines, Sky Blue frosting mound with Pep Orange and white sprinkles, parchment candle with a Pep Orange flame and warm-yellow (#FFE082) inner glow. New helpers: `parseBirthdayMD(raw)` (accepts `MM-DD`, `M-D`, or full `YYYY-MM-DD`; year stripped), `getTodayMD()`, `findTodayBirthdays(birthdays)`, `joinSpanish(items)`, `joinEnglish(items)`. **The app never displays or computes age** — year of birth is intentionally discarded during parsing as a privacy choice. The `role` column is captured but unused in v1; reserved for future filtering or visual differentiation. `DEFAULT_DATA.birthdays` initialized empty so the card simply doesn't render until the program office populates the sheet. `CACHE_VERSION` bumped from 4 to 5 because the data shape gained a `birthdays` array; old caches are invalidated automatically on the next open |
| 2026-04-26 | **Holidays sheet tab + impending-weather alerts on Today.** New optional `Holidays` sheet tab (columns: `date`, `name_es`, `name_en`, `cancels_classes`, `observance_type`, `description_es`, `description_en`) becomes the source of truth for class-cancellation logic and the Today holiday card. The `cancels_classes` flag distinguishes feriados that cancel classes (national holidays, Semana Santa, días no laborables turísticos) from cultural observances that don't (Día del Maestro, Día del Estudiante, Día de la Tradición, Día Internacional de la Mujer). The legacy calendar-event `type:"holiday"` path remains as a fallback when the Holidays tab is missing or empty. New helpers `findHolidayForDate(holidays, dateStr)` and `findHolidayContext(data, dateStr)` consolidate detection across Today and Weekly Overview; the latter normalizes both data sources into a single shape. New `parseBoolean(raw)` helper accepts `TRUE`/`yes`/`y`/`1`/`x`/`✓`/`sí`/`si` as truthy. Holiday card on Today now bilingual: Spanish title + description primary, English in italic EB Garamond underneath; observance days get a quieter Ocean treatment vs feriados' red. Weekly Overview day cards gain a small inline holiday banner with the same Feriado / Día especial visual distinction. `getTodayItems()` return shape's `holidayEvent` field renamed to `holiday` (the normalized shape from `findHolidayContext`). **Weather alerts:** `fetchWeather()` extended with hourly precipitation, precipitation_probability, weather_code, wind_gusts_10m, and temperature_2m for the next 48 hours via `forecast_days=3` and a now-aware slicing window. New `computeWeatherAlert(weather)` helper scans the slice and surfaces a conservative bilingual alert (thunderstorms WMO 95/96/99, heavy rain ≥5mm, freezing ≤2°C, gusts ≥50 km/h, or notable rain ≥2mm at >70% probability) under the dress hint with phase-of-day phrasing ("esta tarde", "mañana a la mañana"). Spanish primary in 11.5 px Roboto, English italic in 11 px EB Garamond, Pep Orange left stripe on a Parchment background. Renders nothing when conditions are normal. `DEFAULT_DATA.holidays` seeded with the August San Martín feriado; the duplicate calendar event row for the same day removed to avoid double-rendering. `CACHE_VERSION` bumped from 3 to 4 because the data shape gained a `holidays` array; old caches are invalidated automatically on the next open |
| 2026-04-26 | **Personalized class display + holiday awareness.** Classes on the Today tab activity card now only render when `shouldFilterClasses(profile)` is true (student has personalized enrollment AND filter toggle is on). The toggle auto-enables in the profile editor's `toggleClass` the first time a class is selected (false → true on the empty-to-non-empty transition only; never overrides a deliberate user-off state once classes are already chosen). Same gate now also drives a new feature on the Calendar tab's Weekly Overview: each day card lists the student's enrolled classes alongside the events that already render. Layout: events first as bordered cards, classes follow as a compact secondary list with a thin Fog left border so they read as a quieter tier than the events. Schedule tab's Mon–Fri Class Schedule is intentionally untouched — that's an unfiltered browseable grid of all program classes. **Holiday suppression:** on any day with a calendar event of `type: "holiday"`, classes are suppressed entirely on both Today and Weekly Overview, even when the student has personalized. **Holiday card on Today:** new visual element rendered above the activity card on a feriado, in a parchment treatment (`#FCE4EC` bg, `#C62828` accent stripe) with a bilingual "Feriado / Holiday" DM Mono label, the event title in italic EB Garamond, and the event description in Roboto; the holiday event itself is filtered out of the activity card's items list to avoid double-rendering, and the "¡Día libre!" empty state is suppressed when a holiday is present (the holiday card serves as context). **API change:** `getTodayItems()` return shape changed from a plain `[items]` array to `{ items, holidayEvent }`; the only caller was `<TodayView>` and was updated. `<WeeklyOverviewView>` signature gains a `profile` prop, passed through from the Calendar tab parent (`ScheduleView` / `CalendarView`). No sheet schema changes — the gate uses the existing `holiday` event type already in `EVENT_STYLES`; `CACHE_VERSION` stays at 3 |
| 2026-04-26 | **Weekly Overview cleanup.** Removed the `↓ TODAY` scroll-to-today pill that sat above the day cards on the current week, since the dedicated Today tab (default-on-open, leftmost) is now the canonical entry point for today-of-day context. The visual highlighting of today's day card stays intact (Ice-tinted background, BAP Blue border, Pep Blue date circle, inline "TODAY" badge next to the weekday name) — that's orientation, not navigation. The matching `todayRef`, `todayInView` flag, and `scrollToToday` handler in `<WeeklyOverviewView>` were dropped along with the button. The TODAY pill in Schedule → Class Schedule (which scrolls to today's row within the Mon–Fri grid of classes) is intentionally untouched; that's a different navigation affordance for a class-only view. No sheet schema changes; `CACHE_VERSION` stays at 3 |
| 2026-04-26 | **Today tab tile cleanup, Local pill reorg, and announcement redesign.** Weather tile now shows current temperature in Fahrenheit as the headline; today's high/low (also Fahrenheit) renders on a small DM Mono line below as `↑ 78°  ↓ 65°`; bilingual dress hint kept underneath. Open-Meteo call extended with `daily=temperature_2m_max,temperature_2m_min`. Underlying values stay in Celsius so the dress-hint thresholds keep working; new pure helper `cToF(c)` converts at display time. Dólar tile simplified: Blue `venta` is now the sole headline (`venta · compra` line removed); MEP renders underneath in DM Mono (`MEP $1.220`). `fetchDolarBlue()` renamed to `fetchDolar()` and extended to pull Blue (`/v1/dolares/blue`) and MEP (`/v1/dolares/bolsa`) in parallel via `Promise.allSettled`, so a failed MEP call still leaves Blue on screen. Today-cache shape gained `tempMax`, `tempMin`, and `mep` fields; old cached entries missing those fields render gracefully and self-refresh on the existing 30-minute TTL, so no key bump was needed. Local tab pills reorganized into two fixed flex rows: This Week + Explore BA on top, Healthcare + Churches + Apps below; horizontal scroll behavior removed so all five pills are visible at once on a phone. **Announcement banner redesigned and made non-dismissible:** the × button is removed (announcements now auto-clear on `end_date`, and the program office controls the lifecycle entirely from the sheet); two new inline SVG glyphs replace the old emoji icon, `<MegaphoneIcon>` for info and `<AlertIcon>` for urgent; the bilingual DM Mono label reads "Aviso / Notice" or "Importante / Important"; a soft accent gradient stripe replaces the old hard left border; an italic Spanish "Hasta el viernes" / "Hasta el 4 de mayo" gloss in EB Garamond appears at the bottom when the announcement runs ≤21 days so students know when it'll go away on its own; a "Más info →" CTA pill in the accent color replaces the previous tiny arrow link. New helper: `formatAnnouncementThrough(endDateStr)`. New CSS class `.bap-pulse-dot-orange` plus a parallel `@keyframes bap-pulse-orange` so the urgent banner's pulsing halo is Pep Orange rather than the synced-status mint green; both honor `prefers-reduced-motion`. Profile field `dismissedAnnouncements` kept in the schema for backwards compat with stored profiles but no longer read or written; `hashAnnouncement()` and the `dismissAnnouncement` App-level callback removed; the `icon` column on the Announcements sheet is no longer read (type-driven glyph replaces it). No sheet schema changes; `CACHE_VERSION` stays at 3 |
| 2026-04-25 | **Service category added to Events.** Tenth category `service` (Spanish: "Servicio") captures opportunities to volunteer, do service learning, and give back to the community. New `<HandsHeartIcon>` glyph (cupped hands cradling a heart) in BAP Blue (`#64B5F6`, previously unused in events). `EVENT_CATEGORIES` extended; sample service event added to `DEFAULT_DATA`. No `CACHE_VERSION` bump because the change is purely additive in value space — the events shape is unchanged |
| 2026-04-25 | **Events / "This Week in BA" shipped.** New optional `Events` Google Sheet tab with 11 columns (`title`, `category`, `description`, `start_date` required; `end_date`, `time`, `venue`, `neighborhood`, `address`, `link`, `cost` optional). Nine categories: music, theater, film, exhibit, dance, festival, food, talk, other; each with a hex color and dedicated mini-icon. New "This Week" sub-tab is now the FIRST sub-tab under Local (before Healthcare, Churches, Apps, Explore BA), and is the default sub-tab whenever at least one event is upcoming this week (falls back to Healthcare otherwise). Events split into "This week / Esta semana" (today through +7d) and "Coming up / Próximamente" groups; filter pills above the list narrow by category when 2+ are present in the upcoming pool; "Nothing curated yet" empty state when nothing is upcoming. Eight new mini-icons added: `<MusicNoteIcon>`, `<TheaterMaskIcon>`, `<FilmReelIcon>`, `<PictureFrameIcon>`, `<SparkleIcon>`, `<ForkPlateIcon>`, `<MicrophoneIcon>`, `<PinIcon>`. Existing `<TangoShoeIcon>` extended with a `color` prop and now goes live for the dance category. Today tab gets an "Esta semana / This Week in BA" tile sitting between today's activity card and the rotating tip; renders only when at least one event is upcoming in the next 7 days, shows the next 1-2 events with category icon and date, and taps through to Local > This Week (component: `<EventsTodayTile>`). New components: `<EventsView>`, `<EventCard>`, `<EventsTodayTile>`. New helpers: `EVENT_CATEGORIES`, `getEventCategory()`, `filterUpcomingEvents()`, `sortEventsChronological()`, `getThisWeekEvents()`, `eventDateLabel()`. Past events auto-hide; multi-day runs reuse the existing `dateRangeLabel()`. `CACHE_VERSION` bumped 2 → 3 because the data shape now includes `events` |
| 2026-04-25 | **Per-student profile shipped.** New `bap-profile` localStorage entry stores first name, enrolled course codes, a `filterEnabled` toggle, and persisted announcement dismissals. Lives at its own key separate from `bap-app-cache` so it survives `CACHE_VERSION` bumps. New header gear icon (top-right of the gradient header) opens a full-screen `<ProfileModal>` with name field, "Show only my classes" toggle, and a course checklist generated from `data.classes`. When the filter is active, an inline pill at the top of the Schedule sub-tabs reads "My classes only — Showing N of M. Tap to change." and reopens the modal on tap. The Today greeting personalizes to "Buen día, María" when a name is set. Today's Activity card and the Schedule tab's Class Schedule + Courses sub-tabs filter to enrolled courses when the toggle is on; Weekly Overview is unaffected because it shows calendar events. Announcement dismissals are now persisted via a stable `djb2` hash of the message text instead of a per-session in-memory flag. New constants: `PROFILE_KEY`, `PROFILE_VERSION`, `EMPTY_PROFILE`. New helpers: `loadProfile()`, `saveProfile()`, `hashAnnouncement()`, `shouldFilterClasses()`, `filterClassesByProfile()`. New components: `<GearIcon>`, `<ProfileModal>`. `getTodayItems()` now takes an optional `profile` argument and applies the filter at the source. `ClassScheduleView` and `ScheduleView` accept `profile` props; `TodayView` accepts `profile` and `onDismissAnnouncement`. Roadmap item "persist announcement dismiss state" retired. No Google Sheet schema changes; `CACHE_VERSION` stays at 2 |
| 2026-04-25 | **Today dashboard shipped as a new default tab.** Six-tab nav (Today, Schedule, Calendar, Local, FAQ, Contacts); Today is the leftmost tab and the default on app open; Local color shifted from BAP Blue to Sky to make room for Today's BAP Blue identity. New `<TodayView>` component combines a time-of-day greeting strip (gradient shifts BAP Blue → Sky → Ocean → Pep Blue across the day, deep navy at night), a slow-rotating `<SunIcon>` during day hours that swaps to a new `<MoonIcon>` from 19:00 to 06:00, and a Spanish date in italic EB Garamond. Quick-stats row with two tiles: weather (Open-Meteo, no key, CORS-enabled) showing temperature, a state-driven `<WeatherIcon>` (six states keyed off WMO weather code with day/night variants), and a bilingual dress hint; plus dólar blue (dolarapi.com, no key) showing venta and compra. Both APIs cached locally under a new `bap-today-cache` localStorage entry with a 30-minute TTL via `loadTodayCache()` / `saveTodayCache()`. Active announcements moved from Weekly Overview to Today. Today's activity card shows classes and calendar events combined and sorted, with a live "Próximo en X min" countdown that auto-updates every minute via `setInterval`; past items dim to 0.55 opacity, the next item is bolded. Empty state replaces the activity card with a "¡Día libre!" treatment featuring a 48 px mate gourd with two animated steam wisps (`bap-steam` keyframe) and an "Explorar BA →" button that jumps to Local via a new `onJumpToTab` callback. Rotating tip card pulls from the Tips sheet (or `FALLBACK_TIPS`) with 7-second rotation and a 320 ms cross-fade. New helpers: `<TodayView>`, `<MoonIcon>`, `<WeatherIcon>`, `getGreeting()`, `getGreetingGradient()`, `getDressHint()`, `formatPesos()`, `formatCountdown()`, `getTodayItems()`, `fetchWeather()`, `fetchDolarBlue()`, `loadTodayCache()`, `saveTodayCache()`. New constants: `BA_LAT`, `BA_LON`, `TODAY_CACHE_KEY`, `TODAY_CACHE_TTL`. New CSS keyframes: `bap-sun-spin` (80 s linear infinite), `bap-steam` (3.5 s ease-in-out infinite). New `today` entry added to `TAB_TITLES` (though `<SectionTitle>` is suppressed on the Today view since the greeting strip is the page anchor). `<TodayHero>` removed from Weekly Overview; the entire daily-snapshot motif now lives on Today. All animations honor `prefers-reduced-motion`. No sheet schema changes; `CACHE_VERSION` stays at 2; weather/dólar use a separate localStorage entry that doesn't interact with the main cache |
| 2026-04-25 | Medium-tier personality moves shipped: `<TodayHero>` card pinned at the top of the Weekly Overview, surfacing today's classes and events with a "Próximo" pill for the next upcoming item; falls back to a "¡Día libre!" mate-gourd treatment on empty days. New `formatSpanishDate()` helper plus `SPANISH_WEEKDAYS`/`SPANISH_MONTHS` constants. Mini-illustration library expanded with `<SunIcon>`, `<ColectivoIcon>`, `<ObeliscoIcon>`, `<TangoShoeIcon>`, `<PalmIcon>`, `<RioWaveIcon>` alongside the existing `<MateGourdIcon>`; sun in use on the Today hero, colectivo and palm in use on the Apps section dividers. Header's faint circle decoration replaced with `<SouthernCrossDecoration>` (five BAP Blue dots in constellation pattern with faint connecting lines). Bottom nav rebuilt with per-tab color identity (Schedule = Pep Blue, Calendar = Ocean, Local = BAP Blue, FAQ = Mountain, Contacts = Pep Orange); active tab's icon and label adopt that color, the icon lifts 3 px (`.bap-nav-icon.lifted`), and a 44 × 4 px pill (`.bap-nav-pill`) slides between tabs via CSS transform with the active color. Pill positioning computed in a `useEffect` measuring buttons via a ref-keyed map and re-running on tab change and window resize. Apps view restructured: pattern-fill section header at top (new `.bap-dot-pattern` CSS class with two layered radial-gradients on Ice background), then apps grouped by transport (Navigation/Transportation/Transit) vs daily life (everything else) with `<SectionDivider>` glyphs (colectivo and palm) when no filter is active; flat list preserved when a category filter is selected. New helpers: `<TodayHero>`, `<SectionDivider>`, `<SouthernCrossDecoration>`, six new SVG icon components, `formatSpanishDate()`. New CSS classes: `.bap-dot-pattern`, `.bap-nav-pill`, `.bap-nav-icon`. All animations honor `prefers-reduced-motion: reduce`. No data-shape changes; `CACHE_VERSION` stays at 2 |
| 2026-04-25 | Personality moves added across the app's chrome: editorial section titles paired with a small Argentine-Spanish gloss (e.g., "Program Schedule" + "CRONOGRAMA") via new `<SectionTitle>` and `TAB_TITLES` constant; pulsing mint-green dot beside the "Synced" status pill (`.bap-pulse-dot` class, `@keyframes bap-pulse`); rotating BA tip card on the loading screen (`<LoadingScreen>` + new optional `Tips` sheet tab with `text` and `category` columns; `renderTip()` parses markdown-style `*italic*` segments inline); whimsical empty-day cards in the Weekly Overview ("¡Día libre!" with inline mate-gourd SVG via `<EmptyDay>` and `<MateGourdIcon>`); press-feedback scale animation on filter pills, bottom nav, FAQ accordion buttons, and class cards (`.bap-press` class). All animations honor `prefers-reduced-motion`. Single `<style id="bap-personality-styles">` block injected once via `useEffect`; no new dependencies. `CACHE_VERSION` bumped 1 → 2 to invalidate caches missing the new `tips` field |
| 2026-04-25 | Stale-while-revalidate localStorage cache added. App now renders cached data instantly on repeat opens and refreshes in the background; first paint goes from blocking-on-network to instant. New `CACHE_VERSION` constant in `App.jsx` (must be bumped whenever the fetched data shape changes). New status states: `refreshing` (cached data shown while fetching) and `cached` (fetch failed but cache available). New helpers `loadCache()` and `saveCache()`. `index.html` updated with preconnect hints to `docs.google.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, and the font stylesheet `<link>` moved into the head (the in-app `useEffect` injection remains as a safety net) |
| 2026-04-18 | Local sub-tab pill labels renamed: "Health Providers" → "Healthcare"; "Exploring BA" → "Explore BA". Internal sub-tab keys (`health`, `explore`) and all underlying data shapes unchanged |
| 2026-04-18 | Apps sub-tab added to Local view (sub-tab order: Health → Churches → Apps → Exploring BA). New optional `Apps` sheet tab with columns `name`, `category`, `description`, `ios_url`, `android_url`, `web_url`, `priority`. Apps sort essentials-first then alphabetically; essential apps get an Ice-blue card background and a Pep Orange dot beside the name. Cards render "📱 iOS" and/or "🤖 Android" buttons when store URLs are set, falling back to "🌐 Website" when only `web_url` is present. Seed list includes Google Maps, BA Cómo Llego, Uber, Cabify, DiDi, PedidosYa, Rappi, SUBE, Mercado Pago, Dólar Hoy, WhatsApp |
| 2026-04-18 | Policies tab renamed to FAQ throughout: sheet tab renamed `Policies` → `FAQ`, page title changed to "Frequently Asked Questions", bottom-nav label changed to "FAQ", internal key renamed `data.policies` → `data.faq`, component renamed `PoliciesView` → `FaqView`, icon key renamed `icons.policies` → `icons.faq` (document icon unchanged). Columns and accordion behavior unchanged |
| 2026-04-16 | Weekly Overview event sort fix: untimed events now appear first for each day (explicit behavior), and timed events sort chronologically by minutes-since-midnight rather than by string comparison (previously `9:00` sorted after `10:00` due to lexicographic ordering). New `toMinutes()` helper |
| 2026-04-16 | Weekly Overview: removed the one-week-ahead cap on forward navigation; weeks now scroll without limit in both directions |
| 2026-04-16 | `location_note` column added to Health, Churches, and Explore tabs for entries whose "location" isn't a physical address (telehealth, home-visit providers, reference IDs, rotating venues, city-wide attractions). Renders as plain italic gray text; no pin, no map link. New `LocationNote` helper. When a row has both `address` and `location_note`, the linked address appears first and the note below as unlinked context |
| 2026-04-16 | Project knowledge doc sweep to catch up with code drift: documented missing columns (`honorific`, `firstname`, `email` on Classes; `start_time`, `end_time`, `visibility` on Calendar; `insurance`, `category` on Health); added Explore, Contacts, and Resources tab sections; added `program` and `orientation` event types; corrected sub-tab name to "Exploring BA"; corrected status label to "Synced"; documented `parseDays()`, `isFacility()`, and filter-pill behavior |
| 2026-04-16 | Clickable addresses: new `AddressLink` helper renders every address in HealthView, ChurchesView, ExploreView, and the Office card of ContactsView as a 📍-prefixed link that opens Google Maps. No spreadsheet changes required; the `maps` column in Contacts is still honored where present and takes precedence over auto-generated URLs |
| 2026-04-12 | Classes tab color update: changed GE class accent from Ocean (`#0057B8`) to Sky (`#6CACE4`) for stronger contrast against UD Pep Blue (`#00205B`); Pep Orange (`#E35205`) for combined HUM 295/296. Sheet-side change only; `DEFAULT_DATA` placeholders unchanged |
| 2026-04-12 | Multi-day event support: `end_date` column in Calendar tab; `eventOverlaps()`, `dateRangeLabel()`, `countDays()` helpers; single-card display with date range and day count in both Semester Calendar and Weekly Overview |
| 2026-04-04 | Announcement banner: new `Announcements` Google Sheet tab; `AnnouncementBanner` component with info/urgent tiers; date-range filtering; dismiss functionality |
| 2026-04-03 | Logo fixes: replaced JPEG-disguised-as-PNG header logo with true transparent PNG; regenerated all PWA icons with Pep Blue background; added favicon support (`.ico`, 32px, 16px); changed policy link text to "View full details" |
