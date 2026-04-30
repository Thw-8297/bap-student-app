# BAP App — Spreadsheet Operations Guide

This is the operational handbook for the Google Sheet that powers the Buenos Aires Program student app. The sheet is the single source of truth for every piece of content the app shows; the app code itself only reads and renders. Updating the sheet is how you change what students see.

This document covers two things:

1. **Pre-cohort checklist** — what to update at the start of each new student program.
2. **Tab-by-tab reference** — what each tab does, what each column means, and how it surfaces in the app.

Anyone with edit access to the sheet can use this guide; no code knowledge is required.

> **Living document.** This guide is updated alongside any change to the sheet schema, tab list, or parsing behavior. The `Last updated` line at the bottom of the file shows when it was most recently touched. Schema changes should include a corresponding edit here in the same pass.

---

## How the sheet and the app talk to each other

The app reads the sheet's contents every time a student opens it (via a small Apps Script Web App that returns all tabs as one JSON blob), caches the response on the device, and rerenders. There is no "publish" button; saving a cell is the publish.

**Edits take up to 1 hour to appear in the app.** The Apps Script caches its response for an hour to avoid re-reading the spreadsheet on every student open. To force fresh content immediately after an important edit, append `?bust=1` to the Apps Script Web App URL once in your browser; the next student fetch will pick up the new data. The Apps Script URL is stored in `App.jsx`; ask the developer for the current value if you need it. Routine edits don't need this; an hour is fine.

If the Apps Script ever goes down or returns garbled data, the app silently falls back to fetching each tab directly from the published sheet and edits then propagate within seconds. Students see no visible difference; the app just takes a beat longer to load that one open.

Three things to internalize:

- **The first row of every tab is the header.** Column names there must match exactly (lowercase, snake_case where used). Renaming a header silently breaks the column.
- **Empty cells are fine.** Optional columns can be left blank and the app handles that gracefully. Required columns must be populated or the row is dropped.
- **Some tabs are required; others are optional.** Required tabs must exist (with at least the header row) or the app's full data fetch fails. Optional tabs can be missing entirely with no consequence.

---

## Pre-cohort checklist

When a new cohort is about to start, work through these in order. The first group is non-negotiable; the rest are progressively less critical.

### Tier 1 — must update before students arrive

| Tab | What to do | Why |
|-----|------------|-----|
| **Settings** | Update the `semester` value (e.g., "Summer 2026" → "Fall 2026"). Set `finals_window_start` and `finals_window_end` to the program-wide finals window for the new term (a single day for Summer; 2-3 days for Fall and Spring). | The semester label appears in the app header and elsewhere as program identity. The finals window drives when the Finals UI surfaces on Today and Schedule (14 days ahead) and the "TBD · {window}" copy on classes whose individual `final_date` hasn't been assigned yet. |
| **Classes** | Replace the entire course catalog with the new cohort's offerings. Update `code`, `title`, `professor`, `honorific`, `firstname`, `days`, `time`, `location`, `email`, plus `start_date` and `end_date` per course. Leave `final_date` and `final_time` blank until the registrar publishes the exam schedule, then fill them in row-by-row as they're assigned. | Powers the Schedule tab's Class Schedule and Courses views; also drives the personalization filter (students tick the courses they're enrolled in). `start_date` and `end_date` keep the Today and Weekly Overview views from showing classes outside the regular meeting window. |
| **Calendar** | Replace all program-specific events with the new semester's dates: arrival, orientation, classes-begin, study tours, excursions, milestones, classes-end, departure. | Powers the Calendar tab and the Schedule tab's Weekly Overview. Old dates are misleading. |
| **Contacts** | Verify program director, assistant director, on-call phone, and any staff-turnover entries. Update `whatsapp` numbers in particular. | The Contacts tab is the emergency reference. Out-of-date numbers are dangerous. |
| **Birthdays** | Clear the previous cohort's student rows and add the new cohort. Only include students who've affirmatively opted in. Staff and faculty rows can typically remain. | The Today tab birthday card matches by MM-DD; old students from a past cohort would still appear if not removed. |

### Tier 2 — should update / verify each cohort

| Tab | What to do | Why |
|-----|------------|-----|
| **Health** | Verify each provider is still in network and that addresses, phones, and notes are current. Add any new GeoBlue providers; remove any who've moved or retired. | Healthcare info is high-stakes. A bad address in an emergency is worse than no address. |
| **Holidays** | If switching to a new calendar year, replace with that year's feriados. Argentine national holidays change yearly because of trasladable dates and decreed días no laborables turísticos. | Drives class-cancellation logic and the Today holiday card. |
| **FAQ** | Skim for cohort-specific outdated info (specific dates, names, deprecated policies). | Cohort-to-cohort details (housing assignments, specific orientation logistics) drift fast. |
| **Announcements** | Clear all rows from the previous cohort; the start-date filter should already hide them, but it's cleanest to delete. | Stale program reminders shouldn't linger. |

### Tier 3 — review periodically (not necessarily per cohort)

| Tab | When to update | Why |
|-----|----------------|-----|
| **Churches** | Every year or two, or when a community recommends a change. | Service times shift; new English-friendly congregations sometimes open. |
| **Apps** | When a major app shutters (rare) or a notably better alternative emerges (rare). | The app catalog is fairly stable year to year. |
| **Tips** | Cumulative — keep adding when good ones occur to you. Don't need to clear. | Tips rotate randomly; the bigger the pool, the better the variety. |
| **Explore** | Every 1-2 years, or when a recommended place closes (BA restaurants in particular). | Neighborhoods and major sights are durable; specific venues are fragile. |
| **Events** | Continuously, but doesn't require pre-cohort reset. Old events filter out automatically by date. | Local events tile shows what's happening this week; no harm in leaving old rows. |
| **Resources** | Rarely. | Insurance numbers and university hotlines change infrequently. |

### Tier 4 — leave alone unless something specific changes

The **Settings** tab beyond the `semester` key (none currently). The data shapes themselves (column names, sheet tab names) — these are tied to the app code; renaming requires a coordinated code change.

---

## Mid-program operations

These are what you'll touch *during* a cohort, not just at startup.

- **Announcements.** Add a row whenever a temporary alert needs to surface (Add/Drop deadline, weather event, schedule change, ticket pickup window). Set `start_date` and `end_date` to bracket when the banner should appear. Mark `type=urgent` for action-required items, `info` (or blank) for reminders. Once `end_date` passes, the banner auto-disappears — no need to delete the row.
- **Calendar.** Add new excursions, study tours, or program events as they're scheduled. Edit existing rows for time/location changes.
- **Events.** Whenever a notable local happening comes across your radar (festivals, concerts, exhibits), add a row. Students see these on the Today tab's "This week" tile and the Local tab's "This Week" sub-tab.
- **Tips.** When a cultural fact or porteño phrase comes up in conversation that you wish you'd told students earlier, add it. The pool grows over time.
- **Finals.** As the registrar publishes the final-exam schedule, fill in `final_date` and `final_time` on each row of the Classes tab. The TBD pills update to concrete dates the next time the app refreshes. If finals get reshuffled, just update the cells; the FinalsCard and Today tile re-render automatically. To force-refresh ahead of the 1-hour cache window for a high-stakes update, hit the Apps Script URL with `?bust=1` once.

---

## Tab-by-tab reference

Tabs marked **(required)** must exist. Tabs marked **(optional)** can be missing without breaking anything.

### Settings *(required)*

A vertical key-value table.

| Column | Purpose |
|--------|---------|
| `Key` | The setting's name. |
| `Value` | The setting's value. |

**Recognized keys (currently):**

- `semester` — Display label for the current term, e.g., "Summer 2026". Shown on the app header.
- `last_updated` — Optional. Date of the last meaningful sheet edit; informational only.
- `finals_window_start` — YYYY-MM-DD. First day of the program-wide final-exam window. Used to gate when the Finals UI appears (the FinalsCard on the Schedule tab and the Finals coming up tile on Today both surface 14 days before this date) and to populate the "TBD · {window}" copy on classes whose individual `final_date` hasn't been assigned yet. Leave blank to disable the finals UI entirely.
- `finals_window_end` — YYYY-MM-DD. Last day of the program-wide final-exam window. For Summer terms, this is typically the same date as `finals_window_start` (a single day). For Fall and Spring, it usually spans 2-3 days.

Adding new keys here doesn't do anything until the app code is updated to read them. The structure is forward-compatible but not auto-magical.

### Classes *(required)*

The course catalog for the current semester.

| Column | Required | Notes |
|--------|----------|-------|
| `code` | Yes | Course code (e.g., "SPAN 350"). Also serves as the unique ID for the personalization filter. |
| `title` | Yes | Full course title. |
| `professor` | No | Last name. |
| `honorific` | No | Dr., Prof., etc. |
| `firstname` | No | First name. |
| `days` | Yes | Days the course meets. Accepts comma-separated three-letter codes ("Mon, Wed, Fri") or a single string of letter codes ("MWF"). |
| `time` | Yes | Time block (e.g., "9:00–10:30"). For courses with different times on different days, format as "Mon 9:00–10:30; Wed 11:00–12:30". |
| `location` | Yes | Classroom or building. |
| `color` | No | Hex color override for the course's accent. Default is BAP Blue. |
| `email` | No | Professor's email; rendered as a tap-to-mail link. |
| `start_date` | No | YYYY-MM-DD. First day the course meets. Outside `[start_date, end_date]` the course is hidden from the Today tab's activity card and the Schedule tab's Weekly Overview. The Class Schedule and Courses sub-views always show every course in the catalog regardless. Blank means "no start-side gate." |
| `end_date` | No | YYYY-MM-DD. Last day the course meets. Same behavior as `start_date`; blank means "no end-side gate." Set this to the last regular session, not the final exam date. |
| `final_date` | No | YYYY-MM-DD. The day of this course's final exam. Once populated, the FinalsCard on the Schedule tab and the Finals coming up tile on Today switch from "TBD" to a concrete date for this row. On the day itself, the regular class meeting on Today and Weekly Overview is replaced by a "Final" entry with a Pep Orange pill. Leave blank until the registrar publishes the schedule. |
| `final_time` | No | Free-form time string (e.g., "9:00–11:00" or "14:00"). Displayed alongside `final_date`. Leave blank until the schedule is published. |

**Where it shows:**

- Schedule tab → Class Schedule (Mon–Fri grid). Always shows the full catalog.
- Schedule tab → Courses (alphabetical list). Always shows the full catalog.
- Schedule tab → Weekly Overview (when student has personalized; suppressed on holidays that cancel classes; honors `start_date` / `end_date`; on `final_date` the regular meeting is replaced by a Final card).
- Schedule tab → FinalsCard (top of all three sub-tabs, when student has personalized AND we're in the finals UI window).
- Today tab activity card (when student has personalized; suppressed on holidays that cancel classes; honors `start_date` / `end_date`; on `final_date` the regular meeting is replaced by a Final entry).
- Today tab → Finals coming up tile (when student has personalized AND we're in the finals UI window).
- Profile editor → "Show only my classes" course checklist.

**Filling in finals — the practical flow.** When the term starts, leave `final_date` and `final_time` blank on every class row. The Finals UI will start appearing on Today and Schedule 14 days before `finals_window_start` with a "TBD · {finals window}" pill on every course. As the registrar assigns finals, fill in the `final_date` and `final_time` cells one row at a time. The TBD pill becomes a concrete date the next time the app refreshes (or sooner with `?bust=1`). Rows you haven't assigned yet keep showing TBD; rows you have assigned show the date.

### Calendar *(required)*

Semester-wide events: arrival, orientation, classes-begin, study tours, excursions, milestones, classes-end, departure.

| Column | Required | Notes |
|--------|----------|-------|
| `date` | Yes | Start date in YYYY-MM-DD format. |
| `end_date` | No | End date (for multi-day events). Leave blank for single-day. |
| `title` | Yes | Event name. |
| `type` | No | One of: `milestone`, `academic`, `excursion`, `holiday`, `program`, `orientation`. Defaults to `academic`. Each gets a distinct color. |
| `description` | No | One or two sentences of context. Renders inside the event card. |
| `start_time` | No | Time of day (e.g., "10:00"). Untimed events render at the top of a day. |
| `end_time` | No | End time. |
| `visibility` | No | `week`, `semester`, or `both` (default). Controls which views the event appears in. |

**The `type: "holiday"` row is now legacy** — it still works as a fallback, but the Holidays tab is the preferred place for feriados. The Calendar should no longer carry holiday-typed rows once the Holidays tab is populated.

**Where it shows:**

- Calendar tab → Semester (filterable list grouped by month)
- Schedule tab → Weekly Overview (day cards)
- Today tab activity card (events overlapping today)

### Health *(required)*

Healthcare providers, hospitals, pharmacies, and dental contacts.

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Provider or facility name. |
| `type` | No | "Doctor", "Hospital", "Dentist", "Pharmacy", etc. Renders as a small badge. |
| `address` | No | Street address. Rendered as a tap-to-Maps link. |
| `location_note` | No | Neighborhood / cross street / building note. |
| `phone` | No | Tap-to-call. |
| `notes` | No | Insurance acceptance, language notes, hours. |
| `link` | No | Website. |
| `insurance` | No | Set to `bcbs` to display the GeoBlue/BCBS badge next to the name. |
| `category` | No | Free-form. Reserved for future filtering. |

**Where it shows:** Local tab → Healthcare.

### Churches *(required)*

Recommended congregations, mostly with English services.

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Church name. |
| `denomination` | No | "Catholic", "Non-denom.", "Anglican", etc. |
| `address` | No | Tap-to-Maps. |
| `location_note` | No | Travel time, neighborhood, transit notes. |
| `service` | No | Service times and language(s). |
| `notes` | No | Anything else worth knowing. |
| `link` | No | Website or Instagram. |

**Where it shows:** Local tab → Churches.

### FAQ *(required)*

Questions students ask repeatedly.

| Column | Required | Notes |
|--------|----------|-------|
| `title` | Yes | The question (e.g., "How do I activate my SUBE card?"). |
| `content` | No | The answer. Multi-paragraph allowed; line breaks are preserved. |
| `link` | No | External resource. |

**Where it shows:** FAQ tab.

### Contacts *(required)*

Program staff, emergency contacts, and addresses.

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Person, office, or facility name. |
| `role` | No | "Director", "Assistant Director", "On-call", etc. |
| `phone` | No | Tap-to-call. |
| `whatsapp` | No | Tap-to-WhatsApp. Use international format including country code. |
| `email` | No | Tap-to-mail. |
| `address` | No | Street address. |
| `maps` | No | Direct Google Maps URL override (otherwise `address` is used). |
| `type` | No | `staff`, `emergency`, `facility`, etc. Defaults to `staff`. |

**Where it shows:** Contacts tab.

### Explore *(required)*

Curated Buenos Aires places, neighborhoods, and experiences.

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Place name. |
| `type` | No | "Neighborhood", "Museum", "Park", "Restaurant", etc. |
| `description` | No | One or two sentences of why this matters. |
| `address` | No | Tap-to-Maps. |
| `location_note` | No | Travel time or neighborhood. |
| `hours` | No | Opening hours. |
| `link` | No | Website. |

**Where it shows:** Local tab → Explore BA.

### Resources *(optional)*

Insurance and university hotlines.

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Resource name (e.g., "GeoBlue / BCBS"). |
| `detail` | No | One-line description. |
| `phone` | No | Tap-to-call. |
| `url` | No | Website. |

### Announcements *(optional)*

Temporary alerts that surface on the Today tab.

| Column | Required | Notes |
|--------|----------|-------|
| `message` | Yes | The alert text. One or two sentences. |
| `type` | No | `info` (default) or `urgent`. Urgent gets red treatment + pulsing dot. |
| `start_date` | Yes | YYYY-MM-DD. The banner appears starting this date. |
| `end_date` | Yes | YYYY-MM-DD. The banner disappears after this date (auto-cleared). |
| `link` | No | "Más info →" CTA URL. |

Announcements are not user-dismissible. The program office controls the banner lifecycle entirely via `start_date` / `end_date`. No need to delete rows after they expire.

### Apps *(optional)*

Recommended mobile apps grouped on the Local tab.

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | App name. |
| `category` | No | Determines grouping. "Transit", "Transportation", "Navigation" group as transport; everything else is daily life. |
| `description` | No | One sentence. |
| `ios_url` | No | App Store URL. |
| `android_url` | No | Google Play URL. |
| `web_url` | No | Browser fallback. |
| `priority` | No | "essential" or blank. Essentials surface first. |

### Tips *(optional)*

Cultural facts, Spanish phrases, and porteño insights that rotate on the Today tab and loading screen.

| Column | Required | Notes |
|--------|----------|-------|
| `text` | Yes | The tip itself. Wrap Spanish words in `*asterisks*` to italicize them in EB Garamond at render time. |
| `category` | No | "phrases", "city", "food", "transit", "culture". Reserved for future filtering. |

Tips rotate randomly: each session opens at a random tip and walks the list in order from there, looping back to the top. So adding tips compounds — never need to clear.

### Events *(optional)*

Local happenings (festivals, concerts, exhibits, services). Distinct from the Calendar tab, which is program-specific.

| Column | Required | Notes |
|--------|----------|-------|
| `title` | Yes | Event name. |
| `category` | No | One of: `music`, `theater`, `film`, `exhibit`, `dance`, `festival`, `food`, `talk`, `service`, `other`. |
| `description` | No | One or two sentences. |
| `start_date` | Yes | YYYY-MM-DD. |
| `end_date` | No | YYYY-MM-DD. Leave blank for single-day events. |
| `time` | No | "20:00" or "8:00 PM". |
| `venue` | No | Venue name. |
| `neighborhood` | No | "Palermo", "San Telmo", etc. |
| `address` | No | Tap-to-Maps. |
| `link` | No | Tickets / official page. |
| `cost` | No | "Free", "$8.000 ARS", etc. |

**Where it shows:** Today tab → "Esta semana" tile (this week's events). Local tab → "This Week" sub-tab.

### Holidays *(optional, but strongly recommended)*

Argentine feriados and cultural observances.

| Column | Required | Notes |
|--------|----------|-------|
| `date` | Yes | YYYY-MM-DD. |
| `name_es` | Yes | Spanish name (or fall back to `name_en`). |
| `name_en` | Yes | English name (or fall back to `name_es`). |
| `cancels_classes` | Yes | `TRUE` for feriados that suppress classes; `FALSE` for cultural observances that don't. |
| `observance_type` | No | `national`, `religious`, `cultural`, `provincial`. Reserved for future filtering. |
| `description_es` | No | Spanish blurb (cultural meaning, history, what porteños do). 2-3 sentences. |
| `description_en` | No | English blurb. 2-3 sentences. |

**Where it shows:**

- Today tab → Holiday card (above the activity card)
- Schedule tab → Weekly Overview (small inline banner inside the day card)

**Class suppression behavior:** On any day where a row has `cancels_classes=TRUE`, classes don't render on Today or Weekly Overview, even if the student has personalized. Cultural observances (`cancels_classes=FALSE`) display the card without affecting class display.

### Birthdays *(optional)*

Student, staff, and faculty birthdays.

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Display name. |
| `date` | Yes | Accepted formats: `MM-DD` (`05-12`), `M-D` (`5-12`), or full `YYYY-MM-DD` (year stripped). |
| `role` | No | `student`, `staff`, `faculty`. Captured but not displayed currently. |

**Privacy guidance:** Only add students who've affirmatively opted in. The card displays publicly. A simple consent checkbox during orientation works well. The app *never* displays or computes age — year of birth is stripped during parsing.

**Feb 29 caveat:** In non-leap years, Feb 29 birthdays won't match. Manually adjust to `02-28` or `03-01` for that calendar year if needed.

**Where it shows:** Today tab → Birthday card (between announcement banner and holiday card).

---

## Common pitfalls

A short list of things that have tripped people up.

- **Renamed columns.** If you rename a header from `start_date` to `startDate`, the app silently drops the column. Always preserve the exact header names listed above.
- **Stray spaces in headers.** "code " and "code" are different columns. Trim trailing whitespace.
- **Date format drift.** Dates must be `YYYY-MM-DD` for everything *except* Birthdays (which also accepts `MM-DD`). Some Google Sheets imports auto-format dates to "1/15/2026" — explicitly set the cell format to plain text or YYYY-MM-DD.
- **Multi-day events without `end_date`.** A single-day event leaves `end_date` blank; a multi-day event needs both dates.
- **`visibility` typos.** "weekly" or "Week" both fail; the only accepted values are `week`, `semester`, or `both`.
- **Holiday rows in two places.** Once a feriado is in the Holidays tab, remove any matching `type: "holiday"` row from the Calendar to avoid double-rendering.
- **Boolean parsing on Holidays.** The `cancels_classes` column accepts `TRUE`, `true`, `yes`, `y`, `1`, `x`, `✓`, `sí`, `si`. Anything else (including blank) is treated as false. When in doubt, use `TRUE` or `FALSE`.
- **Filling `final_date` without `final_time` (or vice versa).** Both blank is fine — the row keeps showing TBD. Filling only one is harmless but reads as a half-finished entry. Aim to fill both at once.
- **Confusing `end_date` with `final_date`.** `end_date` is the last *regular* class meeting. `final_date` is the day the final exam is held, which falls inside the program-wide finals window in Settings (and is typically a day or two after `end_date`).

---

## When to bump CACHE_VERSION

This is a developer task, not a sheet-edit task, but worth knowing about: any time a *new column the app reads* is added, an existing column is renamed, or a *new sheet tab the app reads* is added, the `CACHE_VERSION` constant in the app code must be incremented. Otherwise students with cached old-shape data will see broken renders. Adding rows or editing existing cells never requires a code change.

---

## A note on backups

The Google Sheet has revision history built in (File → Version history → See version history). Before making sweeping pre-cohort changes, name a version ("Before Fall 2026 reset") so you can roll back if something breaks. There's no other backup mechanism; the live sheet is canonical.

---

*Last updated: 2026-04-28.*
