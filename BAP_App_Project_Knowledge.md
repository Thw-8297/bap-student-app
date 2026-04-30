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

The `type` field must be exactly one of: `milestone`, `academic`, `excursion`, `holiday`, `program`, `orientation`. Each type has a distinct color and icon in the app:

- **milestone**: Parchment-orange background, Pep Orange border, ★
- **academic**: Ice background, Ocean border, ◆
- **excursion**: Pale green background, forest green border, ▲
- **holiday**: Pale pink background, red border, ●
- **program**: Parchment background, Mountain border, ◇
- **orientation**: Ice background, Sky border, ⬟

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

A Google Apps Script Web App serves as a consolidated data endpoint: it reads every tab the app needs from the spreadsheet and returns one JSON blob, replacing the 15 parallel gviz CSV fetches the legacy path does. On cold loads this is the difference between one round trip and fifteen, and the response comes pre-parsed as JSON, so PapaParse drops out of the client critical path entirely. Expected speedup is 5–10x on slow connections.

**Deployed URL location.** Stored in `App.jsx` as the `APPS_SCRIPT_URL` constant in the CONFIGURATION section. Leave empty string to force the legacy per-tab path.

**Source.** The Apps Script lives bound to the spreadsheet (Extensions > Apps Script from the sheet's menu). The single source file is `Code.gs`. See the Code.gs file in project knowledge for the canonical source.

**Caching.** The script caches its JSON response for 1 hour via `CacheService.getScriptCache()` under the key `bap_app_data_v1`. Sheet edits therefore take up to 1 hour to appear in the app on the consolidated path. Append `?bust=1` to the Web App URL when manually verifying an edit; that query param skips the cache for one request and re-reads the spreadsheet. As of 2026-04-27, the Today pull-to-refresh gesture also threads `?bust=1` through `fetchAllData({ bust: true })`, so the Director can pull down on Today after a sheet edit and see fresh data immediately, rather than having to hit the URL with `?bust=1` in a separate browser tab. The cache key is intentionally versioned (`_v1`); bump the suffix in `Code.gs` if the script's output shape ever changes incompatibly.

**Manual cache reset.** Run the `clearCache()` function from the Apps Script editor to drop the cached value without bumping the key.

**Deploy procedure (first-time):**

1. Open the spreadsheet, then Extensions > Apps Script.
2. Paste in the contents of `Code.gs`. Save.
3. Run `testReadAllTabs()` once from the editor to authorize the spreadsheet read scope and confirm tab counts in the execution log.
4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
5. Copy the deployed URL into `App.jsx` as `APPS_SCRIPT_URL`. Commit, push, Vercel rebuilds.

**Re-deploy after script edits.** Apps Script Web Apps freeze at the version they were deployed at. Editing the script doesn't affect production until a new deployment is created (Deploy > Manage deployments > pencil icon > Version: New version). The URL stays the same across re-deployments of an existing deployment slot, which is what you want.

**Failure mode.** When the consolidated path fails for any reason (script down, deploy expired, non-JSON response, network error), `App.jsx` logs a `console.warn` and silently falls back to the per-tab gviz path. Students see no visible difference; the app just takes a beat longer that one open. This is intentional: the script is an optimization, not a dependency.

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

**What's customizable:**

- **First name.** When set, the Today greeting reads "Buen día, María" instead of just "Buen día." Falls back to the bare greeting when blank.
- **Enrolled courses.** A multi-select list of every course currently in the Classes tab. Each row shows the course code and title with the same color accent used elsewhere in the app.
- **Show only my classes (toggle).** When on, the Today tab's "Today's Activity" card and the Schedule tab's Class Schedule and Courses sub-tabs filter to only the ticked courses. The Weekly Overview is unaffected because it shows calendar events, not classes; calendar events are never filtered by profile.
- **Persistent announcement dismissals.** The × on an announcement now sticks across sessions instead of returning every time the app reloads. Tracked by a stable `djb2` hash of the message text, so editing an announcement in the sheet effectively resurfaces it as new.

**Access:** A small gear icon in the top-right of the header opens the Settings modal. The modal is full-screen within the 480px column, with name field, toggle, course checklist, and a "Reset profile" button. Changes save immediately to localStorage on every interaction; the "Done" button just closes the modal.

**Filter affordance:** When the filter is active, an inline pill at the top of the Schedule sub-tabs (Class Schedule and Courses) reads "My classes only — Showing N of M. Tap to change." Tapping it reopens the Settings modal. The pill does not appear on the Weekly Overview (calendar-only) or on the Today tab (where the filter is visible implicitly through the activity card).

**Auto-enable on first selection:** As of 2026-04-26, ticking the first class in the profile editor's course checklist automatically flips `filterEnabled` from false to true. This means a student doesn't have to remember to also toggle "Show only my classes" — selecting their courses is intent enough. Subsequent toggling of `filterEnabled` (off and back on) respects the user's deliberate choice; the auto-enable only fires on the empty-to-non-empty transition.

**Class display gating on Today and Weekly Overview:** Also as of 2026-04-26, classes only render on the Today tab activity card and inside the Calendar tab's Weekly Overview day cards when `shouldFilterClasses(profile)` is true. Without personalization, the Today activity card shows only events (or the "¡Día libre!" empty state); Weekly Overview day cards show only events. The Schedule tab's Mon–Fri Class Schedule grid is intentionally exempt — it's the unfiltered browseable view of the program's classes, and a student should be able to see all classes there regardless of personalization.

**Holiday-aware suppression:** On any day with a calendar event of `type: "holiday"`, classes are suppressed on both Today and Weekly Overview, even when the student has personalized. On Today this triggers a small holiday card above the activity card (parchment treatment, `#C62828` accent stripe, bilingual "Feriado / Holiday" DM Mono label, the event title in italic EB Garamond, and the event description in Roboto); the activity card's "¡Día libre!" empty state is suppressed because the holiday card already explains the open day.

**Storage shape:**

```json
{
  "version": 1,
  "name": "",
  "enrolledClasses": ["SPAN 350", "HUM 295"],
  "filterEnabled": false,
  "dismissedAnnouncements": []
}
```

Stored under the localStorage key `bap-profile`, separate from `bap-app-cache`. This separation is intentional: bumping `CACHE_VERSION` (which happens when the Google Sheet data shape changes) wipes the data cache but leaves the profile intact, so students don't lose their settings every time the schema evolves.

The `dismissedAnnouncements` array is a legacy field kept in the schema for backwards compatibility with previously stored profiles. As of the 2026-04-26 announcement-banner redesign, announcements are no longer user-dismissible (the program office controls lifecycle via `end_date`), so this field is neither read nor written anymore. It will simply remain at `[]` for new profiles and stay frozen at whatever value existing profiles had.

**PROFILE_VERSION:**

The constant `PROFILE_VERSION` in `App.jsx` is the profile-shape version. Bump it only when the profile shape itself changes (new field, renamed field, removed field). On next open, the version mismatch causes `loadProfile()` to return `EMPTY_PROFILE` and the next save writes a fresh profile at the new version. Field additions that have safe defaults (`""`, `[]`, `false`) generally don't need a bump because the spread-with-defaults in `loadProfile()` backfills missing keys.

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

**Logo:** The BAP circular logo is embedded in the app header as a base64-encoded PNG with a transparent background and circular alpha mask, sized at 160×160 pixels (2× retina for the 80px CSS display). The base64 string is approximately 63KB. PWA home screen icons use a separate version with a solid Pep Blue (`#00205B`) background.

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

- Weekly Overview: scrollable week-by-week view of the semester. Each day card shows that day's calendar events (filtered via `eventOverlaps()`) sorted with untimed-first then chronologically. As of 2026-04-26, when the student has personalized their enrollment (and the personalization filter is on), each day card also lists the student's classes for that day-of-week, rendered as a compact secondary list beneath the events with a thin Fog left border to set them apart visually from the bordered event cards. Classes are suppressed on any day with a holiday event. Empty days render the `<EmptyDay>` mate-gourd card. Forward and back navigation is uncapped. Today's day card is visually highlighted (Ice-tinted background, BAP Blue border, Pep Blue date circle, inline "TODAY" badge next to the weekday name) so students can spot it while scanning the week, but the previous "↓ TODAY" scroll-to-today button was removed on 2026-04-26 — the dedicated Today tab is now the canonical entry point for today-of-day context. The `<TodayHero>` card that previously anchored this view was removed when the Today tab landed.
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
- **Tile dim/offline/stale states** — both Today tiles (weather and dólar) accept a `dimmed` parameter on `statTile()` that lowers opacity to 55 % and switches the background from white to Ice. Three triggers feed `dimmed`: `isRefreshing` (during pull-to-refresh), `!isOnline` (tracked via `navigator.onLine` and the `online`/`offline` events on `window`), and — for the weather tile only — `isWeatherStale(weather)` or `weatherRefetching`. While `dimmed` is true, taps that would normally open the sheet are suppressed. The exception is the stale-weather case: `dimmed` is true but `onClick` is wired to `refetchWeatherForStaleTap`, so the tile reads as "waiting" rather than "interactive" but still does something useful when tapped. `isOnline` is initialized from `navigator.onLine !== false` (lenient default for environments where the property is unavailable) and updated via `useEffect`-attached `online` / `offline` listeners that clean up on unmount.
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

- **Push notifications** for calendar events.
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
