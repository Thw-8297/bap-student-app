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
| **Calendar** | Replace all program-specific events with the new semester's dates: arrival, orientation, classes-begin, study tours, excursions, classes-end, departure. | Powers the Calendar tab and the Schedule tab's Weekly Overview. Old dates are misleading. |
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
| **Prompts + PromptFields** *(Roster sheet)* | If you used cohort-specific `prompt_id` values last cohort (e.g. `tshirt_size_2026`, `welcome_dinner_rsvp_2026`), either rename them with the new year or clear and reseed. The `Responses` tab will continue to carry historical data keyed to old `prompt_id` values, which is what you want — historical responses stay queryable, but won't surface in the app because no `Prompts` row references them anymore. Run `validatePrompts()` from the auth script editor after seeding. | Year-stamping prompt IDs keeps cohorts cleanly separated in `Responses`. Reusing the same `prompt_id` across cohorts would commingle responses, which makes data analysis painful. |

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
- **Prompts** *(Roster sheet).* Adding a new prompt is two steps: a row in `Prompts` (with `prompt_id`, titles, audience, dates, surface) plus one or more rows in `PromptFields` (one per input box, each carrying a `field_id`, `field_type`, options, etc.). Edits propagate within ~10 minutes (the front-end's `bap-prompts-cache` TTL); the auth script doesn't cache prompts itself. Use `surface=today` for time-bounded prompts (RSVPs, sign-ups), `surface=profile` for evergreen ones (t-shirt sizes, dietary preferences), `surface=both` to put a prompt in both places. Set `start_date` and `end_date` when you want a prompt to auto-vanish after a deadline. Audience-targeting via `audience` accepts `all`, role names (`student` / `staff` / `faculty`), specific CWIDs, or any comma-separated mix. Run `validatePrompts()` after a meaningful edit. **Editing live prompts** (changing labels, swapping options) is fine and propagates within minutes; **renaming a `prompt_id`** is destructive — it disconnects existing responses from the prompt and the form will appear empty to students who already submitted. Don't rename; archive (delete the `Prompts` row) and create a new one if needed.
- **Reading responses, the easy way (in-app).** As of 2026-05-17b, open the app, tap the gear icon, then tap "Ver respuestas / View responses" — visible only when your roster row's `role` is `staff`. (Faculty are intentionally excluded; visiting professors who teach in BA shouldn't read other students' RSVP / dietary / size submissions.) The dashboard shows every prompt with a response count ("12 / 18"), an Active/Closed pill, and a tap-to-drill detail view: per-option tally bars for select fields, the list of individual submissions with submitter names, and a "Falta responder / Awaiting response" section listing who's expected to respond but hasn't. Good for the day-to-day "who still needs to RSVP?" or "what's the most-picked dessert?" workflow. Refreshes on demand from the dashboard's Actualizar button; no auto-poll.
- **Reading responses, the deeper way (spreadsheet).** Open the Roster spreadsheet → `Responses` tab when you need CSV export, ad-hoc formulas, or anything beyond the in-app dashboard. One row per `(cwid, prompt_id, field_id)`, with `value` and `submitted_at`. Easiest pattern: a pivot table grouping by `prompt_id` then `field_id` then `value`, or `=COUNTIFS(Responses!C:C,"meal_2026",Responses!D:D,"main",Responses!E:E,"Vegetariano")` for one-off counts. To match responses to student names, `VLOOKUP` against the `Roster` tab on `cwid`. The `Responses` tab grows linearly with cohort size × number of fields; it doesn't grow with edits (submissions upsert in place).

---

## The Roster spreadsheet *(separate file)*

The Roster lives in its own spreadsheet ("BAP App Roster"). The auth script is bound to this file; the content script can't see it. As of 2026-05-09c the spreadsheet contains four tabs:

- **Roster** — the cohort identity table (one row per person). Required.
- **Prompts** — Director-defined data-collection questions (one row per question). Optional but powers the prompts feature.
- **PromptFields** — input boxes inside each prompt (one row per box). Optional; required when `Prompts` has rows.
- **Responses** — student answers (one row per `cwid` × `prompt_id` × `field_id`). Auto-created by the auth script on first submit; you don't need to create it manually.

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

### Prompts *(optional, separate spreadsheet — same Roster file)*

One row per data-collection question you want to ask students. A prompt can be a single field (t-shirt size) or a multi-field form (a meal RSVP with appetizer + main + dessert + comments). Each row defines metadata; the actual input boxes live in the `PromptFields` tab keyed by `prompt_id`.

| Column | Required | Notes |
|--------|----------|-------|
| `prompt_id` | Yes | Stable string you'll never change once published (e.g. `tshirt_size_2026`, `welcome_dinner_rsvp`). Used as the join key to `PromptFields` and `Responses`. |
| `title_es` | Yes (or `title_en`) | Spanish headline shown on the card and as the form sheet title. |
| `title_en` | Yes (or `title_es`) | English headline. At least one of `title_es` / `title_en` must be filled. |
| `description_es` | No | Spanish blurb shown above the fields. 1-2 sentences of context. |
| `description_en` | No | English blurb. |
| `audience` | No | `all` (default if blank) → everyone in the cohort. Or `student` / `staff` / `faculty` (or comma-list of roles). Or a comma-list of CWIDs for narrow targeting. Mix freely. Case-insensitive. |
| `start_date` | No | `YYYY-MM-DD`. Prompt only appears on or after this date. Blank → no start gate. |
| `end_date` | No | `YYYY-MM-DD`. Prompt vanishes after this date and submissions become forbidden. Blank → no end gate. Both `start_date` and `end_date` blank → always active (used by evergreen profile prompts like t-shirt size). |
| `end_time` | No | `HH:mm` (24-hour, e.g. `20:00` for 8 PM). Tightens the close on `end_date` from end-of-day to a specific time of day — useful for "RSVP closes at 8 PM the night before" style cutoffs. Blank keeps the end-of-day default. Only meaningful when `end_date` is also set; the validator flags `end_time` without `end_date` because it has no effect. The student-facing app shows a subtle "Cierra hoy a las 20:00" caption beneath the prompt title once a cutoff is set. |
| `category` | No | `profile` / `meal` / `activity` / `feedback`. Free-form; reserved for future grouping/filtering. Helpful for your own organization. |
| `surface` | No | `today` (default if blank) / `profile` / `both`. Drives where the prompt renders: `today` shows on the Today tab between the activity card and Finals tile (good for time-bounded prompts like RSVPs); `profile` shows inside the Profile/Settings modal (good for evergreen fields students should be able to revisit anytime); `both` shows in both places. |

**Where they show:**

- `surface=today` or `both` → Today tab `<PromptCard>` ("For you / Pendientes" tile) when the prompt is in its active window.
- `surface=profile` or `both` → Profile/Settings modal `<PromptProfileSection>` ("About you / Tu información"). Active-window gating still applies; evergreen prompts (no dates) appear here permanently.

### PromptFields *(optional, separate spreadsheet — same Roster file)*

One row per input box inside a prompt. Multiple rows joined to a single `Prompts` row by `prompt_id` form a multi-field form.

| Column | Required | Notes |
|--------|----------|-------|
| `prompt_id` | Yes | Foreign key to `Prompts`. Must match an existing `prompt_id` in that tab. |
| `field_id` | Yes | Stable string within the prompt (e.g. `size`, `appetizer`, `main`, `dessert`, `comments`). Combined with `prompt_id` as the upsert key in `Responses`. |
| `field_order` | Yes (effectively) | Integer; controls render order top-to-bottom inside the form sheet. Use 1, 2, 3, … |
| `label_es` | Yes (or `label_en`) | Spanish field label shown above the input. |
| `label_en` | Yes (or `label_es`) | English field label. At least one of `label_es` / `label_en` must be filled. |
| `field_type` | Yes | One of: `short_text` (single-line), `long_text` (multi-line / textarea, e.g. comments), `single_select` (radio-style picker), `multi_select` (checkbox-style picker), `number` (digit-only with decimal support), `boolean` (Yes/No toggle). |
| `options` | Yes for select types | Semicolon-delimited list of choice values: `XS;S;M;L;XL;2XL`. The values themselves are stored in `Responses`; the labels students see come from `option_labels_es` / `option_labels_en` if set, otherwise the option value itself. |
| `option_labels_es` | No | Semicolon-delimited Spanish labels parallel to `options`. Use when the choice value is a code but the display name should be different (e.g. `options=mediano;grande` and `option_labels_es=Mediano;Grande` — same here, but useful for things like `options=ar;us;mx` and `option_labels_es=Argentina;EE.UU.;México`). |
| `option_labels_en` | No | Semicolon-delimited English labels parallel to `options`. Same pattern. |
| `required` | No | TRUE/FALSE. Per field, not per prompt — a meal RSVP can require the appetizer/main/dessert fields and leave the comments optional. Defaults to FALSE. |
| `placeholder_es` | No | Spanish hint text shown inside short_text/long_text/number inputs when empty. |
| `placeholder_en` | No | English hint. App picks Spanish-first, falls back to English if Spanish is blank. |

**Examples:**

- **T-shirt size** (1 row in `Prompts`, 1 row in `PromptFields`):

  | Tab | Key columns |
  |---|---|
  | Prompts | `tshirt_size_2026` · "Talle de remera" · category=`profile` · surface=`profile` |
  | PromptFields | `tshirt_size_2026` · `size` · 1 · "Talle" · `single_select` · `XS;S;M;L;XL;2XL` · required=TRUE |

- **Welcome dinner RSVP** (1 row in `Prompts`, 4 rows in `PromptFields`):

  | Tab | Key columns |
  |---|---|
  | Prompts | `welcome_dinner_2026` · "Cena de bienvenida" · category=`meal` · start=2026-05-12 · end=2026-05-15 · end_time=`20:00` · surface=`today` |
  | PromptFields | `welcome_dinner_2026` · `appetizer` · 1 · "Entrada" · `single_select` · `Empanadas;Provoleta;Ensalada` · required=TRUE |
  | PromptFields | `welcome_dinner_2026` · `main` · 2 · "Plato" · `single_select` · `Bife de chorizo;Milanesa;Pasta;Vegetariano` · required=TRUE |
  | PromptFields | `welcome_dinner_2026` · `dessert` · 3 · "Postre" · `single_select` · `Flan;Helado;Fruta` · required=TRUE |
  | PromptFields | `welcome_dinner_2026` · `comments` · 4 · "Notas" · `long_text` · (blank) · required=FALSE |

- **Tigre day-trip sign-up** (1 row each):

  | Tab | Key columns |
  |---|---|
  | Prompts | `tigre_excursion_2026` · "Excursión a Tigre" · category=`activity` · start=2026-06-01 · end=2026-06-08 · surface=`today` |
  | PromptFields | `tigre_excursion_2026` · `attending` · 1 · "¿Vas?" · `boolean` · (blank) · required=TRUE |

### Responses *(auto-created — separate spreadsheet, same Roster file)*

You don't need to create or maintain this tab manually. The auth script auto-creates it on the first submit and writes one row per `(cwid, prompt_id, field_id)`. Schema:

| Column | Notes |
|--------|-------|
| `submitted_at` | ISO timestamp of the most recent write to this row. |
| `cwid` | Normalized to digits-only, leading zeros stripped (matches the `Roster` row's `cwid` after normalization). |
| `prompt_id` | Matches the `Prompts` row's `prompt_id`. |
| `field_id` | Matches the corresponding `PromptFields` row's `field_id`. |
| `value` | The submitted value. Strings as-is; booleans as `TRUE` / `FALSE`; multi_select stored semicolon-joined. |

Submissions upsert: editing an existing answer updates `value` + `submitted_at` in place rather than appending a new row. So this tab grows linearly with cohort size × number of fields, not with edit count.

**Use this tab to read responses.** A pivot table grouping by `prompt_id` then `field_id` then `value` is the easiest way to tally up "how many vegetarians" or "what's the most-picked dessert." Or use `=COUNTIFS(Responses!C:C,"meal_2026",Responses!D:D,"main",Responses!E:E,"Vegetariano")` for one-off counts. To get the student's name alongside their CWID, do a `VLOOKUP` against the `Roster` tab.

**Editor-side validator for prompts:**

- Open the Roster spreadsheet → Extensions → Apps Script → function dropdown → run `validatePrompts()`. Output goes to the execution log (View → Execution log). Flags duplicate `prompt_id` values, fields pointing at unknown `prompt_id`, duplicate `(prompt_id, field_id)` pairs in `PromptFields`, missing or unrecognized `field_type`, select fields with no options, mismatched `option_labels_es` / `option_labels_en` counts, malformed `start_date` / `end_date`, `end_date` before `start_date`, prompts with no fields defined (students would see an empty form), unrecognized `surface` values, and audience tokens that aren't `all` / a role / a CWID-shaped string.
- Run after any meaningful edit to `Prompts` or `PromptFields`.

**Privacy guidance for responses.**

- Responses can carry sensitive student info depending on what you ask. A meal RSVP is low-stakes; a `dietary_restrictions_detail` long_text could reveal medical info; an `allergies_severity` field could be FERPA-touching. Calibrate prompt design to what you're comfortable storing in this Director-restricted spreadsheet, and remember that the Roster sharing settings apply to `Responses` too.
- Don't ask for anything you wouldn't be comfortable seeing on a screen with another Director-level colleague looking over your shoulder.
- Submissions are authenticated by cohort token + CWID + birthday; within the cohort, a student who knows another student's CWID + birthday could submit on their behalf. For the use cases the prompts feature is calibrated to (sizes, RSVPs, sign-ups), this is fine. For anything individually sensitive, hold off until the auth model is upgraded to Google sign-in.

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

Semester-wide events: arrival, orientation, classes-begin, study tours, excursions, classes-end, departure.

| Column | Required | Notes |
|--------|----------|-------|
| `date` | Yes | Start date in YYYY-MM-DD format. |
| `end_date` | No | End date (for multi-day events). Leave blank for single-day. |
| `title` | Yes | Event name. |
| `type` | No | One of: `program`, `academic`, `excursion`, `holiday`, `orientation`. Defaults to `academic`. Each gets a distinct color. `program` carries the most prominent visual (Parchment-orange + Pep Orange + ★) and should be used for Director-curated entries like arrival days, asados, faculty visits, and other program-office-organized moments. The legacy `milestone` type was retired on 2026-05-11b — its visual was reassigned to `program`; rows still typed `milestone` in the sheet render as Academic cards until relabeled. |
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

*Last updated: 2026-05-17b (Director response dashboard now reads submissions from inside the app for staff/faculty roles; "Reading responses" section in mid-program operations split into in-app and spreadsheet workflows).*
