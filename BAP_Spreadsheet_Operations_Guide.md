# BAP App — Spreadsheet Operations Guide

This is the operational handbook for the Google Sheet that powers the Buenos Aires Program student app. The sheet is the single source of truth for every piece of content the app shows; the app code itself only reads and renders. Updating the sheet is how you change what students see.

This document covers two things:

1. **Pre-cohort checklist** — what to update at the start of each new student program.
2. **Tab-by-tab reference** — what each tab does, what each column means, and how it surfaces in the app.

Anyone with edit access to the sheet can use this guide; no code knowledge is required.

> **Living document.** This guide is updated alongside any change to the sheet schema, tab list, or parsing behavior. The `Last updated` line at the bottom of the file shows when it was most recently touched. Schema changes should include a corresponding edit here in the same pass.

---

## How the sheet and the app talk to each other

**Two spreadsheets, by design.** As of 2026-05-09 the app reads from two separate Google Sheets, each with its own bound Apps Script:

1. **Content sheet** — class schedules, calendar, contacts, etc. Most of this guide is about this sheet. All the public-ish program content lives here.
2. **Roster sheet** — the per-person identity table (CWIDs, birthdays, names, dietary restrictions, t-shirt sizes, etc.). Used only by the user gate at sign-in. See "The Roster spreadsheet" below.

The two-sheet split is intentional. The content script literally has no read access to the Roster, and the auth script literally has no read access to the content sheet, so a bug in either can't leak data from the other. As Director, you'll spend most of your time in the content sheet (mid-program updates, calendar adds, announcements); the Roster gets touched at the start of each cohort and occasionally for late-add students.

The app reads the content sheet every time a student opens it (via a small Apps Script Web App that returns all tabs as one JSON blob), caches the response on the device, and rerenders. There is no "publish" button; saving a cell is the publish.

**Edits take up to 1 hour to appear in the app.** The Apps Script caches its response for an hour to avoid re-reading the spreadsheet on every student open. To force fresh content immediately after an important edit, append `?bust=1&token=<cohort-passcode>` to the Apps Script Web App URL once in your browser; the next student fetch will pick up the new data. The Apps Script URL is stored in `App.jsx`; ask the developer for the current value if you need it. Routine edits don't need this; an hour is fine.

**The Roster auth script does NOT cache.** Identify happens roughly once per device per cohort, so per-request reads are negligible. Roster edits propagate immediately — useful when adding a late-add student or fixing a birthday typo mid-cohort.

**The app is locked behind a cohort passcode plus per-user identification.** As of 2026-05-03 the spreadsheets are no longer published to the web; the Apps Scripts are the only way into the data, and both require the cohort token. As of 2026-05-09 there's a second gate after the cohort passcode: students enter their CWID + birthday, which is matched against the Roster. Both spreadsheets' sharing settings should stay at "Restricted" (only people you explicitly add). If you ever need to "Publish to web" or open up sharing on either sheet, that re-opens a back door — coordinate with the developer first.

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
| **Roster** *(separate sheet)* | Open the **BAP App Roster** spreadsheet (this is a different file from the content sheet). Clear the previous cohort's rows and paste in the new cohort with: `cwid` (9-digit numeric, no leading zeros), `first_name`, `last_name`, `preferred_name` (optional), `pronouns` (optional), `birthday` (MM-DD), `role` (`student` / `staff` / `faculty`), `email`, `whatsapp`, `housing_assignment`, `tshirt_size`, `tshirt_fit` (optional), `dietary_restrictions`, `food_allergies`, `program_status` (default `active`). Add yourself + assistant director + any other staff/faculty too. Then run `validateRoster()` from the auth script's editor (Roster sheet → Extensions → Apps Script → function dropdown → validateRoster → Run) and confirm no warnings. | Without a Roster row, a student can't get past the user gate. Late-adds and corrections are immediate (no cache); they'll work the next time the student opens the app. |
| **Cohort passcode** | Rotate the `COHORT_TOKEN` Script Property in **both** Apps Script editors (content script bound to the content sheet, AND auth script bound to the Roster sheet) — same value in both. (Extensions → Apps Script → ⚙️ Project Settings → Script Properties → edit `COHORT_TOKEN`.) Announce the new code in the cohort's WhatsApp group on the first day of orientation. **No re-deploy needed** — Script Properties are read at request time. The previous cohort's stored tokens fail with AuthError on the next open and both gates re-prompt automatically. | Closes the door on previous-cohort devices that still have the app cached. The passcode + roster pair is the credential gating the app; rotating per cohort is the cheap way to keep last semester's students from passively picking up this semester's content. |

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
- **Roster maintenance** *(separate sheet).* Late-add students get a new row. Withdrawn students get their `program_status` flipped from `active` to `withdrawn` — this prevents them from signing back in mid-cohort but preserves their history. Birthday/CWID typos can be fixed in place; no cache to bust, the auth script reads the sheet on every identify call. After a meaningful edit, run `validateRoster()` from the auth script editor to surface any new typos (duplicate CWIDs, malformed birthdays, etc.).

---

## The Roster spreadsheet *(separate file)*

The Roster lives in its own spreadsheet ("BAP App Roster") with one tab. The auth script is bound to this file; the content script can't see it.

### Roster *(required, separate spreadsheet)*

| Column | Required | Notes |
|--------|----------|-------|
| `cwid` | Yes | 9-digit numeric, no leading zeros (e.g. `123456789`). Format the column as **Plain text** so leading zeros aren't stripped on paste. |
| `first_name` | Yes | What the Today greeting falls back to if `preferred_name` is blank. |
| `last_name` | Yes | Used in the ProfileModal "Logged in as" card and any future formal contexts. |
| `preferred_name` | No | When set, used in the Today greeting and identity card *instead of* `first_name`. Useful for "Cristina goes by Cris," "James goes by Jim," etc. |
| `pronouns` | No | Free text; e.g. `she/her`, `they/them`. Captured-but-unused in v1; reserved for future Director-facing surfaces. |
| `birthday` | Yes | The auth second factor. Plain text. Accepts `MM-DD` (e.g. `05-12`), `M-D`, or full `YYYY-MM-DD` (year stripped at parse). |
| `role` | Yes | One of: `student` / `staff` / `faculty`. Drives any future role-based UI gating. |
| `email` | Yes | Pepperdine email. Displayed in the ProfileModal identity card. |
| `whatsapp` | No | International format (e.g. `+5491144197092`). Captured-but-unused in v1; reserved for future Director-facing contact features. |
| `housing_assignment` | No | Free text (e.g. `Homestay – Recoleta (Familia García)`). Captured-but-unused in v1. |
| `tshirt_size` | No | `XS` / `S` / `M` / `L` / `XL` / `2XL`. Captured-but-unused in v1; reserved for future merch-coordination features. |
| `tshirt_fit` | No | `unisex` / `women's` if you ever order both. |
| `dietary_restrictions` | No | Free text, kept short (e.g. `vegetarian`). Reserved for future RSVP / dinner-menu features. |
| `food_allergies` | No | Free text. Separate from `dietary_restrictions` because severity matters. |
| `program_status` | No | `active` (default if blank) / `withdrawn` / `completed`. Non-active rows can't sign in — useful for keeping historical rosters in this sheet without the app treating them as current. |

**What the Roster does NOT contain.** Tier-C fields like emergency contacts, medical notes, passport numbers, insurance IDs, and blood type are deliberately not in this sheet. They belong to Pepperdine's existing intake systems or a separately-controlled Director-only sheet, not to the app's auth-side roster. The reasoning is calibrated to the threat model: the Roster is the table the auth script reads; broader scope = broader leak surface.

**Auth flow refresher** (the user-side experience this drives):

1. Student opens the app, enters the cohort passcode (gate 1, content data unlocks).
2. Student enters their CWID + birthday (gate 2, the auth script looks the row up in this sheet).
3. App proceeds with their curated row in localStorage. Their first name powers the Today greeting; their role drives any role-gated UI; the rest is reserved for upcoming features.

**Where it shows in the app:**

- Today greeting: `currentUser.preferred_name || currentUser.first_name`
- ProfileModal "Logged in as" card: name, role, email, plus Sign-out button

**Privacy guidance:**

- This sheet is more sensitive than the content sheet. Keep sharing **Restricted** to Director (and Assistant Director if appropriate). Do not publish to web. Do not loosen sharing for any external workflow without coordinating with the developer.
- Don't add Tier-C PII (passport, medical, financial, FERPA-touching) to this sheet. The schema is designed around low-stakes identity data only; broadening it would change the calibration meaningfully.
- The student app receives only the curated subset (no `birthday` echoed back, no fields outside `CURATED_FIELDS` in `AuthCode.gs`); but anyone with edit access to this sheet sees the full row.

**Editor-side validators:**

- Open the Roster spreadsheet → Extensions → Apps Script → function dropdown → run `validateRoster()`. Output goes to the execution log (View → Execution log). Flags duplicate CWIDs, missing required fields, unrecognized roles, malformed birthdays/emails, CWIDs that aren't 9 digits, CWIDs with leading zeros.
- Run after any meaningful edit (cohort reset, late-add, typo fix).

---

## Tab-by-tab reference *(content spreadsheet)*

The rest of this section is about the **content** spreadsheet (separate from the Roster above). Tabs marked **(required)** must exist. Tabs marked **(optional)** can be missing without breaking anything.

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

*Last updated: 2026-05-09.*
