import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";

// ============================================================
// BUILD VERSION — Update each time a new build is generated
// ============================================================
const BUILD_VERSION = "2026-05-16c hotfix — repair the blank Schedule tab. The 2026-05-16 performance pass wrapped WeeklyOverviewView's per-week pipeline (event overlap, per-day grouping, personalized class filter, finals lookup) in a useMemo, but two locals inside that closure — showClasses (= shouldFilterClasses(profile)) and visibleClasses (= filterClassesByProfile(data.classes, profile)) — were still referenced from the per-day render block outside the memo (dayClasses guard, dayFinals filter). Those names lived only inside the useMemo callback, so at render time visibleClasses.filter(...) threw a ReferenceError. The error bubbled past the implicit boundary inside <ScheduleView> and the entire Schedule tab unmounted to a blank white screen. Same shape of regression as the 2026-04-28b hotfix (a memoization pass moved variables into a closure but the render still reached for them). Fix: include showClasses and visibleClasses in the useMemo return object and destructure them alongside the other pre-computed locals (weekDates, eventsByDate, activeClassesByDate, finalsByDate). No data-shape change; no CACHE_VERSION bump; no sheet edits required; no Apps Script cutover. Mechanism check on why this didn't surface earlier in the dev parser pass: showClasses and visibleClasses are plain identifier references inside a function body — JavaScript treats those as runtime ReferenceErrors, not parse errors, so the build was clean and the regression only fired the first time a user with personalization actually clicked Schedule. ============= 2026-05-16b — Semester Calendar now anchors the student in time: a thin BAP Blue divider rule with a centered DM Mono 'Hoy · Today' pill renders before the first not-past event in the filtered, chronologically-sorted, month-grouped list, and every past event dims to opacity 0.55 (same treatment Today's activity card already uses for items earlier in the day). 'Not-past' is defined as (e.end_date || e.date) >= todayStr so an ongoing multi-day event reads as current rather than past — and the divider lands before it rather than after the last fully-past event, which matters when today falls inside a multi-day run. Implementation: new firstNotPastKey useMemo keyed on grouped + todayStr walks the per-month arrays in order and returns the first matching `${date}|${title}` key; the per-event render compares its own key against that and renders the divider via a Fragment wrapper above the event row. When no events are upcoming (everything past, or empty filter), firstNotPastKey is null and no divider renders. Fragment added to the React import. No data-shape change; no CACHE_VERSION bump; no sheet edits required. ============= 2026-05-16 — Performance audit pass: three concrete wins. (1) The 160×160 BAP header logo (previously inlined as a ~63KB base64 string in App.jsx as LOGO_URI) moved to public/logo.png and is now served as a static asset. The base64 blob was adding ~63KB to the JS the phone had to parse before first paint; pulling it out drops the bundled JS by the same amount and lets the asset cache independently (the SW precache picks it up alongside the rest of the shell). LOGO_URI is still the constant referenced at the three header sites; only its value changed from data:image/png;base64,... to '/logo.png'. (2) Memoized the clock-tick-driven derivations on the Today tab. The 1-minute setInterval in TodayView previously caused getTodayItems (eventOverlaps over every calendar event, holiday lookup, class day-of-week filter, finals merge, time-sort), TodayFinalsTile (shouldShowFinalsUI + getStudentFinals + formatFinalsWindow), EventsTodayTile (getThisWeekEvents = filter + chronological sort), and computeWeatherAlert (48-hour hourly scan) to all re-run on every tick — even though none of them produce different output until the calendar day rolls over or the underlying data changes. Each is now wrapped in useMemo keyed on the actual inputs (data/profile/todayStr or data/profile/weather). EventsTodayTile gained a todayStr prop from TodayView so its memo key matches the rest of the tile family. Also lifted the loadTodayCache() call from a per-render JSON.parse to a lazy useState initializer. (3) Memoized the filter/sort pipelines in WeeklyOverviewView (the per-day eventsByDate / activeClassesByDate / finalsByDate compute that previously ran 7-day-deep nested filters on every render including each chevron tap), CalendarView (filter → sort → group-by-month pipeline that previously ran on every filter-pill tap), and EventsView (upcoming → category filter → split-by-week pipeline that previously ran on every filter tap plus a JSON.parse of the dólar cache just to read one number). EventsView also got the same lazy-init treatment for its loadTodayCache call. Net effect: the most-trafficked re-render paths (Today every minute, WeeklyOverview/Calendar/Events filter taps) collapse from full pipeline recompute per render to nearly free after the first paint, and the bundle shrinks by ~63KB. Hooks-rule check: TodayFinalsTile's early returns now sit AFTER the useMemo calls (was: returns first, then helpers) so hooks are called unconditionally on every render. Added useMemo to the React imports (was using useState/useEffect/useRef/useCallback). No data-shape change; no CACHE_VERSION bump; no sheet edits required; no new dependencies; no manual Apps Script cutover. ============= 2026-05-15 — Three small security hardening passes from the audit. (1) AuthCode.gs's doGet and doPost catch-all error responses now drop the `stack` field — runtime exceptions still come back as { error: 'internal_error', message } so the front end has something to log, but the full stack trace (function names, line numbers, internal logic) no longer rides back to the client. Full stack still gets Logger.log'd, which the Director can read in the Apps Script execution log. (2) New safeExternalUrl(url) helper near AddressLink in App.jsx returns the URL unchanged when its scheme is one of http: / https: / tel: / mailto: / sms:, and returns '' for anything else (javascript:, data:, file:, vbscript:, custom schemes). Applied as a guard at every spreadsheet-sourced <a href> site: LinkButton (Health/Churches/Explore/Events link columns), AddressLink (Contacts.maps override), ActionBtn (Contacts.maps, Contacts.whatsapp, Resources.url), AnnouncementBanner CTA (Announcements.link), Apps cards (Apps.ios_url, android_url, web_url), FAQ accordion (FAQ.link). React does NOT sanitize href attributes, so without this guard a Director paste-mishap or a malicious URL accidentally landed in the sheet would fire as script when a student taps the button. Internally-constructed schemes (tel:\${o.phone}, mailto:\${o.email}) trivially pass the allowlist so the change is invisible for those. (3) New vercel.json at the repo root sets Referrer-Policy: strict-origin-when-cross-origin (tightens the small risk of leaking the SPA's referrer when a student taps an external link), X-Frame-Options: DENY (prevents clickjacking by iframing the app on a hostile page), X-Content-Type-Options: nosniff (denies MIME sniffing), and Permissions-Policy denying camera/microphone/geolocation/payment/usb/midi/magnetometer/gyroscope (the app uses none of these powerful browser APIs). CSP was considered but deferred — needs careful tuning against script.google.com, fonts.googleapis.com, open-meteo, dolarapi. Manual cutover: re-paste AuthCode.gs into the Apps Script editor and re-deploy as New Version (only the script change requires a manual re-deploy; the front-end and Vercel-config changes ship with the next push to main). No CACHE_VERSION bump. ============= 2026-05-14 — Weekly Overview day cards now interleave events, finals, and personal classes chronologically by start time instead of always bucketing classes below events. Previously each day rendered three sequential blocks (dayEvents.map → dayFinals.map → dayClasses.map), so a 9 AM class always appeared below an untimed program event or an afternoon excursion, which made the day card read in stacking order rather than time order. Implementation in <WeeklyOverviewView>'s per-day render: after dayEvents, dayFinals, and dayClasses are computed (filters unchanged — class-personalization gate, holiday-cancels-classes gate, per-class start_date/end_date window, and the final-on-this-date class-replacement still apply), they're flattened into a single dayItems array where each entry carries kind ('event' / 'final' / 'class'), sortMin (minutes since midnight, null for untimed), a stable key, and the original payload. Sort uses the same untimed-first-then-chronological pattern as getTodayItems on Today (a.sortMin === null sorts before b.sortMin === null; otherwise ascending number). Final-time and class-time strings are split on dash so a range like '9:00–11:00' or '9:00–10:50' yields the start half for sorting. The three render blocks collapsed into one map over dayItems with a kind-switch — event cards keep their EVENT_STYLES type-driven bg/border + multi-day range badge, final cards keep the Pep Orange Final pill treatment + location line, class rows keep the thinner secondary row with Fog left border. The legacy-holiday-event skip (drop calendar holiday events when a Holidays-tab row is already driving the banner) moved up from the events render-time filter to the dayItems build step so the unified pipeline never carries the duplicate. hasContent is now dayItems.length > 0 || !!holidayContext, matching the simplification. No data-shape change; no CACHE_VERSION bump. ============= 2026-05-11b — Calendar event types consolidated: 'milestone' removed and its visual treatment (Parchment-orange #FFF3E0 bg, Pep Orange border, ★ icon) reassigned to 'program'. Rationale: the two categories had drifted into near-overlap operationally — both surfaced program-office-curated date entries (arrival days, asados, faculty visits, etc.) and students never reliably distinguished the two when filtering. Collapsing them removes a filter pill, simplifies sheet-side decisions for the Director (one fewer 'which type does this belong to?' judgment call per row), and frees the eye-catching Pep Orange treatment to flag program-curated entries broadly rather than just the calendar's marquee moments. The 'program' pill also moved to the first slot after 'All' in the CalendarView filter row, since it's now the largest and most prominent category. Implementation: EVENT_STYLES literal in App.jsx had its 'milestone' key deleted and 'program' restyled in place (bg, border, icon swap; label stays 'Program'); 'program' was hoisted to the first key in the object so Object.keys(EVENT_STYLES) iteration order puts it right after 'all' in the filter pills (the iteration order is the source of truth for pill order, not a separate constant). The legacy 'milestone' seed row in DEFAULT_DATA.calendarEvents was rewritten to type:'program' so the preview mode (no SHEET_ID) still renders the arrival-day card with the now-correct styling. No CACHE_VERSION bump — the data shape is unchanged; the type field is still a string, just with one fewer accepted value. The fallback in CalendarView and WeeklyOverviewView already routes unknown types through EVENT_STYLES.academic, so any legacy rows still typed 'milestone' in the live sheet render as Academic-styled cards until the Director relabels them (separate operations-side cleanup; not blocking). Earlier this day: Weekly Overview navigation now bounded to a tight personal window: one week prior, current week, and up to two weeks ahead. Default lands on the current week as before. Prev/next chevron buttons render disabled (40% opacity, stone color, not-allowed cursor) at the bounds and the click handler is a no-op so a stuck tap can't push past the bounds. Implementation: two consts MIN_WEEK_OFFSET (-1) and MAX_WEEK_OFFSET (+2) inside WeeklyOverviewView, plus canGoBack/canGoForward booleans derived from the current weekOffset; setWeekOffset calls wrap in Math.max / Math.min as a belt-and-suspenders clamp. Earlier this day: optional per-prompt end_time cutoff. New `end_time` column on the Prompts sheet (HH:mm 24h, e.g. `20:00`) tightens the close on `end_date` from end-of-day to a specific time of day — useful for 'RSVP closes at 8 PM' style cutoffs on dinners and excursions. Blank end_time keeps the prior end-of-day-on-end_date behavior. Server side: `promptIsActive` adds a same-day time-of-day check (`Utilities.formatDate(new Date(), tz, 'HH:mm') > end_time` → not active); `buildPromptResponse` projects the new field; `validatePrompts` flags malformed end_times (must be `HH:mm`) and end_time set without end_date. Front side: new `formatPromptCutoff(prompt, now)` helper renders bilingual closes-at copy with three proximity tiers — 'Cierra hoy a las 20:00' when end_date is today, 'Cierra mañana a las 20:00' when it's tomorrow, 'Cierra el 15 de mayo a las 20:00' otherwise; degrades to 'Cerrado / Closed' once the cutoff has passed (so a stale cached entry doesn't claim the form is still open in the brief window before the next prompts fetch drops it). PromptCard rows on Today and PromptProfileSection rows in the gear modal both show the cutoff as a small DM Mono caption (`fontSize: 10`, `C.stone`) beneath the title; rows without an end_time render unchanged. Import xlsx regenerated with the new column populated for the welcome_dinner and tigre_excursion examples ('20:00' on welcome_dinner, '18:00' on tigre_excursion) so the demo data showcases the feature out of the box. Manual cutover: (a) add an `end_time` column to the existing `Prompts` tab in the Roster spreadsheet (just type the header in the next blank column; no row data needed unless you want to set cutoffs), (b) re-paste AuthCode.gs into the Apps Script editor and re-deploy as New Version. CACHE_VERSION stays at 6; PROMPTS_CACHE_TTL stays at 10 min so a Director-edited end_time propagates fast. Earlier this day: Per-student data collection via prompts + responses. Generalized 'Director defines a prompt in a sheet → app surfaces it to the right students → students submit → responses land back in a sheet' primitive — once it exists, every future use case (t-shirt sizes, meal RSVPs, activity sign-ups, evaluation surveys, weekly check-ins) is just a row in the Prompts tab, no code change. Two new tabs in the existing Roster spreadsheet (extends the auth permission boundary that already protected PII; avoids spinning up a third spreadsheet/script): `Prompts` (one row per logical question with prompt_id, title_es/en, description_es/en, audience, start_date, end_date, category, surface) and `PromptFields` (one row per input box, joined to Prompts by prompt_id; carries field_id, field_order, label_es/en, field_type, options [semicolon-delimited], option_labels_es/en, required, placeholder_es/en). The Responses tab (auto-created on first submit) is one row per (cwid, prompt_id, field_id) plus value + submitted_at. The two-tab split handles multi-field prompts cleanly — a meal RSVP with appetizer/main/dessert/comments is 1 Prompts row + 4 PromptFields rows; a t-shirt size is 1 + 1. Surface column ('today' / 'profile' / 'both') chooses where each prompt renders: time-bounded prompts on Today, evergreen ones inside ProfileModal. AuthCode.gs gains two new actions: GET ?action=prompts (re-validates identity, returns active prompts for the user with responses pre-filled, audience-filtered, date-window-gated) and POST submit (text/plain JSON body to avoid CORS preflight against Apps Script — application/json would trigger preflight and Apps Script doesn't implement doOptions). Submit re-validates identity on every call, runs each field through validateSubmissionValues against its declared type + required flag, upserts under a LockService script lock keyed on (cwid, prompt_id, field_id), and returns the refreshed prompt object so the front end can update local state without a follow-up fetch. Field types in v1: short_text, long_text, single_select, multi_select, number, boolean (date deferred until a concrete need shows up). Editor helper validatePrompts() in AuthCode.gs flags duplicate prompt_ids, fields pointing at unknown prompts, missing field_types, select fields with no options, malformed start_date/end_date, audience tokens that aren't 'all'/role/CWID, mismatched option_labels counts, etc. — same shape and Logger.log output as the existing validateRoster(). New App.jsx machinery: class SubmitError extends Error (carries .code + .details so PromptForm can branch on validation_failed / prompt_inactive / audience_mismatch / lock_failed for inline error copy); fetchPrompts and submitResponse async functions next to identifyUser, mirroring its AuthError/NoMatchError throw conventions; PROMPTS_CACHE_KEY ('bap-prompts-cache') with a 10-min TTL keyed by cwid (so a sign-out / sign-in on the same device doesn't surface the previous user's pending forms); filterPromptsBySurface and isPromptPending helpers. Birthday now lives in the bap-user envelope alongside the rest of the curated user record (small expansion of the threat-model trade — birthday on-device matches what's already stored: cwid, name, role, email — and the prompts/submit endpoints re-validate identity on every call so the credential is needed in localStorage; legacy records without birthday force a one-time re-prompt at the user gate, which loadUser handles by returning null when the birthday field is missing). New components: PromptFieldInput (renders one field per field_type — selects as tappable cards with ✓ for multi / • for single and bilingual EB Garamond labels, boolean as Sí/Yes vs No pill pair, number with inputMode='decimal' and digit-only sanitization, short_text/long_text as styled inputs with placeholder support); PromptForm (bottom-sheet wrapper, sticky-ref pattern preserves the prompt object across the BottomSheet's 260ms close animation so the form doesn't flash an empty fallback during exit, useEffect deps include only promptKey so a background prompts refresh while editing doesn't wipe in-progress edits, maps SubmitError.code to bilingual inline error panels); PromptCard (Today tile listing pending/answered prompts with surface=today/both, Pep Orange left stripe + 'Pendientes / For you' header, per-row: Pep Orange dot + Parchment bg for unanswered required-fields prompts, calmer Ocean dot + Ice bg for fully-answered, CTA shifts 'Responder →' / 'Completar →' / 'Editar →' based on state); PromptProfileSection (renders inside ProfileModal after the Logged-in-as card, lists profile/both prompts with a comma-joined preview of saved values for at-a-glance recall, italic 'Sin respuesta / No answer yet' fallback). Form sheet is rendered at App level (above ProfileModal in the JSX so it stacks correctly), state held in App as selectedPrompt; PromptCard and PromptProfileSection both bubble taps up via onOpenPrompt → setSelectedPrompt. handleSubmitPrompt updates prompts state in place after a successful submit (the script returns the refreshed prompt with new responses + submitted_at) and rewrites the per-cwid cache so both surfaces re-render in sync. Background prompts fetch effect runs once both gates are clear and the user has cwid + birthday, populating prompts state from the server and refreshing the cache. AuthError on any prompts call clears cohort token + user + prompts cache in lockstep (matches the existing sheet-data AuthError handler — same root cause, same response). NoMatchError on prompts/submit clears just the user (their roster row was likely removed mid-cohort). Sign out now also wipes the prompts cache and any open form. Two-spreadsheet permission isolation preserved: content script still has no read access to the Roster, auth script still has no read access to the content sheet, prompts/responses live entirely on the Roster side under the same auth boundary as the per-user identity check. CACHE_VERSION stays at 6 — content data shape unchanged; the prompts payload is its own cache layer. Manual cutover after this lands: (a) add Prompts and PromptFields tabs to the Roster spreadsheet (Responses auto-creates on first submit), (b) re-deploy AuthCode.gs (Apps Script editor → Deploy → Manage deployments → pencil icon → New version), (c) seed at least one Prompts row + its matching PromptFields rows (e.g. tshirt_size_2026 as a single-field profile-surface single_select with options 'XS;S;M;L;XL;2XL'), (d) run validatePrompts() from the editor to confirm no warnings, (e) commit + push, (f) existing students get a one-time CWID + birthday re-prompt on next open as legacy user records without birthday are discarded. Earlier this day: 60-day expiry on stored auth credentials. Both `bap-cohort-token` and `bap-user` localStorage entries now wrap their value in a `{ value/token, savedAt }` envelope; loadCohortToken and loadUser treat anything older than AUTH_TTL_MS (60 days) as missing and the student gets re-prompted at the appropriate gate. Soft floor against a phone passed to someone else who never signs out, and stays well outside the typical 'I forgot my code' window. Backward-compatible: the legacy plain-string cohort token and the legacy flat user record (both shipped before this commit) are accepted as still-valid on load; the next save upgrades each to the envelope format, after which the TTL kicks in. Detection heuristic for cohort token: `raw.charAt(0) === '{'` flags the envelope so we don't pay JSON.parse on plain-string legacy values. New constant: AUTH_TTL_MS. No new dependencies; no schema versioning needed (the envelope shape is content-detected, not version-keyed). Earlier this day: per-user identification via CWID + birthday gate. ============= 2026-05-09 — Per-user identification via CWID + birthday gate. New <UserGate> component renders after <PasscodeGate> succeeds, before any per-user features. Probes a separate Apps Script (AuthCode.gs, bound to a new 'BAP App Roster' spreadsheet — physically distinct from the content spreadsheet for permission isolation) with the entered CWID + birthday; on match returns a curated user record, on mismatch returns no_match. The two-spreadsheet split is the load-bearing security design: the content script literally has no read access to the Roster, and the auth script literally has no read access to the content sheet, so a bug in either can't leak data from the other. New AUTH_SCRIPT_URL constant alongside APPS_SCRIPT_URL; the same COHORT_TOKEN value lives in both Script Properties (one cohort code, two homes; rotation is two 30-second copies). Identify endpoint shape: ?action=identify&token=...&cwid=...&birthday=... → { user: { cwid, first_name, last_name, preferred_name, pronouns, role, email, whatsapp, housing_assignment, tshirt_size, tshirt_fit, dietary_restrictions, food_allergies, program_status } } or { error: 'no_match' | 'unauthorized' | 'bad_request' }. Birthday is intentionally omitted from the response — the student already knows it; echoing back is a small leak surface for nothing. Tier-C fields (medical, passport, emergency contacts) deliberately stay out of the Roster sheet. CWID normalization is lenient on input variation (strips non-digits and leading zeros so '123456789', '0123456789', '123-456-789', and ' 123456789 ' all collapse to the same canonical form for comparison) but does not pad short values, so '12345' and '123456789' remain distinct. Birthday is canonicalized to MM-DD on both sides via parseBirthdayMD; sheet rows entered as MM-DD, M-D, or full YYYY-MM-DD all match a front-end submission. Roster row's program_status defaults to 'active' if blank; non-active rows return no_match so a withdrawn or completed student can't sign in. <UserGate> follows <PasscodeGate>'s visual identity (gradient, logo, EB Garamond title pair, DM Mono caption, error panel, button) with two fields: a 9-digit CWID input (inputMode=numeric for the iOS keypad, maxLength=9, onChange strips non-digits so a paste like '123-456-789' cleans up automatically) and a birthday two-dropdown row (Spanish-primary month labels via MONTH_OPTIONS, day options re-cap when month changes via daysInMonthMD — Feb=29 for leap-year support, Apr/Jun/Sep/Nov=30, others=31). Title pair shifts to '¡Hola! / Hello!' with caption 'Decinos quién sos / Tell us who you are'; microline reads 'Buenos Aires Program' to signal continuation from the cohort gate. NoMatchError → 'We couldn't find you. Verify CWID and birthday' panel; AuthError (cohort token rotated mid-session) → calls onCohortReset to bounce back to <PasscodeGate> without showing a misleading wrong-credentials message; other errors → 'Couldn't connect' panel. Helper line at the bottom with a mailto link to buenosaires@pepperdine.edu. New currentUser state in <App>, lazy-init from localStorage at key bap-user, separate from cohort token (bap-cohort-token) and profile (bap-profile) so each piece can be cleared independently. Three-state gate flow: no SHEET_ID → preview mode; cohort token missing → <PasscodeGate>; cohort token present + currentUser missing → <UserGate>; both present → main UI. Returning students who have both keys skip both gates and land on Today instantly. Cohort code rotation clears both gates in lockstep — the data-fetch and refreshAllData AuthError handlers now clear the user alongside the cohort token, so a rotated code resets both gates rather than letting a stale identity from a previous cohort silently persist. New helpers: NoMatchError class; identifyUser() async function next to fetchAllData; loadUser/saveUser/clearUser at USER_KEY ('bap-user'); isStaffOrFaculty(user) for future role-gating (no callers yet); MONTH_OPTIONS constant; daysInMonthMD(monthStr); SELECT_CHEVRON inline SVG. Today greeting now reads from currentUser.preferred_name || currentUser.first_name (the authoritative roster identity) instead of profile.name (student-typed string); falls back to the bare greeting in preview mode or for users whose roster row has no first/preferred name. ProfileModal's 'Name' input replaced with a read-only 'Logged in as' card showing preferred-or-first name + last name, role (capitalized), email, and a confirmed 'Cerrar sesión / Sign out' button below. handleSignOut callback clears currentUser only — leaves cohort token AND profile (enrolledClasses, filterEnabled) intact, so signing back in restores everything. PROFILE_VERSION bumped 1 → 2 because the profile shape lost its name field; loadProfile gains a v1 → v2 migration that salvages enrolledClasses and filterEnabled rather than nuking the profile, so a student who already personalized doesn't lose their course selections on this deploy. CACHE_VERSION stays at 6 — content data shape unchanged. AuthCode.gs ships with two editor helpers: testReadRoster() to authorize the spreadsheet read scope, and validateRoster() to flag duplicate CWIDs (raw and normalized), missing required fields (cwid, birthday, first_name, role), unrecognized roles, malformed birthdays, malformed emails, CWIDs with non-digit characters, CWIDs that aren't exactly 9 digits, and CWIDs starting with leading zeros. Manual cutover steps after this lands: (a) populate the Roster sheet with the actual cohort, (b) confirm AUTH script's COHORT_TOKEN matches the content script's value, (c) run validateRoster() once to confirm no warnings, (d) commit + push, (e) announce to students that the app now asks for CWID and birthday after the access code. ============= 2026-05-11 — Weekly Overview navigation now bounded to a tight personal window: one week prior, current week, and up to two weeks ahead. Default lands on the current week as before. Prev/next chevron buttons render disabled (40% opacity, stone color, not-allowed cursor) at the bounds and the click handler is a no-op so a stuck tap can't push past the bounds. Implementation: two consts MIN_WEEK_OFFSET (-1) and MAX_WEEK_OFFSET (+2) inside WeeklyOverviewView, plus canGoBack/canGoForward booleans derived from the current weekOffset; setWeekOffset calls wrap in Math.max / Math.min as a belt-and-suspenders clamp. Earlier this day: optional per-prompt end_time cutoff. New `end_time` column on the Prompts sheet (HH:mm 24h, e.g. `20:00`) tightens the close on `end_date` from end-of-day to a specific time of day — useful for 'RSVP closes at 8 PM' style cutoffs on dinners and excursions. Blank end_time keeps the prior end-of-day-on-end_date behavior. Server side: `promptIsActive` adds a same-day time-of-day check (`Utilities.formatDate(new Date(), tz, 'HH:mm') > end_time` → not active); `buildPromptResponse` projects the new field; `validatePrompts` flags malformed end_times (must be `HH:mm`) and end_time set without end_date. Front side: new `formatPromptCutoff(prompt, now)` helper renders bilingual closes-at copy with three proximity tiers — 'Cierra hoy a las 20:00' when end_date is today, 'Cierra mañana a las 20:00' when it's tomorrow, 'Cierra el 15 de mayo a las 20:00' otherwise; degrades to 'Cerrado / Closed' once the cutoff has passed (so a stale cached entry doesn't claim the form is still open in the brief window before the next prompts fetch drops it). PromptCard rows on Today and PromptProfileSection rows in the gear modal both show the cutoff as a small DM Mono caption (`fontSize: 10`, `C.stone`) beneath the title; rows without an end_time render unchanged. Import xlsx regenerated with the new column populated for the welcome_dinner and tigre_excursion examples ('20:00' on welcome_dinner, '18:00' on tigre_excursion) so the demo data showcases the feature out of the box. Manual cutover: (a) add an `end_time` column to the existing `Prompts` tab in the Roster spreadsheet (just type the header in the next blank column; no row data needed unless you want to set cutoffs), (b) re-paste AuthCode.gs into the Apps Script editor and re-deploy as New Version. CACHE_VERSION stays at 6; PROMPTS_CACHE_TTL stays at 10 min so a Director-edited end_time propagates fast. Earlier this day: Per-student data collection via prompts + responses. Generalized 'Director defines a prompt in a sheet → app surfaces it to the right students → students submit → responses land back in a sheet' primitive — once it exists, every future use case (t-shirt sizes, meal RSVPs, activity sign-ups, evaluation surveys, weekly check-ins) is just a row in the Prompts tab, no code change. Two new tabs in the existing Roster spreadsheet (extends the auth permission boundary that already protected PII; avoids spinning up a third spreadsheet/script): `Prompts` (one row per logical question with prompt_id, title_es/en, description_es/en, audience, start_date, end_date, category, surface) and `PromptFields` (one row per input box, joined to Prompts by prompt_id; carries field_id, field_order, label_es/en, field_type, options [semicolon-delimited], option_labels_es/en, required, placeholder_es/en). The Responses tab (auto-created on first submit) is one row per (cwid, prompt_id, field_id) plus value + submitted_at. The two-tab split handles multi-field prompts cleanly — a meal RSVP with appetizer/main/dessert/comments is 1 Prompts row + 4 PromptFields rows; a t-shirt size is 1 + 1. Surface column ('today' / 'profile' / 'both') chooses where each prompt renders: time-bounded prompts on Today, evergreen ones inside ProfileModal. AuthCode.gs gains two new actions: GET ?action=prompts (re-validates identity, returns active prompts for the user with responses pre-filled, audience-filtered, date-window-gated) and POST submit (text/plain JSON body to avoid CORS preflight against Apps Script — application/json would trigger preflight and Apps Script doesn't implement doOptions). Submit re-validates identity on every call, runs each field through validateSubmissionValues against its declared type + required flag, upserts under a LockService script lock keyed on (cwid, prompt_id, field_id), and returns the refreshed prompt object so the front end can update local state without a follow-up fetch. Field types in v1: short_text, long_text, single_select, multi_select, number, boolean (date deferred until a concrete need shows up). Editor helper validatePrompts() in AuthCode.gs flags duplicate prompt_ids, fields pointing at unknown prompts, missing field_types, select fields with no options, malformed start_date/end_date, audience tokens that aren't 'all'/role/CWID, mismatched option_labels counts, etc. — same shape and Logger.log output as the existing validateRoster(). New App.jsx machinery: class SubmitError extends Error (carries .code + .details so PromptForm can branch on validation_failed / prompt_inactive / audience_mismatch / lock_failed for inline error copy); fetchPrompts and submitResponse async functions next to identifyUser, mirroring its AuthError/NoMatchError throw conventions; PROMPTS_CACHE_KEY ('bap-prompts-cache') with a 10-min TTL keyed by cwid (so a sign-out / sign-in on the same device doesn't surface the previous user's pending forms); filterPromptsBySurface and isPromptPending helpers. Birthday now lives in the bap-user envelope alongside the rest of the curated user record (small expansion of the threat-model trade — birthday on-device matches what's already stored: cwid, name, role, email — and the prompts/submit endpoints re-validate identity on every call so the credential is needed in localStorage; legacy records without birthday force a one-time re-prompt at the user gate, which loadUser handles by returning null when the birthday field is missing). New components: PromptFieldInput (renders one field per field_type — selects as tappable cards with ✓ for multi / • for single and bilingual EB Garamond labels, boolean as Sí/Yes vs No pill pair, number with inputMode='decimal' and digit-only sanitization, short_text/long_text as styled inputs with placeholder support); PromptForm (bottom-sheet wrapper, sticky-ref pattern preserves the prompt object across the BottomSheet's 260ms close animation so the form doesn't flash an empty fallback during exit, useEffect deps include only promptKey so a background prompts refresh while editing doesn't wipe in-progress edits, maps SubmitError.code to bilingual inline error panels); PromptCard (Today tile listing pending/answered prompts with surface=today/both, Pep Orange left stripe + 'Pendientes / For you' header, per-row: Pep Orange dot + Parchment bg for unanswered required-fields prompts, calmer Ocean dot + Ice bg for fully-answered, CTA shifts 'Responder →' / 'Completar →' / 'Editar →' based on state); PromptProfileSection (renders inside ProfileModal after the Logged-in-as card, lists profile/both prompts with a comma-joined preview of saved values for at-a-glance recall, italic 'Sin respuesta / No answer yet' fallback). Form sheet is rendered at App level (above ProfileModal in the JSX so it stacks correctly), state held in App as selectedPrompt; PromptCard and PromptProfileSection both bubble taps up via onOpenPrompt → setSelectedPrompt. handleSubmitPrompt updates prompts state in place after a successful submit (the script returns the refreshed prompt with new responses + submitted_at) and rewrites the per-cwid cache so both surfaces re-render in sync. Background prompts fetch effect runs once both gates are clear and the user has cwid + birthday, populating prompts state from the server and refreshing the cache. AuthError on any prompts call clears cohort token + user + prompts cache in lockstep (matches the existing sheet-data AuthError handler — same root cause, same response). NoMatchError on prompts/submit clears just the user (their roster row was likely removed mid-cohort). Sign out now also wipes the prompts cache and any open form. Two-spreadsheet permission isolation preserved: content script still has no read access to the Roster, auth script still has no read access to the content sheet, prompts/responses live entirely on the Roster side under the same auth boundary as the per-user identity check. CACHE_VERSION stays at 6 — content data shape unchanged; the prompts payload is its own cache layer. Manual cutover after this lands: (a) add Prompts and PromptFields tabs to the Roster spreadsheet (Responses auto-creates on first submit), (b) re-deploy AuthCode.gs (Apps Script editor → Deploy → Manage deployments → pencil icon → New version), (c) seed at least one Prompts row + its matching PromptFields rows (e.g. tshirt_size_2026 as a single-field profile-surface single_select with options 'XS;S;M;L;XL;2XL'), (d) run validatePrompts() from the editor to confirm no warnings, (e) commit + push, (f) existing students get a one-time CWID + birthday re-prompt on next open as legacy user records without birthday are discarded. Earlier this day: 60-day expiry on stored auth credentials. Both `bap-cohort-token` and `bap-user` localStorage entries now wrap their value in a `{ value/token, savedAt }` envelope; loadCohortToken and loadUser treat anything older than AUTH_TTL_MS (60 days) as missing and the student gets re-prompted at the appropriate gate. Soft floor against a phone passed to someone else who never signs out, and stays well outside the typical 'I forgot my code' window. Backward-compatible: the legacy plain-string cohort token and the legacy flat user record (both shipped before this commit) are accepted as still-valid on load; the next save upgrades each to the envelope format, after which the TTL kicks in. Detection heuristic for cohort token: `raw.charAt(0) === '{'` flags the envelope so we don't pay JSON.parse on plain-string legacy values. New constant: AUTH_TTL_MS. No new dependencies; no schema versioning needed (the envelope shape is content-detected, not version-keyed). Earlier this day: per-user identification via CWID + birthday gate. ============= 2026-05-09 — Per-user identification via CWID + birthday gate. New <UserGate> component renders after <PasscodeGate> succeeds, before any per-user features. Probes a separate Apps Script (AuthCode.gs, bound to a new 'BAP App Roster' spreadsheet — physically distinct from the content spreadsheet for permission isolation) with the entered CWID + birthday; on match returns a curated user record, on mismatch returns no_match. The two-spreadsheet split is the load-bearing security design: the content script literally has no read access to the Roster, and the auth script literally has no read access to the content sheet, so a bug in either can't leak data from the other. New AUTH_SCRIPT_URL constant alongside APPS_SCRIPT_URL; the same COHORT_TOKEN value lives in both Script Properties (one cohort code, two homes; rotation is two 30-second copies). Identify endpoint shape: ?action=identify&token=...&cwid=...&birthday=... → { user: { cwid, first_name, last_name, preferred_name, pronouns, role, email, whatsapp, housing_assignment, tshirt_size, tshirt_fit, dietary_restrictions, food_allergies, program_status } } or { error: 'no_match' | 'unauthorized' | 'bad_request' }. Birthday is intentionally omitted from the response — the student already knows it; echoing back is a small leak surface for nothing. Tier-C fields (medical, passport, emergency contacts) deliberately stay out of the Roster sheet. CWID normalization is lenient on input variation (strips non-digits and leading zeros so '123456789', '0123456789', '123-456-789', and ' 123456789 ' all collapse to the same canonical form for comparison) but does not pad short values, so '12345' and '123456789' remain distinct. Birthday is canonicalized to MM-DD on both sides via parseBirthdayMD; sheet rows entered as MM-DD, M-D, or full YYYY-MM-DD all match a front-end submission. Roster row's program_status defaults to 'active' if blank; non-active rows return no_match so a withdrawn or completed student can't sign in. <UserGate> follows <PasscodeGate>'s visual identity (gradient, logo, EB Garamond title pair, DM Mono caption, error panel, button) with two fields: a 9-digit CWID input (inputMode=numeric for the iOS keypad, maxLength=9, onChange strips non-digits so a paste like '123-456-789' cleans up automatically) and a birthday two-dropdown row (Spanish-primary month labels via MONTH_OPTIONS, day options re-cap when month changes via daysInMonthMD — Feb=29 for leap-year support, Apr/Jun/Sep/Nov=30, others=31). Title pair shifts to '¡Hola! / Hello!' with caption 'Decinos quién sos / Tell us who you are'; microline reads 'Buenos Aires Program' to signal continuation from the cohort gate. NoMatchError → 'We couldn't find you. Verify CWID and birthday' panel; AuthError (cohort token rotated mid-session) → calls onCohortReset to bounce back to <PasscodeGate> without showing a misleading wrong-credentials message; other errors → 'Couldn't connect' panel. Helper line at the bottom with a mailto link to buenosaires@pepperdine.edu. New currentUser state in <App>, lazy-init from localStorage at key bap-user, separate from cohort token (bap-cohort-token) and profile (bap-profile) so each piece can be cleared independently. Three-state gate flow: no SHEET_ID → preview mode; cohort token missing → <PasscodeGate>; cohort token present + currentUser missing → <UserGate>; both present → main UI. Returning students who have both keys skip both gates and land on Today instantly. Cohort code rotation clears both gates in lockstep — the data-fetch and refreshAllData AuthError handlers now clear the user alongside the cohort token, so a rotated code resets both gates rather than letting a stale identity from a previous cohort silently persist. New helpers: NoMatchError class; identifyUser() async function next to fetchAllData; loadUser/saveUser/clearUser at USER_KEY ('bap-user'); isStaffOrFaculty(user) for future role-gating (no callers yet); MONTH_OPTIONS constant; daysInMonthMD(monthStr); SELECT_CHEVRON inline SVG. Today greeting now reads from currentUser.preferred_name || currentUser.first_name (the authoritative roster identity) instead of profile.name (student-typed string); falls back to the bare greeting in preview mode or for users whose roster row has no first/preferred name. ProfileModal's 'Name' input replaced with a read-only 'Logged in as' card showing preferred-or-first name + last name, role (capitalized), email, and a confirmed 'Cerrar sesión / Sign out' button below. handleSignOut callback clears currentUser only — leaves cohort token AND profile (enrolledClasses, filterEnabled) intact, so signing back in restores everything. PROFILE_VERSION bumped 1 → 2 because the profile shape lost its name field; loadProfile gains a v1 → v2 migration that salvages enrolledClasses and filterEnabled rather than nuking the profile, so a student who already personalized doesn't lose their course selections on this deploy. CACHE_VERSION stays at 6 — content data shape unchanged. AuthCode.gs ships with two editor helpers: testReadRoster() to authorize the spreadsheet read scope, and validateRoster() to flag duplicate CWIDs (raw and normalized), missing required fields (cwid, birthday, first_name, role), unrecognized roles, malformed birthdays, malformed emails, CWIDs with non-digit characters, CWIDs that aren't exactly 9 digits, and CWIDs starting with leading zeros. Manual cutover steps after this lands: (a) populate the Roster sheet with the actual cohort, (b) confirm AUTH script's COHORT_TOKEN matches the content script's value, (c) run validateRoster() once to confirm no warnings, (d) commit + push, (e) announce to students that the app now asks for CWID and birthday after the access code.";

// ============================================================
// ★ CONFIGURATION — Only edit this section ★
// ============================================================
const SHEET_ID = "1Bn1wpsKr6-3eXRZtH-_6IxmTiQA4I157-nt-0tdmyaA";

// Apps Script Web App that returns all sheet tabs as one JSON blob.
// As of 2026-05-03 this is the only data path; the gviz fallback was
// removed so the cohort token in Script Properties is the single
// source of access control. Every request must carry ?token=<value>
// matching the COHORT_TOKEN set in the script's Properties — without
// it the script returns { error: "unauthorized" }.
// Deploy via Extensions > Apps Script in the spreadsheet, with
// "Execute as: Me" and "Who has access: Anyone".
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwZUxnUtb39W_LtY_DPdSp9RvUx_pXBqCtx7fnB7O9lqEeSMD5hrbqkQTKa72YdB_E/exec";

// Roster auth endpoint. A separate Apps Script bound to the
// "BAP App Roster" spreadsheet (physically distinct from the
// content spreadsheet, for permission isolation — the content
// script literally has no read access to the roster). Validates
// CWID + birthday against the Roster tab; called only by the
// <UserGate> component, never by the data path.
//   ?action=identify&token=<cohort>&cwid=<cwid>&birthday=<MM-DD>
//     → { user: { ... } }
//     → { error: "unauthorized" | "no_match" | "bad_request" }
// Same COHORT_TOKEN value as APPS_SCRIPT_URL; one cohort code,
// two homes (one Script Property in each script).
const AUTH_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxpBDFtPQpJ-tZ5ap-G8UvJ7K9OJGu2eZI0xcCI_ib1A9brq3uR5idKHMUter6RxXFP/exec";

// ============================================================
// DEFAULT DATA — Used when no Google Sheet is connected
// ============================================================

const DEFAULT_DATA = {
  semester: "Summer 2026",
  finals_window_start: "2026-07-13",
  finals_window_end: "2026-07-13",
  classes: [
    { code: "IES 300", title: "Argentine History & Society", professor: "García", honorific: "Prof.", firstname: "Ana", days: ["Mon", "Wed"], time: "9:00–10:30", location: "Classroom A", color: "#0057B8", email: "", start_date: "2026-05-18", end_date: "2026-07-10", final_date: "", final_time: "" },
    { code: "SPA 201", title: "Intermediate Spanish II", professor: "Martínez", honorific: "Prof.", firstname: "Carlos", days: ["Mon", "Tue", "Thu"], time: "11:00–12:00", location: "Classroom B", color: "#64B5F6", email: "", start_date: "2026-05-18", end_date: "2026-07-10", final_date: "", final_time: "" },
    { code: "REL 100", title: "The Way of Jesus", professor: "Smith", honorific: "Dr.", firstname: "John", days: ["Tue", "Thu"], time: "14:00–15:30", location: "Classroom A", color: "#425563", email: "", start_date: "2026-05-18", end_date: "2026-07-10", final_date: "", final_time: "" },
    { code: "COM 300", title: "Intercultural Communication", professor: "Álvarez", honorific: "Prof.", firstname: "María", days: ["Wed", "Fri"], time: "14:00–15:30", location: "Classroom C", color: "#6CACE4", email: "", start_date: "2026-05-18", end_date: "2026-07-10", final_date: "", final_time: "" },
    { code: "ART 280", title: "Tango & Argentine Arts", professor: "Reyes", honorific: "Prof.", firstname: "Lucía", days: ["Fri"], time: "10:00–12:30", location: "Studio", color: "#E35205", email: "", start_date: "2026-05-18", end_date: "2026-07-10", final_date: "", final_time: "" },
  ],
  calendarEvents: [
    { date: "2026-08-10", end_date: "", title: "Arrival Day", type: "program", description: "Airport pickup and welcome dinner", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-11", end_date: "2026-08-13", title: "Orientation", type: "orientation", description: "Three-day orientation program", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-14", end_date: "", title: "Classes begin", type: "academic", description: "First day of classes", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-21", end_date: "2026-08-24", title: "Study Tour: Córdoba", type: "excursion", description: "Four-day study tour", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-28", end_date: "", title: "City Tour", type: "excursion", description: "Guided walking tour of downtown BA", start_time: "10:00", end_time: "13:00", visibility: "both" },
    { date: "2026-09-04", end_date: "", title: "Asado", type: "program", description: "Weekly asado", start_time: "13:40", end_time: "14:40", visibility: "week" },
  ],
  healthProviders: [
    { name: "Dr. Example", type: "Doctor", address: "Av. Santa Fe 1234", phone: "+54 11 1234-5678", notes: "GeoBlue", link: "", insurance: "bcbs" },
  ],
  churches: [
    { name: "Saddleback Buenos Aires", denomination: "Non-denom.", address: "Mario Bravo 559", service: "11AM, 5PM, 7PM (Spanish & English)", notes: "35 mins by subte/bus", link: "" },
    { name: "Comunidad Cristiana BA", denomination: "Non-denom.", address: "Av. Medrano 951, Almagro", service: "Sun 11:00 (Spanish)", notes: "Young congregation; contemporary worship", link: "" },
  ],
  faq: [
    { title: "Independent Travel", content: "Students may travel independently on weekends and during break. A travel form must be submitted 48 hours in advance via the program portal. Group travel of 2+ is strongly encouraged.", link: "https://example.com/handbook/travel-policy" },
    { title: "Curfew", content: "There is no formal curfew, but students must be reachable by phone at all times. Quiet hours in the residences are 11:00 PM – 7:00 AM.", link: "" },
    { title: "Attendance", content: "Attendance is mandatory for all classes and program excursions. Two unexcused absences per course may result in a grade reduction.", link: "https://example.com/handbook/attendance" },
    { title: "Emergency Contact", content: "Program Director is available 24/7 at the emergency number provided during orientation. In a life-threatening emergency, call 107 (SAME ambulance) or 911.", link: "https://example.com/handbook/emergency" },
  ],
  apps: [
    { name: "Google Maps", category: "Navigation", description: "Maps, transit, and walking directions.", ios_url: "https://apps.apple.com/app/google-maps/id585027354", android_url: "https://play.google.com/store/apps/details?id=com.google.android.apps.maps", web_url: "", priority: "essential" },
    { name: "BA Cómo Llego", category: "Navigation", description: "Official CABA transit planner; bus, subte, and train combos.", ios_url: "", android_url: "", web_url: "https://www.buenosaires.gob.ar/comollego", priority: "essential" },
    { name: "Uber", category: "Transportation", description: "Rideshare; widely available in BA.", ios_url: "https://apps.apple.com/app/uber/id368677368", android_url: "https://play.google.com/store/apps/details?id=com.ubercab", web_url: "", priority: "essential" },
    { name: "Cabify", category: "Transportation", description: "Rideshare alternative; often cheaper than Uber.", ios_url: "", android_url: "", web_url: "https://cabify.com/ar", priority: "recommended" },
    { name: "DiDi", category: "Transportation", description: "Rideshare; frequent promos for new users.", ios_url: "", android_url: "", web_url: "https://global.didiglobal.com", priority: "recommended" },
    { name: "PedidosYa", category: "Food & Delivery", description: "Food and grocery delivery; dominant in BA.", ios_url: "", android_url: "", web_url: "https://www.pedidosya.com.ar", priority: "essential" },
    { name: "Rappi", category: "Food & Delivery", description: "Food, groceries, pharmacy, and cash delivery.", ios_url: "", android_url: "", web_url: "https://www.rappi.com.ar", priority: "essential" },
    { name: "SUBE", category: "Finance", description: "Check SUBE card balance; top up online.", ios_url: "", android_url: "", web_url: "https://www.argentina.gob.ar/sube", priority: "essential" },
    { name: "Mercado Pago", category: "Finance", description: "QR payments and transfers; ubiquitous in Argentina.", ios_url: "", android_url: "", web_url: "https://www.mercadopago.com.ar", priority: "recommended" },
    { name: "Dólar Hoy", category: "Finance", description: "Track the blue dollar exchange rate.", ios_url: "", android_url: "", web_url: "https://dolarhoy.com", priority: "recommended" },
    { name: "WhatsApp", category: "Comms", description: "Primary messaging app in Argentina.", ios_url: "https://apps.apple.com/app/whatsapp-messenger/id310633997", android_url: "https://play.google.com/store/apps/details?id=com.whatsapp", web_url: "", priority: "essential" },
  ],
  contacts: [
    { name: "Buenos Aires Program", role: "Program Office", phone: "+5491151561793", whatsapp: "", email: "buenosaires@pepperdine.edu", address: "11 de Septiembre de 1888 955, CABA", maps: "https://maps.app.goo.gl/HQt8A6ZQABrhL7rG7", type: "office" },
    { name: "Emergency Line", role: "24/7 Emergency", phone: "+5491151561793", whatsapp: "", email: "", address: "", maps: "", type: "emergency" },
    { name: "Travis Hill-Weber", role: "Program Director", phone: "+5491151561793", whatsapp: "https://wa.me/5491151561793", email: "travis.hillweber@pepperdine.edu", address: "", maps: "", type: "staff" },
    { name: "Harmony Hill-Weber", role: "Coordinator of Student Life", phone: "+5491123188597", whatsapp: "https://wa.me/5491151561793", email: "harmony.hillweber@pepperdine.edu", address: "", maps: "", type: "staff" },
  ],
  explore: [
    { name: "MALBA", type: "Museum", description: "Premier Latin American art museum", address: "Av. Figueroa Alcorta 3415, Palermo", hours: "Thu–Mon 12–8pm", link: "https://www.malba.org.ar" },
    { name: "San Telmo", type: "Neighborhood", description: "Bohemian cobblestone neighborhood known for tango and antiques", address: "Defensa & surrounding streets", hours: "", link: "" },
    { name: "Teatro Colón", type: "Landmark", description: "One of the world's top opera houses", address: "Cerrito 628, Microcentro", hours: "Tours daily 9am–5pm", link: "https://teatrocolon.org.ar" },
  ],
  resources: [
    { name: "U.S. Embassy Buenos Aires", detail: "Av. Colombia 4300, Palermo", phone: "+54 11 5777-4533", url: "https://ar.usembassy.gov/" },
    { name: "International SOS (ISOS)", detail: "Pepperdine travel assistance", phone: "+1 215-842-9000", url: "https://www.internationalsos.com" },
    { name: "GeoBlue / BCBS", detail: "Student health insurance", phone: "+1 610-254-8771", url: "https://www.geo-blue.com" },
    { name: "Pepperdine Campus Safety", detail: "Malibu campus (24/7)", phone: "+1 310-506-4442", url: "" },
  ],
  announcements: [
    { message: "Add/Drop period ends Friday, August 28. Contact your advisor with any changes.", type: "info", start_date: "2026-08-24", end_date: "2026-08-28", icon: "📋", link: "" },
  ],
  tips: [
    { text: 'Buenos Aires literally means "Good Air."', category: "city" },
    { text: "*Dale* is yes, no, sure, ok, and \u201clet\u2019s go,\u201d all at once.", category: "phrases" },
    { text: "Most caf\u00e9s bring you a free glass of soda water with every coffee.", category: "food" },
    { text: "*Che* is how you get someone\u2019s attention. No one takes offense.", category: "phrases" },
  ],
  events: [
    { title: "Festival de Tango BA", category: "festival", description: "Citywide tango festival; free milongas across town.", start_date: "2026-08-15", end_date: "2026-08-25", time: "", venue: "Various", neighborhood: "Citywide", address: "", link: "https://festivales.buenosaires.gob.ar", cost: "Free" },
    { title: "Frida Kahlo en MALBA", category: "exhibit", description: "Touring exhibition; recommended on a weekday.", start_date: "2026-08-01", end_date: "2026-09-30", time: "", venue: "MALBA", neighborhood: "Palermo", address: "Av. Figueroa Alcorta 3415", link: "https://www.malba.org.ar", cost: "$5.000 ARS" },
    { title: "La Bomba de Tiempo", category: "music", description: "Improvised percussion ensemble; a Monday-night BA institution.", start_date: "2026-08-17", end_date: "", time: "20:00", venue: "Konex", neighborhood: "Almagro", address: "Sarmiento 3131", link: "https://ciudadculturalkonex.org", cost: "$8.000 ARS" },
    { title: "Comedor comunitario en Barracas", category: "service", description: "Help serve dinner at a neighborhood soup kitchen; Spanish helpful but not required.", start_date: "2026-08-20", end_date: "", time: "18:00", venue: "Comedor Los Pibes", neighborhood: "Barracas", address: "", link: "", cost: "Free" },
  ],
  // Sample holidays so the fallback / first-load case still surfaces
  // an example. The live Holidays sheet tab supersedes this list once
  // the cohort's app fetches.
  holidays: [
    {
      date: "2026-08-17",
      name_es: "Paso a la Inmortalidad del Gral. San Martín",
      name_en: "General San Martín Memorial Day",
      cancels_classes: true,
      observance_type: "national",
      description_es: "Día del Libertador. Honra a José de San Martín, que liberó a Argentina, Chile y Perú del dominio español. Su figura es central en la identidad nacional; vas a ver su nombre en plazas, calles, billetes y monumentos por todo el país.",
      description_en: "Liberator's Day. Honors José de San Martín, who freed Argentina, Chile, and Peru from Spanish rule. His name and image are everywhere in the country — plazas, streets, currency, and monuments.",
    },
  ],
  // Birthdays default to empty — the program office populates the
  // sheet tab; without real data, the card simply doesn't render.
  birthdays: [],
};

// ============================================================
// GOOGLE SHEETS FETCHER
// ============================================================

// Thrown when the Apps Script rejects a request because the cohort
// token is missing or wrong. The auth gate catches this specifically
// to clear the bad token from localStorage and re-prompt the student
// instead of falling through to the generic error path.
class AuthError extends Error {
  constructor(message) {
    super(message || "unauthorized");
    this.name = "AuthError";
  }
}

// Thrown by identifyUser() when the auth script returns
// { error: "no_match" } — the CWID isn't in the roster, the
// birthday doesn't line up, or the row's program_status isn't
// "active". <UserGate> catches this specifically to show a
// "We couldn't find you" message rather than a generic network
// error. Distinct from AuthError so a stale cohort token (which
// returns "unauthorized") triggers the cohort gate, not the user
// gate's wrong-credentials panel.
class NoMatchError extends Error {
  constructor(message) {
    super(message || "no_match");
    this.name = "NoMatchError";
  }
}

// Parse day codes from the spreadsheet. Accepts both single-letter
// concatenated codes (e.g. "MTWR") and comma-separated three-letter
// abbreviations (e.g. "Mon,Tue,Wed"). Returns an array like ["Mon","Tue"].
const DAY_LETTER_MAP = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" };

function parseDays(raw) {
  if (!raw) return [];
  const s = raw.trim();
  // If it contains a comma or a three-letter day name, use the old split approach
  if (s.includes(",") || /\b(Mon|Tue|Wed|Thu|Fri)\b/.test(s)) {
    return s.split(",").map((d) => d.trim());
  }
  // Otherwise treat each character as a single-letter day code
  return [...s].map((ch) => DAY_LETTER_MAP[ch.toUpperCase()]).filter(Boolean);
}

// Parse a spreadsheet cell's boolean-ish value. Google Sheets exports
// booleans as upper-case "TRUE"/"FALSE" via the gviz CSV endpoint, but
// users often type "yes", "1", "x", "✓", or even leave a non-empty
// blank-ish string. Anything that doesn't look affirmative is false.
function parseBoolean(raw) {
  if (raw === true) return true;
  if (raw === false || raw == null) return false;
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1" || s === "x" || s === "✓" || s === "si" || s === "sí";
}

// Normalize a birthday date cell to a "MM-DD" string for matching.
// Accepts MM-DD, M-D, or full YYYY-MM-DD; the year is intentionally
// stripped because birthdays match annually and the app never wants
// to display or compute age. Returns null on anything unparseable.
function parseBirthdayMD(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Full date YYYY-MM-DD (year ignored)
  const full = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (full) {
    return `${String(parseInt(full[2], 10)).padStart(2, "0")}-${String(parseInt(full[3], 10)).padStart(2, "0")}`;
  }
  // MM-DD or M-D
  const md = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (md) {
    return `${String(parseInt(md[1], 10)).padStart(2, "0")}-${String(parseInt(md[2], 10)).padStart(2, "0")}`;
  }
  return null;
}

// Today's MM-DD for matching against birthday rows. Uses the user's
// local clock (intentional: a student in Buenos Aires sees birthdays
// based on their wall clock, regardless of where the app is hosted).
function getTodayMD() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// All birthday rows whose MM-DD matches today's. Caller renders zero
// or more matches. Multiple matches are common-enough to design for
// (1-3 names per day in a small program; >3 falls back to a list view).
function findTodayBirthdays(birthdays) {
  if (!Array.isArray(birthdays)) return [];
  const today = getTodayMD();
  return birthdays.filter((b) => b.md === today);
}

// Spanish-style list join: "A, B, C y D". Used for the Today birthday
// card title when multiple people share a birthday.
function joinSpanish(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

// Normalize raw tab arrays into the shape the rest of the app expects.
// Shared by both fetch paths (consolidated Apps Script and per-tab gviz),
// so the rendered output is identical regardless of how the data arrived.
// Input keys match the sheet tab names exactly, mirroring what the Apps
// Script endpoint returns.
function normalizeData(raw) {
  const Settings = raw.Settings || [];
  const Classes = raw.Classes || [];
  const Calendar = raw.Calendar || [];
  const Health = raw.Health || [];
  const Churches = raw.Churches || [];
  const FAQ = raw.FAQ || [];
  const Contacts = raw.Contacts || [];
  const Explore = raw.Explore || [];
  const Resources = raw.Resources || [];
  const Announcements = raw.Announcements || [];
  const Apps = raw.Apps || [];
  const Tips = raw.Tips || [];
  const Events = raw.Events || [];
  const Holidays = raw.Holidays || [];
  const Birthdays = raw.Birthdays || [];

  const settings = {};
  Settings.forEach((r) => { if (r.Key && r.Value) settings[r.Key.trim()] = r.Value.trim(); });

  return {
    semester: settings.semester || "Summer 2026",
    // Program-wide finals window. When populated, the Today tab and the
    // Schedule tab use this range to (a) decide when to surface the
    // upcoming-finals UI (2 weeks before the window opens) and (b)
    // render a "TBD · {window}" hint for any class whose final_date
    // hasn't been filled in yet. Both blank → finals UI never appears.
    finals_window_start: settings.finals_window_start || "",
    finals_window_end: settings.finals_window_end || "",
    classes: Classes.filter(r => r.code).map((r) => ({
      code: r.code.trim(),
      title: r.title.trim(),
      professor: r.professor ? r.professor.trim() : "",
      honorific: r.honorific ? r.honorific.trim() : "",
      firstname: r.firstname ? r.firstname.trim() : "",
      days: parseDays(r.days),
      time: r.time.trim(),
      location: r.location.trim(),
      color: r.color ? r.color.trim() : "#64B5F6",
      email: r.email ? r.email.trim() : "",
      // Optional date-gating fields. start_date and end_date bracket
      // the regular meeting period: outside this window the class is
      // suppressed from Today and Weekly Overview but stays visible in
      // Class Schedule and Courses (browseable catalog). Either blank
      // → no gating on that side. final_date and final_time describe
      // the assigned final exam slot; both blank → "TBD" against the
      // program's finals window from Settings.
      start_date: r.start_date ? r.start_date.trim().slice(0, 10) : "",
      end_date: r.end_date ? r.end_date.trim().slice(0, 10) : "",
      final_date: r.final_date ? r.final_date.trim().slice(0, 10) : "",
      final_time: r.final_time ? r.final_time.trim() : "",
    })),
    calendarEvents: Calendar.filter(r => r.date).map((r) => ({
      date: r.date.trim(),
      end_date: r.end_date ? r.end_date.trim().slice(0, 10) : "",
      title: r.title.trim(),
      type: r.type ? r.type.trim() : "academic",
      description: r.description ? r.description.trim() : "",
      start_time: r.start_time ? r.start_time.trim() : "",
      end_time: r.end_time ? r.end_time.trim() : "",
      visibility: r.visibility ? r.visibility.trim().toLowerCase() : "both",
    })),
    healthProviders: Health.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      type: r.type ? r.type.trim() : "",
      address: r.address ? r.address.trim() : "",
      location_note: r.location_note ? r.location_note.trim() : "",
      phone: r.phone ? r.phone.trim() : "",
      notes: r.notes ? r.notes.trim() : "",
      link: r.link ? r.link.trim() : "",
      insurance: r.insurance ? r.insurance.trim() : "",
      category: r.category ? r.category.trim().toLowerCase() : "",
    })),
    churches: Churches.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      denomination: r.denomination ? r.denomination.trim() : "",
      address: r.address ? r.address.trim() : "",
      location_note: r.location_note ? r.location_note.trim() : "",
      service: r.service ? r.service.trim() : "",
      notes: r.notes ? r.notes.trim() : "",
      link: r.link ? r.link.trim() : "",
    })),
    faq: FAQ.filter(r => r.title).map((r) => ({
      title: r.title.trim(),
      content: r.content ? r.content.trim() : "",
      link: r.link ? r.link.trim() : "",
    })),
    contacts: Contacts.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      role: r.role ? r.role.trim() : "",
      phone: r.phone ? r.phone.trim() : "",
      whatsapp: r.whatsapp ? r.whatsapp.trim() : "",
      email: r.email ? r.email.trim() : "",
      address: r.address ? r.address.trim() : "",
      maps: r.maps ? r.maps.trim() : "",
      type: r.type ? r.type.trim() : "staff",
    })),
    explore: Explore.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      type: r.type ? r.type.trim() : "",
      description: r.description ? r.description.trim() : "",
      address: r.address ? r.address.trim() : "",
      location_note: r.location_note ? r.location_note.trim() : "",
      hours: r.hours ? r.hours.trim() : "",
      link: r.link ? r.link.trim() : "",
    })),
    resources: Resources.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      detail: r.detail ? r.detail.trim() : "",
      phone: r.phone ? r.phone.trim() : "",
      url: r.url ? r.url.trim() : "",
    })),
    announcements: Announcements.filter(r => r.message).map((r) => ({
      message: r.message.trim(),
      type: r.type ? r.type.trim().toLowerCase() : "info",
      start_date: r.start_date ? r.start_date.trim() : "",
      end_date: r.end_date ? r.end_date.trim() : "",
      icon: r.icon ? r.icon.trim() : "📋",
      link: r.link ? r.link.trim() : "",
    })),
    apps: Apps.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      category: r.category ? r.category.trim() : "",
      description: r.description ? r.description.trim() : "",
      ios_url: r.ios_url ? r.ios_url.trim() : "",
      android_url: r.android_url ? r.android_url.trim() : "",
      web_url: r.web_url ? r.web_url.trim() : "",
      priority: r.priority ? r.priority.trim().toLowerCase() : "",
    })),
    tips: Tips.filter(r => r.text).map((r) => ({
      text: r.text.trim(),
      category: r.category ? r.category.trim().toLowerCase() : "",
    })),
    events: Events.filter(r => r.title && r.start_date).map((r) => ({
      title: r.title.trim(),
      category: r.category ? r.category.trim().toLowerCase() : "other",
      description: r.description ? r.description.trim() : "",
      start_date: r.start_date.trim().slice(0, 10),
      end_date: r.end_date ? r.end_date.trim().slice(0, 10) : "",
      time: r.time ? r.time.trim() : "",
      venue: r.venue ? r.venue.trim() : "",
      neighborhood: r.neighborhood ? r.neighborhood.trim() : "",
      address: r.address ? r.address.trim() : "",
      link: r.link ? r.link.trim() : "",
      cost: r.cost ? r.cost.trim() : "",
    })),
    // Holidays sheet rows. cancels_classes is parsed as a boolean from
    // common spreadsheet truthy strings ("TRUE", "true", "1", "yes",
    // "x", "✓"). Anything else is false. observance_type is free-form
    // text but we lowercase it for downstream comparison.
    holidays: Holidays.filter(r => r.date && (r.name_es || r.name_en)).map((r) => ({
      date: r.date.trim().slice(0, 10),
      name_es: r.name_es ? r.name_es.trim() : "",
      name_en: r.name_en ? r.name_en.trim() : "",
      cancels_classes: parseBoolean(r.cancels_classes),
      observance_type: r.observance_type ? r.observance_type.trim().toLowerCase() : "",
      description_es: r.description_es ? r.description_es.trim() : "",
      description_en: r.description_en ? r.description_en.trim() : "",
    })),
    // Birthday rows. Date is normalized to MM-DD; rows that fail to
    // parse are dropped silently. The role column is preserved but
    // unused by the current UI.
    birthdays: Birthdays.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      md: parseBirthdayMD(r.date),
      role: r.role ? r.role.trim().toLowerCase() : "",
    })).filter((b) => b.md),
  };
}

// Sole data path: one round trip to the Apps Script Web App, which
// returns all 15 tabs as a single JSON blob. The script caches its
// own response for 1 hour via CacheService, so most hits don't
// re-read the spreadsheet at all.
//
// `token` is the cohort passcode the student entered at the auth
// gate; it's appended as ?token=<value> and the script rejects the
// request if it doesn't match the COHORT_TOKEN in Script Properties.
// A rejection is detected by the { error: "unauthorized" } shape
// (the script always returns 200 with JSON; doGet can't set status
// codes) and re-thrown as AuthError so the gate can re-prompt.
//
// `bust=true` appends ?bust=1 so the script's CacheService entry is
// bypassed and the spreadsheet is re-read. Used by the pull-to-refresh
// gesture on Today; without it a freshly edited sheet can take up to
// an hour to appear.
async function fetchAllData({ token, bust = false } = {}) {
  if (!APPS_SCRIPT_URL) throw new Error("APPS_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  const params = new URLSearchParams({ token });
  if (bust) params.set("bust", "1");
  const url = `${APPS_SCRIPT_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Apps Script endpoint returned ${res.status}`);
  const tabs = await res.json();
  if (tabs && tabs.error === "unauthorized") throw new AuthError();
  return normalizeData(tabs);
}

// Hit the auth script's identify endpoint with the cohort token
// plus a CWID and a MM-DD birthday. Returns the curated user
// record on success. On rejection, throws AuthError (cohort token
// stale — cohort code rotated since the student last opened) or
// NoMatchError (credentials don't match a row). Anything else
// bubbles as a generic Error so the gate can show "Couldn't
// connect" rather than a misleading "wrong credentials."
async function identifyUser({ token, cwid, birthday }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  if (!cwid || !birthday) throw new Error("missing cwid or birthday");
  const params = new URLSearchParams({ action: "identify", token, cwid, birthday });
  const url = `${AUTH_SCRIPT_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error === "no_match") throw new NoMatchError();
  if (body && body.error) throw new Error(`Auth script error: ${body.error}`);
  if (!body || !body.user) throw new Error("Auth script returned no user");
  return body.user;
}

// Thrown by submitResponse() when the auth script rejects a payload
// for a reason other than auth — typically validation_failed (a
// required field was empty, or a select value isn't in the options
// list) or audience_mismatch / prompt_inactive (the prompt closed
// out from under the student between page load and submit). Carries
// the script's machine-readable error code so the form can surface
// the right copy. Distinct from AuthError so the gate flow isn't
// triggered on a normal validation failure.
class SubmitError extends Error {
  constructor(code, details) {
    super(code || "submit_failed");
    this.name = "SubmitError";
    this.code = code || "submit_failed";
    this.details = details || "";
  }
}

// Pull the active prompts for a user from the auth script's
// /prompts endpoint. Returns the array as-is. The script does the
// audience filtering and active-window check, and pre-fills any
// existing responses for this user, so the front end mostly just
// renders. Errors mirror identifyUser: AuthError on stale cohort
// token (caller clears state and bounces to the cohort gate),
// NoMatchError on a stale stored user (caller clears the user and
// bounces to the user gate), generic Error on anything else.
async function fetchPrompts({ token, cwid, birthday }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  if (!cwid || !birthday) throw new Error("missing cwid or birthday");
  const params = new URLSearchParams({ action: "prompts", token, cwid, birthday });
  const url = `${AUTH_SCRIPT_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error === "no_match") throw new NoMatchError();
  if (body && body.error) throw new Error(`Auth script error: ${body.error}`);
  return Array.isArray(body && body.prompts) ? body.prompts : [];
}

// Submit a single prompt's field values back to the auth script.
// POSTed as text/plain with a JSON body — text/plain avoids the
// CORS preflight that application/json would trigger against an
// Apps Script Web App (Apps Script doesn't implement doOptions, so
// preflight requests fail). The script re-validates identity on
// every submit so a stolen cohort token alone can't write
// submissions on behalf of someone else. Returns the refreshed
// prompt object (same shape as fetchPrompts entries) so the caller
// can update its local state without a follow-up fetch.
async function submitResponse({ token, cwid, birthday, prompt_id, fields }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  if (!cwid || !birthday) throw new Error("missing cwid or birthday");
  if (!prompt_id) throw new Error("missing prompt_id");
  const res = await fetch(AUTH_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "submit", token, cwid, birthday, prompt_id, fields: fields || {},
    }),
  });
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error === "no_match") throw new NoMatchError();
  if (body && body.error) throw new SubmitError(body.error, body.details);
  if (!body || !body.prompt) throw new Error("Auth script returned no prompt");
  return body.prompt;
}

// ============================================================
// LOCAL CACHE — Stale-while-revalidate
// Renders cached data instantly on repeat opens, then refreshes
// in the background. Drops perceived load time to ~zero.
// Bump CACHE_VERSION whenever the data shape changes so old
// caches are ignored instead of crashing the app.
// ============================================================

const CACHE_KEY = "bap-app-cache";
const CACHE_VERSION = 6;

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CACHE_VERSION) return null;
    if (!parsed.data) return null;
    return { data: parsed.data, timestamp: parsed.timestamp || 0 };
  } catch (e) {
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // Quota exceeded or storage disabled; silently skip
  }
}

// ============================================================
// COHORT AUTH TOKEN — Required to fetch any data
// Stored at its own localStorage key (bap-cohort-token). When
// missing or rejected, the app renders <PasscodeGate> instead of
// the main UI. The token is the shared cohort passcode the
// program office hands out at orientation; rotated each cohort by
// editing the COHORT_TOKEN entry in Apps Script Properties (no
// re-deploy needed for rotation).
// ============================================================

const COHORT_TOKEN_KEY = "bap-cohort-token";

// 60-day expiry on both stored auth credentials (cohort token
// and current user). Saved values older than this are treated
// as missing on load, so a student who hasn't opened the app in
// a while is gently re-prompted for the cohort code and their
// CWID + birthday. Acts as a soft floor in case a phone gets
// passed to someone else and the student forgot to sign out, and
// stays well outside the typical "I forgot my code, ask the
// program office" window. Same value for both credentials; if
// they ever need to diverge, split into two constants.
const AUTH_TTL_MS = 60 * 24 * 60 * 60 * 1000;

function loadCohortToken() {
  try {
    const raw = localStorage.getItem(COHORT_TOKEN_KEY);
    if (!raw) return "";
    // New envelope format: { token, savedAt }. Recognized by the
    // leading "{" so we don't pay JSON.parse on plain-string
    // values from the legacy format below.
    if (raw.charAt(0) === "{") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.token === "string" && typeof parsed.savedAt === "number") {
          if (Date.now() - parsed.savedAt > AUTH_TTL_MS) return "";
          return parsed.token;
        }
      } catch (e) {
        // Malformed envelope; treat as missing.
      }
      return "";
    }
    // Legacy plain-string format from before 2026-05-09b. Accept
    // it as still-valid so already-logged-in students aren't
    // bounced today; the next save upgrades to the envelope
    // format, after which the TTL applies.
    return raw;
  } catch (e) {
    return "";
  }
}

function saveCohortToken(token) {
  try {
    localStorage.setItem(COHORT_TOKEN_KEY, JSON.stringify({
      token,
      savedAt: Date.now(),
    }));
  } catch (e) {
    // Quota exceeded or storage disabled; silently skip
  }
}

function clearCohortToken() {
  try {
    localStorage.removeItem(COHORT_TOKEN_KEY);
  } catch (e) {
    // Storage disabled; silently skip
  }
}

// ============================================================
// CURRENT USER — Per-device identity (CWID + birthday auth)
// The curated row returned by the auth script's identify
// endpoint, stashed in localStorage so a returning student skips
// the user gate. Stored at its own key (bap-user), separate from
// the cohort token and the profile, so each piece can be cleared
// independently. Cleared in three cases: (1) student taps "Sign
// out" in the profile editor, (2) the cohort token rotates and
// the AuthError handler wipes everything, (3) browser site-data
// reset.
//
// Shape (post-Phase 2; Phase 3 wires it up):
//   { cwid, first_name, last_name, preferred_name, pronouns,
//     role, email, whatsapp, housing_assignment, tshirt_size,
//     tshirt_fit, dietary_restrictions, food_allergies,
//     program_status }
// ============================================================

const USER_KEY = "bap-user";

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // New envelope format: { value, savedAt }. Subject to the
    // AUTH_TTL_MS expiry; older values are treated as missing
    // so the student gets re-prompted at the user gate.
    if (parsed.value && typeof parsed.savedAt === "number") {
      if (Date.now() - parsed.savedAt > AUTH_TTL_MS) return null;
      const u = parsed.value;
      if (!u || typeof u !== "object" || !u.cwid) return null;
      // Birthday must be present on-device so the prompts/submit
      // endpoints can re-validate identity without re-prompting.
      // Records saved before the prompts feature landed don't have
      // it; treat as missing so the student passes the user gate
      // once and the next save includes it.
      if (!u.birthday) return null;
      return u;
    }

    // Legacy flat format from before 2026-05-09b (the bare user
    // record at the top level). Same birthday requirement applies;
    // legacy records never carried it, so this branch effectively
    // forces a one-time re-prompt for any pre-prompts deploy that
    // saved in the flat shape.
    if (parsed.cwid && parsed.birthday) return parsed;

    return null;
  } catch (e) {
    return null;
  }
}

function saveUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify({
      value: user,
      savedAt: Date.now(),
    }));
  } catch (e) {
    // Quota exceeded or storage disabled; silently skip
  }
}

function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    // Storage disabled; silently skip
  }
}

// Returns true when the current user is staff or faculty (vs.
// student). Single source of truth for any role-restricted UI
// surface added later. Returns false on null/missing user so the
// preview-mode fallback (no SHEET_ID, no auth) reads as "student"
// for safety — a future staff-only view stays hidden in preview.
function isStaffOrFaculty(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).trim().toLowerCase();
  return r === "staff" || r === "faculty";
}

// ============================================================
// STUDENT PROFILE — Per-student personalization
// Stored at its own localStorage key (bap-profile) so it survives
// CACHE_VERSION bumps to the data cache. Profile is optional: an
// empty profile leaves the app behaving as it did before, showing
// every student every class. Bump PROFILE_VERSION only if the
// profile shape itself changes (new field, renamed field).
// ============================================================

const PROFILE_KEY = "bap-profile";
const PROFILE_VERSION = 2;

const EMPTY_PROFILE = {
  version: PROFILE_VERSION,
  enrolledClasses: [],
  filterEnabled: false,
  dismissedAnnouncements: [],
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw);

    // V1 → V2 migration: the `name` field moved to currentUser
    // (the authoritative roster identity). Salvage enrolledClasses
    // and filterEnabled rather than nuking the profile so a student
    // who already personalized doesn't lose their course selections
    // on the deploy that introduces the user gate.
    if (parsed.version === 1) {
      return {
        ...EMPTY_PROFILE,
        enrolledClasses: Array.isArray(parsed.enrolledClasses) ? parsed.enrolledClasses : [],
        filterEnabled: !!parsed.filterEnabled,
      };
    }

    if (parsed.version !== PROFILE_VERSION) return { ...EMPTY_PROFILE };
    return {
      ...EMPTY_PROFILE,
      ...parsed,
      enrolledClasses: Array.isArray(parsed.enrolledClasses) ? parsed.enrolledClasses : [],
      dismissedAnnouncements: Array.isArray(parsed.dismissedAnnouncements) ? parsed.dismissedAnnouncements : [],
    };
  } catch (e) {
    return { ...EMPTY_PROFILE };
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      ...profile,
      version: PROFILE_VERSION,
    }));
  } catch (e) {
    // Quota exceeded or storage disabled; silently skip
  }
}

// Returns true when the profile has classes selected AND the filter
// toggle is on; everywhere else, classes render unfiltered.
function shouldFilterClasses(profile) {
  return !!(profile && profile.filterEnabled && profile.enrolledClasses && profile.enrolledClasses.length > 0);
}

function filterClassesByProfile(classes, profile) {
  if (!shouldFilterClasses(profile)) return classes;
  const set = new Set(profile.enrolledClasses);
  return (classes || []).filter((c) => set.has(c.code));
}

// ============================================================
// PROMPTS CACHE — Per-student form definitions + responses
// Lives at its own localStorage key (bap-prompts-cache), separate
// from the content-data cache and the user record. The cache is
// keyed by cwid so a sign-out / sign-in on the same device doesn't
// surface the previous user's prompts to the next one.
//
// Short TTL (10 min) is intentional: prompts are Director-edited
// in Sheets and need to propagate fast — half an hour from "I added
// a meal RSVP question" to "students see it" is the goal. The
// content-data cache uses a 1-hour TTL on the script side; prompts
// trade a bit of API chatter for snappier visibility into Director
// edits.
// ============================================================

const PROMPTS_CACHE_KEY = "bap-prompts-cache";
const PROMPTS_CACHE_TTL = 10 * 60 * 1000;

function loadPromptsCache(cwid) {
  try {
    const raw = localStorage.getItem(PROMPTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.cwid !== cwid) return null;
    if (typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > PROMPTS_CACHE_TTL) return null;
    return Array.isArray(parsed.prompts) ? parsed.prompts : null;
  } catch (e) {
    return null;
  }
}

function savePromptsCache(cwid, prompts) {
  try {
    localStorage.setItem(PROMPTS_CACHE_KEY, JSON.stringify({
      cwid,
      prompts: Array.isArray(prompts) ? prompts : [],
      ts: Date.now(),
    }));
  } catch (e) {
    // Quota exceeded or storage disabled; silently skip
  }
}

function clearPromptsCache() {
  try {
    localStorage.removeItem(PROMPTS_CACHE_KEY);
  } catch (e) {
    // Storage disabled; silently skip
  }
}

// Returns prompts whose surface matches the requested target. The
// surface column accepts "today" / "profile" / "both"; defaults to
// "today" when blank. Used by TodayView and ProfileModal to filter
// the global prompts array down to the slice each surface should
// render.
function filterPromptsBySurface(prompts, target) {
  if (!Array.isArray(prompts)) return [];
  return prompts.filter((p) => {
    const s = String(p.surface || "today").toLowerCase();
    return s === target || s === "both";
  });
}

// True when at least one required field on the prompt has no
// stored response. Drives the orange "needs answering" dot on the
// Today PromptCard rows — a fully-answered prompt fades to "Editar"
// while a still-pending one keeps the attention-getting dot.
function isPromptPending(prompt) {
  if (!prompt || !Array.isArray(prompt.fields)) return false;
  const responses = prompt.responses || {};
  for (let i = 0; i < prompt.fields.length; i++) {
    const f = prompt.fields[i];
    if (!f.required) continue;
    const v = responses[f.field_id];
    if (v == null || String(v).trim() === "") return true;
  }
  return false;
}

// ── Class date-gating helpers ──
//
// A class can carry optional start_date and end_date columns. Outside
// that window the class is suppressed from Today and Weekly Overview
// (the day-relevant views), but stays visible in Class Schedule and
// Courses (the catalog views). Either column blank → that side of the
// window is unbounded, so a class with both blank renders everywhere
// (which is the legacy behavior and remains the default).
function isClassActive(c, dateStr) {
  if (!c || !dateStr) return true;
  if (c.start_date && dateStr < c.start_date) return false;
  if (c.end_date && dateStr > c.end_date) return false;
  return true;
}

// Wrap isClassActive across an array. Used by the Today activity card
// and Weekly Overview to drop pre-arrival or post-finals classes.
function filterActiveClassesForDate(classes, dateStr) {
  if (!Array.isArray(classes)) return [];
  return classes.filter((c) => isClassActive(c, dateStr));
}

// Number of full days from `today` (a Date) to a YYYY-MM-DD string.
// Negative if the target is in the past, 0 if the same day, positive
// for future dates. Used by the 2-weeks-before-finals gating.
function daysUntil(targetDateStr, today) {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr + "T12:00:00");
  const ref = new Date(today);
  ref.setHours(12, 0, 0, 0);
  return Math.round((target - ref) / 86400000);
}

// Returns the student's enrolled classes (filtered by profile when
// personalization is on) sorted for finals display: assigned finals
// first by date+time, then unassigned (TBD) finals by class code.
// When the student hasn't personalized, returns []; the finals UI is
// per-student and silent without a profile.
function getStudentFinals(data, profile) {
  if (!shouldFilterClasses(profile)) return [];
  const enrolled = filterClassesByProfile(data.classes || [], profile);
  const withFinals = enrolled.map((c) => ({
    code: c.code,
    title: c.title,
    location: c.location,
    color: c.color,
    final_date: c.final_date || "",
    final_time: c.final_time || "",
  }));
  withFinals.sort((a, b) => {
    const aHas = !!a.final_date;
    const bHas = !!b.final_date;
    if (aHas && bHas) {
      if (a.final_date !== b.final_date) return a.final_date.localeCompare(b.final_date);
      const ma = toMinutes(a.final_time);
      const mb = toMinutes(b.final_time);
      if (ma === null && mb === null) return a.code.localeCompare(b.code);
      if (ma === null) return -1;
      if (mb === null) return 1;
      if (ma !== mb) return ma - mb;
      return a.code.localeCompare(b.code);
    }
    if (aHas) return -1;
    if (bHas) return 1;
    return a.code.localeCompare(b.code);
  });
  return withFinals;
}

// Returns the enrolled-class final exam(s) happening on a specific
// date, sorted by start time. Used by the Today activity card on
// finals days to surface the final in place of the (already gated)
// regular class schedule. Empty array when the student hasn't
// personalized or no enrolled class has a final on that date.
function getFinalForDate(data, profile, dateStr) {
  const finals = getStudentFinals(data, profile);
  return finals
    .filter((f) => f.final_date && f.final_date === dateStr)
    .sort((a, b) => {
      const ma = toMinutes(a.final_time);
      const mb = toMinutes(b.final_time);
      if (ma === null && mb === null) return 0;
      if (ma === null) return -1;
      if (mb === null) return 1;
      return ma - mb;
    });
}

// Returns true when the finals UI should appear on the Today tab
// and at the top of the Schedule tab. The rule: the student must
// have personalized AND either (a) we're inside or within 14 days
// of finals_window_start, OR (b) at least one enrolled class has a
// final_date populated (e.g. an early-assigned final). Without a
// finals_window_start in Settings the rule reduces to (b) alone.
function shouldShowFinalsUI(data, profile, today) {
  if (!shouldFilterClasses(profile)) return false;
  const finals = getStudentFinals(data, profile);
  if (finals.length === 0) return false;
  const anyAssigned = finals.some((f) => !!f.final_date);
  const anchor = data.finals_window_start || "";
  if (anchor) {
    const d = daysUntil(anchor, today);
    if (d !== null && d <= 14) return true;
  }
  return anyAssigned;
}

// Number of milliseconds before a cached weather payload is treated
// as "stale" for click purposes. Stale tiles stay dimmed and a tap
// triggers a foreground re-fetch instead of opening WeatherSheet.
const WEATHER_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

function isWeatherStale(weather) {
  if (!weather || !weather.ts) return false;
  return (Date.now() - weather.ts) > WEATHER_STALE_MS;
}

// Tighter staleness window for dólar than for weather: Blue/MEP/Oficial
// can move 5–10 % over a single trading day, so a stale rate is more
// misleading at the calculator than a stale weather card. Same dim-
// then-tap-to-refetch pattern as weather.
const DOLAR_STALE_MS = 3 * 60 * 60 * 1000; // 3 hours

function isDolarStale(dolar) {
  if (!dolar || !dolar.ts) return false;
  return (Date.now() - dolar.ts) > DOLAR_STALE_MS;
}

// Convert km/h → mph, rounded. Open-Meteo returns wind gusts in km/h
// by default; we keep the raw value in storage and convert at display
// time so the underlying threshold logic doesn't need to change.
function kmhToMph(kmh) {
  if (typeof kmh !== "number") return null;
  return Math.round(kmh * 0.621371);
}

// Look up a Holidays-tab entry for a YYYY-MM-DD date string. Returns
// the row (with cancels_classes already a boolean) or null. Used by
// both the Today tab and the Weekly Overview to decide (a) whether to
// suppress classes that day and (b) what to render in the holiday
// card. The Holidays sheet tab is the single source of truth; the
// older calendar event of type "holiday" is only used as a fallback
// when the Holidays tab is missing or empty (see findHolidayContext).
function findHolidayForDate(holidays, dateStr) {
  if (!dateStr || !Array.isArray(holidays)) return null;
  return holidays.find((h) => h.date === dateStr) || null;
}

// Compose the holiday context for a given date. Prefers the Holidays
// sheet row (richer, bilingual, has cancels_classes flag); falls back
// to a calendar event of type "holiday" for backwards compatibility
// when no Holidays tab exists yet. Returns null when neither source
// has a match. The shape returned is normalized so the Today card
// and Weekly Overview gating use a single code path.
function findHolidayContext(data, dateStr) {
  const fromTab = findHolidayForDate(data.holidays, dateStr);
  if (fromTab) {
    return {
      source: "tab",
      name_es: fromTab.name_es || fromTab.name_en,
      name_en: fromTab.name_en || fromTab.name_es,
      description_es: fromTab.description_es,
      description_en: fromTab.description_en,
      cancels_classes: fromTab.cancels_classes,
    };
  }
  // Legacy fallback: calendar event tagged type:"holiday". Treat as
  // class-cancelling because the old behavior assumed that.
  const legacy = (data.calendarEvents || []).find(
    (e) => e.type === "holiday" && eventOverlaps(e, dateStr, dateStr)
  );
  if (legacy) {
    return {
      source: "legacy",
      name_es: legacy.title,
      name_en: legacy.title,
      description_es: legacy.description,
      description_en: legacy.description,
      cancels_classes: true,
    };
  }
  return null;
}

// ============================================================
// BRAND TOKENS
// ============================================================

const C = {
  bapBlue: "#64B5F6", pepBlue: "#00205B", pepOrange: "#E35205",
  ocean: "#0057B8", sky: "#6CACE4", fog: "#B9D9EB",
  mountain: "#425563", stone: "#7A99AC", pepBlack: "#1D252D",
  ice: "#E3F2FD", parchment: "#F5F3F0", white: "#FFFFFF",
};


const LOGO_URI = "/logo.png";
const BCBS_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAoCAYAAAB99ePgAAAJpklEQVR42r2YaWxdxRXHfzNz732L3/Oe2HEWsicmZAGKCoEmIBEglKgQpIaqakslSjdRIdQKEQmh9kO/UKkVEkhU6YemBdESGpBoEW1DoyIKEWEJTtIQ7CSA4yw2cWw/v+XeWfrh+tnPz34moaVXupq3zJk5539mzvIXpVLJhWGI7/torZFS4pxDCAGAtRbP89Ba43keURTh+/74qLVGKYW1FiEEzjkAhBDjspUyQRBQ3i+KIjzPwxgzvm9ZFkCMjIy48oTKTYBxJZ1zSCnH50w3Vhs1nUylomWjau0LIH3fn7RAtfUXophSapIh5c/Vc7TWUxQrr10tK4RA5HI5V8v68lP+zVo7rWKVLr1Y1GvJAohCoeCmm1CpmJRyyiIzjZWoV46VxlUCMZ0sgFdr0/JzoQrNhFwlgtbamopNOXMzKVY58WIUrIXIxcgCSP5PT7XRFzLfqwXz5+HWTz2rQiAq3VodBioVMw4iY7EIImMx5dHF46e5RttY1oyd6zIQtuI7QqCNxTouPJQ4B+mEBCXBOpACrAUp41FI8vkQOU04cIBwjlRCAaANFMIIIStCiDF4nkLiSAYeCNCRITQAY7e2WCy66qBonSNQkmcO9fPx+RCpBDZGPXaZdWSTHnevnYUHICTOjaHhHAklOTlS4id7etm6sokbFmRoa0gBFqQHVoNUoDXDoeOdvhGe6fqEBS0pHlrfzmjokAK8yvxWDooAvoLH3x5g36F+SPuxjwXxGzlSjQHbOptpSvmUtEGNoW4deL7ktd5Rnt13imcPDuB7ghWtKZY3J2mv8xFScGokomewQPdgidHQQmiY05zgvi+0oSivM006sdYBgqwn8OoS+EkPJ9z4WdShZXY6ge8pjIkDqyu71lqQguePDHDZkiYe//IS9p4Yovtcgd7hkO7zoxgHrSmPNXOybO2cxbLWFCXj+PYfj/BW3zAbFzWRK2lkFEUopYi0ASHjwwnxIR5zcaGkKY6EFIdDiqMabUFbSynSOCkJtcESXwBPSpy2vNtfZNPSRn7fdZY/vXsGKeDS1hR3drZwz+WzuW5BPUkl2fvRMD98/gOSStDckGD/mRIIh7VjyEVak0l4COlA+GAs+LGrbWS4dkULa9rqCJTg8ECBvx89R2RgdjaJFJZU4INz4CSF0FCILGdHQlpSPq99NMyB3hwH+nJsWNHMZSJNLlI8d3CAvrymOBKBsQwUNAsbkxw+MwKiA4TBK4URmXSCne+e5oXDgyhf4BB4OHoGQx6+eRFr5mQw1nF2NGLzsiZuWtzAk2+e5vanDpNK+Rhjscaxdk6ahzfOZ6igMQiUgISSSOe448p2nrhtGTve6uPW5c1sWd7MN3e9z0lt0XlHIbIEniByMr44DjypFBLLgbNFdu8/Cxk/vsmFiMfuWkkmkOw6NMCXLqlnsKD5a895fAlPbFnKTTveixFTEvKas6uaeOT6WCFfwHBoaEx6WODsaEQuNLRlEjQmPH7wYg8nzuQJ6hM4IFCCXMmSVG7s1oE0Jj5rSQUq7ZFKeyhPsGxxA61pn+HQcdnsOnYe6Ofprn4SStKeTTCQj9h0aTPKk6RSHirt0ZD0wDpSgWBhY8CxwRILGwOEJ3n1xDB3P3eElC8ZjSy7tnWyYn6WqGTAl9QnFH0jJTpn1cVxToCUUoJzOATGxkCYoubOzhZ6h0u8fmSA5S1JmlMe/fmIGxc38EbPIHtPDHFnZwvGOowbe63DORBKsn5uhv19I3TOSuEEBL7i1Q/Oc+B0Dk/C26dyhMbhrKMxE5D0JOdGQ9bNTuGMQ05N/BPhIhsoXjw6yB/eOs2pXIgvBeva6zjYP8ru7vM81TWAJwXIOJtMJGNw2vGVlS309BdoSHrUNyQIQ0O2PuCWpU2cK2gee6OP4/0FhIO17WmODZZIBx5XdmSItEUKkOWECxN5VQjBsfNFljYnWb+ujWJk2drZwsMb53NyOOLuK9pY0ZxksKgRkUFJgXACIeKl8pHhuvkZmtOSN07muH1lM4SGkZLhgZeP4xBs3zAfP5A4bdiyvIkX3j/HpkUZ6tMeJTOW+Cvd6qyjZCwuUOx6b4Dbljdz7xVtCAF//mCQ+/5yjIWNCVa2pvjFzQv5zf4zOCVj9ziHNrGhkXGkUj4/vqaDHftO8dVVraTrfGRo+NrqWSQUfPeFbnTRsGxelnkNCd7sOccDV3dgjRszUkxciEBCXVLRkJA0pD10ZPjV6yfJhYbL52TY9/EwH/bnaUwqWtMev37zNMc/GaWhPiAbSOoSikxCjYUAQSEf8aOrO8gGimcPDfDo5kXY0PDoP3sZKhrWX1KPy0f88pZFPPpqL9evaGHDogYKJYMsl1yFQtFZa8hrx1AhwvMU2liyKY9Nvz1E90CRB29YwOLGFFLEIeHx10/SOxrR9f21eM4gpIcxmnTCpyGIz6AF6gLJy8eG2fxkFzu/tYp/fTTC7945ze6vr2LrzoNsv3EhWMf2l45z5P51LGlKUowsSlb1rVhL4Me5EiHwfcGtTx/lpUMDcdgJFEKAKxpAMH9WivfuWUVD0iM0Fm8sN2smCkaLIJOQPLK3l5+99CG771nNv/vz/O39c2xc0kTn7BTbdnTx5F1LufeqDkYKGk+KqX2rk5J8qIkcFCKDs1CKNEoJUukAKUEgSNT5eEF8ya2UOM/HSkUh0mhEfH7LBaOz5EPHTzd2cN/GudyxowslBPdfO4/mtM+233TxyJYl3PvFheQKGiWYVGxOKpm8sZJJSYHAESExJUNBirjgFFCKBGhHLjREYcTB7qN0zJtPNpsZpzPKZbpSCm0MBa14bPMC2jMBD77Yw9L2Orr7cvz89mV8b7lizyv/YP01V09pqmp0/GARLMkqVs3LsqY9zeqODKva6lg7N8Olc1JcNbcenGXPnj0MDQ+hlJq24y+7Ox8Jtm/s4JXvrGZB2ue5b6zkoQ2X0PvJECeOH5vSwAshZuZKxHiDY8e6dotSE927NnYKjTETV4JUpKVDBB5ow2jkUFIQBAHFYnH6jn86xao7fmMtqmozWVlk1uj4qxWM+wiNlAqcndJoT2KZcrmcq9UaugkNx7olh5QT48W0hpOoiBpGVSPnzdizTiFkJo8Xw5VMQmgG3mUSVzKT9ZMg/oxN9WeV/VzoCDepRJn6/WLk/+dEzmelIqrdKoRA2hq37b/hSmpxcxdCgVXGSlkOITOxmuX/Khev5j1qUWDlOdNxyDPJCiGQ1Q11JXLVVl8odToT3TodUV0JzCTkgiCoSViXhaoVqswon0ZYV87VWhMEwRQFaxHW/wG6bNXpAmrN9QAAAABJRU5ErkJggg==";
const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEK_DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EVENT_STYLES = {
  program:     { bg: "#FFF3E0", border: C.pepOrange, icon: "★", label: "Program" },
  academic:    { bg: C.ice, border: C.ocean, icon: "◆", label: "Academic" },
  excursion:   { bg: "#E8F5E9", border: "#388E3C", icon: "▲", label: "Excursion" },
  holiday:     { bg: "#FCE4EC", border: "#C62828", icon: "●", label: "Holiday" },
  orientation: { bg: C.ice, border: C.sky, icon: "⬟", label: "Orientation" },
};

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
}

// Get the Sunday that starts the week containing a given date
function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d;
}

// Format a date as YYYY-MM-DD
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Get today's date string in YYYY-MM-DD
function getTodayStr() {
  const now = new Date();
  return toDateStr(now);
}

// Extract the time range for a specific day from complex schedule strings
function getTimeForDay(timeStr, day) {
  if (!timeStr) return "";
  const t = timeStr.trim();
  if (!/\b(Mon|Tue|Wed|Thu|Fri)\b/.test(t)) return t;
  const segments = t.split(";").map((s) => s.trim());
  for (const seg of segments) {
    const match = seg.match(/^([A-Za-z+\s]+?)\s+(\d{1,2}[:.]\d{2}.*)$/);
    if (match) {
      const days = match[1].split(/[+,\s]+/);
      if (days.some((d) => d.trim() === day)) return match[2].trim();
    }
  }
  return t;
}

function getSortTime(timeStr, day) {
  const t = getTimeForDay(timeStr, day);
  const m = t.match(/(\d{1,2})[:.:](\d{2})/);
  if (m) return m[1].padStart(2, "0") + ":" + m[2];
  return "99:99";
}

// Parse a time string like "8:00", "08:00", "8:00:00", "8:00 AM", or "20:30"
// into minutes-since-midnight. Returns null if the string is empty or
// unparseable (which callers can treat as "untimed"). Handles 12-hour
// formats with AM/PM as a courtesy; 24-hour is the primary format in the app.
function toMinutes(timeStr) {
  if (!timeStr) return null;
  const s = String(timeStr).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3] ? m[3].toUpperCase() : null;
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

// Check whether a (possibly multi-day) event overlaps a date range
function eventOverlaps(event, rangeStart, rangeEnd) {
  const eStart = event.date;
  const eEnd = event.end_date || event.date;
  return eStart <= rangeEnd && eEnd >= rangeStart;
}

// Build a compact date-range label for multi-day events, e.g. "May 22–25"
function dateRangeLabel(startDate, endDate) {
  const s = new Date(startDate + "T12:00:00");
  const e = new Date(endDate + "T12:00:00");
  const sMonth = MONTHS[s.getMonth()];
  const eMonth = MONTHS[e.getMonth()];
  if (sMonth === eMonth) return `${sMonth} ${s.getDate()}–${e.getDate()}`;
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`;
}

// Count the days in a multi-day event
function countDays(startDate, endDate) {
  const s = new Date(startDate + "T12:00:00");
  const e = new Date(endDate + "T12:00:00");
  return Math.round((e - s) / 86400000) + 1;
}

// ============================================================
// EVENTS — "This Week in BA" category config and helpers
// ============================================================

// Each category gets a color accent and a glyph component. The icon
// receives a color prop so the rendered glyph matches the accent.
// Falls through to "other" for unknown categories so the sheet can
// add tentative new categories without crashing the view.
const EVENT_CATEGORIES = {
  music:    { label: "Music",    es: "Música",     color: "#E35205", Icon: MusicNoteIcon },
  theater:  { label: "Theater",  es: "Teatro",     color: "#00205B", Icon: TheaterMaskIcon },
  film:     { label: "Film",     es: "Cine",       color: "#425563", Icon: FilmReelIcon },
  exhibit:  { label: "Exhibit",  es: "Muestra",    color: "#6CACE4", Icon: PictureFrameIcon },
  dance:    { label: "Dance",    es: "Danza",      color: "#E35205", Icon: TangoShoeIcon },
  festival: { label: "Festival", es: "Festival",   color: "#E35205", Icon: SparkleIcon },
  food:     { label: "Food",     es: "Gastronomía",color: "#0057B8", Icon: ForkPlateIcon },
  talk:     { label: "Talk",     es: "Charla",     color: "#425563", Icon: MicrophoneIcon },
  service:  { label: "Service",  es: "Servicio",   color: "#64B5F6", Icon: HandsHeartIcon },
  other:    { label: "Other",    es: "Otro",       color: "#7A99AC", Icon: PinIcon },
};

function getEventCategory(key) {
  return EVENT_CATEGORIES[key] || EVENT_CATEGORIES.other;
}

// Filter an event list to entries that haven't yet ended. Events with
// an end_date are kept until the day after end_date; single-day events
// are kept on their start_date.
function filterUpcomingEvents(events, todayStr) {
  return (events || []).filter((e) => {
    const last = e.end_date && e.end_date >= e.start_date ? e.end_date : e.start_date;
    return last >= todayStr;
  });
}

// Sort events chronologically by start_date, then by time when both
// share the same start. Untimed events come before timed ones on the
// same day so "all-day" entries lead the day.
function sortEventsChronological(events) {
  return [...(events || [])].sort((a, b) => {
    if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
    const ma = toMinutes(a.time);
    const mb = toMinutes(b.time);
    if (ma === null && mb === null) return 0;
    if (ma === null) return -1;
    if (mb === null) return 1;
    return ma - mb;
  });
}

// Returns events whose date range intersects today through today+7d.
// Used by the Today tile and by EventsView to highlight "this week."
function getThisWeekEvents(data) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayStr = toDateStr(today);
  const weekEndStr = toDateStr(weekEnd);
  const upcoming = (data.events || []).filter((e) => {
    const last = e.end_date && e.end_date >= e.start_date ? e.end_date : e.start_date;
    return last >= todayStr && e.start_date <= weekEndStr;
  });
  return sortEventsChronological(upcoming);
}

// Compact, friendly date label for an event card. Single-day → "Mon, May 4";
// multi-day → "May 4 – May 8" using the existing dateRangeLabel().
function eventDateLabel(event) {
  if (event.end_date && event.end_date > event.start_date) {
    return dateRangeLabel(event.start_date, event.end_date);
  }
  const d = new Date(event.start_date + "T12:00:00");
  return `${WEEK_DAYS_SHORT[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Compact day abbreviations: M T W R F
const DAY_ABBREV = { Mon: "M", Tue: "T", Wed: "W", Thu: "R", Fri: "F" };

// Build a compact schedule string for the "All Courses" cards.
// Uniform schedules (e.g. "11:30–13:40") → "MTWR 11:30–13:40"
// Variable schedules (e.g. "Tue 11:30–13:30; Wed 17:30–19:30; Thu 15:00–17:00")
//   → "T 11:30–13:30 · W 17:30–19:30 · R 15:00–17:00"
function compactSchedule(days, timeStr) {
  if (!timeStr) return days.map((d) => DAY_ABBREV[d] || d).join("");
  const t = timeStr.trim();

  // Check whether the time string contains any day-name prefixes
  if (/\b(Mon|Tue|Wed|Thu|Fri)\b/.test(t)) {
    // Variable schedule — parse each semicolon-separated segment
    const segments = t.split(";").map((s) => s.trim()).filter(Boolean);
    const parts = segments.map((seg) => {
      // Match day prefix(es) like "Mon+Tue", "Tue", "Wed" followed by a time range
      const m = seg.match(/^([A-Za-z+\s]+?)\s+(\d{1,2}[:.]\d{2}.*)$/);
      if (m) {
        const dayLetters = m[1].split(/[+,\s]+/).map((d) => DAY_ABBREV[d] || d).join("");
        return `${dayLetters} ${m[2].trim()}`;
      }
      return seg;
    });
    return parts.join(" · ");
  }

  // Uniform schedule — all days share the same time
  const abbr = days.map((d) => DAY_ABBREV[d] || d).join("");
  return `${abbr} ${t}`;
}

// ============================================================
// UI COMPONENTS
// ============================================================

// Tab titles paired with a small Argentine Spanish gloss. The
// English headline anchors the page; the gloss adds bicultural
// character without doubling the cognitive load.
const TAB_TITLES = {
  today:    { en: "Today",                       es: "Hoy" },
  schedule: { en: "Program Schedule",            es: "Cronograma" },
  calendar: { en: "Semester Calendar",           es: "Calendario" },
  local:    { en: "Local Resources",             es: "Buenos Aires" },
  faq:      { en: "Frequently Asked Questions",  es: "Preguntas Frecuentes" },
  contacts: { en: "Contacts",                    es: "Contactos" },
};

// Render a tip string with markdown-style *italic* segments. Splits on
// asterisks and alternates between regular text and EB Garamond italic
// spans. Safe (no innerHTML) and lightweight enough to use inline.
function renderTip(text) {
  if (!text) return null;
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
      return (
        <em key={i} style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

// Mate gourd glyph used in the Weekly Overview empty-day card. Kept
// as inline SVG so it inherits color and adds zero bundle weight.
function MateGourdIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="42" y1="8" x2="42" y2="22" stroke={C.mountain} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="42" cy="9" rx="3" ry="1.5" fill={C.mountain} />
      <path d="M16 30 Q14 50 32 56 Q50 50 48 30 Q48 24 44 22 Q40 21 32 21 Q24 21 20 22 Q16 24 16 30 Z"
            fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="32" cy="22" rx="11" ry="2.5" fill={C.mountain} />
      <path d="M22 30 Q21 42 26 50" stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Mini-illustration library ───
// Small inline SVGs in the BAP palette used as section decorations,
// hero ornaments, and empty-state mascots. All 64×64 source, scale to
// any size, no external dependencies.

function SunIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="11" fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="2" />
      <g stroke={C.pepBlue} strokeWidth="2.5" strokeLinecap="round">
        <line x1="32" y1="6"  x2="32" y2="14" />
        <line x1="32" y1="50" x2="32" y2="58" />
        <line x1="6"  y1="32" x2="14" y2="32" />
        <line x1="50" y1="32" x2="58" y2="32" />
        <line x1="13" y1="13" x2="19" y2="19" />
        <line x1="45" y1="45" x2="51" y2="51" />
        <line x1="51" y1="13" x2="45" y2="19" />
        <line x1="19" y1="45" x2="13" y2="51" />
      </g>
    </svg>
  );
}

function ColectivoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="18" width="52" height="28" rx="4" fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="2" />
      <rect x="10" y="22" width="14" height="10" rx="1.5" fill={C.ice} stroke={C.pepBlue} strokeWidth="1.5" />
      <rect x="28" y="22" width="14" height="10" rx="1.5" fill={C.ice} stroke={C.pepBlue} strokeWidth="1.5" />
      <rect x="46" y="22" width="8"  height="10" rx="1.5" fill={C.ice} stroke={C.pepBlue} strokeWidth="1.5" />
      <rect x="6"  y="38" width="52" height="3" fill={C.pepBlue} />
      <circle cx="17" cy="48" r="5" fill={C.mountain} stroke={C.pepBlue} strokeWidth="1.5" />
      <circle cx="47" cy="48" r="5" fill={C.mountain} stroke={C.pepBlue} strokeWidth="1.5" />
      <circle cx="17" cy="48" r="1.8" fill="#FFFFFF" />
      <circle cx="47" cy="48" r="1.8" fill="#FFFFFF" />
    </svg>
  );
}

function ObeliscoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 4 L36 50 L28 50 Z" fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="2" strokeLinejoin="round" />
      <line x1="32" y1="10" x2="32" y2="48" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <rect x="24" y="50" width="16" height="6" rx="0.5" fill="#FFFFFF" stroke={C.pepBlue} strokeWidth="2" />
      <rect x="20" y="56" width="24" height="4" rx="0.5" fill={C.mountain} stroke={C.pepBlue} strokeWidth="2" />
    </svg>
  );
}

function TangoShoeIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 40 Q8 36 12 36 L40 36 Q46 36 48 30 Q49 26 53 25 L53 32 Q53 38 47 41 Q44 43 40 43 L20 43 L20 48 Q20 52 16 52 L11 52 Q8 52 8 48 Z"
            fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <line x1="48" y1="32" x2="48" y2="55" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="48" cy="56" rx="5" ry="1.5" fill={color} />
      <path d="M20 38 L36 38" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
    </svg>
  );
}

function PalmIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M30 22 Q28 38 26 56" stroke={C.mountain} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M30 22 Q14 14 6 18 Q10 22 18 22 Q24 22 30 22 Z" fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 22 Q46 12 56 14 Q54 20 46 22 Q38 23 30 22 Z" fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 22 Q22 8 18 4 Q22 10 24 16 Q26 20 30 22 Z" fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 22 Q40 8 48 6 Q46 14 40 18 Q34 21 30 22 Z" fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="30" cy="22" r="2.5" fill={C.mountain} />
    </svg>
  );
}

function RioWaveIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 32 Q12 22 22 32 T42 32 T62 32" stroke={C.bapBlue} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M2 42 Q12 32 22 42 T42 42 T62 42" stroke={C.bapBlue} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M2 22 Q12 12 22 22 T42 22 T62 22" stroke={C.bapBlue} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// Crescent moon for the Today greeting strip after sunset. Companion
// to SunIcon; same 64×64 viewBox so the two swap cleanly without
// layout shift. A few stars added at low opacity for character.
function MoonIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M44 12 Q26 16 22 32 Q22 48 38 52 Q26 54 18 46 Q10 38 12 26 Q14 14 28 10 Q36 8 44 12 Z"
            fill={C.bapBlue} stroke={C.fog} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="50" cy="20" r="1.2" fill={C.fog} opacity="0.8" />
      <circle cx="54" cy="36" r="0.9" fill={C.fog} opacity="0.6" />
      <circle cx="46" cy="48" r="0.9" fill={C.fog} opacity="0.6" />
    </svg>
  );
}

// ─── Event category glyphs ───
// One per Events category. All accept a color prop so the EventsView
// can render them in a colored circle that matches the category accent.
// Default fill stays in the BAP palette so they look correct anywhere
// else they get reused.

function MusicNoteIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M26 14 L48 10 L48 42" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="22" cy="44" rx="8" ry="6" fill={color} />
      <ellipse cx="44" cy="46" rx="8" ry="6" fill={color} />
      <line x1="26" y1="14" x2="48" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function TheaterMaskIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14 14 Q14 10 18 10 L40 10 Q44 10 44 14 L44 30 Q44 44 30 50 Q14 44 14 30 Z"
            fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="22" cy="24" rx="2.5" ry="3.5" fill={C.white} />
      <ellipse cx="36" cy="24" rx="2.5" ry="3.5" fill={C.white} />
      <path d="M22 36 Q29 42 36 36" stroke={C.white} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M44 26 Q52 28 56 36 Q58 48 46 54 Q42 56 38 54" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}

function FilmReelIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill={color} />
      <circle cx="32" cy="32" r="4" fill={C.white} />
      <circle cx="32" cy="14" r="3.5" fill={C.white} />
      <circle cx="32" cy="50" r="3.5" fill={C.white} />
      <circle cx="14" cy="32" r="3.5" fill={C.white} />
      <circle cx="50" cy="32" r="3.5" fill={C.white} />
      <circle cx="20" cy="20" r="2.5" fill={C.white} />
      <circle cx="44" cy="20" r="2.5" fill={C.white} />
      <circle cx="20" cy="44" r="2.5" fill={C.white} />
      <circle cx="44" cy="44" r="2.5" fill={C.white} />
    </svg>
  );
}

function PictureFrameIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="12" width="44" height="40" rx="2" fill={color} stroke={color} strokeWidth="2" />
      <rect x="14" y="16" width="36" height="32" fill={C.white} />
      <circle cx="22" cy="26" r="3" fill={color} opacity="0.6" />
      <path d="M14 44 L24 32 L34 40 L42 30 L50 44 Z" fill={color} opacity="0.55" />
    </svg>
  );
}

function SparkleIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 6 L36 28 L58 32 L36 36 L32 58 L28 36 L6 32 L28 28 Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="50" cy="14" r="2.5" fill={color} opacity="0.7" />
      <circle cx="14" cy="50" r="2" fill={color} opacity="0.7" />
      <circle cx="14" cy="14" r="1.5" fill={color} opacity="0.5" />
    </svg>
  );
}

function ForkPlateIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="32" cy="38" rx="22" ry="6" fill={color} />
      <ellipse cx="32" cy="34" rx="22" ry="6" fill={C.white} stroke={color} strokeWidth="2" />
      <ellipse cx="32" cy="34" rx="14" ry="3" fill={color} opacity="0.25" />
      <line x1="14" y1="10" x2="14" y2="28" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="10" x2="18" y2="22" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="10" x2="22" y2="28" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="48" y1="10" x2="48" y2="30" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="48" cy="14" rx="4" ry="6" fill={color} />
    </svg>
  );
}

function MicrophoneIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="24" y="8" width="16" height="30" rx="8" fill={color} stroke={color} strokeWidth="2" />
      <path d="M16 32 Q16 46 32 46 Q48 46 48 32" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <line x1="32" y1="46" x2="32" y2="56" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="56" x2="40" y2="56" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="18" x2="36" y2="18" stroke={C.white} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="28" y1="24" x2="36" y2="24" stroke={C.white} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function PinIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 8 Q18 8 18 24 Q18 36 32 56 Q46 36 46 24 Q46 8 32 8 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="24" r="6" fill={C.white} />
    </svg>
  );
}

function HandsHeartIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Heart cradled above the hands */}
      <path d="M32 14 Q26 6 20 12 Q15 18 22 26 L32 34 L42 26 Q49 18 44 12 Q38 6 32 14 Z"
            fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Left cupped hand */}
      <path d="M10 36 Q10 30 16 30 Q22 30 24 34 L32 40 L32 54 L18 54 Q10 54 10 48 Z"
            fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Right cupped hand */}
      <path d="M54 36 Q54 30 48 30 Q42 30 40 34 L32 40 L32 54 L46 54 Q54 54 54 48 Z"
            fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Subtle palm crease for definition */}
      <path d="M16 40 Q20 42 24 41" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M48 40 Q44 42 40 41" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Cupcake glyph — used on the Today birthday card. BAP Blue fluted
// wrapper, Sky Blue frosting with sprinkles, parchment candle with a
// Pep Orange flame and a small inner glow. Same 64×64 viewBox style
// as the rest of the inline glyph library.
function CupcakeIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Frosting — curvy mound on top, drawn first so wrapper sits on top */}
      <path d="M14 38 Q14 27, 22 29 Q26 22, 32 25 Q38 21, 42 28 Q50 27, 50 38 Z"
            fill={C.sky} stroke={C.pepBlue} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Sprinkles on the frosting */}
      <circle cx="22" cy="34" r="0.9" fill={C.pepOrange} />
      <circle cx="29" cy="31" r="0.9" fill={C.white} />
      <circle cx="38" cy="33" r="0.9" fill={C.pepOrange} />
      <circle cx="44" cy="35" r="0.9" fill={C.white} />
      {/* Wrapper — trapezoid with vertical fluting */}
      <path d="M14 38 L20 58 L44 58 L50 38 Z"
            fill={C.bapBlue} stroke={C.pepBlue} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="22" y1="40" x2="24" y2="56" stroke={C.white} strokeWidth="1" opacity="0.55" />
      <line x1="32" y1="40" x2="32" y2="56" stroke={C.white} strokeWidth="1" opacity="0.55" />
      <line x1="42" y1="40" x2="40" y2="56" stroke={C.white} strokeWidth="1" opacity="0.55" />
      {/* Candle */}
      <rect x="30.5" y="14" width="3" height="11" fill={C.parchment} stroke={C.pepBlue} strokeWidth="1" />
      {/* Flame */}
      <ellipse cx="32" cy="11" rx="2.2" ry="3.2" fill={C.pepOrange} />
      <ellipse cx="32" cy="10.5" rx="0.9" ry="1.6" fill="#FFE082" />
    </svg>
  );
}

// Megaphone glyph — used as the leading mark on the standard
// "Aviso / Notice" announcement banner. Designed to feel editorial
// and warm rather than alert-coded.
function MegaphoneIcon({ size = 16, color = C.bapBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Cone */}
      <path d="M14 26 L46 14 L46 50 L14 38 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Handle on the back */}
      <rect x="46" y="22" width="6" height="20" rx="2" fill={color} stroke={color} strokeWidth="2" />
      {/* Sound waves radiating to the right */}
      <path d="M56 24 Q60 32 56 40" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Drop strap from the bottom of the cone */}
      <path d="M22 38 L22 52" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Alert triangle glyph — used as the leading mark on urgent
// announcement banners. Pep Orange by default to pull the eye.
function AlertIcon({ size = 16, color = C.pepOrange }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 8 L58 54 L6 54 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <line x1="32" y1="24" x2="32" y2="40" stroke={C.white} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="46" r="2.2" fill={C.white} />
    </svg>
  );
}

// Compact weather glyph for the Today quick-stats tile. Picks one of
// six states from the Open-Meteo weather_code plus is_day. Kept small
// (28–32 px) and palette-aligned so it sits beside the temp without
// overpowering the tile.
function WeatherIcon({ code = 0, isDay = true, size = 30 }) {
  // Map WMO weather codes to a small set of states.
  // 0 = clear, 1/2 = mainly clear / partly cloudy, 3 = overcast,
  // 45/48 = fog, 51/53/55 = drizzle, 61/63/65 = rain,
  // 80/81/82 = rain showers, 71/73/75/77 = snow, 95/96/99 = thunder.
  let state = "clear";
  if (code === 0) state = isDay ? "clear" : "clearNight";
  else if (code === 1 || code === 2) state = isDay ? "partly" : "partlyNight";
  else if (code === 3 || code === 45 || code === 48) state = "cloudy";
  else if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65) || (code >= 80 && code <= 82)) state = "rain";
  else if (code >= 71 && code <= 77) state = "snow";
  else if (code >= 95 && code <= 99) state = "thunder";

  const stroke = C.pepBlue;
  const fill = C.bapBlue;
  const cloudPath = "M14 38 Q14 30 22 30 Q24 22 32 22 Q42 22 44 30 Q52 30 52 38 Q52 44 46 44 L20 44 Q14 44 14 38 Z";

  if (state === "clear") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="32" cy="32" r="11" fill={fill} stroke={stroke} strokeWidth="2" />
        <g stroke={stroke} strokeWidth="2.5" strokeLinecap="round">
          <line x1="32" y1="6"  x2="32" y2="14" />
          <line x1="32" y1="50" x2="32" y2="58" />
          <line x1="6"  y1="32" x2="14" y2="32" />
          <line x1="50" y1="32" x2="58" y2="32" />
          <line x1="13" y1="13" x2="19" y2="19" />
          <line x1="45" y1="45" x2="51" y2="51" />
          <line x1="51" y1="13" x2="45" y2="19" />
          <line x1="19" y1="45" x2="13" y2="51" />
        </g>
      </svg>
    );
  }
  if (state === "clearNight") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M44 12 Q26 16 22 32 Q22 48 38 52 Q26 54 18 46 Q10 38 12 26 Q14 14 28 10 Q36 8 44 12 Z"
              fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "partly") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="22" cy="22" r="9" fill={C.parchment} stroke={stroke} strokeWidth="2" />
        <g stroke={stroke} strokeWidth="2" strokeLinecap="round">
          <line x1="22" y1="6"  x2="22" y2="10" />
          <line x1="6"  y1="22" x2="10" y2="22" />
          <line x1="11" y1="11" x2="14" y2="14" />
          <line x1="33" y1="11" x2="30" y2="14" />
        </g>
        <path d={cloudPath} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "partlyNight") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M28 8 Q18 11 16 21 Q16 31 26 33 Q19 33 14 28 Q9 23 11 16 Q14 9 22 7 Q26 6 28 8 Z"
              fill={C.parchment} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={cloudPath} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "cloudy") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d={cloudPath} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 50 Q14 46 22 50 Q30 54 38 50 Q46 46 56 50" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }
  if (state === "rain") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d={cloudPath} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <g stroke={C.ocean} strokeWidth="2.5" strokeLinecap="round">
          <line x1="22" y1="48" x2="20" y2="56" />
          <line x1="32" y1="48" x2="30" y2="56" />
          <line x1="42" y1="48" x2="40" y2="56" />
        </g>
      </svg>
    );
  }
  if (state === "snow") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d={cloudPath} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <g fill={C.fog}>
          <circle cx="22" cy="52" r="2" />
          <circle cx="32" cy="54" r="2" />
          <circle cx="42" cy="52" r="2" />
        </g>
      </svg>
    );
  }
  // thunder
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d={cloudPath} fill={C.mountain} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 46 L24 56 L30 56 L26 62 L40 50 L34 50 L38 46 Z" fill={C.pepOrange} stroke={C.pepOrange} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// Header decoration. Five-star Southern Cross constellation positioned
// in the top-right corner of the app header. Replaces the previous
// faint circle. Faint lines connect the stars to suggest the cross.
function SouthernCrossDecoration() {
  return (
    <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ position: "absolute", top: -10, right: -10, opacity: 0.55 }} aria-hidden="true">
      <line x1="50" y1="14" x2="55" y2="86" stroke={C.bapBlue} strokeWidth="0.5" opacity="0.35" />
      <line x1="18" y1="56" x2="85" y2="48" stroke={C.bapBlue} strokeWidth="0.5" opacity="0.35" />
      <circle cx="50" cy="14" r="2.5" fill={C.bapBlue} />
      <circle cx="55" cy="86" r="3"   fill={C.bapBlue} />
      <circle cx="85" cy="48" r="2.5" fill={C.bapBlue} />
      <circle cx="18" cy="56" r="2"   fill={C.bapBlue} />
      <circle cx="40" cy="70" r="1.2" fill={C.bapBlue} />
    </svg>
  );
}

// Spanish weekday and month names. Used by formatSpanishDate for the
// Today hero card. Argentine convention: lowercase day and month names,
// numeric day, "de" connector before the month.
const SPANISH_WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const SPANISH_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatSpanishDate(d) {
  const wd = SPANISH_WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = SPANISH_MONTHS[d.getMonth()];
  // Capitalize the weekday for display: "Lunes, 28 de abril"
  const wdCap = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${wdCap}, ${day} de ${month}`;
}

// ─── Today dashboard helpers ───
//
// The Today tab is the app's daily-open hook: greeting strip with a
// time-of-day gradient, weather + dólar blue tiles, today's activity
// list with a live "Próximo" countdown, active announcements, and a
// rotating tip. All rendered from a single TodayView component using
// the helpers below.

// Greeting picker. Argentine convention: buen día through late
// morning, buenas tardes through evening, buenas noches at night.
function getGreeting(hour) {
  if (hour >= 5 && hour < 12) return { en: "Good morning", es: "Buen día" };
  if (hour >= 12 && hour < 19) return { en: "Good afternoon", es: "Buenas tardes" };
  return { en: "Good evening", es: "Buenas noches" };
}

// Time-of-day gradient for the greeting strip. Stays inside the BAP
// palette (BAP Blue, Sky, Ocean, Pep Blue) and shifts subtly across
// the day so the strip feels alive without breaking brand.
function getGreetingGradient(hour) {
  if (hour >= 5 && hour < 9)   return `linear-gradient(135deg, #6CACE4 0%, #64B5F6 60%, #B9D9EB 100%)`; // dawn
  if (hour >= 9 && hour < 17)  return `linear-gradient(135deg, #64B5F6 0%, #6CACE4 50%, #0057B8 100%)`; // day
  if (hour >= 17 && hour < 20) return `linear-gradient(135deg, #0057B8 0%, #00205B 100%)`;              // dusk
  return `linear-gradient(135deg, #00205B 0%, #0a1635 100%)`;                                            // night
}

// Dress hint based on temperature and weather code. Bilingual,
// short, glanceable. Argentine °C; never longer than the temp itself.
function getDressHint(temp, code) {
  if (typeof temp !== "number") return "";
  const isThunder = code >= 95 && code <= 99;
  const isRain = (code >= 51 && code <= 65) || (code >= 80 && code <= 82);
  const isSnow = code >= 71 && code <= 77;
  if (isThunder) return "Quedate adentro / Stay inside";
  let base;
  if (temp < 5)       base = "Mucho abrigo / Heavy coat";
  else if (temp < 13) base = "Abrigo y bufanda / Coat & scarf";
  else if (temp < 18) base = "Un sweater / A sweater";
  else if (temp < 23) base = "Algo liviano / Something light";
  else if (temp < 29) base = "Manga corta / Short sleeves";
  else                base = "¡A la pileta! / Beach weather";
  if (isSnow) return base + " · ❄";
  if (isRain) return base + " · paraguas";
  return base;
}

// Format the dólar blue rate with Spanish-locale thousand separators.
function formatPesos(n) {
  if (typeof n !== "number") return "—";
  return "$" + Math.round(n).toLocaleString("es-AR");
}

// Live "in X min" / "in X h Ym" countdown to a target minutes-since-
// midnight. Returns null if the target is in the past or unparseable.
function formatCountdown(targetMin, nowMin) {
  if (typeof targetMin !== "number" || typeof nowMin !== "number") return null;
  const delta = targetMin - nowMin;
  if (delta <= 0) return null;
  if (delta < 60) return `en ${delta} min`;
  const h = Math.floor(delta / 60);
  const m = delta % 60;
  return m === 0 ? `en ${h} h` : `en ${h} h ${m} min`;
}

// Today's quick-data cache. Separate from the main sheet cache because
// these values turn over much faster (every 30 minutes) and are
// fetched from different APIs. Errors are swallowed silently so a
// failed weather call never blocks dólar, and vice versa.
const TODAY_CACHE_KEY = "bap-today-cache";
const TODAY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function loadTodayCache() {
  try {
    const raw = localStorage.getItem(TODAY_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed || {};
  } catch (e) {
    return {};
  }
}

function saveTodayCache(payload) {
  try {
    localStorage.setItem(TODAY_CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Quota or storage disabled; silently skip
  }
}

// Buenos Aires coordinates for the Open-Meteo weather call.
const BA_LAT = -34.6037;
const BA_LON = -58.3816;

async function fetchWeather() {
  // Pull current conditions, a 7-day daily forecast, and a 48-hour
  // hourly slice. The hourly slice powers two things: the impending-
  // weather alert under the Today tile and the next-12-hours strip in
  // the WeatherSheet modal. The daily block powers the 7-day list in
  // the same modal; it includes weather_code, precipitation_probability_max,
  // and wind_gusts_10m_max so the modal can show condition icons and
  // surface notable rain or wind per day.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BA_LAT}&longitude=${BA_LON}` +
    `&current=temperature_2m,weather_code,is_day,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_gusts_10m_max` +
    `&hourly=temperature_2m,weather_code,precipitation,precipitation_probability,wind_gusts_10m` +
    `&forecast_days=7&timezone=America/Argentina/Buenos_Aires`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  const j = await res.json();
  const c = j.current || {};
  const d = j.daily || {};
  const h = j.hourly || {};
  const firstNum = (arr) => (Array.isArray(arr) && typeof arr[0] === "number" ? arr[0] : null);
  // Slice the hourly arrays to the next 48 hours starting from now.
  // Open-Meteo returns all 7 days of hourly data starting from midnight
  // BA local time on day 1, so we have to find the index of the entry
  // that represents the current hour and slice forward from there.
  const times = Array.isArray(h.time) ? h.time : [];
  // Anchor the 48-hour slice to "now" in Buenos Aires. The Open-Meteo
  // response runs entirely in BA local time (because of timezone=
  // America/Argentina/Buenos_Aires) and emits ISO strings without a
  // timezone suffix, so comparing them against a UTC-based reference
  // would drift by exactly 3 hours and skip the slice forward into
  // the future. Two anchors, in order of preference:
  //   1. The API's own current.time (BA local, same format as
  //      hourly.time, so plain string compare works).
  //   2. Intl.DateTimeFormat with explicit BA timezone, if current.time
  //      is missing for any reason.
  let nowLocalHour = "";
  if (typeof c.time === "string" && c.time.length >= 13) {
    nowLocalHour = c.time.slice(0, 13);
  } else {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", hourCycle: "h23",
      });
      const parts = fmt.formatToParts(new Date());
      const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
      nowLocalHour = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}`;
    } catch (e) {
      nowLocalHour = "";
    }
  }
  let startIdx = nowLocalHour
    ? times.findIndex((t) => typeof t === "string" && t.slice(0, 13) >= nowLocalHour)
    : 0;
  if (startIdx < 0) startIdx = 0;
  const sliceN = (arr) => Array.isArray(arr) ? arr.slice(startIdx, startIdx + 48) : [];
  const arr = (a) => (Array.isArray(a) ? a : []);
  return {
    temp: typeof c.temperature_2m === "number" ? c.temperature_2m : null,
    code: typeof c.weather_code === "number" ? c.weather_code : 0,
    isDay: c.is_day === 1 || c.is_day === true,
    tempMax: firstNum(d.temperature_2m_max),
    tempMin: firstNum(d.temperature_2m_min),
    hourly: {
      time: sliceN(times),
      temp: sliceN(h.temperature_2m),
      code: sliceN(h.weather_code),
      precip: sliceN(h.precipitation),
      precipProb: sliceN(h.precipitation_probability),
      windGust: sliceN(h.wind_gusts_10m),
    },
    daily: {
      time: arr(d.time),
      tempMax: arr(d.temperature_2m_max),
      tempMin: arr(d.temperature_2m_min),
      code: arr(d.weather_code),
      precipProbMax: arr(d.precipitation_probability_max),
      windGustMax: arr(d.wind_gusts_10m_max),
    },
    // Version marker on the hourly slice anchor. Bumped to 2 in the
    // 2026-04-27b hotfix when the anchor switched from a UTC-based
    // reference to the API's own current.time. Cached weather objects
    // missing this marker (or carrying a smaller value) are treated
    // as stale by <TodayView>'s effect and force-refreshed on next
    // open, so students don't have to wait out the 30-min TTL to
    // shake off the bad slice.
    hourlySliceVersion: 2,
    ts: Date.now(),
  };
}

// Celsius → Fahrenheit, rounded. Open-Meteo returns Celsius by default;
// we keep the underlying values in Celsius so the bilingual dress hint
// thresholds keep working, and convert only at display time.
function cToF(c) {
  if (typeof c !== "number") return null;
  return Math.round((c * 9) / 5 + 32);
}

// Scan the next 48h of hourly forecast data for "significant" weather
// worth flagging on the Today tile. Returns either { es, en } with a
// short bilingual alert string, or null when conditions are normal.
//
// Thresholds are deliberately conservative so the alert means
// something when it appears. Buenos Aires gets light drizzle often;
// surfacing every shower would dilute the signal.
//
// Detection order matters: we return the most weather-disruptive
// signal first. Thunderstorm > heavy rain > freezing > strong wind
// > moderate rain. Only one alert at a time.
function computeWeatherAlert(weather) {
  if (!weather || !weather.hourly) return null;
  const h = weather.hourly;
  const codes = h.code || [];
  const precip = h.precip || [];
  const precipProb = h.precipProb || [];
  const gust = h.windGust || [];
  const temp = h.temp || [];
  const times = h.time || [];
  const n = Math.min(48, codes.length, precip.length, gust.length, temp.length);
  if (n === 0) return null;

  // Helper: figure out roughly when in the window something happens.
  // "Esta tarde" / "esta noche" / "mañana" feels more useful than a
  // raw "in 7 hours" countdown for a weather heads-up.
  const phaseFor = (idx) => {
    const t = times[idx];
    if (!t) return { es: "pronto", en: "soon" };
    const dt = new Date(t);
    const now = new Date();
    const sameDay = dt.toDateString() === now.toDateString();
    const hour = dt.getHours();
    if (sameDay) {
      if (hour < 12) return { es: "esta mañana", en: "this morning" };
      if (hour < 18) return { es: "esta tarde", en: "this afternoon" };
      return { es: "esta noche", en: "tonight" };
    }
    // Tomorrow (or beyond, but the window caps at 48h)
    if (hour < 12) return { es: "mañana a la mañana", en: "tomorrow morning" };
    if (hour < 18) return { es: "mañana a la tarde", en: "tomorrow afternoon" };
    return { es: "mañana a la noche", en: "tomorrow night" };
  };

  // 1. Thunderstorm (WMO 95-99)
  for (let i = 0; i < n; i++) {
    const c = codes[i];
    if (c === 95 || c === 96 || c === 99) {
      const p = phaseFor(i);
      return { es: `Tormenta eléctrica ${p.es}`, en: `Thunderstorm ${p.en}` };
    }
  }

  // 2. Heavy rain (>5mm in any single hour, or sustained moderate)
  for (let i = 0; i < n; i++) {
    if (precip[i] >= 5) {
      const p = phaseFor(i);
      return { es: `Lluvia fuerte ${p.es}`, en: `Heavy rain ${p.en}` };
    }
  }

  // 3. Freezing temps (≤2°C, ~36°F)
  for (let i = 0; i < n; i++) {
    if (typeof temp[i] === "number" && temp[i] <= 2) {
      const p = phaseFor(i);
      return { es: `Frío extremo ${p.es}`, en: `Freezing ${p.en}` };
    }
  }

  // 4. Strong winds (gusts ≥50 km/h)
  for (let i = 0; i < n; i++) {
    if (gust[i] >= 50) {
      const p = phaseFor(i);
      return { es: `Vientos fuertes ${p.es}`, en: `Strong winds ${p.en}` };
    }
  }

  // 5. Notable rain (≥2mm in an hour with high probability) — softer
  // signal worth surfacing because students often plan their day
  // around staying dry.
  for (let i = 0; i < n; i++) {
    if (precip[i] >= 2 && precipProb[i] >= 70) {
      const p = phaseFor(i);
      return { es: `Lluvia ${p.es}`, en: `Rain expected ${p.en}` };
    }
  }

  return null;
}

// Pull Blue, MEP (bolsa), and Oficial in parallel via
// Promise.allSettled so a failed call on any single rate still leaves
// us showing the others. We only throw if the Blue call fails
// outright, since Blue is the headline number; MEP and Oficial are
// secondary lines and degrade to an em-dash placeholder.
async function fetchDolar() {
  const [blueRes, mepRes, oficialRes] = await Promise.allSettled([
    fetch("https://dolarapi.com/v1/dolares/blue"),
    fetch("https://dolarapi.com/v1/dolares/bolsa"),
    fetch("https://dolarapi.com/v1/dolares/oficial"),
  ]);

  const out = { venta: null, compra: null, mep: null, oficial: null, ts: Date.now() };

  if (blueRes.status === "fulfilled" && blueRes.value.ok) {
    const j = await blueRes.value.json();
    out.venta = typeof j.venta === "number" ? j.venta : null;
    out.compra = typeof j.compra === "number" ? j.compra : null;
  }

  if (mepRes.status === "fulfilled" && mepRes.value.ok) {
    const j = await mepRes.value.json();
    out.mep = typeof j.venta === "number" ? j.venta : null;
  }

  if (oficialRes.status === "fulfilled" && oficialRes.value.ok) {
    const j = await oficialRes.value.json();
    out.oficial = typeof j.venta === "number" ? j.venta : null;
  }

  if (out.venta === null) throw new Error("Dólar fetch failed");
  return out;
}

// Compute today's items: classes scheduled for today's day-of-week
// plus calendar events that overlap today (excluding semester-only).
// Sorted by start time; untimed items first.
//
// Filtering rules:
//   1. Classes only show when shouldFilterClasses(profile) is true —
//      i.e., the student has personalized their enrollment AND the
//      filter toggle is on. The toggle auto-enables when classes are
//      first selected (see toggleClass in the Profile editor).
//   2. Classes are also suppressed on a holiday whose Holidays-tab
//      row has cancels_classes=true (national feriados, Semana Santa,
//      días no laborables turísticos). Cultural observances with
//      cancels_classes=false don't suppress classes.
//   3. The legacy calendar-event `type:"holiday"` path still works as
//      a fallback when the Holidays tab is empty; for backwards compat,
//      legacy holiday events always cancel classes.
//
// Returns { items, holiday } so TodayView can render a small
// holiday context card alongside the (possibly empty) activity card.
function getTodayItems(data, profile) {
  const today = new Date();
  const todayDow = WEEK_DAYS_SHORT[today.getDay()];
  today.setHours(12, 0, 0, 0);
  const todayStr = toDateStr(today);

  const holiday = findHolidayContext(data, todayStr);
  const suppressClasses = holiday && holiday.cancels_classes;

  // Finals replace regular classes when the day matches an enrolled
  // class's final_date. This sits above the start_date/end_date gate
  // so a final exam scheduled after the regular session ends still
  // surfaces on Today on the day it actually happens. Holidays still
  // win over finals — a feriado on a final-exam day suppresses
  // everything (and program ops should obviously not schedule a final
  // on a feriado anyway).
  const todaysFinals = !suppressClasses
    ? getFinalForDate(data, profile, todayStr).map((f) => ({
        kind: "final",
        title: f.title,
        code: f.code,
        time: f.final_time || "",
        sortMin: toMinutes(f.final_time),
        location: f.location,
      }))
    : [];

  // Regular classes only render if (a) the student has personalized,
  // (b) today's holiday (if any) doesn't cancel classes, AND (c) no
  // final exam is scheduled today (finals replace regular sessions).
  const showClasses = shouldFilterClasses(profile) && !suppressClasses && todaysFinals.length === 0;
  const visibleClasses = showClasses
    ? filterActiveClassesForDate(filterClassesByProfile(data.classes || [], profile), todayStr)
    : [];

  const todayClasses = visibleClasses
    .filter((c) => c.days && c.days.includes(todayDow))
    .map((c) => ({
      kind: "class",
      title: c.title,
      code: c.code,
      time: getTimeForDay(c.time, todayDow),
      sortMin: toMinutes(getTimeForDay(c.time, todayDow)),
      location: c.location,
    }));

  // The legacy holiday calendar event (if used) is filtered out of
  // the events list to avoid double-rendering with the holiday card.
  // Holidays-tab rows aren't in calendarEvents at all, so no filter
  // needed for that path.
  const todayEvents = (data.calendarEvents || [])
    .filter((e) => e.visibility !== "semester")
    .filter((e) => eventOverlaps(e, todayStr, todayStr))
    .filter((e) => !(holiday && holiday.source === "legacy" && e.type === "holiday"))
    .map((e) => ({
      kind: "event",
      title: e.title,
      code: "",
      time: e.start_time
        ? (e.end_time ? `${e.start_time}–${e.end_time}` : e.start_time)
        : "",
      sortMin: toMinutes(e.start_time),
      location: "",
    }));

  const items = [...todaysFinals, ...todayClasses, ...todayEvents].sort((a, b) => {
    if (a.sortMin === null && b.sortMin === null) return 0;
    if (a.sortMin === null) return -1;
    if (b.sortMin === null) return 1;
    return a.sortMin - b.sortMin;
  });

  return { items, holiday };
}

// ─── Today detail-sheet helpers ───
//
// Small pure helpers used by <WeatherSheet> and <DolarSheet>. Kept up
// here (rather than inside the components) so they're easy to test in
// isolation and reused by both the hourly strip and the 7-day list.

// Map a WMO weather code to a short bilingual condition label. Used
// for the descriptor text in the 7-day list. Mirrors the state
// grouping used by <WeatherIcon> so icon and label always agree.
function getWeatherLabel(code) {
  if (code === 0) return { es: "Despejado", en: "Clear" };
  if (code === 1) return { es: "Mayormente despejado", en: "Mostly clear" };
  if (code === 2) return { es: "Parcialmente nublado", en: "Partly cloudy" };
  if (code === 3) return { es: "Nublado", en: "Overcast" };
  if (code === 45 || code === 48) return { es: "Niebla", en: "Fog" };
  if (code >= 51 && code <= 55) return { es: "Llovizna", en: "Drizzle" };
  if (code >= 61 && code <= 65) return { es: "Lluvia", en: "Rain" };
  if (code >= 80 && code <= 82) return { es: "Chubascos", en: "Showers" };
  if (code >= 71 && code <= 77) return { es: "Nieve", en: "Snow" };
  if (code >= 95 && code <= 99) return { es: "Tormenta", en: "Thunderstorm" };
  return { es: "—", en: "—" };
}

// Format an Open-Meteo ISO local time string ("2026-04-27T14:00") as
// a compact hour label for the hourly strip. "Ahora" for the first
// item, otherwise "14h" / "9h". Argentine 24-hour convention.
function formatHourLabel(iso, isFirst) {
  if (isFirst) return "Ahora";
  if (typeof iso !== "string") return "";
  const m = iso.match(/T(\d{2}):/);
  if (!m) return "";
  return parseInt(m[1], 10) + "h";
}

// Compact bilingual weekday label from an Open-Meteo daily date string
// ("2026-04-27"). Returns "Hoy / Today" for today, otherwise the
// Spanish weekday capitalized. English gloss is left to the caller
// since some places want it inline and others don't.
function getShortDayLabel(iso, today) {
  if (typeof iso !== "string") return { es: "", en: "" };
  const d = new Date(iso + "T12:00:00");
  const todayStr = today instanceof Date
    ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    : null;
  if (todayStr && iso.slice(0, 10) === todayStr) {
    return { es: "Hoy", en: "Today" };
  }
  const wd = SPANISH_WEEKDAYS[d.getDay()];
  const wdCap = wd.charAt(0).toUpperCase() + wd.slice(1);
  return { es: wdCap, en: WEEK_DAYS_FULL[d.getDay()] };
}

// USD formatter with cents for amounts under $100 and rounded
// thousands-separated whole dollars otherwise. Mirrors how a student
// would actually read the converted value in their head.
function formatUsd(n) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  if (n === 0) return "$0";
  if (Math.abs(n) < 100) return "$" + n.toFixed(2);
  return "$" + Math.round(n).toLocaleString("en-US");
}

// Pull an Argentine-peso integer out of a free-text cost string. Used
// by <EventCard> to append a USD parenthetical to event prices. Skips
// strings that already cite USD (so "$15 USD" is left alone). Honors
// the Argentine "." thousands convention: "$8.000" → 8000. Sub-10
// values are returned as null so a comma-decimal misparse like "$5,50"
// (which the regex truncates to "$5") doesn't render a meaningless
// "~$0.00 USD" annotation.
function parseArsAmount(costStr) {
  if (typeof costStr !== "string") return null;
  if (/USD|US\$|U\$D|U\$S/i.test(costStr)) return null;
  const m = costStr.match(/\$\s*([0-9.]+)/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/\./g, ""), 10);
  if (!isFinite(n) || n < 10) return null;
  return n;
}

// ─── BottomSheet ───
//
// Generic slide-up modal used by <WeatherSheet> and <DolarSheet>.
// Built to feel native on a phone: backdrop fades in, sheet slides
// up from the bottom on a 280 ms ease, drag-handle sits above a
// brand-aligned header (English headline + Spanish gloss), body
// scrolls internally. Backdrop tap closes; a dedicated × button in
// the header closes too. Intentionally kept distinct from the
// existing <ProfileModal> (which is full-screen and styled like a
// settings page); this is a lighter, content-detail sheet.
function BottomSheet({ open, onClose, titleEs, titleEn, children }) {
  // Mount/unmount with a short animation window so the slide-down
  // exit is visible. `show` controls presence in the DOM; `animateIn`
  // controls the transform/backdrop opacity.
  const [show, setShow] = useState(open);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      setShow(true);
      const id = requestAnimationFrame(() => setAnimateIn(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAnimateIn(false);
      const t = setTimeout(() => setShow(false), 260);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock background scroll while the sheet is open so iOS doesn't
  // bounce the page behind the backdrop when you scroll the body.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  if (!show) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0,
        background: animateIn ? "rgba(29, 37, 45, 0.55)" : "rgba(29, 37, 45, 0)",
        zIndex: 200,
        transition: "background 0.26s ease-out",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.parchment, width: "100%", maxWidth: 480,
          borderRadius: "20px 20px 0 0",
          maxHeight: "92vh", display: "flex", flexDirection: "column",
          transform: animateIn ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 -8px 28px rgba(0, 32, 91, 0.20)",
          overflow: "hidden",
        }}
      >
        {/* Drag handle (decorative; tap-to-close still works via the × button or backdrop) */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 2px", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.fog }} />
        </div>
        {/* Header */}
        <div style={{
          padding: "8px 18px 14px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, flexShrink: 0,
          borderBottom: `1px solid ${C.fog}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "'EB Garamond', serif", fontSize: 24, fontWeight: 700,
              color: C.pepBlue, letterSpacing: -0.4, lineHeight: 1.05,
            }}>{titleEn}</div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
              letterSpacing: 1.8, color: C.ocean, marginTop: 4,
            }}>{titleEs}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bap-press"
            style={{
              background: C.ice, border: `1px solid ${C.fog}`, color: C.mountain,
              width: 34, height: 34, borderRadius: 17, cursor: "pointer",
              fontSize: 20, lineHeight: 1, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >×</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "14px 16px 28px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── WeatherSheet ───
//
// Detail view that opens when the student taps the Today weather tile.
// Two stacked sections: a horizontal "next 12 hours" strip across the
// top, and a 7-day daily list below. Both sourced from the same
// weather object that already drives the Today tile (no additional
// fetch). Wind and rain probability are surfaced per-day only when
// they cross gentle thresholds (≥20 mph gusts; ≥25% rain prob) so
// quiet days stay clean. Dress hint is intentionally omitted here;
// it lives only on the Today tile per the brief.
function WeatherSheet({ open, onClose, weather }) {
  const today = new Date();

  // Next 12 hours from the existing 48-hour hourly slice.
  const hours = (weather && weather.hourly && weather.hourly.time) || [];
  const hourCount = Math.min(12, hours.length);
  const hourRows = [];
  for (let i = 0; i < hourCount; i++) {
    const iso = hours[i];
    const code = weather.hourly.code?.[i] ?? 0;
    const temp = weather.hourly.temp?.[i];
    const prob = weather.hourly.precipProb?.[i];
    // Derive day/night from the hour-of-day in the ISO string. 6-19
    // is day, otherwise night. Matches getGreetingGradient roughly
    // and is fine for a small icon switch.
    const m = typeof iso === "string" ? iso.match(/T(\d{2}):/) : null;
    const hr = m ? parseInt(m[1], 10) : 12;
    const isDay = hr >= 6 && hr < 19;
    hourRows.push({
      label: formatHourLabel(iso, i === 0),
      code,
      isDay,
      tempF: typeof temp === "number" ? cToF(temp) : null,
      prob: typeof prob === "number" ? prob : null,
    });
  }

  // 7-day list from the new daily block. Length should be 7 but we
  // defensively cap it at whatever the API actually returned.
  const daily = (weather && weather.daily) || null;
  const dayCount = daily ? Math.min(7, (daily.time || []).length) : 0;
  const dayRows = [];
  for (let i = 0; i < dayCount; i++) {
    const iso = daily.time[i];
    const code = daily.code?.[i] ?? 0;
    const tMax = daily.tempMax?.[i];
    const tMin = daily.tempMin?.[i];
    const probMax = daily.precipProbMax?.[i];
    const gustMax = daily.windGustMax?.[i];
    const label = getShortDayLabel(iso, today);
    dayRows.push({
      key: iso,
      labelEs: label.es,
      labelEn: label.en,
      code,
      condition: getWeatherLabel(code),
      tempMaxF: typeof tMax === "number" ? cToF(tMax) : null,
      tempMinF: typeof tMin === "number" ? cToF(tMin) : null,
      // Show rain prob only when meaningful (>= 25%), per the brief
      probMax: typeof probMax === "number" && probMax >= 25 ? Math.round(probMax) : null,
      // Show wind only when notably gusty (>= 20 mph). Open-Meteo
      // returns gust speeds in km/h; convert at display time so the
      // students (mostly from Malibu) see units they're used to.
      gustMax: typeof gustMax === "number" && kmhToMph(gustMax) >= 20 ? kmhToMph(gustMax) : null,
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      titleEs="Pronóstico"
      titleEn="Weather"
    >
      {/* Hourly strip */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 10,
        }}>Próximas 12 horas <span style={{ color: C.stone }}>·</span> <span style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic", textTransform: "none",
          letterSpacing: 0, color: C.mountain, fontSize: 12,
        }}>Next 12 hours</span></div>
        {hourRows.length === 0 ? (
          <div style={{
            background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
            padding: "16px", color: C.stone, fontSize: 12,
            fontFamily: "'Roboto', sans-serif",
          }}>—</div>
        ) : (
          <div style={{
            display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch",
            paddingBottom: 4, marginLeft: -2, marginRight: -2,
            scrollbarWidth: "thin",
          }}>
            {hourRows.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: "0 0 auto", minWidth: 64,
                  background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
                  padding: "10px 6px 8px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}
              >
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.ocean,
                  textTransform: "uppercase", letterSpacing: 1,
                }}>{h.label}</div>
                <WeatherIcon code={h.code} isDay={h.isDay} size={28} />
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700,
                  color: C.pepBlue, lineHeight: 1,
                }}>{h.tempF !== null ? h.tempF + "°" : "—"}</div>
                {/* Per the brief: only show probability when there is one (≥40% in the strip) */}
                {typeof h.prob === "number" && h.prob >= 40 ? (
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: C.ocean,
                    lineHeight: 1,
                  }}>{Math.round(h.prob)}%</div>
                ) : (
                  <div style={{ height: 10 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7-day list */}
      <div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 10,
        }}>Próximos 7 días <span style={{ color: C.stone }}>·</span> <span style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic", textTransform: "none",
          letterSpacing: 0, color: C.mountain, fontSize: 12,
        }}>Next 7 days</span></div>
        {dayRows.length === 0 ? (
          <div style={{
            background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
            padding: "16px", color: C.stone, fontSize: 12,
            fontFamily: "'Roboto', sans-serif",
          }}>Cargando pronóstico extendido…</div>
        ) : (
          <div style={{
            background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
            overflow: "hidden",
          }}>
            {dayRows.map((d, i) => {
              const sameLabel = d.labelEs === d.labelEn;
              return (
                <div
                  key={d.key}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    borderTop: i === 0 ? "none" : `1px solid ${C.fog}`,
                  }}
                >
                  {/* Day label */}
                  <div style={{ width: 76, flexShrink: 0 }}>
                    <div style={{
                      fontFamily: "'Roboto', sans-serif", fontSize: 13.5, fontWeight: 600,
                      color: C.pepBlack, lineHeight: 1.15,
                    }}>{d.labelEs}</div>
                    {!sameLabel && (
                      <div style={{
                        fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                        fontSize: 11.5, color: C.mountain, marginTop: 1, lineHeight: 1.15,
                      }}>{d.labelEn}</div>
                    )}
                  </div>
                  {/* Icon */}
                  <div style={{ flexShrink: 0 }}>
                    <WeatherIcon code={d.code} isDay={true} size={32} />
                  </div>
                  {/* Condition + optional rain/wind */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Roboto', sans-serif", fontSize: 12.5,
                      color: C.pepBlack, lineHeight: 1.2,
                    }}>{d.condition.es}</div>
                    {(d.probMax !== null || d.gustMax !== null) && (
                      <div style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                        color: C.ocean, marginTop: 3, lineHeight: 1.2,
                        display: "flex", gap: 8, flexWrap: "wrap",
                      }}>
                        {d.probMax !== null && (
                          <span>☂ {d.probMax}%</span>
                        )}
                        {d.gustMax !== null && (
                          <span>≈ {d.gustMax} mph</span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* High/low */}
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 13,
                    color: C.pepBlue, fontWeight: 700, whiteSpace: "nowrap",
                    textAlign: "right", flexShrink: 0,
                  }}>
                    {d.tempMaxF !== null ? d.tempMaxF + "°" : "—"}
                    <span style={{ color: C.stone, fontWeight: 400, margin: "0 4px" }}>/</span>
                    <span style={{ color: C.mountain, fontWeight: 400 }}>
                      {d.tempMinF !== null ? d.tempMinF + "°" : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 11.5,
          color: C.stone, marginTop: 10, lineHeight: 1.4, textAlign: "center",
        }}>
          Datos de Open-Meteo <span style={{ color: C.fog }}>·</span> Open-Meteo
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── DolarSheet ───
//
// Currency calculator that opens when the student taps the dólar tile.
// Bidirectional input (default ARS → USD), quick-pick chips appropriate
// to the current direction, and a comparison strip that converts the
// same amount at all four rates: Blue compra (highlighted as primary),
// Blue venta, MEP, and Oficial. A small footnote calls out the spread
// so students understand why the cueva quote and the calculator quote
// can differ slightly.
function DolarSheet({ open, onClose, dolar }) {
  const [direction, setDirection] = useState("ars-to-usd"); // or "usd-to-ars"
  const [amount, setAmount] = useState("");

  const compra = (dolar && typeof dolar.compra === "number") ? dolar.compra : null;
  const venta = (dolar && typeof dolar.venta === "number") ? dolar.venta : null;
  const mep = (dolar && typeof dolar.mep === "number") ? dolar.mep : null;
  const oficial = (dolar && typeof dolar.oficial === "number") ? dolar.oficial : null;

  // Reset the input when the user flips direction so a "1000" doesn't
  // accidentally read as 1000 USD after a flip from ARS.
  const setDir = (next) => {
    if (next !== direction) {
      setDirection(next);
      setAmount("");
    }
  };

  // Sanitize input: digits and at most one decimal separator. We
  // accept both "." and "," (Argentine decimal convention) and
  // normalize to a dot internally.
  const onAmountChange = (raw) => {
    let s = String(raw).replace(/[^\d.,]/g, "");
    // Collapse repeated separators to the last one
    s = s.replace(/,/g, ".");
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    }
    setAmount(s);
  };

  const num = parseFloat(amount);
  const value = isFinite(num) && num > 0 ? num : 0;

  // Convert `value` (in the source currency) to the destination using
  // a given rate. ARS→USD: USD = ARS / rate. USD→ARS: ARS = USD × rate.
  function convertWith(rate) {
    if (!rate || rate <= 0) return null;
    if (direction === "ars-to-usd") return value / rate;
    return value * rate;
  }

  const primaryResult = convertWith(compra);

  // Quick chips. ARS amounts are common menu/Uber prices; USD amounts
  // are common cueva conversion sizes.
  const chipsArs = [1000, 5000, 10000, 50000];
  const chipsUsd = [5, 20, 50, 100];
  const chips = direction === "ars-to-usd" ? chipsArs : chipsUsd;
  const chipFmt = direction === "ars-to-usd"
    ? (n) => "$" + n.toLocaleString("es-AR")
    : (n) => "US$ " + n;

  // Format a converted result in the destination currency.
  function fmtResult(n) {
    if (n == null) return "—";
    return direction === "ars-to-usd" ? formatUsd(n) : formatPesos(n);
  }

  // Comparison strip data. We always compare the same input across
  // all four rates so students can see the spread at a glance.
  const compareRows = [
    { key: "compra", labelEs: "Blue compra", labelEn: "Blue (buy from you)", rate: compra, primary: true },
    { key: "venta", labelEs: "Blue venta", labelEn: "Blue (sell to you)", rate: venta, primary: false },
    { key: "mep", labelEs: "MEP", labelEn: "MEP (bolsa)", rate: mep, primary: false },
    { key: "oficial", labelEs: "Oficial", labelEn: "Official", rate: oficial, primary: false },
  ];

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      titleEs="Calculadora"
      titleEn="Currency"
    >
      {/* Direction toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { key: "ars-to-usd", labelEs: "Pesos → Dólares", labelEn: "ARS → USD" },
          { key: "usd-to-ars", labelEs: "Dólares → Pesos", labelEn: "USD → ARS" },
        ].map((opt) => {
          const active = direction === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setDir(opt.key)}
              className="bap-press"
              style={{
                flex: 1,
                background: active ? C.pepBlue : C.white,
                color: active ? C.white : C.mountain,
                border: `1px solid ${active ? C.pepBlue : C.fog}`,
                borderRadius: 10, padding: "10px 8px", cursor: "pointer",
                fontFamily: "'Roboto', sans-serif", fontSize: 12,
                fontWeight: active ? 600 : 500,
                lineHeight: 1.15,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <span>{opt.labelEs}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9.5,
                opacity: 0.85, letterSpacing: 0.8,
              }}>{opt.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Input + primary result */}
      <div style={{
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 14,
        padding: "16px 16px 14px", marginBottom: 14,
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9.5, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 6,
        }}>
          {direction === "ars-to-usd" ? "Tenés en pesos" : "Tenés en dólares"}
          <span style={{ color: C.stone, margin: "0 4px" }}>·</span>
          <span style={{
            fontFamily: "'EB Garamond', serif", fontStyle: "italic",
            textTransform: "none", letterSpacing: 0, color: C.mountain,
          }}>{direction === "ars-to-usd" ? "You have, in pesos" : "You have, in dollars"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700,
            color: C.stone, lineHeight: 1,
          }}>{direction === "ars-to-usd" ? "$" : "US$"}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0"
            aria-label={direction === "ars-to-usd" ? "Amount in Argentine pesos" : "Amount in U.S. dollars"}
            style={{
              flex: 1, minWidth: 0,
              fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700,
              color: C.pepBlue,
              background: "transparent", border: "none", outline: "none",
              padding: "2px 0",
            }}
          />
        </div>

        {/* Quick chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setAmount(String(c))}
              className="bap-press"
              style={{
                background: C.ice, color: C.ocean,
                border: `1px solid ${C.fog}`, borderRadius: 16,
                padding: "5px 12px", cursor: "pointer",
                fontFamily: "'DM Mono', monospace", fontSize: 11,
                letterSpacing: 0.4,
              }}
            >{chipFmt(c)}</button>
          ))}
        </div>

        {/* Primary result */}
        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.fog}`,
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 9.5, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.ocean, marginBottom: 4,
          }}>
            {direction === "ars-to-usd" ? "Equivale a" : "Equivale a"}
            <span style={{ color: C.stone, margin: "0 4px" }}>·</span>
            <span style={{
              fontFamily: "'EB Garamond', serif", fontStyle: "italic",
              textTransform: "none", letterSpacing: 0, color: C.mountain,
            }}>at Blue compra</span>
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700,
            color: C.pepBlue, lineHeight: 1,
          }}>
            {value > 0 ? fmtResult(primaryResult) : (direction === "ars-to-usd" ? "US$ —" : "$ —")}
          </div>
        </div>
      </div>

      {/* All-rates comparison */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 8,
        }}>Comparación <span style={{ color: C.stone }}>·</span> <span style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic", textTransform: "none",
          letterSpacing: 0, color: C.mountain, fontSize: 12,
        }}>All rates</span></div>
        <div style={{
          background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
          overflow: "hidden",
        }}>
          {compareRows.map((row, i) => {
            const result = row.rate ? convertWith(row.rate) : null;
            const sameLabel = row.labelEs === row.labelEn;
            return (
              <div
                key={row.key}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, padding: "10px 14px",
                  borderTop: i === 0 ? "none" : `1px solid ${C.fog}`,
                  background: row.primary ? C.ice : C.white,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontFamily: "'Roboto', sans-serif", fontSize: 13,
                    fontWeight: row.primary ? 700 : 500, color: C.pepBlack,
                    lineHeight: 1.15,
                  }}>{row.labelEs}</div>
                  {!sameLabel && (
                    <div style={{
                      fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                      fontSize: 11, color: C.mountain, marginTop: 1, lineHeight: 1.15,
                    }}>{row.labelEn}</div>
                  )}
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                    color: C.stone, marginTop: 3,
                  }}>
                    {row.rate ? `1 US$ = ${formatPesos(row.rate)}` : "—"}
                  </div>
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700,
                  color: row.primary ? C.pepBlue : C.mountain,
                  whiteSpace: "nowrap",
                }}>
                  {value > 0 && row.rate ? fmtResult(result) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footnote on the spread */}
      <div style={{
        marginTop: 12,
        background: C.parchment, border: `1px solid ${C.fog}`, borderRadius: 10,
        padding: "10px 12px",
      }}>
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 11.5, color: C.pepBlack,
          lineHeight: 1.4,
        }}>
          La calculadora usa el <strong>Blue compra</strong>: lo que la cueva te paga por cada dólar.
          Si comprás dólares (no los vendés), pagás el <strong>venta</strong>, que es un poco más alto.
        </div>
        <div style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic",
          fontSize: 11, color: C.mountain, marginTop: 4, lineHeight: 1.4,
        }}>
          The calculator uses Blue compra, the rate a cueva pays you per dollar. If you're buying dollars instead of selling them, you pay venta, which is slightly higher.
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Today View ───
function TodayView({ data, onJumpToTab, profile, currentUser, onRefreshData, prompts, onOpenPrompt }) {
  // Clock tick. Updates every minute so the Próximo countdown stays
  // accurate and the greeting/gradient shifts as the day progresses.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Weather + dólar with a 30-minute localStorage TTL. Lazy-init from
  // cache so the tiles render instantly on repeat opens; refresh in
  // the background whenever the cached value is missing or stale.
  // Lazy useState initializer so loadTodayCache() (a JSON.parse of the
  // weather+dolar blob) runs once on mount, not on every clock tick.
  const [weather, setWeather] = useState(() => loadTodayCache().weather || null);
  const [dolar, setDolar] = useState(() => loadTodayCache().dolar || null);

  // Sheet open state for the two Today tile detail views. Closed by
  // default; toggled by tapping the respective tile.
  const [weatherSheetOpen, setWeatherSheetOpen] = useState(false);
  const [dolarSheetOpen, setDolarSheetOpen] = useState(false);

  // ── Connectivity + per-tile refetch state ──
  // isOnline: tracks navigator.onLine + the online/offline window
  // events. Both tiles dim and tap-disable while offline so a tap
  // doesn't open a sheet against possibly-stale data without warning.
  // weatherRefetching / dolarRefetching: true while a stale-tile-tap is
  // mid-flight on the respective tile. We track them separately from
  // isRefreshing (the whole-page PTR) and from each other so a refetch
  // on one tile doesn't dim the unrelated one.
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine !== false : true
  );
  const [weatherRefetching, setWeatherRefetching] = useState(false);
  const [dolarRefetching, setDolarRefetching] = useState(false);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Standalone weather re-fetch used by the stale-tile tap. On success,
  // updates state + cache and opens the WeatherSheet (because the user's
  // tap signaled they wanted the modal — we just made them wait for
  // fresh data first). On failure, leaves the tile in its prior state.
  const refetchWeatherForStaleTap = useCallback(async () => {
    if (weatherRefetching) return;
    setWeatherRefetching(true);
    try {
      const w = await fetchWeather();
      setWeather(w);
      const cur = loadTodayCache();
      saveTodayCache({ ...cur, weather: w });
      setWeatherSheetOpen(true);
    } catch (e) {
      // Swallow — the tile stays dimmed; user can try again.
    } finally {
      setWeatherRefetching(false);
    }
  }, [weatherRefetching]);

  // Same pattern for dólar. The 3-hour staleness gate is tighter than
  // weather's 6-hour gate because Blue/MEP/Oficial can drift enough in
  // half a day to make the calculator's output misleading.
  const refetchDolarForStaleTap = useCallback(async () => {
    if (dolarRefetching) return;
    setDolarRefetching(true);
    try {
      const d = await fetchDolar();
      setDolar(d);
      const cur = loadTodayCache();
      saveTodayCache({ ...cur, dolar: d });
      setDolarSheetOpen(true);
    } catch (e) {
      // Swallow — the tile stays dimmed; user can try again.
    } finally {
      setDolarRefetching(false);
    }
  }, [dolarRefetching]);

  // ── Pull-to-refresh ──
  // Mobile gesture: pull down from the top of Today to force-refresh
  // weather, dólar, AND the sheet data. The sheet refresh goes
  // through onRefreshData (App-level) which appends ?bust=1 to the
  // Apps Script URL so the script-side 1-hour cache is bypassed too.
  // PTR_THRESHOLD: pull distance (px) to trigger a refresh on release.
  // PTR_MAX: visual cap on translation so the indicator doesn't drift
  // off the top of the viewport. PTR_RESISTANCE: applied to the raw
  // touch delta so the pull feels weighted, like every iOS app.
  const PTR_THRESHOLD = 70;
  const PTR_MAX = 110;
  const PTR_RESISTANCE = 0.55;
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const ptrTouchStartY = useRef(null);
  const ptrScrollableRef = useRef(null);
  const ptrActive = useRef(false);

  // Walk up the DOM from a starting element to find the closest
  // vertically-scrollable ancestor. Used at touchstart so we know
  // which container's scrollTop to check before allowing a pull.
  // Falls back to documentElement if nothing else qualifies.
  const findScrollableAncestor = (el) => {
    let n = el;
    while (n && n !== document.body) {
      const s = window.getComputedStyle(n);
      if ((s.overflowY === "auto" || s.overflowY === "scroll") && n.scrollHeight > n.clientHeight) {
        return n;
      }
      n = n.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  };

  // Trigger a refresh of all live + cached data. Force-fetches weather
  // and dólar (bypassing the 30-min TTL), and calls onRefreshData
  // which re-fetches the sheet data with ?bust=1. All three run in
  // parallel; the indicator stays visible until the slowest finishes.
  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const cur = loadTodayCache();
    let nextCache = { ...cur };
    const weatherPromise = fetchWeather()
      .then((w) => {
        setWeather(w);
        nextCache = { ...nextCache, weather: w };
        saveTodayCache(nextCache);
      })
      .catch(() => { /* keep prior */ });
    const dolarPromise = fetchDolar()
      .then((d) => {
        setDolar(d);
        nextCache = { ...nextCache, dolar: d };
        saveTodayCache(nextCache);
      })
      .catch(() => { /* keep prior */ });
    const sheetPromise = onRefreshData ? onRefreshData() : Promise.resolve();
    await Promise.allSettled([weatherPromise, dolarPromise, sheetPromise]);
    setIsRefreshing(false);
    setPullDistance(0);
  }, [isRefreshing, onRefreshData]);

  // Touch handlers for the pull gesture. Only activates when the
  // scrollable ancestor is at the top (scrollTop === 0); otherwise
  // the touch is treated as a normal scroll. preventDefault is
  // intentionally NOT called (React's passive listener default would
  // make it throw); overscrollBehaviorY: "contain" on the content
  // container keeps the browser's own pull-to-refresh out of the way.
  const onPtrTouchStart = (e) => {
    if (isRefreshing) return;
    if (weatherSheetOpen || dolarSheetOpen) return;
    if (!e.touches || e.touches.length !== 1) return;
    const scrollable = findScrollableAncestor(e.currentTarget);
    ptrScrollableRef.current = scrollable;
    if (scrollable && scrollable.scrollTop > 0) return;
    ptrTouchStartY.current = e.touches[0].clientY;
    ptrActive.current = true;
  };

  const onPtrTouchMove = (e) => {
    if (!ptrActive.current || isRefreshing) return;
    if (!e.touches || e.touches.length !== 1) return;
    // Bail if the user has scrolled the container in the meantime
    // (e.g. they swiped up first, then back down). The pull only
    // counts when we're truly anchored at the top.
    const scrollable = ptrScrollableRef.current;
    if (scrollable && scrollable.scrollTop > 0) {
      ptrActive.current = false;
      setPullDistance(0);
      return;
    }
    const dy = e.touches[0].clientY - ptrTouchStartY.current;
    if (dy <= 0) {
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(PTR_MAX, dy * PTR_RESISTANCE));
  };

  const onPtrTouchEnd = () => {
    if (!ptrActive.current) return;
    ptrActive.current = false;
    ptrTouchStartY.current = null;
    if (pullDistance >= PTR_THRESHOLD) {
      // Trigger refresh; keep the indicator visible at threshold
      // height until both layers finish.
      setPullDistance(PTR_THRESHOLD);
      triggerRefresh();
    } else {
      // Snap back to 0 with a small transition.
      setPullDistance(0);
    }
  };

  const ptrTouchCancel = () => {
    ptrActive.current = false;
    ptrTouchStartY.current = null;
    if (!isRefreshing) setPullDistance(0);
  };

  useEffect(() => {
    const c = loadTodayCache();
    const fresh = (entry) => entry && entry.ts && (Date.now() - entry.ts < TODAY_CACHE_TTL);
    // Weather shape must (a) carry the daily sub-object for the 7-day
    // modal AND (b) have a slice anchor version of at least 2. Caches
    // saved by builds before 2026-04-27b had the hourly slice anchored
    // to UTC instead of BA local, drifting it ~3 hours into the future;
    // the version bump invalidates those caches on next open, so
    // students don't have to wait out the 30-min TTL for the fix to
    // take effect.
    const weatherShapeOk = c.weather
      && c.weather.daily
      && Array.isArray(c.weather.daily.time)
      && (c.weather.hourlySliceVersion || 0) >= 2;

    let nextCache = { ...c };

    if (!fresh(c.weather) || !weatherShapeOk) {
      fetchWeather()
        .then((w) => {
          setWeather(w);
          nextCache = { ...nextCache, weather: w };
          saveTodayCache(nextCache);
        })
        .catch(() => { /* keep cached or null */ });
    }
    if (!fresh(c.dolar)) {
      fetchDolar()
        .then((d) => {
          setDolar(d);
          nextCache = { ...nextCache, dolar: d };
          saveTodayCache(nextCache);
        })
        .catch(() => { /* keep cached or null */ });
    }
  }, []);

  const hour = now.getHours();
  const greeting = getGreeting(hour);
  const gradient = getGreetingGradient(hour);
  const isDayHour = hour >= 6 && hour < 19;
  const dateLabel = formatSpanishDate(now);

  // Derive today's calendar date as YYYY-MM-DD so we can use it as a
  // memo key. The 1-minute clock tick changes `now` constantly but the
  // date string only changes at midnight, so memoizing the heavy work
  // (getTodayItems → eventOverlaps over every calendar event, holiday
  // lookup, class filter, finals merge, sort) on todayStr means it runs
  // once per day instead of once per minute. data/profile are stable
  // useState references in App, so adding them to the deps list is just
  // a correctness belt — they don't change between ticks.
  const todayAnchor = new Date(now);
  todayAnchor.setHours(12, 0, 0, 0);
  const todayStr = toDateStr(todayAnchor);
  const { items, holiday } = useMemo(
    () => getTodayItems(data, profile),
    [data, profile, todayStr]
  );
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextItem = items.find((i) => i.sortMin !== null && i.sortMin > nowMin);
  const countdown = nextItem ? formatCountdown(nextItem.sortMin, nowMin) : null;

  // Tip rotator. Picks from the Tips sheet (or falls back to a small
  // built-in set), rotating every 15 seconds with a soft fade.
  const tipList = (data.tips && data.tips.length > 0) ? data.tips : FALLBACK_TIPS;
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * tipList.length));
  const [tipFading, setTipFading] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % tipList.length);
        setTipFading(false);
      }, 320);
    }, 15000);
    return () => clearInterval(id);
  }, [tipList.length]);
  const tip = tipList[tipIdx] || tipList[0];

  // ── Greeting strip ──
  const greetingStrip = (
    <div style={{
      background: gradient, color: "#FFFFFF", borderRadius: 16,
      padding: "20px 20px 18px", marginBottom: 14, position: "relative",
      overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 32, 91, 0.18)",
    }}>
      <div className={isDayHour ? "bap-sun-rotate" : ""} style={{
        position: "absolute", top: -10, right: -10, opacity: 0.22,
        transform: "scale(1.7)", transformOrigin: "center",
      }}>
        {isDayHour ? <SunIcon size={64} /> : <MoonIcon size={64} />}
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
        letterSpacing: 2, color: C.bapBlue, marginBottom: 4,
      }}>Hoy / Today</div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontSize: 26, fontWeight: 700,
        lineHeight: 1.05, letterSpacing: -0.4,
      }}>{(() => {
        // Prefer the preferred_name over first_name so a student
        // who goes by "Cris" instead of "Cristina" sees the right
        // greeting. Falls back to the bare greeting in preview
        // mode (no SHEET_ID, currentUser is null) or for users
        // whose roster row has no first/preferred name.
        const userName = (currentUser && (currentUser.preferred_name || currentUser.first_name)) || "";
        return userName ? `${greeting.es}, ${userName}` : greeting.es;
      })()}</div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontStyle: "italic",
        fontSize: 16, color: C.fog, marginTop: 4,
      }}>{dateLabel}</div>
    </div>
  );

  // ── Quick-stats row ──
  // Tiles that have an onClick handler render as a button (semantic
  // and keyboard-accessible); tiles without one render as a plain div
  // (no false affordance on the empty-state placeholders).
  //
  // dimmed=true: tile is offline / refreshing / stale. Renders against
  // the Ice background at ~55% opacity, with the tap suppressed when
  // a click handler is supplied. Used to give a visible "this isn't
  // current" cue without removing the tile entirely.
  const statTile = (children, key, onClick, dimmed) => {
    const baseStyle = {
      flex: 1,
      background: dimmed ? C.ice : `linear-gradient(135deg, ${C.white} 0%, ${C.ice} 100%)`,
      border: `1px solid ${C.fog}`,
      borderRadius: 12, padding: "12px 14px", minWidth: 0,
      opacity: dimmed ? 0.55 : 1,
      transition: "opacity 0.18s ease, background 0.18s ease",
    };
    if (onClick && !dimmed) {
      return (
        <button
          key={key}
          onClick={onClick}
          className="bap-press"
          aria-label={`Open ${key} details`}
          style={{
            ...baseStyle,
            cursor: "pointer", textAlign: "left",
            font: "inherit", color: "inherit",
            display: "block",
          }}
        >{children}</button>
      );
    }
    if (onClick && dimmed) {
      // Dimmed but tappable: stale-weather case. The tap fires the
      // handler (e.g. refetchWeatherForStaleTap) instead of opening a
      // sheet. The bap-press class is omitted to read as "waiting"
      // rather than "interactive."
      return (
        <button
          key={key}
          onClick={onClick}
          aria-label={`Refresh ${key}`}
          style={{
            ...baseStyle,
            cursor: "pointer", textAlign: "left",
            font: "inherit", color: "inherit",
            display: "block",
          }}
        >{children}</button>
      );
    }
    return (
      <div key={key} className={dimmed ? "" : "bap-press"} style={baseStyle}>{children}</div>
    );
  };

  // computeWeatherAlert scans 48 hours of hourly forecast data each call,
  // and the weather state only changes when fetchWeather succeeds (every
  // ~30 min at most). Memoize so the clock tick doesn't redo the scan.
  const weatherAlert = useMemo(
    () => (weather ? computeWeatherAlert(weather) : null),
    [weather]
  );
  // Stale = cached weather older than 6 hours (WEATHER_STALE_MS). When
  // stale, the tile dims and a tap triggers a foreground re-fetch via
  // refetchWeatherForStaleTap instead of opening WeatherSheet directly.
  const weatherStale = isWeatherStale(weather);
  // Same gate for dolar at the tighter 3-hour DOLAR_STALE_MS threshold.
  const dolarStale = isDolarStale(dolar);

  const weatherTile = statTile(
    weather ? (
      <>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9.5, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 4,
        }}>Buenos Aires</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <WeatherIcon code={weather.code} isDay={weather.isDay} size={32} />
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700,
            color: C.pepBlue, lineHeight: 1,
          }}>{weather.temp !== null ? cToF(weather.temp) + "°" : "—"}</div>
        </div>
        {(typeof weather.tempMax === "number" || typeof weather.tempMin === "number") && (
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain,
            marginTop: 6, lineHeight: 1.3,
          }}>
            {typeof weather.tempMax === "number" ? `↑ ${cToF(weather.tempMax)}°` : ""}
            {typeof weather.tempMax === "number" && typeof weather.tempMin === "number" ? "  " : ""}
            {typeof weather.tempMin === "number" ? `↓ ${cToF(weather.tempMin)}°` : ""}
          </div>
        )}
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 11, color: C.mountain,
          marginTop: 6, lineHeight: 1.3,
        }}>{getDressHint(weather.temp, weather.code)}</div>
        {weatherAlert && (
          <div style={{
            marginTop: 8,
            background: C.parchment,
            borderLeft: `2.5px solid ${C.pepOrange}`,
            borderRadius: 4,
            padding: "4px 8px",
            lineHeight: 1.3,
          }}>
            <div style={{
              fontFamily: "'Roboto', sans-serif", fontSize: 11.5, fontWeight: 500,
              color: C.pepBlack,
            }}>
              {weatherAlert.es}
              <span style={{ color: C.stone, margin: "0 4px" }}>/</span>
              <span style={{
                fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                fontWeight: 400, color: C.mountain,
              }}>{weatherAlert.en}</span>
            </div>
          </div>
        )}
      </>
    ) : (
      <>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9.5, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 4,
        }}>Buenos Aires</div>
        <div style={{ height: 32, display: "flex", alignItems: "center", color: C.stone, fontSize: 12 }}>—</div>
      </>
    ),
    "weather",
    // Click handler: when fresh + online + idle, opens the modal.
    // When stale-but-online, fires a foreground re-fetch instead;
    // success ungrays + opens the modal. When refreshing or offline,
    // statTile sees dimmed=true and ignores onClick — no false tap.
    weather
      ? (
          weatherStale && isOnline && !isRefreshing && !weatherRefetching
            ? refetchWeatherForStaleTap
            : () => setWeatherSheetOpen(true)
        )
      : null,
    // Dimmed state: refreshing OR offline OR stale OR mid-stale-refetch.
    isRefreshing || !isOnline || weatherStale || weatherRefetching,
  );

  const dolarTile = statTile(
    dolar && dolar.compra ? (
      <>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9.5, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 4,
        }}>Dólar blue</div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700,
          color: C.pepBlue, lineHeight: 1,
        }}>{formatPesos(dolar.compra)}</div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain,
          marginTop: 6, lineHeight: 1.3,
        }}>
          MEP {dolar.mep ? formatPesos(dolar.mep) : "—"}
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain,
          marginTop: 2, lineHeight: 1.3,
        }}>
          Oficial {dolar.oficial ? formatPesos(dolar.oficial) : "—"}
        </div>
      </>
    ) : (
      <>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9.5, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 4,
        }}>Dólar blue</div>
        <div style={{ height: 32, display: "flex", alignItems: "center", color: C.stone, fontSize: 12 }}>—</div>
      </>
    ),
    "dolar",
    // Click handler mirrors weather: when fresh + online + idle, opens
    // the calculator. When stale-but-online, fires a foreground re-
    // fetch via refetchDolarForStaleTap; success ungrays + opens. When
    // refreshing or offline, statTile sees dimmed=true and ignores
    // onClick — no false tap affordance.
    dolar && dolar.compra
      ? (
          dolarStale && isOnline && !isRefreshing && !dolarRefetching
            ? refetchDolarForStaleTap
            : () => setDolarSheetOpen(true)
        )
      : null,
    // Dimmed state: refreshing OR offline OR stale OR mid-stale-refetch.
    isRefreshing || !isOnline || dolarStale || dolarRefetching,
  );

  // ── Holiday card ──
  // Renders above the activity card on a feriado or cultural
  // observance. On a class-cancelling holiday it serves as context
  // for why the day is open; on an observance day it's a small
  // cultural primer. Bilingual: Spanish primary, English in italic
  // serif underneath. Pulls title and descriptions from the Holidays
  // sheet tab (or, as fallback, from a calendar holiday event).
  let holidayCard = null;
  if (holiday) {
    const sameTitle = holiday.name_es && holiday.name_en && holiday.name_es === holiday.name_en;
    const sameDesc = holiday.description_es && holiday.description_en && holiday.description_es === holiday.description_en;
    const labelEs = holiday.cancels_classes ? "Feriado" : "Día especial";
    const labelEn = holiday.cancels_classes ? "Holiday" : "Cultural day";
    const accent = holiday.cancels_classes ? "#C62828" : C.ocean;
    const bg = holiday.cancels_classes ? "#FCE4EC" : C.ice;
    holidayCard = (
      <div style={{
        background: bg,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: "13px 16px",
        marginBottom: 14,
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: 1.5, color: accent,
          marginBottom: 6,
        }}>
          {labelEs} <span style={{ color: C.stone, margin: "0 2px" }}>/</span> {labelEn}
        </div>
        <div style={{
          fontFamily: "'EB Garamond', serif", fontSize: 19, fontWeight: 700,
          fontStyle: "italic", color: C.pepBlack, lineHeight: 1.2,
        }}>{holiday.name_es || holiday.name_en}</div>
        {!sameTitle && holiday.name_en && (
          <div style={{
            fontFamily: "'EB Garamond', serif", fontSize: 14,
            fontStyle: "italic", color: C.mountain, lineHeight: 1.25,
            marginTop: 2,
          }}>{holiday.name_en}</div>
        )}
        {holiday.description_es && (
          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.pepBlack,
            marginTop: 8, lineHeight: 1.45, whiteSpace: "pre-line",
          }}>{holiday.description_es}</div>
        )}
        {!sameDesc && holiday.description_en && (
          <div style={{
            fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12.5,
            color: C.mountain, marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-line",
          }}>{holiday.description_en}</div>
        )}
      </div>
    );
  }

  // ── Today's activity (or empty state) ──
  // Branches:
  //   - items > 0 → list of items (the holiday is already surfaced
  //     above as its own card)
  //   - empty + class-cancelling holiday → no activityCard at all
  //     (holiday card alone is enough; "¡Día libre!" would be redundant)
  //   - empty otherwise → "¡Día libre!" empty state. Cultural
  //     observances (cancels_classes=false) still get this when
  //     there's nothing else on, since they don't change the day's
  //     rhythm.
  const suppressEmptyForHoliday = !!(holiday && holiday.cancels_classes);
  let activityCard;
  if (items.length === 0 && suppressEmptyForHoliday) {
    activityCard = null;
  } else if (items.length === 0) {
    activityCard = (
      <div style={{
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
        padding: "18px 18px 16px", marginBottom: 14, position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Faint steam wisps rising from the gourd */}
            <div className="bap-steam" style={{
              position: "absolute", top: -10, left: 14, width: 2, height: 12,
              borderRadius: 2, background: C.fog, opacity: 0,
            }} />
            <div className="bap-steam delayed" style={{
              position: "absolute", top: -10, left: 22, width: 2, height: 12,
              borderRadius: 2, background: C.fog, opacity: 0,
            }} />
            <MateGourdIcon size={48} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 700,
              fontStyle: "italic", color: C.pepBlue, lineHeight: 1.1,
            }}>¡Día libre!</div>
            <div style={{
              fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain,
              marginTop: 4, lineHeight: 1.4,
            }}>Nada en agenda hoy. Date una vuelta; Buenos Aires te espera.</div>
          </div>
        </div>
        {onJumpToTab && (
          <button
            onClick={() => onJumpToTab("local")}
            className="bap-press"
            style={{
              marginTop: 14, background: C.ice, color: C.ocean,
              border: `1px solid ${C.fog}`, borderRadius: 10,
              padding: "9px 14px", cursor: "pointer", width: "100%",
              fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500,
              textTransform: "uppercase", letterSpacing: 1.2,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            Explorar BA <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    );
  } else {
    activityCard = (
      <div style={{
        background: C.white,
        border: `1px solid ${C.fog}`, borderLeft: `4px solid ${C.bapBlue}`,
        borderRadius: 12,
        padding: "14px 16px 12px", marginBottom: 14,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.ocean,
          }}>Agenda</div>
          {countdown && nextItem && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              textTransform: "uppercase", letterSpacing: 1.2,
              background: C.ice, color: C.ocean,
              padding: "4px 10px", borderRadius: 10,
            }}>
              <span className="bap-pulse-dot" aria-hidden="true" />
              Próximo {countdown}
            </div>
          )}
        </div>
        {items.map((item, i) => {
          const isNext = nextItem && nextItem === item;
          const isFinal = item.kind === "final";
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "9px 0",
              borderTop: i === 0 ? "none" : `1px solid ${C.fog}`,
              opacity: item.sortMin !== null && item.sortMin <= nowMin ? 0.55 : 1,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontFamily: "'Roboto', sans-serif", fontSize: 14,
                  fontWeight: isNext ? 700 : 500, color: C.pepBlack,
                  lineHeight: 1.3,
                }}>
                  {item.code && (
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                      color: C.ocean, marginRight: 6, letterSpacing: 0.5,
                    }}>{item.code}</span>
                  )}
                  {isFinal && (
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 700,
                      color: C.white, background: C.pepOrange,
                      padding: "1px 6px", borderRadius: 6, marginRight: 6,
                      textTransform: "uppercase", letterSpacing: 1,
                      verticalAlign: 1,
                    }}>Final</span>
                  )}
                  {item.title}
                </div>
                {item.location && (
                  <div style={{
                    fontFamily: "'Roboto', sans-serif", fontSize: 11.5,
                    color: C.stone, marginTop: 2,
                  }}>{item.location}</div>
                )}
              </div>
              {item.time && (
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                  color: isNext ? C.ocean : C.stone, fontWeight: isNext ? 700 : 400,
                  whiteSpace: "nowrap", marginLeft: 12,
                }}>{item.time}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Tip card ──
  const tipCard = (
    <div style={{
      background: C.white,
      border: `1px solid ${C.fog}`, borderLeft: `4px solid ${C.bapBlue}`,
      borderRadius: 12, padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden="true" style={{
        position: "absolute", top: 8, right: 10, opacity: 0.18,
        pointerEvents: "none",
      }}>
        <RioWaveIcon size={36} />
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: C.ocean,
        textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6,
        display: "flex", alignItems: "center", gap: 6,
        position: "relative",
      }}>
        <span>¿Sabías que…?</span>
      </div>
      <div className={`bap-tip-text${tipFading ? " fading" : ""}`} style={{
        fontFamily: "'Roboto', sans-serif", fontSize: 13.5, lineHeight: 1.5,
        color: C.pepBlack, minHeight: 40,
        position: "relative",
      }}>{renderTip(tip.text)}</div>
    </div>
  );

  // Effective pull translation. While refreshing, hold at the
  // threshold so the indicator stays visible without flickering.
  // Otherwise track the live pull distance, which snaps to 0 on
  // release-without-trigger via the transition below.
  const ptrTranslate = isRefreshing ? PTR_THRESHOLD : pullDistance;
  const ptrReady = pullDistance >= PTR_THRESHOLD && !isRefreshing;
  // Indicator opacity ramps from ~0 at no pull to fully visible by
  // the time the user is past threshold or actively refreshing.
  const ptrOpacity = isRefreshing ? 1 : Math.min(1, pullDistance / PTR_THRESHOLD);

  return (
    <div
      onTouchStart={onPtrTouchStart}
      onTouchMove={onPtrTouchMove}
      onTouchEnd={onPtrTouchEnd}
      onTouchCancel={ptrTouchCancel}
      style={{ position: "relative" }}
    >
      {/* Pull-to-refresh indicator. Sits in a 56 px slot above the
          greeting strip; revealed by translating the content down. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -56,
          left: 0,
          right: 0,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${ptrTranslate}px)`,
          transition: ptrActive.current ? "none" : "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
          opacity: ptrOpacity,
        }}
      >
        <div
          className={isRefreshing ? "bap-spin" : ""}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `2.5px solid ${C.fog}`,
            borderTopColor: ptrReady || isRefreshing ? C.pepBlue : C.fog,
            transition: "border-top-color 0.18s ease-out",
          }}
        />
      </div>

      {/* Content; translates down with the pull so the indicator slot
          becomes visible at the top. Snaps back via the same transition. */}
      <div
        style={{
          transform: `translateY(${ptrTranslate}px)`,
          transition: ptrActive.current ? "none" : "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {greetingStrip}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {weatherTile}
          {dolarTile}
        </div>
        <AnnouncementBanner announcements={data.announcements} />
        <BirthdayCard birthdays={data.birthdays} />
        {holidayCard}
        {activityCard}
        <PromptCard prompts={prompts} onOpenPrompt={onOpenPrompt} />
        <TodayFinalsTile data={data} profile={profile} now={now} onJumpToTab={onJumpToTab} />
        <EventsTodayTile data={data} todayStr={todayStr} onJumpToTab={onJumpToTab} />
        {tipCard}
      </div>

      <WeatherSheet
        open={weatherSheetOpen}
        onClose={() => setWeatherSheetOpen(false)}
        weather={weather}
      />
      <DolarSheet
        open={dolarSheetOpen}
        onClose={() => setDolarSheetOpen(false)}
        dolar={dolar}
      />
    </div>
  );
}

// Small section divider used inside grouped lists (e.g., the Apps view's
// "Getting around" vs "Daily life" groups). Pairs a glyph in a soft
// rounded container with a bilingual label. Decorative; helps the eye
// scan a long flat list.
function SectionDivider({ icon, en, es }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      margin: "18px 0 10px",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: C.ice,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        border: `1px solid rgba(108, 172, 228, 0.4)`,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'EB Garamond', serif", fontSize: 16, fontWeight: 700,
          color: C.pepBlue, lineHeight: 1,
        }}>{en}</div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9.5,
          textTransform: "uppercase", letterSpacing: 1.5, color: C.ocean,
          marginTop: 2,
        }}>{es}</div>
      </div>
    </div>
  );
}

// Whimsical empty-day card for the Weekly Overview. Replaces the
// flat "No events" line with a small mate gourd and Argentine-flavored
// copy. One uniform treatment for every empty day in the visible week.
function EmptyDay() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: C.ice, border: `1px dashed ${C.fog}`, borderRadius: 8,
      padding: "10px 14px", marginTop: 4,
    }}>
      <MateGourdIcon size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'EB Garamond', serif", fontSize: 16, fontWeight: 700,
          fontStyle: "italic", color: C.pepBlue, lineHeight: 1.1,
        }}>¡Día libre!</div>
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.mountain,
          marginTop: 2, lineHeight: 1.3,
        }}>Nada en agenda hoy.</div>
      </div>
    </div>
  );
}

// Section title used at the top of every main view. English headline
// in EB Garamond at 28 px; Spanish gloss below in DM Mono uppercase.
function SectionTitle({ tabKey }) {
  const t = TAB_TITLES[tabKey];
  if (!t) return null;
  return (
    <div style={{ marginBottom: 18, lineHeight: 1 }}>
      <div style={{
        width: 28, height: 2, background: C.bapBlue,
        borderRadius: 1, marginBottom: 10,
      }} />
      <div style={{
        fontFamily: "'EB Garamond', serif", fontSize: 28, fontWeight: 700,
        color: C.pepBlue, letterSpacing: -0.5, lineHeight: 1.05,
      }}>{t.en}</div>
      <div style={{
        marginTop: 4,
        fontFamily: "'DM Mono', monospace", fontSize: 11,
        textTransform: "uppercase", letterSpacing: 2.2, color: C.ocean,
      }}>{t.es}</div>
    </div>
  );
}

// Loading screen with a rotating BA tip. Pulls tips from the cached
// data when available and falls back to a small built-in set so the
// first-ever load is never blank. New tip every 4 seconds with a
// soft fade. Honors prefers-reduced-motion via the .bap-tip-fade class.
const FALLBACK_TIPS = [
  { text: 'Buenos Aires literally means "Good Air."' },
  { text: "*Dale* is yes, no, sure, ok, and \u201clet\u2019s go,\u201d all at once." },
  { text: "Most caf\u00e9s bring you a free glass of soda water with every coffee." },
];

function LoadingScreen({ tips }) {
  const list = (tips && tips.length > 0) ? tips : FALLBACK_TIPS;
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * list.length));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % list.length);
        setFading(false);
      }, 320);
    }, 4000);
    return () => clearInterval(interval);
  }, [list.length]);

  const current = list[idx] || list[0];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 28px", textAlign: "center",
    }}>
      <div className="bap-spin" style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `3px solid ${C.fog}`, borderTopColor: C.pepBlue,
        marginBottom: 20,
      }} />
      <div style={{
        fontFamily: "'EB Garamond', serif", fontSize: 18, color: C.pepBlue,
        marginBottom: 18,
      }}>Cargando…</div>
      <div style={{
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
        padding: "16px 18px", boxShadow: "0 1px 4px rgba(0, 32, 91, 0.05)",
        width: "100%", maxWidth: 280,
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.ocean,
          textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <span style={{ fontSize: 12 }}>💡</span>
          <span>Tip of the load</span>
        </div>
        <div className={`bap-tip-text${fading ? " fading" : ""}`} style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 13.5, lineHeight: 1.5,
          color: C.pepBlack, minHeight: 60,
        }}>{renderTip(current.text)}</div>
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="bap-press" style={{
      padding: "5px 14px", borderRadius: 20,
      border: active ? `2px solid ${C.pepBlue}` : "2px solid transparent",
      background: active ? C.pepBlue : C.ice,
      color: active ? C.white : C.mountain,
      fontFamily: "'Roboto', sans-serif", fontSize: 13, fontWeight: active ? 500 : 400,
      cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

function Card({ children, borderLeft, bg }) {
  return (
    <div style={{
      background: bg || C.white, borderRadius: 10, padding: 16,
      border: `1px solid ${C.fog}`, borderLeft: borderLeft ? `4px solid ${borderLeft}` : undefined,
    }}>{children}</div>
  );
}

// ─── Announcement Banner ───
// "Hasta el viernes" / "Hasta el 4 de mayo" — short, italic gloss
// shown at the bottom of an active announcement so students know
// when it'll auto-disappear. Returns null when the end date is more
// than ~21 days out (in which case the date context just becomes
// noise) or already past.
function formatAnnouncementThrough(endDateStr) {
  if (!endDateStr) return null;
  const end = new Date(endDateStr + "T12:00:00");
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const daysOut = Math.round((end - today) / (1000 * 60 * 60 * 24));

  if (daysOut < 0) return null;
  if (daysOut === 0) return "Solo hoy";
  if (daysOut === 1) return "Hasta mañana";
  if (daysOut <= 7) return `Hasta el ${SPANISH_WEEKDAYS[end.getDay()]}`;
  if (daysOut <= 21) return `Hasta el ${end.getDate()} de ${SPANISH_MONTHS[end.getMonth()]}`;
  return null;
}

function AnnouncementBanner({ announcements }) {
  const todayStr = getTodayStr();

  // Filter to only announcements active today (today is within
  // the date range). Per 2026-04-26 redesign, announcements are
  // not user-dismissible: they auto-clear once the end_date passes,
  // so the program office controls the lifecycle in the sheet.
  const active = (announcements || []).filter((a) => {
    if (!a.start_date || !a.end_date) return false;
    if (todayStr < a.start_date || todayStr > a.end_date) return false;
    return true;
  });

  if (active.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
      {active.map((a, i) => {
        const isUrgent = a.type === "urgent";
        const accent = isUrgent ? C.pepOrange : C.bapBlue;
        const bg = isUrgent ? C.parchment : C.ice;
        const labelEs = isUrgent ? "Importante" : "Aviso";
        const labelEn = isUrgent ? "Important" : "Notice";
        const through = formatAnnouncementThrough(a.end_date);

        return (
          <div key={i} style={{
            position: "relative",
            background: bg,
            borderRadius: 12,
            padding: "13px 14px 13px 18px",
            overflow: "hidden",
            boxShadow: isUrgent
              ? "0 1px 3px rgba(227, 82, 5, 0.10)"
              : "0 1px 3px rgba(0, 87, 184, 0.08)",
          }}>
            {/* Vertical accent stripe on the left edge — gradient gives
                a softer feel than a hard border, and adds depth without
                pulling visual weight from the message itself. */}
            <div aria-hidden="true" style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
              background: `linear-gradient(180deg, ${accent} 0%, ${accent}AA 100%)`,
            }} />

            {/* Header row: icon + bilingual label. Urgent gets a small
                pulsing dot pinned to the right to signal live priority. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              {isUrgent
                ? <AlertIcon size={16} color={accent} />
                : <MegaphoneIcon size={16} color={accent} />}
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
                textTransform: "uppercase", letterSpacing: 1.5, color: accent,
              }}>
                {labelEs} <span style={{ color: C.stone, margin: "0 2px" }}>/</span> {labelEn}
              </span>
              {isUrgent && (
                <span
                  className="bap-pulse-dot-orange"
                  aria-hidden="true"
                  style={{ marginLeft: "auto" }}
                />
              )}
            </div>

            {/* Message body */}
            <div style={{
              fontFamily: "'Roboto', sans-serif", fontSize: 14,
              lineHeight: 1.5, color: C.pepBlack,
            }}>
              {a.message}
            </div>

            {/* Footer: italic Spanish "through" gloss on the left,
                optional CTA pill on the right. Wrapped so they stack
                gracefully on narrow widths. */}
            {(through || a.link) && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, marginTop: 10, flexWrap: "wrap",
              }}>
                {through ? (
                  <span style={{
                    fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                    fontSize: 13, color: C.mountain, lineHeight: 1.2,
                  }}>{through}</span>
                ) : <span />}
                {safeExternalUrl(a.link) && (
                  <a
                    href={safeExternalUrl(a.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bap-press"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
                      color: C.white, background: accent,
                      padding: "5px 12px", borderRadius: 14,
                      textDecoration: "none", textTransform: "uppercase", letterSpacing: 0.8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Más info <span aria-hidden="true">→</span>
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Birthday card — surfaced on Today between the announcement banner
// and the holiday card on any day where one or more rows in
// data.birthdays match today's MM-DD. Three layout tiers:
//   - 1 person:  personalized title with their name in the headline
//   - 2 people:  Spanish title with both names joined ("María y Carlos")
//   - 3+ people: generic "¡Feliz cumple!" header with names listed
//                beneath in a single comma-joined line
// Spanish-only by design — the names themselves carry the bicultural
// feeling, and the Spanish reads warmer without an English echo
// underneath. Year of birth (if present in the source data) is
// intentionally stripped during parsing — the app never displays or
// computes age.
function BirthdayCard({ birthdays }) {
  const today = findTodayBirthdays(birthdays);
  if (today.length === 0) return null;
  const names = today.map((b) => b.name);

  let title;
  let listLine = null;
  if (names.length === 1) {
    title = `¡Feliz cumple, ${names[0]}!`;
  } else if (names.length === 2) {
    title = `¡Feliz cumple a ${joinSpanish(names)}!`;
  } else {
    title = "¡Feliz cumple!";
    listLine = names.join(", ");
  }

  return (
    <div style={{
      background: C.parchment,
      borderLeft: `4px solid ${C.pepOrange}`,
      borderRadius: 12,
      padding: "13px 16px",
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{ flexShrink: 0 }}>
        <CupcakeIcon size={44} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic",
          fontSize: 18, fontWeight: 700, color: C.pepBlack, lineHeight: 1.2,
        }}>{title}</div>
        {listLine && (
          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.pepBlack,
            marginTop: 6, lineHeight: 1.4,
          }}>{listLine}</div>
        )}
      </div>
    </div>
  );
}

// ─── Weekly Overview ───
function WeeklyOverviewView({ data, profile }) {
  const [weekOffset, setWeekOffset] = useState(0);

  // The whole per-week pipeline (event overlap scan, per-day grouping +
  // sort, personalized class filter, finals lookup) only depends on
  // data, profile, and weekOffset — none of which change on a typical
  // re-render. Memoize so chevron taps don't redo unrelated work and a
  // background data refresh doesn't redo the same computation twice
  // before the user sees anything.
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = toDateStr(today);

  const weekData = useMemo(() => {
    const baseWeekStart = getWeekStart(today);
    const weekStart = new Date(baseWeekStart);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(d);
    }

    const weekStartStr = toDateStr(weekDates[0]);
    const weekEndStr = toDateStr(weekDates[6]);

    // Filter events that overlap this week (handles multi-day events).
    const weekEvents = data.calendarEvents.filter((e) => {
      if (e.visibility === "semester") return false;
      return eventOverlaps(e, weekStartStr, weekEndStr);
    });

    // Group events by date. Multi-day events go on their start date
    // (or the first day of the week if they started earlier).
    const eventsByDate = {};
    weekDates.forEach((d) => { eventsByDate[toDateStr(d)] = []; });
    weekEvents.forEach((e) => {
      const placeOn = e.date >= weekStartStr ? e.date : weekStartStr;
      if (eventsByDate[placeOn]) eventsByDate[placeOn].push(e);
    });
    // Sort each day's events. Untimed events come first; timed events follow
    // in chronological order. Parses times numerically so 9:00 sorts before
    // 10:00 (lexicographic sort would reverse them).
    Object.values(eventsByDate).forEach((evts) => {
      evts.sort((a, b) => {
        const ma = toMinutes(a.start_time);
        const mb = toMinutes(b.start_time);
        if (ma === null && mb === null) return 0;
        if (ma === null) return -1;
        if (mb === null) return 1;
        return ma - mb;
      });
    });

    // Personalized classes by day-of-week. Only computed when the
    // student has personalized AND the filter toggle is on (which
    // auto-enables when classes are first selected). Empty otherwise,
    // and never rendered on a day that has a holiday event. Each day
    // additionally gates by the per-class start_date/end_date window
    // so pre-arrival or post-finals weeks don't carry over the regular
    // class grid into the overview.
    const showClasses = shouldFilterClasses(profile);
    const visibleClasses = showClasses
      ? filterClassesByProfile(data.classes || [], profile)
      : [];

    // Pre-compute, per displayed date, the active classes for that day.
    // Stored by YYYY-MM-DD so the day-card render doesn't recompute the
    // active filter on every re-render.
    const activeClassesByDate = {};
    if (showClasses) {
      weekDates.forEach((d) => {
        const ds = toDateStr(d);
        const dow = WEEK_DAYS_SHORT[d.getDay()];
        const dayActive = filterActiveClassesForDate(visibleClasses, ds);
        activeClassesByDate[ds] = dayActive
          .filter((c) => c.days && c.days.includes(dow))
          .sort((a, b) =>
            getSortTime(a.time, dow).localeCompare(getSortTime(b.time, dow))
          );
      });
    }

    // Pre-compute final exams happening on each displayed date for the
    // student's enrolled classes. On a finals day, the regular class
    // grid for that day is replaced with the finals (which is what the
    // Today tab does too).
    const finalsByDate = {};
    weekDates.forEach((d) => {
      finalsByDate[toDateStr(d)] = getFinalForDate(data, profile, toDateStr(d));
    });

    return { weekDates, weekStartStr, weekEndStr, eventsByDate, activeClassesByDate, finalsByDate, showClasses, visibleClasses };
    // We intentionally exclude `today` from the deps — it's a fresh Date
    // object each render but `todayStr` (below) is what would actually
    // change, and we want a week to recompute when the calendar day
    // rolls over. eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, profile, weekOffset, todayStr]);

  const { weekDates, weekStartStr, weekEndStr, eventsByDate, activeClassesByDate, finalsByDate, showClasses, visibleClasses } = weekData;

  const weekLabel = `${formatDate(weekStartStr)} – ${formatDate(weekEndStr)}`;
  const MIN_WEEK_OFFSET = -1;
  const MAX_WEEK_OFFSET = 2;
  const canGoBack = weekOffset > MIN_WEEK_OFFSET;
  const canGoForward = weekOffset < MAX_WEEK_OFFSET;

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button
          onClick={() => canGoBack && setWeekOffset((o) => Math.max(MIN_WEEK_OFFSET, o - 1))}
          disabled={!canGoBack}
          aria-label="Previous week"
          style={{
            background: "none", border: `1px solid ${C.fog}`, borderRadius: 8, padding: "6px 12px",
            cursor: canGoBack ? "pointer" : "not-allowed", fontSize: 16,
            color: canGoBack ? C.pepBlue : C.stone, fontWeight: 700,
            opacity: canGoBack ? 1 : 0.4,
          }}
        >‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.stone, letterSpacing: 0.5 }}>{weekLabel}</div>
          {weekOffset === 0 && (
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: C.ocean, fontWeight: 500, marginTop: 2 }}>This Week</div>
          )}
        </div>
        <button
          onClick={() => canGoForward && setWeekOffset((o) => Math.min(MAX_WEEK_OFFSET, o + 1))}
          disabled={!canGoForward}
          aria-label="Next week"
          style={{
            background: "none", border: `1px solid ${C.fog}`, borderRadius: 8, padding: "6px 12px",
            cursor: canGoForward ? "pointer" : "not-allowed", fontSize: 16,
            color: canGoForward ? C.pepBlue : C.stone, fontWeight: 700,
            opacity: canGoForward ? 1 : 0.4,
          }}
        >›</button>
      </div>
      {weekOffset !== 0 && (
        <button onClick={() => setWeekOffset(0)} style={{
          display: "block", margin: "0 auto 14px", background: C.ice, border: `1px solid ${C.fog}`,
          borderRadius: 16, padding: "4px 16px", cursor: "pointer",
          fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean, fontWeight: 500,
        }}>← Back to This Week</button>
      )}

      {/* Days */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {weekDates.map((d) => {
          const ds = toDateStr(d);
          const dow = WEEK_DAYS_SHORT[d.getDay()];
          const isToday = ds === todayStr;
          const dayEvents = eventsByDate[ds] || [];
          const holidayContext = findHolidayContext(data, ds);
          const cancelsClasses = !!(holidayContext && holidayContext.cancels_classes);
          // Personal classes only render when (a) the student has
          // personalized AND (b) the day's holiday (if any) doesn't
          // cancel classes. Cultural observances (cancels_classes=false)
          // do NOT suppress classes. Class Schedule's own week view
          // stays unaffected; this is only for the weekly overview.
          //
          // As of 2026-04-28 each class is also gated by its own
          // start_date / end_date — outside that range the class meeting
          // is suppressed for that day. And on a class's final_date,
          // the regular class meeting is replaced by a "Final" entry
          // (rendered in dayFinals below) instead of the normal class.
          //
          // activeClassesByDate is pre-computed above and already applies
          // (i) the personalization filter, (ii) the per-class active
          // date range, and (iii) the day-of-week match. The remaining
          // filter here drops any class whose final lands on this date,
          // since dayFinals will surface it as a "Final" entry instead.
          const dayClasses = (showClasses && !cancelsClasses)
            ? (activeClassesByDate[ds] || []).filter((c) => !(c.final_date && c.final_date === ds))
            : [];
          const dayFinals = (showClasses && !cancelsClasses)
            ? visibleClasses.filter((c) => c.final_date && c.final_date === ds)
            : [];

          // Unified, chronologically sorted day list. Events, finals,
          // and personal classes interleave by start time so the card
          // order reflects what the day actually looks like minute by
          // minute, rather than always bucketing classes below events.
          // Each entry tags its kind so the render below can pick the
          // matching card style. Untimed entries (no start_time on an
          // event, no final_time on a final) sort to the top, matching
          // getTodayItems' behavior on the Today tab.
          const dayItems = [];
          dayEvents.forEach((e, i) => {
            // Skip legacy holiday events when there's already a
            // Holidays-tab row driving the holiday banner above.
            if (holidayContext && holidayContext.source === "legacy" && e.type === "holiday") return;
            dayItems.push({ kind: "event", sortMin: toMinutes(e.start_time), key: `evt-${i}`, payload: e });
          });
          dayFinals.forEach((c, i) => {
            const start = (c.final_time || "").split(/[–-]/)[0];
            dayItems.push({ kind: "final", sortMin: toMinutes(start), key: `fin-${i}`, payload: c });
          });
          dayClasses.forEach((c, i) => {
            const t = getTimeForDay(c.time, dow);
            const start = (t || "").split(/[–-]/)[0];
            dayItems.push({ kind: "class", sortMin: toMinutes(start), key: `cls-${i}`, payload: c, time: t });
          });
          dayItems.sort((a, b) => {
            if (a.sortMin === null && b.sortMin === null) return 0;
            if (a.sortMin === null) return -1;
            if (b.sortMin === null) return 1;
            return a.sortMin - b.sortMin;
          });
          const hasContent = dayItems.length > 0 || !!holidayContext;

          return (
            <div key={ds} style={{
              background: isToday ? "#F0F7FF" : C.white,
              borderRadius: 12, padding: "12px 14px",
              border: isToday ? `2px solid ${C.bapBlue}` : `1px solid ${C.fog}`,
            }}>
              {/* Day header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hasContent ? 10 : 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: isToday ? C.pepBlue : C.parchment,
                  color: isToday ? C.white : C.pepBlack,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16,
                }}>{d.getDate()}</div>
                <div>
                  <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 15, color: C.pepBlack }}>
                    {WEEK_DAYS_FULL[d.getDay()]}
                    {isToday && <span style={{
                      marginLeft: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.white,
                      background: C.ocean, padding: "2px 8px", borderRadius: 10, fontWeight: 400,
                    }}>TODAY</span>}
                  </div>
                </div>
              </div>

              {/* Holiday banner inside the day card. Renders for any
                  Holidays-tab row hitting this date (or a legacy
                  calendar holiday event). Class-cancelling holidays
                  get the red feriado treatment; cultural observances
                  get a quieter Ocean treatment so they don't shout. */}
              {holidayContext && (() => {
                const accent = holidayContext.cancels_classes ? "#C62828" : C.ocean;
                const bg = holidayContext.cancels_classes ? "#FCE4EC" : C.ice;
                const labelEs = holidayContext.cancels_classes ? "Feriado" : "Día especial";
                return (
                  <div style={{
                    background: bg, borderLeft: `3px solid ${accent}`,
                    borderRadius: 8, padding: "8px 12px", marginBottom: 6,
                  }}>
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 500,
                      textTransform: "uppercase", letterSpacing: 1.2, color: accent,
                      marginBottom: 2,
                    }}>{labelEs}</div>
                    <div style={{
                      fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                      fontSize: 14, fontWeight: 700, color: C.pepBlack, lineHeight: 1.2,
                    }}>{holidayContext.name_es || holidayContext.name_en}</div>
                  </div>
                );
              })()}

              {/* Events, finals, and personal classes interleave by
                  start time. Untimed entries (typically all-day events)
                  sort to the top; everything else flows in chronological
                  order. Each kind keeps its own card style — events get
                  their type-driven background + border, finals get the
                  Pep Orange "Final" treatment, classes get the thinner
                  secondary row. */}
              {dayItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dayItems.map((item) => {
                    if (item.kind === "event") {
                      const e = item.payload;
                      const s = EVENT_STYLES[e.type] || EVENT_STYLES.academic;
                      const isMulti = e.end_date && e.end_date > e.date;
                      const timeStr = e.start_time
                        ? (e.end_time ? `${e.start_time}–${e.end_time}` : e.start_time)
                        : "";
                      return (
                        <div key={item.key} style={{
                          background: s.bg, borderLeft: `3px solid ${s.border}`,
                          borderRadius: 8, padding: "8px 12px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: 13, color: C.pepBlack }}>
                              {e.title}
                            </span>
                            {timeStr && (
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone, whiteSpace: "nowrap", marginLeft: 8 }}>{timeStr}</span>
                            )}
                          </div>
                          {isMulti && (
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone, marginTop: 3 }}>
                              {dateRangeLabel(e.date, e.end_date)} · {countDays(e.date, e.end_date)} days
                            </div>
                          )}
                          {e.description && (
                            <div style={{ fontSize: 12, color: C.mountain, marginTop: 3, fontFamily: "'Roboto', sans-serif", lineHeight: 1.4, whiteSpace: "pre-line" }}>{e.description}</div>
                          )}
                        </div>
                      );
                    }

                    if (item.kind === "final") {
                      const c = item.payload;
                      return (
                        <div key={item.key} style={{
                          background: "#FFF4ED", borderLeft: `3px solid ${C.pepOrange}`,
                          borderRadius: 8, padding: "8px 12px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: 13, color: C.pepBlack, minWidth: 0 }}>
                              <span style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 700,
                                color: C.white, background: C.pepOrange,
                                padding: "1px 6px", borderRadius: 6, marginRight: 6,
                                textTransform: "uppercase", letterSpacing: 1, verticalAlign: 1,
                              }}>Final</span>
                              <span style={{
                                fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                                color: C.ocean, marginRight: 6, letterSpacing: 0.5,
                              }}>{c.code}</span>
                              {c.title}
                            </span>
                            {c.final_time && (
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone, whiteSpace: "nowrap" }}>{c.final_time}</span>
                            )}
                          </div>
                          {c.location && (
                            <div style={{
                              fontFamily: "'Roboto', sans-serif", fontSize: 11.5,
                              color: C.stone, marginTop: 3,
                            }}>{c.location}</div>
                          )}
                        </div>
                      );
                    }

                    // class
                    const c = item.payload;
                    const t = item.time;
                    return (
                      <div key={item.key} style={{
                        display: "flex", alignItems: "baseline", justifyContent: "space-between",
                        gap: 8, padding: "4px 12px 4px 15px",
                        borderLeft: `2px solid ${C.fog}`,
                      }}>
                        <span style={{
                          fontFamily: "'Roboto', sans-serif", fontSize: 12,
                          color: C.mountain, lineHeight: 1.35,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          <span style={{
                            fontFamily: "'DM Mono', monospace", fontSize: 10,
                            color: C.stone, marginRight: 6,
                          }}>{c.code}</span>
                          {c.title}
                        </span>
                        {t && (
                          <span style={{
                            fontFamily: "'DM Mono', monospace", fontSize: 10,
                            color: C.stone, whiteSpace: "nowrap",
                          }}>{t}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!hasContent && <EmptyDay />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule (Class Schedule) ───
function ClassScheduleView({ data, view, profile }) {
  const todayRef = useRef(null);

  const todayAbbrev = WEEK_DAYS_SHORT[new Date().getDay()];
  const isWeekday = DAYS_ORDER.includes(todayAbbrev);

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Apply the profile-driven "My classes only" filter once at the top;
  // both the week view and the All Courses list draw from this list.
  const visibleClasses = filterClassesByProfile(data.classes || [], profile);

  const classesForDay = (day) =>
    visibleClasses.filter((c) => c.days.includes(day)).sort((a, b) => getSortTime(a.time, day).localeCompare(getSortTime(b.time, day)));

  // Sort courses by code for "All Courses"
  const sortedClasses = [...visibleClasses].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div>
      {view === "week" ? (
        <div>
          {/* TODAY button */}
          {isWeekday && (
            <button onClick={scrollToToday} style={{
              display: "flex", alignItems: "center", gap: 6, margin: "0 auto 14px",
              background: C.ocean, color: C.white, border: "none", borderRadius: 20,
              padding: "6px 18px", cursor: "pointer", fontFamily: "'DM Mono', monospace",
              fontSize: 12, fontWeight: 500, letterSpacing: 0.5,
            }}>
              ↓ TODAY
            </button>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {DAYS_ORDER.map((day) => {
              const classes = classesForDay(day);
              const isToday = day === todayAbbrev;
              return (
                <div key={day} ref={isToday ? todayRef : undefined}>
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500,
                    color: isToday ? C.ocean : C.stone, marginBottom: 6,
                    textTransform: "uppercase", letterSpacing: 1,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {day === "Mon" ? "Monday" : day === "Tue" ? "Tuesday" : day === "Wed" ? "Wednesday" : day === "Thu" ? "Thursday" : "Friday"}
                    {isToday && <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.white,
                      background: C.ocean, padding: "2px 8px", borderRadius: 10,
                      textTransform: "uppercase", letterSpacing: 0.5,
                    }}>TODAY</span>}
                  </div>
                  {classes.length === 0 ? (
                    <div style={{ padding: "10px 0", color: C.fog, fontStyle: "italic", fontSize: 14, fontFamily: "'Roboto', sans-serif" }}>No classes</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {classes.map((c) => (
                        <div key={c.code + day} className="bap-press" style={{ display: "flex", alignItems: "stretch", background: C.white, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.fog}` }}>
                          <div style={{ width: 4, background: c.color, flexShrink: 0 }} />
                          <div style={{ padding: "10px 14px", flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 15, color: C.pepBlack }}>{c.title}</span>
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.stone, whiteSpace: "nowrap", marginLeft: 12 }}>{getTimeForDay(c.time, day)}</span>
                            </div>
                            <div style={{ fontSize: 13, color: C.mountain, marginTop: 3, fontFamily: "'Roboto', sans-serif" }}>{c.code} · {c.professor} · {c.location}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* All Courses view — alphabetical, with honorific+firstname, email, no expand */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedClasses.map((c) => {
            const profDisplay = c.honorific && c.firstname
              ? `${c.honorific} ${c.firstname} ${c.professor}`
              : c.professor;
            return (
              <Card key={c.code} borderLeft={c.color}>
                <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 17, color: C.pepBlue, marginBottom: 6 }}>{c.code}: {c.title}</div>
                <div style={{ fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7 }}>
                  {profDisplay}<br />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.stone }}>{compactSchedule(c.days, c.time)}</span><br />
                  {c.location}
                </div>
                {c.email && (
                  <a href={`mailto:${c.email}`} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
                    fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                    textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                    background: C.ice, border: `1px solid ${C.fog}`, cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ocean} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Email {c.honorific ? `${c.honorific} ${c.professor}` : c.professor}
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Schedule Tab (flat three-pill navigation) ───
function ScheduleView({ data, profile, onOpenSettings }) {
  const [section, setSection] = useState("overview");
  const filterActive = shouldFilterClasses(profile);
  const today = new Date();

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        <Pill active={section === "overview"} onClick={() => setSection("overview")}>Weekly Overview</Pill>
        <Pill active={section === "week"} onClick={() => setSection("week")}>Class Schedule</Pill>
        <Pill active={section === "list"} onClick={() => setSection("list")}>Courses</Pill>
      </div>
      {filterActive && section !== "overview" && (
        <div
          onClick={onOpenSettings}
          className="bap-press"
          role="button"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.ice, border: `1px solid ${C.fog}`, borderRadius: 10,
            padding: "8px 12px", marginBottom: 14, cursor: "pointer",
          }}
        >
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
            textTransform: "uppercase", letterSpacing: 1, color: C.ocean,
            background: C.white, padding: "2px 8px", borderRadius: 10,
            border: `1px solid ${C.fog}`,
          }}>My classes only</span>
          <span style={{ fontSize: 12, color: C.mountain, fontFamily: "'Roboto', sans-serif", flex: 1 }}>
            Showing {profile.enrolledClasses.length} of {(data.classes || []).length}. Tap to change.
          </span>
        </div>
      )}
      {/* FinalsCard sits above all three sub-views — it's a persistent
          "what's coming" anchor while finals are in scope, and visible
          regardless of which sub-tab the student is on. */}
      <FinalsCard data={data} profile={profile} today={today} />
      {section === "overview" && <WeeklyOverviewView data={data} profile={profile} />}
      {(section === "week" || section === "list") && <ClassScheduleView data={data} view={section} profile={profile} />}
    </div>
  );
}

// ─── Calendar ───
function CalendarView({ data }) {
  const [filter, setFilter] = useState("all");
  const types = ["all", ...Object.keys(EVENT_STYLES)];

  // Memoize the filter → sort → group-by-month pipeline so a filter-pill
  // tap doesn't redo the same work as the immediately-following render
  // that's reacting to the same state change, and so unrelated parent
  // re-renders (e.g. tab switches into Calendar) skip the pipeline.
  const grouped = useMemo(() => {
    const events = data.calendarEvents
      .filter((e) => filter === "all" || e.type === filter)
      .filter((e) => e.visibility !== "week")
      .sort((a, b) => a.date.localeCompare(b.date));
    const out = {};
    events.forEach((e) => {
      const mk = e.date.slice(0, 7);
      if (!out[mk]) out[mk] = [];
      out[mk].push(e);
    });
    return out;
  }, [data.calendarEvents, filter]);

  // First not-past event marker for the "Hoy · Today" divider. An event
  // counts as not-past when its end (or start, for single-day) is on or
  // after today, so an ongoing multi-day event reads as current rather
  // than past. The divider renders before the first such event in
  // chronological order; if every event is past, no divider renders.
  const todayStr = getTodayStr();
  const firstNotPastKey = useMemo(() => {
    for (const monthEvents of Object.values(grouped)) {
      for (const e of monthEvents) {
        const endStr = e.end_date || e.date;
        if (endStr >= todayStr) return `${e.date}|${e.title}`;
      }
    }
    return null;
  }, [grouped, todayStr]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {types.map((t) => {
          const active = filter === t;
          const s = t === "all" ? { bg: C.pepBlue, border: C.pepBlue } : EVENT_STYLES[t];
          return (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "5px 13px", borderRadius: 20,
              border: active ? `2px solid ${s.border}` : "2px solid transparent",
              background: active ? (t === "all" ? C.pepBlue : s.bg) : C.ice,
              color: active ? (t === "all" ? C.white : C.pepBlack) : C.stone,
              fontFamily: "'Roboto', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
            }}>{t === "all" ? "All" : EVENT_STYLES[t].label}</button>
          );
        })}
      </div>
      {Object.entries(grouped).map(([monthKey, monthEvents]) => {
        const d = new Date(monthKey + "-15");
        const monthName = d.toLocaleString("en-US", { month: "long", year: "numeric" });
        return (
          <div key={monthKey} style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.stone, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.fog}` }}>{monthName}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {monthEvents.map((e, i) => {
                const s = EVENT_STYLES[e.type] || EVENT_STYLES.academic;
                const isMulti = e.end_date && e.end_date > e.date;
                const startDay = formatDate(e.date).split(" ")[1];
                const endDay = isMulti ? formatDate(e.end_date).split(" ")[1] : null;
                // If end_date is in a different month, show the month abbreviation too
                const endInSameMonth = isMulti && e.end_date.slice(0, 7) === e.date.slice(0, 7);
                const dateDisplay = isMulti
                  ? (endInSameMonth ? `${startDay}–${endDay}` : `${startDay}–${formatDate(e.end_date)}`)
                  : startDay;
                const dayDisplay = isMulti
                  ? `${getDayOfWeek(e.date)}–${getDayOfWeek(e.end_date)}`
                  : getDayOfWeek(e.date);
                const eventKey = `${e.date}|${e.title}`;
                const isFirstNotPast = eventKey === firstNotPastKey;
                const isPast = (e.end_date || e.date) < todayStr;
                return (
                  <Fragment key={i}>
                    {isFirstNotPast && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 2px" }}>
                        <div style={{ flex: 1, height: 1, background: C.bapBlue }} />
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
                          color: C.bapBlue, letterSpacing: 1.2, textTransform: "uppercase",
                          padding: "3px 10px", borderRadius: 12, background: C.ice,
                          border: `1px solid ${C.bapBlue}`,
                        }}>Hoy · Today</div>
                        <div style={{ flex: 1, height: 1, background: C.bapBlue }} />
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", opacity: isPast ? 0.55 : 1 }}>
                      <div style={{ minWidth: 44, textAlign: "right", paddingTop: 2 }}>
                        <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 16, fontWeight: 700, color: C.pepBlack }}>{dateDisplay}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone }}>{dayDisplay}</div>
                      </div>
                      <div style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${s.border}` }}>
                        <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14, color: C.pepBlack }}>{e.title}</div>
                        {isMulti && (
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone, marginTop: 3 }}>
                            {countDays(e.date, e.end_date)} days
                          </div>
                        )}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Safe External URL ───
// Allowlist for URL schemes that flow in from the spreadsheet
// (Health.link, Calendar.link, Events.link, Announcements.link,
// Contacts.maps/whatsapp, Apps.ios_url/android_url/web_url, FAQ.link,
// Resources.url, etc.). Returns the trimmed URL when its scheme is
// one of http: / https: / tel: / mailto: / sms:, and returns ""
// for anything else (javascript:, data:, file:, vbscript:, custom
// schemes). The Director controls the sheet, but a copy-paste from
// a malicious source — or a clever attacker who gained Director sheet
// access — could otherwise embed `javascript:` URIs that fire as
// script when a student taps a button. React does NOT sanitize href
// attributes, so the guard has to live in the app. Router every
// spreadsheet-sourced <a href> through this helper.
function safeExternalUrl(url) {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  return /^(https?:|tel:|mailto:|sms:)/i.test(trimmed) ? trimmed : "";
}

// ─── Address → Google Maps Link ───
// Renders an address as a tappable link that opens Google Maps (native app on
// mobile; maps.google.com on desktop). If `mapsUrl` is provided (e.g. from the
// spreadsheet's maps column), it takes precedence — but only if it passes
// the safeExternalUrl scheme check; an unsafe override silently falls back
// to the auto-encoded search URL, which we construct ourselves and is always
// safe.
function AddressLink({ address, mapsUrl }) {
  if (!address) return null;
  const safeOverride = safeExternalUrl(mapsUrl);
  const href = safeOverride
    || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      color: "inherit", textDecoration: "none", cursor: "pointer",
    }}>
      <span style={{ marginRight: 4 }}>📍</span>{address}
    </a>
  );
}

// ─── Location Note (non-address location info) ───
// Use this for entries whose "location" isn't a real address; for example,
// telehealth providers, membership numbers shown as location context, or
// churches meeting in rotating homes. Renders as plain italic gray text,
// never linked, no pin icon.
function LocationNote({ note }) {
  if (!note) return null;
  return <span style={{ color: C.stone, fontStyle: "italic" }}>{note}</span>;
}

// ─── Link Helper ───
function LinkButton({ url }) {
  const safe = safeExternalUrl(url);
  if (!safe) return null;
  let label = "Visit website";
  let icon = "→";
  let external = true;
  if (safe.includes("wa.me")) { label = "WhatsApp"; icon = "💬"; }
  else if (safe.includes("instagram.com")) { label = "Instagram"; icon = "📷"; }
  else if (safe.startsWith("tel:")) { label = "Call"; icon = "📞"; external = false; }
  return (
    <a href={safe} target={external ? "_blank" : undefined} rel="noopener noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
      fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
      background: C.ice, border: `1px solid ${C.fog}`, cursor: "pointer",
    }}>
      {icon} {label}
    </a>
  );
}

// ─── Filter Pills (smaller, for sub-filtering) ───
function FilterPill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "3px 11px", borderRadius: 14,
      border: active ? `1.5px solid ${C.ocean}` : "1.5px solid transparent",
      background: active ? C.ice : C.parchment,
      color: active ? C.ocean : C.stone,
      fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: active ? 500 : 400,
      cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

// ─── Health: Facility vs Person detection ───
const FACILITY_TYPES = /hospital|clinic|clínica|sanatorio|laboratory|lab|pharmacy|farmacia|emergency|isos|imaging|diagnóstico/i;
function isFacility(provider) {
  if (provider.category) return provider.category === "facility";
  return FACILITY_TYPES.test(provider.type);
}

// ─── Events ("This Week in BA") ───
// Renders the curated weekly cultural list under Local. Each card is
// anchored by a colored category circle holding a glyph (music, theater,
// film, exhibit, dance, festival, food, talk, other), with title, date
// label, optional time, description, venue + neighborhood, address (via
// AddressLink), cost, and an external link button.
function EventsView({ events, activeFilter, onFilterChange, categoriesPresent }) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = toDateStr(today);

  // Pull the cached Blue compra rate once on mount so each <EventCard>
  // can annotate ARS prices with a USD parenthetical without each card
  // doing its own localStorage read AND without re-parsing the cached
  // weather/dólar JSON on every filter-pill tap. Compra (not venta)
  // because that's the rate students actually transact at when cashing
  // USD; same rate the dólar tile and DolarSheet's primary result use.
  // Lazy useState initializer → loadTodayCache runs once per mount.
  const [dolarCompra] = useState(() => {
    const tc = loadTodayCache();
    return tc && tc.dolar && tc.dolar.compra ? tc.dolar.compra : null;
  });

  // Memoize the upcoming → filter-by-category → split-by-week pipeline
  // so a filter-pill tap recomputes only what it actually changes, and
  // unrelated parent re-renders skip the whole thing.
  const { upcoming, thisWeek, later } = useMemo(() => {
    const up = sortEventsChronological(filterUpcomingEvents(events, todayStr));
    const visible = activeFilter === "all" ? up : up.filter((e) => e.category === activeFilter);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = toDateStr(weekEnd);
    return {
      upcoming: up,
      thisWeek: visible.filter((e) => e.start_date <= weekEndStr),
      later: visible.filter((e) => e.start_date > weekEndStr),
    };
    // `today` is a fresh Date each render but todayStr captures the
    // calendar-day identity; deps include it so a midnight rollover
    // invalidates the memo. eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, activeFilter, todayStr]);

  // Filter pills only show when 2+ categories are actually present.
  const showPills = (categoriesPresent || []).length > 1;

  if (upcoming.length === 0) {
    return (
      <div style={{
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
        padding: "24px 18px", textAlign: "center",
      }}>
        <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 18, fontWeight: 700, color: C.pepBlack, marginBottom: 6 }}>
          Nothing curated yet
        </div>
        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain, lineHeight: 1.5 }}>
          The director updates this list weekly. Check back soon — or tap Explore BA below for evergreen recommendations.
        </div>
      </div>
    );
  }

  return (
    <div>
      {showPills && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <FilterPill active={activeFilter === "all"} onClick={() => onFilterChange("all")}>All</FilterPill>
          {categoriesPresent.map((cat) => {
            const meta = getEventCategory(cat);
            return (
              <FilterPill key={cat} active={activeFilter === cat} onClick={() => onFilterChange(cat)}>
                {meta.label}
              </FilterPill>
            );
          })}
        </div>
      )}

      {thisWeek.length > 0 && (
        <>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.stone, marginBottom: 8,
          }}>This week / Esta semana</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: later.length > 0 ? 18 : 0 }}>
            {thisWeek.map((e, i) => <EventCard key={`tw-${i}`} event={e} dolarCompra={dolarCompra} />)}
          </div>
        </>
      )}

      {later.length > 0 && (
        <>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.stone, marginBottom: 8,
          }}>Coming up / Próximamente</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {later.map((e, i) => <EventCard key={`lt-${i}`} event={e} dolarCompra={dolarCompra} />)}
          </div>
        </>
      )}
    </div>
  );
}

function EventCard({ event, dolarCompra }) {
  const meta = getEventCategory(event.category);
  const Icon = meta.Icon;
  const dateLabel = eventDateLabel(event);

  // Append a USD parenthetical to the cost pill when the cost string is
  // parseable as ARS and we have a cached Blue compra rate to convert
  // against. Returns null when either condition fails, in which case
  // the pill renders the raw cost string unchanged.
  const arsAmount = parseArsAmount(event.cost);
  const usdAmount = arsAmount && dolarCompra ? arsAmount / dolarCompra : null;

  return (
    <div className="bap-press" style={{
      background: C.white, border: `1px solid ${C.fog}`,
      borderRadius: 12, padding: "12px 14px",
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      {/* Category glyph circle */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: meta.color, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={26} color={C.white} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlack, lineHeight: 1.2 }}>
            {event.title}
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11,
            color: meta.color, background: C.ice,
            padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap",
            border: `1px solid ${C.fog}`,
          }}>
            {dateLabel}{event.time ? ` · ${event.time}` : ""}
          </div>
        </div>

        {event.description && (
          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain,
            marginTop: 6, lineHeight: 1.45,
          }}>{event.description}</div>
        )}

        {(event.venue || event.neighborhood) && (
          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.stone,
            marginTop: 6,
          }}>
            {event.venue}
            {event.venue && event.neighborhood ? " · " : ""}
            {event.neighborhood}
          </div>
        )}

        {event.address && (
          <div style={{ marginTop: 4 }}>
            <AddressLink address={event.address} />
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: event.cost || event.link ? 8 : 0, alignItems: "center" }}>
          {event.cost && (
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain,
              background: C.parchment, padding: "2px 8px", borderRadius: 10,
              border: `1px solid ${C.fog}`,
            }}>
              {event.cost}
              {usdAmount !== null && (
                <>
                  <span style={{ color: C.stone, margin: "0 4px" }}>·</span>
                  <span style={{ color: C.stone }}>~{formatUsd(usdAmount)} USD</span>
                </>
              )}
            </span>
          )}
          {event.link && <LinkButton url={event.link} />}
        </div>
      </div>
    </div>
  );
}

// ─── Finals helpers (display-time) ───
//
// formatFinalDate: short date label keyed off the user's local time
// zone. We pass `T12:00:00` to dodge any DST-edge weirdness around
// midnight conversions; YYYY-MM-DD is treated as UTC otherwise.
function formatFinalDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return `${dow}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Format the finals window for the TBD copy. Single-day windows
// collapse to "Jul 13"; multi-day windows render as "Jul 13–15"
// (same-month) or "Jul 30 – Aug 1" (cross-month). Falls back to
// just the start when only one bound is set.
function formatFinalsWindow(startStr, endStr) {
  if (!startStr && !endStr) return "";
  if (startStr && !endStr) return formatFinalDate(startStr).split(", ")[1] || "";
  if (!startStr && endStr) return formatFinalDate(endStr).split(", ")[1] || "";
  if (startStr === endStr) return formatFinalDate(startStr).split(", ")[1] || "";
  return dateRangeLabel(startStr, endStr);
}

// ─── Today tile: Finals coming up ───
//
// Compact preview that appears on the Today dashboard 14 days before
// the program-wide finals window starts (or as soon as any enrolled
// class has a final_date assigned). Tapping the tile jumps to the
// Schedule tab, where <FinalsCard> shows the same data in fuller form.
// Mirrors <EventsTodayTile>'s shape but uses a Pep Blue accent so it
// reads as academic, not cultural.
function TodayFinalsTile({ data, profile, now, onJumpToTab }) {
  // Memoize the heavy derivations on the calendar day (not on `now` itself),
  // so the 1-minute clock tick doesn't re-run the full class scan + sort
  // + days-until math every tick. data/profile are stable refs from App.
  const todayDay = toDateStr(now);
  const shouldShow = useMemo(
    () => shouldShowFinalsUI(data, profile, new Date(todayDay + "T12:00:00")),
    [data, profile, todayDay]
  );
  const finals = useMemo(
    () => getStudentFinals(data, profile),
    [data, profile]
  );
  const winLabel = useMemo(
    () => formatFinalsWindow(data.finals_window_start, data.finals_window_end),
    [data.finals_window_start, data.finals_window_end]
  );
  if (!shouldShow) return null;
  if (finals.length === 0) return null;
  const preview = finals.slice(0, 3);

  return (
    <div
      onClick={() => { if (onJumpToTab) onJumpToTab("schedule"); }}
      className="bap-press"
      role="button"
      style={{
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 14,
        padding: "12px 14px 14px", marginBottom: 14, cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.pepBlue, marginBottom: 2,
          }}>Exámenes finales</div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: C.pepBlack, lineHeight: 1.1 }}>
            Finals coming up
          </div>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.ocean,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          See all →
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {preview.map((f) => (
          <div key={f.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 4, alignSelf: "stretch", background: f.color || C.pepBlue,
              borderRadius: 2, flexShrink: 0, minHeight: 28,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'EB Garamond', serif", fontSize: 14, fontWeight: 700,
                color: C.pepBlack, lineHeight: 1.2,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                  color: C.ocean, marginRight: 6, fontWeight: 400, letterSpacing: 0.5,
                }}>{f.code}</span>
                {f.title}
              </div>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                color: C.stone, marginTop: 1,
              }}>
                {f.final_date
                  ? (f.final_time ? `${formatFinalDate(f.final_date)} · ${f.final_time}` : formatFinalDate(f.final_date))
                  : (winLabel ? `TBD · ${winLabel}` : "TBD")
                }
              </div>
            </div>
          </div>
        ))}
      </div>

      {finals.length > preview.length && (
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 11.5, color: C.stone,
          marginTop: 8, textAlign: "center",
        }}>
          +{finals.length - preview.length} more
        </div>
      )}
    </div>
  );
}

// ─── Schedule top-of-tab: Finals card ───
//
// Pinned above all three Schedule sub-tabs (Weekly Overview, Class
// Schedule, Courses) when the student has personalized AND we're
// within 2 weeks of finals_window_start OR at least one enrolled
// class has a final_date assigned. Each row uses the class's color
// stripe so it visually pairs with the Class Schedule cards below.
// Renders nothing when the gating fails (e.g. mid-semester with no
// finals assigned, or for a non-personalized student).
function FinalsCard({ data, profile, today }) {
  if (!shouldShowFinalsUI(data, profile, today)) return null;
  const finals = getStudentFinals(data, profile);
  if (finals.length === 0) return null;

  const winLabel = formatFinalsWindow(data.finals_window_start, data.finals_window_end);

  return (
    <div style={{
      background: C.parchment,
      border: `1px solid ${C.fog}`,
      borderLeft: `4px solid ${C.pepBlue}`,
      borderRadius: 12, padding: "12px 14px 14px",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 10, gap: 8,
      }}>
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.pepBlue, marginBottom: 2,
          }}>Exámenes finales</div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 18, fontWeight: 700, color: C.pepBlack, lineHeight: 1.1 }}>
            Finals
          </div>
        </div>
        {winLabel && (
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: C.ocean,
            background: C.white, border: `1px solid ${C.fog}`,
            padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap",
          }}>{winLabel}</span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {finals.map((f) => {
          const hasDate = !!f.final_date;
          return (
            <div key={f.code} style={{
              display: "flex", alignItems: "stretch",
              background: C.white, border: `1px solid ${C.fog}`, borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{ width: 4, background: f.color || C.pepBlue, flexShrink: 0 }} />
              <div style={{ padding: "8px 12px", flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  gap: 8,
                }}>
                  <div style={{
                    fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14.5,
                    color: C.pepBlack, lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                      color: C.ocean, marginRight: 6, fontWeight: 400, letterSpacing: 0.5,
                    }}>{f.code}</span>
                    {f.title}
                  </div>
                  {hasDate
                    ? (
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 11,
                        color: C.pepBlack, fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {formatFinalDate(f.final_date)}
                        {f.final_time ? ` · ${f.final_time}` : ""}
                      </span>
                    )
                    : (
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 700,
                        color: C.white, background: C.stone,
                        padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap",
                        textTransform: "uppercase", letterSpacing: 1,
                      }}>TBD</span>
                    )
                  }
                </div>
                {f.location && (
                  <div style={{
                    fontFamily: "'Roboto', sans-serif", fontSize: 11.5,
                    color: C.stone, marginTop: 2,
                  }}>{f.location}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Today tile: Esta semana ───
// Compact preview for the Today dashboard. Shows the next 1-2 upcoming
// events from the weekly window. Renders nothing when no events are
// populated for the week, so weeks without curated content stay clean.
function EventsTodayTile({ data, todayStr, onJumpToTab }) {
  // Memoize on the calendar day so the 1-minute clock tick in TodayView
  // doesn't re-run the full this-week filter + chronological sort every
  // tick. todayStr is the YYYY-MM-DD anchor passed down from TodayView;
  // it changes only at midnight, which is when getThisWeekEvents would
  // actually return a different list.
  const events = useMemo(() => getThisWeekEvents(data), [data, todayStr]);
  if (events.length === 0) return null;

  const preview = events.slice(0, 2);

  return (
    <div
      onClick={() => { if (onJumpToTab) onJumpToTab("local"); }}
      className="bap-press"
      role="button"
      style={{
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 14,
        padding: "12px 14px 14px", marginBottom: 14, cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.pepOrange, marginBottom: 2,
          }}>Esta semana</div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: C.pepBlack, lineHeight: 1.1 }}>
            This Week in BA
          </div>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.ocean,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          See all →
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {preview.map((e, i) => {
          const meta = getEventCategory(e.category);
          const Icon = meta.Icon;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: meta.color, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={18} color={C.white} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'EB Garamond', serif", fontSize: 14, fontWeight: 700,
                  color: C.pepBlack, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{e.title}</div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                  color: C.stone, marginTop: 1,
                }}>
                  {eventDateLabel(e)}{e.time ? ` · ${e.time}` : ""}
                  {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length > preview.length && (
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 11.5, color: C.stone,
          marginTop: 8, textAlign: "center",
        }}>
          +{events.length - preview.length} more this week
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROMPTS — Per-student data collection
// Three components:
//   <PromptForm>       — bottom-sheet form for one prompt's fields
//   <PromptCard>       — Today-tab tile listing pending/answered prompts
//   <PromptProfileSection> — block inside <ProfileModal> for evergreen prompts
// All three operate on the prompt shape returned by AuthCode.gs's
// /prompts endpoint:
//   { prompt_id, title_es, title_en, description_es, description_en,
//     category, surface, start_date, end_date,
//     fields: [{ field_id, field_order, label_es, label_en,
//                field_type, options[], option_labels_es[],
//                option_labels_en[], required, placeholder_es,
//                placeholder_en }, ...],
//     responses: { field_id: storedValue, ... },
//     submitted_at: "2026-05-09T...Z" }
// ============================================================

// Build the local form-state object from a prompt's stored
// responses. Ensures every field has a sensible blank value
// (empty string / [] / false) so React inputs stay controlled.
function initFormFromPrompt(prompt) {
  if (!prompt || !Array.isArray(prompt.fields)) return {};
  const responses = prompt.responses || {};
  const out = {};
  for (let i = 0; i < prompt.fields.length; i++) {
    const f = prompt.fields[i];
    const stored = responses[f.field_id];
    if (f.field_type === "multi_select") {
      out[f.field_id] = stored ? String(stored).split(";").map((x) => x.trim()).filter(Boolean) : [];
    } else if (f.field_type === "boolean") {
      out[f.field_id] = String(stored == null ? "" : stored).trim().toUpperCase() === "TRUE";
    } else {
      out[f.field_id] = stored == null ? "" : String(stored);
    }
  }
  return out;
}

// Subtle bilingual "closes at…" label rendered beneath a prompt's
// title when the Director has set a specific end_time on the
// Prompts sheet. Returns null when there's no cutoff (the prompt
// just closes at end-of-day on end_date, which doesn't need a
// per-row caption — the prompt simply vanishes that night).
//
// Three date proximities, all cohort-friendly Argentine Spanish:
//   end_date === today       → "Cierra hoy a las 20:00"
//   end_date === tomorrow    → "Cierra mañana a las 20:00"
//   end_date further out     → "Cierra el 15 de mayo a las 20:00"
//
// Past end_time on end_date → renders as "Cerrado" so a stale
// cached entry doesn't claim the form is still open. (The
// background prompts fetch will drop the prompt entirely on the
// next refresh, but until then this label is the truth-teller.)
function formatPromptCutoff(prompt, now) {
  if (!prompt) return null;
  const endDate = String(prompt.end_date || "").trim();
  const endTime = String(prompt.end_time || "").trim();
  if (!endDate || !endTime) return null;

  const ref = now instanceof Date ? now : new Date();
  const todayStr = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(ref.getDate()).padStart(2, "0")}`;

  // Past the cutoff?
  if (todayStr > endDate) return { es: "Cerrado", en: "Closed" };
  if (todayStr === endDate) {
    const nowHm = `${String(ref.getHours()).padStart(2, "0")}:${String(ref.getMinutes()).padStart(2, "0")}`;
    if (nowHm > endTime) return { es: "Cerrado", en: "Closed" };
  }

  // Compute "tomorrow" string in local terms
  const tom = new Date(ref);
  tom.setDate(tom.getDate() + 1);
  const tomStr = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, "0")}-${String(tom.getDate()).padStart(2, "0")}`;

  if (endDate === todayStr) {
    return { es: `Cierra hoy a las ${endTime}`, en: `Closes today at ${endTime}` };
  }
  if (endDate === tomStr) {
    return { es: `Cierra mañana a las ${endTime}`, en: `Closes tomorrow at ${endTime}` };
  }

  // Further-out date: spell it bilingually
  // SPANISH_MONTHS is defined elsewhere in App.jsx and uses lowercase
  // long-form month names ("mayo", "junio", etc.) — perfect for
  // Argentine convention "el 15 de mayo".
  const parts = endDate.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m - 1, d);
  const monthEs = (typeof SPANISH_MONTHS !== "undefined" && SPANISH_MONTHS[m - 1]) || dt.toLocaleString("es", { month: "long" });
  const monthEn = dt.toLocaleString("en", { month: "short" });
  return {
    es: `Cierra el ${d} de ${monthEs} a las ${endTime}`,
    en: `Closes ${monthEn} ${d} at ${endTime}`,
  };
}

// Compact bilingual "last saved" label for the form footer. Shows
// relative time within 24h ("hace 5 min / 5m ago") and falls back
// to a date label after that.
function formatPromptSavedAt(iso) {
  if (!iso) return "";
  let d;
  try {
    d = new Date(iso);
    if (isNaN(d.getTime())) return "";
  } catch (e) {
    return "";
  }
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "";
  if (diff < 60 * 1000) return "ahora / just now";
  if (diff < 60 * 60 * 1000) {
    const m = Math.max(1, Math.round(diff / 60000));
    return `hace ${m} min / ${m}m ago`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const h = Math.round(diff / 3600000);
    return `hace ${h} h / ${h}h ago`;
  }
  try {
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  } catch (e) {
    return iso.slice(0, 10);
  }
}

// One field's renderer. Branches on field_type so the form
// reads as native for each kind of input. Selects are rendered
// as tappable cards (vs. a native <select>) because they're easier
// to scan and tap on a phone, and they let us show bilingual
// labels per option without the cramped feel of <select> options.
function PromptFieldInput({ field, value, onChange }) {
  const labelEs = field.label_es || "";
  const labelEn = field.label_en || "";
  const sameLabel = labelEs && labelEn && labelEs === labelEn;
  const placeholder = field.placeholder_es || field.placeholder_en || "";

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: C.white, border: `1px solid ${C.fog}`, borderRadius: 10,
    padding: "12px 14px",
    fontFamily: "'Roboto', sans-serif", fontSize: 14, color: C.pepBlack,
    lineHeight: 1.4, outline: "none",
  };

  const labelBlock = (
    <div style={{
      marginBottom: 8, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap",
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 1.5, color: C.ocean, lineHeight: 1.2,
      }}>
        {labelEs || labelEn}
      </div>
      {!sameLabel && labelEn && labelEs && (
        <div style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 13,
          color: C.mountain, lineHeight: 1.2,
        }}>
          / {labelEn}
        </div>
      )}
      {field.required && (
        <span aria-label="Required" title="Required" style={{
          width: 6, height: 6, borderRadius: "50%", background: C.pepOrange,
          display: "inline-block", marginLeft: 2,
        }} />
      )}
    </div>
  );

  const t = field.field_type;

  if (t === "short_text") {
    return (
      <div>
        {labelBlock}
        <input
          type="text" value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} style={inputStyle}
        />
      </div>
    );
  }

  if (t === "long_text") {
    return (
      <div>
        {labelBlock}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
        />
      </div>
    );
  }

  if (t === "number") {
    return (
      <div>
        {labelBlock}
        <input
          type="text" inputMode="decimal" value={value || ""}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
          placeholder={placeholder} style={inputStyle}
        />
      </div>
    );
  }

  if (t === "boolean") {
    const isTrue = value === true || value === "TRUE";
    const isFalse = value === false || value === "FALSE";
    const pillStyle = (active) => ({
      flex: 1, padding: "12px 0", borderRadius: 10, cursor: "pointer",
      background: active ? C.ocean : C.white,
      color: active ? C.white : C.mountain,
      border: `1px solid ${active ? C.ocean : C.fog}`,
      fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500,
      letterSpacing: 0.5,
    });
    return (
      <div>
        {labelBlock}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="bap-press" style={pillStyle(isTrue)}
                  onClick={() => onChange(true)}>Sí / Yes</button>
          <button type="button" className="bap-press" style={pillStyle(isFalse)}
                  onClick={() => onChange(false)}>No</button>
        </div>
      </div>
    );
  }

  if (t === "single_select" || t === "multi_select") {
    const isMulti = t === "multi_select";
    const arr = isMulti ? (Array.isArray(value) ? value : []) : null;
    const optionLabels = (idx) => {
      const opt = field.options[idx];
      const es = field.option_labels_es[idx] || opt;
      const en = field.option_labels_en[idx] || "";
      return { opt, es, en, sameLabel: es && en && es === en };
    };
    return (
      <div>
        {labelBlock}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {field.options.map((opt, i) => {
            const meta = optionLabels(i);
            const checked = isMulti ? arr.indexOf(opt) >= 0 : value === opt;
            const onTap = () => {
              if (isMulti) {
                const next = checked ? arr.filter((x) => x !== opt) : arr.concat([opt]);
                onChange(next);
              } else {
                onChange(opt);
              }
            };
            return (
              <button
                type="button"
                key={opt}
                onClick={onTap}
                className="bap-press"
                style={{
                  display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  background: checked ? C.ice : C.white,
                  border: `1px solid ${checked ? C.ocean : C.fog}`,
                  borderRadius: 10, padding: "10px 12px", cursor: "pointer", width: "100%",
                }}
              >
                <span style={{
                  width: 22, height: 22, flexShrink: 0,
                  borderRadius: isMulti ? 6 : "50%",
                  border: `1.5px solid ${checked ? C.ocean : C.stone}`,
                  background: checked ? C.ocean : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.white, fontSize: 14, fontWeight: 700, lineHeight: 1,
                }}>{checked ? (isMulti ? "✓" : "•") : ""}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 15,
                    color: C.pepBlack, lineHeight: 1.2,
                  }}>{meta.es}</div>
                  {!meta.sameLabel && meta.en && (
                    <div style={{
                      fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12.5,
                      color: C.mountain, lineHeight: 1.2, marginTop: 1,
                    }}>{meta.en}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Unknown / unsupported types render a placeholder rather than
  // crashing the form. validatePrompts() in AuthCode.gs catches
  // this case at edit time, but a defensive renderer keeps the rest
  // of the form usable if a sheet edit slips through.
  return (
    <div>
      {labelBlock}
      <div style={{
        background: C.ice, border: `1px dashed ${C.fog}`, borderRadius: 10,
        padding: "10px 12px", fontFamily: "'Roboto', sans-serif", fontSize: 12,
        color: C.stone, fontStyle: "italic",
      }}>
        Tipo de campo no soportado: {t}
      </div>
    </div>
  );
}

// Bottom-sheet form for one prompt. Local form state is initialized
// from the prompt's stored responses (so editing pre-fills) and
// re-initializes whenever the prompt's id changes (so opening a
// different prompt resets the form). Submit calls onSubmit with
// { promptId, fields }; the parent is responsible for the actual
// network call and state update — we only handle local form state,
// validation feedback, and submit-in-flight UI.
function PromptForm({ open, onClose, prompt, onSubmit }) {
  // Sticky-ref pattern: parents typically clear the selected prompt
  // synchronously when onClose fires, but BottomSheet plays a 260 ms
  // close animation. Without this ref the form would flash an empty
  // fallback during the close. lastPromptRef holds the most recent
  // non-null prompt so the closing sheet still has something to
  // render against.
  const lastPromptRef = useRef(null);
  if (prompt) lastPromptRef.current = prompt;
  const displayPrompt = prompt || lastPromptRef.current;

  // Use the displayed prompt's id as the dependency key so we
  // re-initialize when the parent swaps prompts. submitted_at is
  // intentionally NOT a dep — a background prompts refresh while
  // the form is open (rare) shouldn't wipe the student's in-progress
  // edits.
  const promptKey = displayPrompt ? displayPrompt.prompt_id : "";

  const [values, setValues] = useState(() => initFormFromPrompt(displayPrompt));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setValues(initFormFromPrompt(displayPrompt));
    setErrorMsg("");
    setSubmitting(false);
  }, [promptKey]);

  if (!displayPrompt) {
    // Render an empty sheet as a safety net; the parent shouldn't
    // open this without a prompt, but if it does the user can dismiss.
    return (
      <BottomSheet open={open} onClose={onClose} titleEs="Formulario" titleEn="Form">
        <div style={{ color: C.stone, fontStyle: "italic", padding: 8 }}>
          No hay formulario seleccionado.
        </div>
      </BottomSheet>
    );
  }

  const fields = displayPrompt.fields || [];
  const titleEs = displayPrompt.title_es || displayPrompt.title_en || "";
  const titleEn = displayPrompt.title_en || displayPrompt.title_es || "";
  const sameTitle = displayPrompt.title_es && displayPrompt.title_en && displayPrompt.title_es === displayPrompt.title_en;
  const descEs = displayPrompt.description_es || "";
  const descEn = displayPrompt.description_en || "";
  const sameDesc = descEs && descEn && descEs === descEn;
  const hasPriorSubmission = !!displayPrompt.submitted_at;

  const setField = (fid, v) => setValues((prev) => ({ ...prev, [fid]: v }));

  const handleSubmit = async () => {
    if (submitting) return;
    setErrorMsg("");
    setSubmitting(true);
    try {
      await onSubmit({ promptId: displayPrompt.prompt_id, fields: values });
      onClose();
    } catch (err) {
      const code = err && err.code ? err.code : "";
      if (code === "validation_failed") {
        const m = String((err && err.details) || "").match(/^(missing_field|bad_value):(.+)$/);
        if (m) {
          const f = fields.find((x) => x.field_id === m[2]);
          const lbl = f ? (f.label_es || f.label_en || m[2]) : m[2];
          setErrorMsg(m[1] === "missing_field"
            ? `Falta completar: ${lbl} / Missing: ${lbl}`
            : `Valor inválido: ${lbl} / Invalid value: ${lbl}`);
        } else {
          setErrorMsg("Hay datos inválidos en el formulario. / The form has invalid data.");
        }
      } else if (code === "prompt_inactive") {
        setErrorMsg("Este formulario ya cerró. / This form has closed.");
      } else if (code === "audience_mismatch") {
        setErrorMsg("No tenés acceso a este formulario. / You don't have access to this form.");
      } else if (code === "lock_failed") {
        setErrorMsg("La planilla está ocupada. Reintentá. / The sheet is busy. Please try again.");
      } else if (err && err.name === "AuthError") {
        setErrorMsg("Sesión expirada. Cerrá y volvé a abrir la app. / Session expired. Close and re-open the app.");
      } else if (err && err.name === "NoMatchError") {
        setErrorMsg("Tu usuario ya no es reconocido. Cerrá sesión y volvé a entrar. / Your account isn't recognized. Sign out and back in.");
      } else {
        setErrorMsg("No se pudo guardar. Reintentá. / Couldn't save. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} titleEs={titleEs} titleEn={sameTitle ? "" : titleEn}>
      {(descEs || descEn) && (
        <div style={{ marginBottom: 18 }}>
          {descEs && (
            <div style={{
              fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.pepBlack,
              lineHeight: 1.45,
            }}>{descEs}</div>
          )}
          {!sameDesc && descEn && (
            <div style={{
              fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12.5,
              color: C.mountain, lineHeight: 1.45, marginTop: 4,
            }}>{descEn}</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {fields.map((f) => (
          <PromptFieldInput
            key={f.field_id}
            field={f}
            value={values[f.field_id]}
            onChange={(v) => setField(f.field_id, v)}
          />
        ))}
      </div>

      {errorMsg && (
        <div style={{
          marginTop: 16,
          background: C.parchment,
          borderLeft: `3px solid ${C.pepOrange}`,
          borderRadius: 6,
          padding: "10px 12px",
          fontFamily: "'Roboto', sans-serif", fontSize: 12.5, color: C.pepBlack,
          lineHeight: 1.4,
        }}>{errorMsg}</div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="bap-press"
        style={{
          marginTop: 20, width: "100%", padding: "13px 0", borderRadius: 10,
          background: submitting ? C.stone : C.pepBlue, color: C.white,
          border: "none", cursor: submitting ? "wait" : "pointer",
          fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500,
          letterSpacing: 0.5,
        }}
      >
        {submitting
          ? "Guardando…"
          : hasPriorSubmission
            ? "Actualizar / Update"
            : "Enviar / Submit"}
      </button>

      {hasPriorSubmission && (
        <div style={{
          marginTop: 8, textAlign: "center",
          fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: C.stone,
        }}>
          Guardado {formatPromptSavedAt(displayPrompt.submitted_at)}
        </div>
      )}
    </BottomSheet>
  );
}

// Today-tab tile listing prompts that surface on Today (surface =
// "today" or "both"). One row per prompt; tapping opens
// <PromptForm> for that prompt. Renders nothing when there are no
// today-surface prompts so the Today layout stays clean for
// students whose Director hasn't queued anything up.
//
// Visual identity matches <TodayFinalsTile> and <EventsTodayTile>:
// white card, fog border, header with bilingual section label,
// stripe of rows underneath. Pep Orange dot beside any prompt with
// an unanswered required field; calmer "Editar" affordance once
// the student has saved.
function PromptCard({ prompts, onOpenPrompt }) {
  const todayPrompts = filterPromptsBySurface(prompts, "today");
  if (todayPrompts.length === 0) return null;

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.fog}`, borderRadius: 14,
      borderLeft: `4px solid ${C.pepOrange}`,
      padding: "12px 14px 14px", marginBottom: 14,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.pepOrange, marginBottom: 2,
          }}>Pendientes</div>
          <div style={{
            fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700,
            color: C.pepBlack, lineHeight: 1.1,
          }}>For you</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {todayPrompts.map((p) => {
          const pending = isPromptPending(p);
          const submitted = !!p.submitted_at;
          const cta = submitted ? (pending ? "Completar →" : "Editar →") : "Responder →";
          const cutoff = formatPromptCutoff(p);
          return (
            <button
              key={p.prompt_id}
              type="button"
              onClick={() => onOpenPrompt(p)}
              className="bap-press"
              style={{
                display: "flex", alignItems: "stretch", textAlign: "left",
                background: pending ? C.parchment : C.ice,
                border: `1px solid ${C.fog}`,
                borderRadius: 10, padding: 0, cursor: "pointer", width: "100%",
              }}
            >
              <div style={{ width: 4, background: pending ? C.pepOrange : C.ocean, flexShrink: 0 }} />
              <div style={{
                flex: 1, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
                minWidth: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14.5,
                    color: C.pepBlack, lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.title_es || p.title_en}</div>
                  {p.title_en && p.title_es && p.title_en !== p.title_es && (
                    <div style={{
                      fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12,
                      color: C.mountain, lineHeight: 1.2, marginTop: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{p.title_en}</div>
                  )}
                  {cutoff && (
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.stone,
                      lineHeight: 1.3, marginTop: 3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{cutoff.es}</div>
                  )}
                </div>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: pending ? C.pepOrange : C.ocean,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>{cta}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Local ───
function LocalView({ data }) {
  // Default to the events sub-tab when at least one event is upcoming
  // this week; otherwise fall back to health so the existing flow is
  // unchanged on weeks with no curated events.
  const initialSub = (data.events && data.events.length > 0 && getThisWeekEvents(data).length > 0) ? "events" : "health";
  const [sub, setSub] = useState(initialSub);
  const [healthFilter, setHealthFilter] = useState("all");
  const [churchFilter, setChurchFilter] = useState("all");
  const [appsFilter, setAppsFilter] = useState("all");
  const [exploreFilter, setExploreFilter] = useState("all");
  const [eventsFilter, setEventsFilter] = useState("all");

  // Extract unique types/denominations/categories
  const healthTypes = [...new Set(data.healthProviders.map((h) => h.type).filter(Boolean))].sort();
  const churchDenoms = [...new Set(data.churches.map((c) => c.denomination).filter(Boolean))].sort();
  const appsCategories = [...new Set((data.apps || []).map((a) => a.category).filter(Boolean))].sort();
  const exploreTypes = [...new Set((data.explore || []).map((p) => p.type).filter(Boolean))].sort();
  const eventCategoriesPresent = [...new Set((data.events || []).map((e) => e.category).filter(Boolean))];

  // Filtered lists
  const filteredHealth = healthFilter === "all" ? data.healthProviders : data.healthProviders.filter((h) => h.type === healthFilter);
  const filteredChurches = churchFilter === "all" ? data.churches : data.churches.filter((c) => c.denomination === churchFilter);
  const filteredApps = appsFilter === "all" ? (data.apps || []) : (data.apps || []).filter((a) => a.category === appsFilter);
  const filteredExplore = exploreFilter === "all" ? (data.explore || []) : (data.explore || []).filter((p) => p.type === exploreFilter);

  // Sort apps: essentials first, then by name
  const sortedApps = [...filteredApps].sort((a, b) => {
    const aEss = a.priority === "essential" ? 0 : 1;
    const bEss = b.priority === "essential" ? 0 : 1;
    if (aEss !== bEss) return aEss - bEss;
    return a.name.localeCompare(b.name);
  });

  // Badge style
  const badge = { fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12, whiteSpace: "nowrap", flexShrink: 0 };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Pill active={sub === "events"} onClick={() => setSub("events")}>This Week</Pill>
          <Pill active={sub === "explore"} onClick={() => setSub("explore")}>Explore BA</Pill>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Pill active={sub === "health"} onClick={() => setSub("health")}>Healthcare</Pill>
          <Pill active={sub === "churches"} onClick={() => setSub("churches")}>Churches</Pill>
          <Pill active={sub === "apps"} onClick={() => setSub("apps")}>Apps</Pill>
        </div>
      </div>

      {sub === "events" && (
        <EventsView
          events={data.events || []}
          activeFilter={eventsFilter}
          onFilterChange={setEventsFilter}
          categoriesPresent={eventCategoriesPresent}
        />
      )}

      {sub === "health" && (
        <div>
          {healthTypes.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              <FilterPill active={healthFilter === "all"} onClick={() => setHealthFilter("all")}>All</FilterPill>
              {healthTypes.map((t) => (
                <FilterPill key={t} active={healthFilter === t} onClick={() => setHealthFilter(t)}>{t}</FilterPill>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredHealth.map((h, i) => {
              const facility = isFacility(h);
              return (
              <Card key={i} bg={facility ? C.ice : undefined}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{h.name}</span>
                    {h.insurance && h.insurance.toLowerCase() === "bcbs" && (
                      <img src={BCBS_URI} alt="BCBS" title="Blue Cross Blue Shield / GeoBlue" style={{ height: 18, width: "auto", opacity: 0.85 }} />
                    )}
                  </div>
                  {h.type && <span style={badge}>{h.type}</span>}
                </div>
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {h.address && <><AddressLink address={h.address} /><br /></>}
                  {h.location_note && <><LocationNote note={h.location_note} /><br /></>}
                  {h.phone && <>{h.phone}<br /></>}
                  {h.notes && <span style={{ color: C.stone, fontStyle: "italic" }}>{h.notes}</span>}
                </div>
                <LinkButton url={h.link} />
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {sub === "churches" && (
        <div>
          {churchDenoms.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              <FilterPill active={churchFilter === "all"} onClick={() => setChurchFilter("all")}>All</FilterPill>
              {churchDenoms.map((d) => (
                <FilterPill key={d} active={churchFilter === d} onClick={() => setChurchFilter(d)}>{d}</FilterPill>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredChurches.map((ch, i) => (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{ch.name}</span>
                  {ch.denomination && <span style={badge}>{ch.denomination}</span>}
                </div>
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {ch.address && <><AddressLink address={ch.address} /><br /></>}
                  {ch.location_note && <><LocationNote note={ch.location_note} /><br /></>}
                  {ch.service && <>{ch.service}<br /></>}
                  {ch.notes && <span style={{ color: C.stone, fontStyle: "italic" }}>{ch.notes}</span>}
                </div>
                <LinkButton url={ch.link} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {sub === "apps" && (() => {
        // Internal renderer so the same card markup serves both
        // grouped and flat (filtered) layouts without duplication.
        const renderAppCard = (a, key) => {
          const isEssential = a.priority === "essential";
          return (
            <Card key={key} bg={isEssential ? C.ice : undefined}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 8 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>
                  {isEssential && <span style={{ color: C.pepOrange, marginRight: 6 }}>●</span>}
                  {a.name}
                </span>
                {a.category && <span style={badge}>{a.category}</span>}
              </div>
              {a.description && (
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>
                  {a.description}
                </div>
              )}
              {(a.ios_url || a.android_url || a.web_url) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {safeExternalUrl(a.ios_url) && (
                    <a href={safeExternalUrl(a.ios_url)} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                      background: C.white, border: `1px solid ${C.fog}`, cursor: "pointer",
                    }}>📱 iOS</a>
                  )}
                  {safeExternalUrl(a.android_url) && (
                    <a href={safeExternalUrl(a.android_url)} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                      background: C.white, border: `1px solid ${C.fog}`, cursor: "pointer",
                    }}>🤖 Android</a>
                  )}
                  {safeExternalUrl(a.web_url) && !a.ios_url && !a.android_url && (
                    <a href={safeExternalUrl(a.web_url)} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                      background: C.white, border: `1px solid ${C.fog}`, cursor: "pointer",
                    }}>🌐 Website</a>
                  )}
                </div>
              )}
            </Card>
          );
        };

        // Group apps. "Transport" covers anything in Navigation,
        // Transportation, or Transit categories; everything else falls
        // into "Daily life." Grouping only applies when filter === "all"
        // (when a single category is selected, a flat list is clearer).
        const TRANSPORT_PATTERN = /navigation|transport|transit/i;
        const transportApps = sortedApps.filter((a) => a.category && TRANSPORT_PATTERN.test(a.category));
        const dailyApps     = sortedApps.filter((a) => !a.category || !TRANSPORT_PATTERN.test(a.category));

        return (
          <div>
            {/* Pattern-fill section header anchors the Apps view. */}
            <div className="bap-dot-pattern" style={{
              backgroundColor: C.ice,
              borderRadius: 12,
              padding: "14px 16px 16px",
              marginBottom: 14,
              border: `1px solid rgba(108, 172, 228, 0.4)`,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                textTransform: "uppercase", letterSpacing: 1.2,
                background: C.ocean, color: "#FFFFFF",
                padding: "3px 10px", borderRadius: 10, marginBottom: 8,
              }}>Apps</span>
              <h4 style={{
                fontFamily: "'EB Garamond', serif", fontSize: 18, fontWeight: 700,
                color: C.pepBlue, margin: "0 0 4px", letterSpacing: -0.3,
              }}>Argentine essentials</h4>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                textTransform: "uppercase", letterSpacing: 1.5, color: C.ocean,
              }}>Lo que vas a usar todos los días</div>
            </div>

            {appsCategories.length > 1 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                <FilterPill active={appsFilter === "all"} onClick={() => setAppsFilter("all")}>All</FilterPill>
                {appsCategories.map((c) => (
                  <FilterPill key={c} active={appsFilter === c} onClick={() => setAppsFilter(c)}>{c}</FilterPill>
                ))}
              </div>
            )}

            {appsFilter !== "all" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sortedApps.map((a, i) => renderAppCard(a, i))}
              </div>
            ) : (
              <>
                {transportApps.length > 0 && (
                  <>
                    <SectionDivider icon={<ColectivoIcon size={24} />} en="Getting around" es="Transporte" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {transportApps.map((a, i) => renderAppCard(a, "t" + i))}
                    </div>
                  </>
                )}
                {dailyApps.length > 0 && (
                  <>
                    <SectionDivider icon={<PalmIcon size={24} />} en="Daily life" es="Día a día" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {dailyApps.map((a, i) => renderAppCard(a, "d" + i))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        );
      })()}

      {sub === "explore" && (
        <div>
          {exploreTypes.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              <FilterPill active={exploreFilter === "all"} onClick={() => setExploreFilter("all")}>All</FilterPill>
              {exploreTypes.map((t) => (
                <FilterPill key={t} active={exploreFilter === t} onClick={() => setExploreFilter(t)}>{t}</FilterPill>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredExplore.map((p, i) => (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{p.name}</span>
                  {p.type && <span style={badge}>{p.type}</span>}
                </div>
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {p.description && <>{p.description}<br /></>}
                  {p.address && <span style={{ color: C.stone }}><AddressLink address={p.address} /><br /></span>}
                  {p.location_note && <><LocationNote note={p.location_note} /><br /></>}
                  {p.hours && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.stone }}>{p.hours}</span>}
                </div>
                <LinkButton url={p.link} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FAQ ───
function FaqView({ data }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {data.faq.map((p, i) => (
        <div key={i} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.fog}`, overflow: "hidden" }}>
          <button onClick={() => setOpen(open === i ? null : i)} className="bap-press" style={{
            width: "100%", padding: "14px 16px", border: "none", background: "transparent",
            display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
            fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue, textAlign: "left",
          }}>
            {p.title}
            <span style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 12, color: C.stone }}>▼</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 16px 14px", fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {p.content}
              {safeExternalUrl(p.link) && (
                <a href={safeExternalUrl(p.link)} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", gap: 5, marginTop: 10, width: "fit-content",
                  fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                  textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                  background: C.ice, border: `1px solid ${C.fog}`, cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  View full details
                  <span style={{ fontSize: 14 }}>→</span>
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Action Button Helper ───
function ActionBtn({ href, icon, label, variant }) {
  // Callers route both internally-constructed schemes (tel:…, mailto:…)
  // and raw sheet values (Contacts.maps, Contacts.whatsapp, Resources.url)
  // through here, so the scheme guard lives at the entry. Internally-
  // constructed schemes are always in the allowlist, so the only thing
  // this drops in practice is a malicious sheet URL.
  const safe = safeExternalUrl(href);
  if (!safe) return null;
  const styles = {
    phone: { bg: C.ice, color: C.ocean, border: C.fog },
    whatsapp: { bg: "#E8F5E9", color: "#2E7D32", border: "#C8E6C9" },
    email: { bg: C.ice, color: C.ocean, border: C.fog },
    maps: { bg: C.ice, color: C.ocean, border: C.fog },
    emergency: { bg: "#FFF3E0", color: "#BF360C", border: "#FFCC80" },
  };
  const s = styles[variant] || styles.phone;
  return (
    <a href={safe} target={variant === "maps" || variant === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "'DM Mono', monospace", fontSize: 12, color: s.color,
      textDecoration: "none", padding: "6px 12px", borderRadius: 8,
      background: s.bg, border: `1px solid ${s.border}`, cursor: "pointer",
    }}>
      {icon} {label}
    </a>
  );
}

// ─── Contacts ───
function ContactsView({ data }) {
  const contacts = data.contacts || [];
  const office = contacts.filter((c) => c.type === "office");
  const emergency = contacts.filter((c) => c.type === "emergency");
  const staff = contacts.filter((c) => c.type === "staff");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Program Office */}
      {office.map((o, i) => (
        <Card key={`office-${i}`}>
          <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 17, color: C.pepBlue, marginBottom: 4 }}>{o.name}</div>
          {o.address && <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", marginBottom: 8 }}><AddressLink address={o.address} mapsUrl={o.maps} /></div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {o.phone && <ActionBtn href={`tel:${o.phone.replace(/[\s.]/g, "")}`} icon="📞" label="Call" variant="phone" />}
            {o.maps && <ActionBtn href={o.maps} icon="📍" label="Open in Maps" variant="maps" />}
            {o.email && <ActionBtn href={`mailto:${o.email}`} icon="✉" label={o.email} variant="email" />}
          </div>
        </Card>
      ))}

      {/* Emergency */}
      {emergency.length > 0 && (
        <>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.stone, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Emergency</div>
          {emergency.map((e, i) => (
            <div key={`emerg-${i}`} style={{
              background: "#FFF3E0", borderRadius: 10, padding: 16,
              border: `1px solid #FFCC80`, borderLeft: `4px solid ${C.pepOrange}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: "#BF360C" }}>{e.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: "#FFCC80", color: "#BF360C", padding: "2px 10px", borderRadius: 12 }}>{e.role}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {e.phone && <ActionBtn href={`tel:${e.phone.replace(/[\s.]/g, "")}`} icon="📞" label={e.phone} variant="emergency" />}
                {e.whatsapp && <ActionBtn href={e.whatsapp} icon="💬" label="WhatsApp" variant="whatsapp" />}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Staff */}
      {staff.length > 0 && (
        <>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.stone, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Staff</div>
          {staff.map((s, i) => (
            <Card key={`staff-${i}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{s.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12 }}>{s.role}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {s.phone && <ActionBtn href={`tel:${s.phone.replace(/[\s.]/g, "")}`} icon="📞" label="Call" variant="phone" />}
                {s.whatsapp && <ActionBtn href={s.whatsapp} icon="💬" label="WhatsApp" variant="whatsapp" />}
                {s.email && <ActionBtn href={`mailto:${s.email}`} icon="✉" label="Email" variant="email" />}
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Local Emergency Numbers */}
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.stone, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Local Emergency Numbers</div>
      <div style={{ background: C.white, borderRadius: 10, padding: 16, border: `1px solid ${C.fog}` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, fontFamily: "'Roboto', sans-serif", color: C.mountain }}>
          {[
            { label: "SAME Ambulance", num: "107" },
            { label: "Police", num: "911" },
            { label: "Fire", num: "100" },
          ].map((n) => (
            <div key={n.num} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{n.label}</span>
              <a href={`tel:${n.num}`} style={{
                fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: C.ocean,
                textDecoration: "none", padding: "4px 12px", borderRadius: 8,
                background: C.ice, border: `1px solid ${C.fog}`,
              }}>{n.num}</a>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      {(data.resources || []).length > 0 && (
        <>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.stone, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Additional Resources</div>
          {data.resources.map((r, i) => (
            <Card key={`res-${i}`}>
              <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue, marginBottom: 2 }}>{r.name}</div>
              {r.detail && <div style={{ fontSize: 13, color: C.stone, fontFamily: "'Roboto', sans-serif", marginBottom: 8, whiteSpace: "pre-line" }}>{r.detail}</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {r.phone && <ActionBtn href={`tel:${r.phone.replace(/[\s\-().]/g, "")}`} icon="📞" label={r.phone} variant="phone" />}
                {r.url && <ActionBtn href={r.url} icon="→" label="Website" variant="maps" />}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Nav Icons ───
const icons = {
  today: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  schedule: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  calendar: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  local: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  faq: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  contacts: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
};

const TABS = [
  { key: "today",    label: "Today",    icon: icons.today,    color: C.bapBlue },
  { key: "schedule", label: "Schedule", icon: icons.schedule, color: C.pepBlue },
  { key: "calendar", label: "Calendar", icon: icons.calendar, color: C.ocean },
  { key: "local",    label: "Local",    icon: icons.local,    color: C.sky },
  { key: "faq",      label: "FAQ",      icon: icons.faq,      color: C.mountain },
  { key: "contacts", label: "Contacts", icon: icons.contacts, color: C.pepOrange },
];

// ─── Gear icon for the header settings entry point ───
function GearIcon({ size = 20, color = "#FFFFFF" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

// ─── Prompt list block for ProfileModal (evergreen prompts) ───
//
// Renders inside <ProfileModal> after the "Logged in as" card. Lists
// prompts whose surface is "profile" or "both" — typically evergreen
// fields the student should be able to revisit anytime (t-shirt size,
// dietary preferences, contact info corrections). Each row tap opens
// the same <PromptForm> bottom sheet that PromptCard uses, so the two
// surfaces share validation and submit behavior.
//
// Renders nothing when there are no profile-surface prompts, so the
// settings modal stays clean for cohorts where the Director hasn't
// queued evergreen forms.
function PromptProfileSection({ prompts, onOpenPrompt }) {
  const profilePrompts = filterPromptsBySurface(prompts, "profile");
  if (profilePrompts.length === 0) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 1.5, color: C.stone, marginBottom: 8,
      }}>About you / Tu información</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {profilePrompts.map((p) => {
          const pending = isPromptPending(p);
          const submitted = !!p.submitted_at;
          const cta = submitted ? (pending ? "Completar →" : "Editar →") : "Responder →";
          // Compact preview of saved values: comma-joined, truncated.
          // Lets the student see at a glance what they previously
          // saved without opening the form.
          const previewParts = [];
          for (let i = 0; i < (p.fields || []).length; i++) {
            const f = p.fields[i];
            const v = (p.responses || {})[f.field_id];
            if (v == null || String(v).trim() === "") continue;
            // For multi_select stored as semicolon-joined, swap to commas
            const display = String(v).split(";").map((x) => x.trim()).filter(Boolean).join(", ");
            previewParts.push(display);
          }
          const preview = previewParts.join(" · ");
          const cutoff = formatPromptCutoff(p);

          return (
            <button
              key={p.prompt_id}
              type="button"
              onClick={() => onOpenPrompt(p)}
              className="bap-press"
              style={{
                display: "flex", alignItems: "stretch", textAlign: "left",
                background: C.white,
                border: `1px solid ${C.fog}`,
                borderRadius: 10, padding: 0, cursor: "pointer", width: "100%",
              }}
            >
              <div style={{ width: 4, background: pending ? C.pepOrange : C.ocean, flexShrink: 0 }} />
              <div style={{
                flex: 1, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
                minWidth: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14.5,
                    color: C.pepBlack, lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.title_es || p.title_en}</div>
                  {preview ? (
                    <div style={{
                      fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.mountain,
                      marginTop: 2, lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{preview}</div>
                  ) : (
                    <div style={{
                      fontFamily: "'Roboto', sans-serif", fontStyle: "italic", fontSize: 12,
                      color: C.stone, marginTop: 2, lineHeight: 1.3,
                    }}>Sin respuesta / No answer yet</div>
                  )}
                  {cutoff && (
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.stone,
                      lineHeight: 1.3, marginTop: 3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{cutoff.es}</div>
                  )}
                </div>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: pending ? C.pepOrange : C.ocean,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>{cta}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Profile / settings modal ───
// Full-screen overlay (within the 480px column) where a student sets
// their first name, ticks the courses they're enrolled in, and toggles
// "Show only my classes". Reads/writes the profile via the onChange
// callback so the App owns the source of truth.
function ProfileModal({ open, onClose, profile, onChange, classes, currentUser, onSignOut, prompts, onOpenPrompt }) {
  if (!open) return null;

  const sortedClasses = [...(classes || [])].sort((a, b) => a.code.localeCompare(b.code));
  const enrolledSet = new Set(profile.enrolledClasses || []);

  const toggleClass = (code) => {
    const next = new Set(enrolledSet);
    if (next.has(code)) next.delete(code); else next.add(code);
    const nextArr = Array.from(next);
    // Auto-enable the personalization filter the first time a class
    // is selected, so the student's choices take effect immediately
    // on Today and in Weekly Overview without needing to also flip
    // the toggle below. We only flip false → true; never override
    // a deliberate user-off state once classes are already chosen.
    const wasEmpty = enrolledSet.size === 0;
    const nowHasOne = nextArr.length > 0;
    const shouldAutoEnable = wasEmpty && nowHasOne && !profile.filterEnabled;
    onChange({
      ...profile,
      enrolledClasses: nextArr,
      ...(shouldAutoEnable ? { filterEnabled: true } : {}),
    });
  };
  const toggleFilter = () => onChange({ ...profile, filterEnabled: !profile.filterEnabled });
  const clearAll = () => {
    if (!window.confirm("¿Querés borrar tu perfil? / Reset your profile?\n\nEsto borra las clases marcadas y la configuración. / This clears your selected classes and settings.")) return;
    onChange({
      ...profile,
      enrolledClasses: [],
      filterEnabled: false,
      dismissedAnnouncements: [],
    });
  };

  const handleSignOutClick = () => {
    if (!window.confirm("¿Cerrar sesión? / Sign out?\n\nVas a tener que ingresar tu CWID y cumpleaños de nuevo. / You'll need to enter your CWID and birthday again.")) return;
    if (typeof onSignOut === "function") onSignOut();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(29, 37, 45, 0.55)",
        zIndex: 200, display: "flex", justifyContent: "center", alignItems: "stretch",
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.parchment, width: "100%", maxWidth: 480,
          margin: "0 auto", display: "flex", flexDirection: "column",
          maxHeight: "100vh",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "16px 20px",
          background: `linear-gradient(135deg, ${C.pepBlue} 0%, ${C.ocean} 100%)`,
          color: C.white, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.bapBlue, marginBottom: 2 }}>
              Settings / Ajustes
            </div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.1 }}>
              Your Profile
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", color: C.white,
              width: 36, height: 36, borderRadius: 18, cursor: "pointer",
              fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 24px" }}>
          {/* Logged in as */}
          {currentUser && (
            <div style={{
              marginBottom: 22, padding: "14px 14px",
              background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
            }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
                letterSpacing: 1.5, color: C.stone, marginBottom: 6,
              }}>
                Sesión iniciada como&nbsp;/&nbsp;Logged in as
              </div>
              <div style={{
                fontFamily: "'EB Garamond', serif", fontSize: 18, fontWeight: 700, color: C.pepBlack,
                lineHeight: 1.2,
              }}>
                {currentUser.preferred_name || currentUser.first_name}
                {currentUser.last_name ? ` ${currentUser.last_name}` : ""}
              </div>
              <div style={{
                fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.stone, marginTop: 4,
                display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
              }}>
                {currentUser.role && (
                  <span style={{ textTransform: "capitalize" }}>{currentUser.role}</span>
                )}
                {currentUser.role && currentUser.email && (
                  <span style={{ color: C.fog }}>·</span>
                )}
                {currentUser.email && (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                    {currentUser.email}
                  </span>
                )}
              </div>
              <button
                onClick={handleSignOutClick}
                className="bap-press"
                style={{
                  marginTop: 12,
                  background: "none", border: `1px solid ${C.fog}`, borderRadius: 8,
                  padding: "8px 14px", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.mountain, letterSpacing: 0.5,
                }}
              >
                Cerrar sesión&nbsp;/&nbsp;Sign out
              </button>
            </div>
          )}

          {/* Director-defined evergreen prompts (t-shirt size,
              dietary preferences, contact info corrections, etc.).
              Renders nothing when the Director hasn't queued any
              profile-surface prompts. */}
          <PromptProfileSection prompts={prompts} onOpenPrompt={onOpenPrompt} />

          {/* My classes toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.white, borderRadius: 12, border: `1px solid ${C.fog}`,
            padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 15, color: C.pepBlack }}>
                Show only my classes
              </div>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.stone, marginTop: 2 }}>
                Filters Today and Schedule to the courses you tick below.
              </div>
            </div>
            <button
              onClick={toggleFilter}
              aria-pressed={!!profile.filterEnabled}
              aria-label="Toggle My classes only"
              className="bap-press"
              style={{
                width: 48, height: 28, borderRadius: 14,
                background: profile.filterEnabled ? C.ocean : C.fog,
                border: "none", cursor: "pointer", position: "relative",
                transition: "background 0.18s ease-out", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: profile.filterEnabled ? 23 : 3,
                width: 22, height: 22, borderRadius: "50%", background: C.white,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.18s ease-out",
              }} />
            </button>
          </div>

          {/* Class checklist */}
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.stone, marginBottom: 8,
          }}>My courses</div>

          {sortedClasses.length === 0 ? (
            <div style={{
              fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.stone,
              fontStyle: "italic", padding: "14px 0",
            }}>No courses loaded yet. Once the schedule syncs, you can tick yours here.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sortedClasses.map((c) => {
                const checked = enrolledSet.has(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => toggleClass(c.code)}
                    className="bap-press"
                    style={{
                      display: "flex", alignItems: "stretch", textAlign: "left",
                      background: checked ? C.ice : C.white,
                      border: `1px solid ${checked ? C.ocean : C.fog}`,
                      borderRadius: 10, overflow: "hidden", cursor: "pointer",
                      padding: 0, width: "100%",
                    }}
                  >
                    <div style={{ width: 4, background: c.color, flexShrink: 0 }} />
                    <div style={{ padding: "10px 14px", flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `1.5px solid ${checked ? C.ocean : C.stone}`,
                        background: checked ? C.ocean : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: C.white, fontSize: 14, fontWeight: 700, lineHeight: 1,
                      }}>{checked ? "✓" : ""}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 15, color: C.pepBlack }}>
                          {c.code}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain, marginTop: 1 }}>
                          {c.title}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Reset */}
          <button
            onClick={clearAll}
            style={{
              marginTop: 22, display: "block", marginLeft: "auto",
              background: "none", border: `1px solid ${C.fog}`, borderRadius: 8,
              padding: "6px 14px", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.stone,
            }}
          >Reset profile</button>

          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 11, color: C.stone,
            marginTop: 18, lineHeight: 1.5, textAlign: "center",
          }}>
            Saved on this device only. Changes apply immediately.
          </div>
        </div>

        {/* Modal footer */}
        <div style={{
          padding: "12px 16px 18px", background: C.white, borderTop: `1px solid ${C.fog}`,
        }}>
          <button
            onClick={onClose}
            className="bap-press"
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10,
              background: C.pepBlue, color: C.white, border: "none", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
            }}
          >Done</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PASSCODE GATE
// ============================================================
// Bilingual full-screen gate that runs before any data is fetched
// or any cached data is rendered. Submission probes the Apps
// Script with the entered token; on success the token is stashed
// in localStorage and the resolved data is handed up to <App> via
// onAuth so the main effect doesn't have to refetch. On failure
// the user gets a bilingual "wrong code" message and the gate
// stays put. Network errors surface as a separate generic message
// so they aren't conflated with a wrong passcode.
function PasscodeGate({ onAuth }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(""); // "" | "wrong" | "network"
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const candidate = code.trim();
    if (!candidate || submitting) return;
    setSubmitting(true);
    setErrorKey("");
    try {
      const data = await fetchAllData({ token: candidate });
      onAuth(candidate, data);
    } catch (err) {
      if (err && err.name === "AuthError") {
        setErrorKey("wrong");
        setCode("");
        if (inputRef.current) inputRef.current.focus();
      } else {
        setErrorKey("network");
      }
      setSubmitting(false);
    }
  }, [code, submitting, onAuth]);

  const errorText = errorKey === "wrong"
    ? { es: "Código incorrecto.", en: "Wrong code." }
    : errorKey === "network"
    ? { es: "No se pudo conectar. Probá de nuevo.", en: "Couldn't connect. Try again." }
    : null;

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto", minHeight: "100vh",
      background: `linear-gradient(160deg, ${C.pepBlue} 0%, ${C.ocean} 60%, ${C.bapBlue} 100%)`,
      color: C.white, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 24px",
      position: "relative", overflow: "hidden",
    }}>
      <SouthernCrossDecoration />
      <img src={LOGO_URI} alt="Buenos Aires Program" style={{
        width: 96, height: 96, borderRadius: "50%", marginBottom: 24,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }} />
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 2.5, color: C.bapBlue, marginBottom: 6, textAlign: "center",
      }}>
        Pepperdine University
      </div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontSize: 30, fontWeight: 700,
        lineHeight: 1.1, marginBottom: 4, textAlign: "center",
      }}>
        Buenos Aires Program
      </div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 16,
        color: C.fog, marginBottom: 32, textAlign: "center",
      }}>
        Programa de Buenos Aires
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320 }}>
        <label htmlFor="bap-passcode" style={{
          display: "block", fontFamily: "'DM Mono', monospace", fontSize: 11,
          textTransform: "uppercase", letterSpacing: 2, color: C.bapBlue,
          marginBottom: 8, textAlign: "center",
        }}>
          Código de acceso&nbsp;/&nbsp;Access code
        </label>
        <input
          ref={inputRef}
          id="bap-passcode"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={code}
          onChange={(e) => { setCode(e.target.value); if (errorKey) setErrorKey(""); }}
          disabled={submitting}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12,
            border: `1px solid ${errorKey === "wrong" ? C.pepOrange : "rgba(255,255,255,0.25)"}`,
            background: "rgba(255,255,255,0.10)", color: C.white,
            fontFamily: "'Roboto', sans-serif", fontSize: 17, letterSpacing: 0.5,
            outline: "none", textAlign: "center",
          }}
        />
        {errorText && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8,
            background: "rgba(227, 82, 5, 0.18)",
            border: `1px solid ${C.pepOrange}`,
            fontFamily: "'Roboto', sans-serif", fontSize: 13,
            color: C.white, textAlign: "center",
          }}>
            {errorText.es}
            <span style={{ color: C.fog, margin: "0 6px" }}>/</span>
            <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
              {errorText.en}
            </span>
          </div>
        )}
        <button
          type="submit"
          disabled={!code.trim() || submitting}
          className="bap-press"
          style={{
            marginTop: 18, width: "100%", padding: "14px 16px",
            borderRadius: 12, border: "none", cursor: code.trim() && !submitting ? "pointer" : "default",
            background: code.trim() && !submitting ? C.bapBlue : "rgba(255,255,255,0.15)",
            color: code.trim() && !submitting ? C.pepBlue : "rgba(255,255,255,0.5)",
            fontFamily: "'Roboto', sans-serif", fontSize: 16, fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          {submitting ? "Conectando…  /  Connecting…" : "Continuar  /  Continue"}
        </button>
      </form>

      <div style={{
        marginTop: 28, fontFamily: "'EB Garamond', serif", fontStyle: "italic",
        fontSize: 13, color: C.fog, textAlign: "center", maxWidth: 320, lineHeight: 1.5,
      }}>
        ¿No tenés el código? Pedíselo al equipo del programa.
        <br />
        <span style={{ fontSize: 12 }}>Don't have the code? Ask the program staff.</span>
      </div>
    </div>
  );
}

// ============================================================
// USER GATE — CWID + birthday identification
// Renders after <PasscodeGate> succeeds and before any per-user
// features. Probes the auth script (separate Apps Script bound
// to the Roster spreadsheet) with the entered CWID + birthday;
// on success the curated user record is handed up via onAuth so
// subsequent renders can personalize. Wrong-credentials get a
// "We couldn't find you" panel; AuthError (cohort token rotated
// mid-session) bubbles to onCohortReset so the App can bounce
// the student back to the cohort gate without showing a misleading
// wrong-credentials message in this gate (the student didn't enter
// the cohort code here). Network errors get a generic "Couldn't
// connect" message.
// ============================================================

const MONTH_OPTIONS = [
  { value: "01", es: "Enero",      en: "January"   },
  { value: "02", es: "Febrero",    en: "February"  },
  { value: "03", es: "Marzo",      en: "March"     },
  { value: "04", es: "Abril",      en: "April"     },
  { value: "05", es: "Mayo",       en: "May"       },
  { value: "06", es: "Junio",      en: "June"      },
  { value: "07", es: "Julio",      en: "July"      },
  { value: "08", es: "Agosto",     en: "August"    },
  { value: "09", es: "Septiembre", en: "September" },
  { value: "10", es: "Octubre",    en: "October"   },
  { value: "11", es: "Noviembre",  en: "November"  },
  { value: "12", es: "Diciembre",  en: "December"  },
];

// Days available in the day dropdown for a given month. February
// always returns 29 so leap-year birthdays are pickable; the
// auth script's parseBirthdayMD handles 02-29 either way. Returns
// 31 when month is unset so the day dropdown stays fully populated
// until a month is chosen.
function daysInMonthMD(monthStr) {
  if (!monthStr) return 31;
  const m = parseInt(monthStr, 10);
  if (m === 2) return 29;
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
  return 31;
}

// Inline chevron used as the trailing affordance on the month/day
// selects. Stripping the native appearance makes the closed
// selects match the CWID input visually; the chevron signals
// "this is a picker." The native picker UI still opens on tap.
const SELECT_CHEVRON = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>")`;

function UserGate({ cohortToken, onAuth, onCohortReset }) {
  const [cwid, setCwid] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(""); // "" | "wrong" | "network"
  const cwidInputRef = useRef(null);

  useEffect(() => {
    if (cwidInputRef.current) cwidInputRef.current.focus();
  }, []);

  // If the user picks a month that has fewer days than the day
  // they previously selected (e.g. picked 31, then changed month
  // to April), clear the day so the dropdown resets cleanly
  // instead of holding an out-of-range value.
  const dayMax = daysInMonthMD(month);
  useEffect(() => {
    if (day && parseInt(day, 10) > dayMax) {
      setDay("");
    }
  }, [day, dayMax]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const trimmedCwid = cwid.trim();
    if (!trimmedCwid || !month || !day || submitting) return;
    setSubmitting(true);
    setErrorKey("");
    const birthday = `${month}-${String(day).padStart(2, "0")}`;
    try {
      const user = await identifyUser({ token: cohortToken, cwid: trimmedCwid, birthday });
      // Pass birthday up to the App alongside the user so it can
      // be tucked into the stored envelope. The auth script's
      // prompts/submit endpoints re-validate identity on every
      // call (cwid + birthday → roster row), so the birthday
      // needs to live on-device too. Same threat-model trade as
      // the rest of the user record: low-stakes within cohort.
      onAuth(user, birthday);
    } catch (err) {
      if (err && err.name === "AuthError") {
        // Cohort token rotated since this student entered it.
        // Hand back to the cohort gate; do NOT show a wrong-
        // credentials panel here, that would mislead the student
        // about which thing went wrong.
        if (typeof onCohortReset === "function") onCohortReset();
        return;
      }
      if (err && err.name === "NoMatchError") {
        setErrorKey("wrong");
      } else {
        setErrorKey("network");
      }
      setSubmitting(false);
    }
  }, [cwid, month, day, submitting, cohortToken, onAuth, onCohortReset]);

  const errorText = errorKey === "wrong"
    ? { es: "No te encontramos. Verificá tu CWID y cumpleaños.", en: "We couldn't find you. Check your CWID and birthday." }
    : errorKey === "network"
    ? { es: "No se pudo conectar. Probá de nuevo.", en: "Couldn't connect. Try again." }
    : null;

  const canSubmit = !!cwid.trim() && !!month && !!day && !submitting;

  const fieldBorder = errorKey === "wrong" ? C.pepOrange : "rgba(255,255,255,0.25)";

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto", minHeight: "100vh",
      background: `linear-gradient(160deg, ${C.pepBlue} 0%, ${C.ocean} 60%, ${C.bapBlue} 100%)`,
      color: C.white, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 24px",
      position: "relative", overflow: "hidden",
    }}>
      <SouthernCrossDecoration />
      <img src={LOGO_URI} alt="Buenos Aires Program" style={{
        width: 96, height: 96, borderRadius: "50%", marginBottom: 24,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }} />
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 2.5, color: C.bapBlue, marginBottom: 6, textAlign: "center",
      }}>
        Buenos Aires Program
      </div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontSize: 32, fontWeight: 700,
        lineHeight: 1.1, marginBottom: 4, textAlign: "center",
      }}>
        ¡Hola!
      </div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 18,
        color: C.fog, marginBottom: 10, textAlign: "center",
      }}>
        Hello!
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 1.5, color: C.fog, marginBottom: 32, textAlign: "center",
        maxWidth: 320, lineHeight: 1.5,
      }}>
        Decinos quién sos&nbsp;/&nbsp;Tell us who you are
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320 }}>
        {/* CWID */}
        <label htmlFor="bap-cwid" style={{
          display: "block", fontFamily: "'DM Mono', monospace", fontSize: 11,
          textTransform: "uppercase", letterSpacing: 2, color: C.bapBlue,
          marginBottom: 8, textAlign: "center",
        }}>
          CWID
        </label>
        <input
          ref={cwidInputRef}
          id="bap-cwid"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={cwid}
          onChange={(e) => {
            // Strip anything non-digit on input so a paste containing
            // dashes ("123-456-789"), spaces, or stray letters cleans
            // up automatically. CWIDs are 9-digit numerics with no
            // leading zeros, but the auth script normalizes both
            // sides for leading-zero tolerance just in case.
            const digits = e.target.value.replace(/\D/g, "");
            setCwid(digits);
            if (errorKey) setErrorKey("");
          }}
          disabled={submitting}
          placeholder="123456789"
          maxLength={9}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12,
            border: `1px solid ${fieldBorder}`,
            background: "rgba(255,255,255,0.10)", color: C.white,
            fontFamily: "'Roboto', sans-serif", fontSize: 17, letterSpacing: 0.5,
            outline: "none", textAlign: "center",
            boxSizing: "border-box",
          }}
        />

        {/* Birthday */}
        <label htmlFor="bap-bday-month" style={{
          display: "block", fontFamily: "'DM Mono', monospace", fontSize: 11,
          textTransform: "uppercase", letterSpacing: 2, color: C.bapBlue,
          marginTop: 20, marginBottom: 8, textAlign: "center",
        }}>
          Cumpleaños&nbsp;/&nbsp;Birthday
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            id="bap-bday-month"
            value={month}
            onChange={(e) => { setMonth(e.target.value); if (errorKey) setErrorKey(""); }}
            disabled={submitting}
            style={{
              flex: 1.5, padding: "14px 16px", paddingRight: 36, borderRadius: 12,
              border: `1px solid ${fieldBorder}`,
              background: "rgba(255,255,255,0.10)", color: month ? C.white : "rgba(255,255,255,0.6)",
              fontFamily: "'Roboto', sans-serif", fontSize: 16,
              outline: "none", appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
              cursor: submitting ? "default" : "pointer",
              boxSizing: "border-box",
              backgroundImage: SELECT_CHEVRON,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
              backgroundSize: "10px 6px",
            }}
          >
            <option value="" style={{ color: C.pepBlack }}>Mes / Month</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value} style={{ color: C.pepBlack }}>
                {m.es} / {m.en}
              </option>
            ))}
          </select>
          <select
            value={day}
            onChange={(e) => { setDay(e.target.value); if (errorKey) setErrorKey(""); }}
            disabled={submitting}
            style={{
              flex: 1, padding: "14px 16px", paddingRight: 32, borderRadius: 12,
              border: `1px solid ${fieldBorder}`,
              background: "rgba(255,255,255,0.10)", color: day ? C.white : "rgba(255,255,255,0.6)",
              fontFamily: "'Roboto', sans-serif", fontSize: 16,
              outline: "none", appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
              cursor: submitting ? "default" : "pointer",
              boxSizing: "border-box",
              backgroundImage: SELECT_CHEVRON,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "10px 6px",
            }}
          >
            <option value="" style={{ color: C.pepBlack }}>Día / Day</option>
            {Array.from({ length: dayMax }, (_, i) => {
              const d = String(i + 1).padStart(2, "0");
              return (
                <option key={d} value={d} style={{ color: C.pepBlack }}>
                  {i + 1}
                </option>
              );
            })}
          </select>
        </div>

        {errorText && (
          <div style={{
            marginTop: 14, padding: "10px 12px", borderRadius: 8,
            background: "rgba(227, 82, 5, 0.18)",
            border: `1px solid ${C.pepOrange}`,
            fontFamily: "'Roboto', sans-serif", fontSize: 13,
            color: C.white, textAlign: "center", lineHeight: 1.4,
          }}>
            {errorText.es}
            <span style={{ color: C.fog, margin: "0 6px" }}>/</span>
            <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
              {errorText.en}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="bap-press"
          style={{
            marginTop: 18, width: "100%", padding: "14px 16px",
            borderRadius: 12, border: "none", cursor: canSubmit ? "pointer" : "default",
            background: canSubmit ? C.bapBlue : "rgba(255,255,255,0.15)",
            color: canSubmit ? C.pepBlue : "rgba(255,255,255,0.5)",
            fontFamily: "'Roboto', sans-serif", fontSize: 16, fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          {submitting ? "Verificando…  /  Checking…" : "Continuar  /  Continue"}
        </button>
      </form>

      <div style={{
        marginTop: 28, fontFamily: "'EB Garamond', serif", fontStyle: "italic",
        fontSize: 13, color: C.fog, textAlign: "center", maxWidth: 320, lineHeight: 1.5,
      }}>
        ¿No te encontramos? Escribinos a{" "}
        <a
          href="mailto:buenosaires@pepperdine.edu"
          style={{ color: C.fog, textDecoration: "underline" }}
        >
          buenosaires@pepperdine.edu
        </a>
        <br />
        <span style={{ fontSize: 12 }}>Can't find you? Email us.</span>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [tab, setTab] = useState("today");

  // Cohort auth token. Lazy-init from localStorage so a student who
  // has already entered the passcode on this device skips the gate.
  // When empty (and SHEET_ID is configured), the App early-returns
  // the <PasscodeGate> instead of the main UI. Cleared on AuthError
  // so a rotated cohort code re-prompts automatically.
  const [cohortToken, setCohortToken] = useState(() => loadCohortToken());

  // Current user identity. The curated row returned by the auth
  // script's identify endpoint, lazy-init from localStorage so a
  // returning student skips the user gate. When non-null AND a
  // cohort token is present, the App proceeds to the main UI;
  // otherwise the App renders <UserGate> after <PasscodeGate>
  // succeeds. Cleared together with the cohort token on AuthError
  // so a rotated cohort code resets both gates in lockstep.
  const [currentUser, setCurrentUser] = useState(() => loadUser());

  // Set inside handleAuth so the post-auth render doesn't immediately
  // re-fetch what the gate's validation probe just retrieved.
  const justAuthed = useRef(false);

  // Profile state. Lazy-init from localStorage so the very first
  // render already reflects the student's choices (no flash of
  // unfiltered content for someone who has the filter on). Profile
  // lives at its own key (PROFILE_KEY), separate from the data cache,
  // so it is unaffected by CACHE_VERSION bumps.
  const [profile, setProfile] = useState(() => loadProfile());
  const [profileOpen, setProfileOpen] = useState(false);

  const updateProfile = useCallback((next) => {
    setProfile(next);
    saveProfile(next);
  }, []);

  // Prompts state. Lazy-init from the per-cwid cache so a returning
  // student sees their pending forms instantly; refreshed in the
  // background by the effect below. Lives at its own localStorage
  // key (PROMPTS_CACHE_KEY) with a 10-min TTL so Director edits to
  // the Prompts/PromptFields tabs propagate within a few minutes.
  const initialUser = currentUser; // capture at mount so the lazy init isn't tied to the live ref
  const [prompts, setPrompts] = useState(() => {
    if (!initialUser || !initialUser.cwid) return [];
    return loadPromptsCache(initialUser.cwid) || [];
  });

  // The prompt currently being edited in the bottom-sheet form.
  // Set when the student taps a row in <PromptCard> or
  // <PromptProfileSection>; cleared when the form closes. Form sheet
  // renders at App level (rather than inside Today or ProfileModal)
  // so it stacks above either surface and shares one state.
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const handleOpenPrompt = useCallback((p) => setSelectedPrompt(p), []);
  const handleClosePrompt = useCallback(() => setSelectedPrompt(null), []);

  // Bottom-nav pill positioning. The pill slides under whichever tab is
  // active; its color adopts the active tab's color identity. We measure
  // each button via a ref-keyed map so re-positioning works on layout
  // changes (window resize, font load, etc.) without a layout-only
  // re-render of the whole component tree.
  const navRef = useRef(null);
  const navBtnRefs = useRef({});
  const [pillTransform, setPillTransform] = useState({ x: 0, color: C.bapBlue });

  // Lazy-init from localStorage cache so repeat opens render instantly.
  // First-ever open (no cache) falls through to "loading"; if SHEET_ID
  // is empty we treat the build as preview/default mode.
  const [data, setData] = useState(() => {
    if (!SHEET_ID) return DEFAULT_DATA;
    const cached = loadCache();
    return cached ? cached.data : DEFAULT_DATA;
  });
  const [status, setStatus] = useState(() => {
    if (!SHEET_ID) return "default";
    return loadCache() ? "refreshing" : "loading";
  });

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=EB+Garamond:wght@400;700&family=Roboto:wght@400;500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Inject the small set of keyframes and helper classes the
    // personality moves rely on. Idempotent: bails if the style tag
    // is already present (e.g., during hot-reload).
    if (!document.getElementById("bap-personality-styles")) {
      const style = document.createElement("style");
      style.id = "bap-personality-styles";
      style.textContent = `
        @keyframes bap-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(124, 252, 158, 0.55); transform: scale(1); }
          70%  { box-shadow: 0 0 0 8px rgba(124, 252, 158, 0);   transform: scale(1.08); }
          100% { box-shadow: 0 0 0 0 rgba(124, 252, 158, 0);     transform: scale(1); }
        }
        @keyframes bap-pulse-orange {
          0%   { box-shadow: 0 0 0 0 rgba(227, 82, 5, 0.55); transform: scale(1); }
          70%  { box-shadow: 0 0 0 8px rgba(227, 82, 5, 0);   transform: scale(1.08); }
          100% { box-shadow: 0 0 0 0 rgba(227, 82, 5, 0);     transform: scale(1); }
        }
        @keyframes bap-spin { to { transform: rotate(360deg); } }
        @keyframes bap-sun-spin { to { transform: rotate(360deg); } }
        @keyframes bap-steam {
          0%   { opacity: 0; transform: translateY(0); }
          50%  { opacity: 0.55; transform: translateY(-6px); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        .bap-pulse-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #7CFC9E;
          box-shadow: 0 0 0 0 rgba(124, 252, 158, 0.6);
          animation: bap-pulse 1.8s ease-out infinite;
          display: inline-block;
        }
        .bap-pulse-dot-orange {
          width: 6px; height: 6px; border-radius: 50%;
          background: ${C.pepOrange};
          box-shadow: 0 0 0 0 rgba(227, 82, 5, 0.6);
          animation: bap-pulse-orange 1.8s ease-out infinite;
          display: inline-block;
        }
        .bap-spin { animation: bap-spin 0.9s linear infinite; }
        .bap-sun-rotate {
          animation: bap-sun-spin 80s linear infinite;
          transform-origin: center;
        }
        .bap-steam {
          animation: bap-steam 3.5s ease-in-out infinite;
        }
        .bap-steam.delayed { animation-delay: 1.7s; }
        .bap-tip-text { transition: opacity 0.3s ease-in-out; }
        .bap-tip-text.fading { opacity: 0; }
        .bap-press {
          transition: transform 0.12s ease-out, box-shadow 0.12s ease-out;
        }
        .bap-press:active { transform: scale(0.97); }
        .bap-dot-pattern {
          background-image:
            radial-gradient(circle at 0 0, rgba(0, 87, 184, 0.10) 1px, transparent 1.5px),
            radial-gradient(circle at 8px 8px, rgba(0, 87, 184, 0.10) 1px, transparent 1.5px);
          background-size: 16px 16px;
          background-repeat: repeat;
        }
        .bap-nav-pill {
          position: absolute;
          bottom: 6px;
          left: 0;
          width: 44px;
          height: 4px;
          border-radius: 2px;
          transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease-out;
          pointer-events: none;
          will-change: transform;
        }
        .bap-nav-icon {
          display: inline-flex;
          transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bap-nav-icon.lifted { transform: translateY(-3px); }
        @media (prefers-reduced-motion: reduce) {
          .bap-pulse-dot { animation: none; }
          .bap-pulse-dot-orange { animation: none; }
          .bap-spin      { animation: none; border-top-color: ${C.fog}; }
          .bap-tip-text  { transition: none; }
          .bap-press     { transition: none; }
          .bap-press:active { transform: none; }
          .bap-nav-pill  { transition: none; }
          .bap-nav-icon  { transition: none; }
          .bap-nav-icon.lifted { transform: none; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!SHEET_ID || !cohortToken) return;
    // Skip the immediate post-auth fetch — handleAuth already
    // primed setData/setStatus/cache from the gate's probe.
    if (justAuthed.current) {
      justAuthed.current = false;
      return;
    }
    fetchAllData({ token: cohortToken })
      .then((d) => {
        setData(d);
        setStatus("live");
        saveCache(d);
      })
      .catch((err) => {
        if (err && err.name === "AuthError") {
          // Token is no longer valid (cohort rotation, manual revoke).
          // Clear it AND the cached user so a rotated cohort code
          // resets both gates in lockstep — otherwise the student
          // would re-enter the cohort code and skip straight to a
          // possibly-stale identity from a previous cohort. Also
          // drop the prompts cache for the same reason.
          clearCohortToken();
          setCohortToken("");
          clearUser();
          setCurrentUser(null);
          clearPromptsCache();
          setPrompts([]);
          setSelectedPrompt(null);
          return;
        }
        console.error("Sheet fetch failed:", err);
        // If we were already showing cached data, keep it on screen.
        // Otherwise drop to the hardcoded defaults.
        setStatus((prev) => (prev === "refreshing" ? "cached" : "fallback"));
      });
  }, [cohortToken]);

  // Called by <PasscodeGate> on successful submit. The gate's probe
  // already fetched a full data payload as proof the token works, so
  // we prime data/status/cache from that and short-circuit the
  // useEffect's would-be redundant re-fetch via the justAuthed ref.
  const handleAuth = useCallback((token, primedData) => {
    justAuthed.current = true;
    saveCohortToken(token);
    setData(primedData);
    setStatus("live");
    saveCache(primedData);
    setCohortToken(token);
  }, []);

  // Called by <UserGate> on successful identification. Stash the
  // curated user record and dismount the gate. The birthday is
  // passed through alongside the user so it can ride in the
  // envelope — the prompts/submit endpoints re-validate identity
  // on every call (cwid + birthday), so birthday needs to live
  // on-device too. No data priming needed here — the cohort gate
  // already fetched and primed the full content payload, so the
  // main UI renders immediately with the cached data alongside
  // the freshly known identity. No justAuthed ref needed for the
  // same reason.
  const handleUserAuth = useCallback((user, birthday) => {
    const augmented = { ...user, birthday: birthday || "" };
    saveUser(augmented);
    setCurrentUser(augmented);
  }, []);

  // Called by <UserGate> when its identify call returns AuthError —
  // i.e., the cohort token was rotated between the cohort gate
  // succeeding and the user gate submitting (rare, but possible).
  // Wipe the cohort token so the App falls back to <PasscodeGate>
  // on the next render. Do NOT touch `currentUser`: there isn't
  // one yet (the user gate is what was being shown), and a stale
  // cached user from a prior session was already cleared by the
  // data-fetch AuthError handler that runs in parallel.
  const handleCohortReset = useCallback(() => {
    clearCohortToken();
    setCohortToken("");
  }, []);

  // Called by <ProfileModal>'s sign-out button. Clears the user
  // record but leaves the cohort token in place — the student is
  // still in the cohort, just identifying as nobody on this device
  // until they enter CWID + birthday again. Next render of <App>
  // sees cohortToken set + currentUser empty, falls through to
  // <UserGate>. Profile (enrolledClasses, filterEnabled) is left
  // untouched: signing out and back in shouldn't reset what
  // courses the student ticked.
  const handleSignOut = useCallback(() => {
    clearUser();
    setCurrentUser(null);
    // Drop the prompts cache so the next user signing in on this
    // device doesn't see the previous user's pending forms in the
    // brief window before fetchPrompts repopulates state.
    clearPromptsCache();
    setPrompts([]);
    setSelectedPrompt(null);
  }, []);

  // Manual refresh path used by the Today pull-to-refresh gesture.
  // Calls fetchAllData with bust=true so the Apps Script's 1-hour
  // CacheService entry is bypassed and the spreadsheet is re-read on
  // this fetch. Returns a promise so the caller can await it and
  // keep its refresh indicator visible until the round trip lands.
  // Status flips to "refreshing" while in flight so the header pill
  // shows the same state as a normal background refresh.
  const refreshAllData = useCallback(async () => {
    if (!SHEET_ID || !cohortToken) return;
    setStatus((prev) => (prev === "live" || prev === "cached" || prev === "fallback") ? "refreshing" : prev);
    try {
      const d = await fetchAllData({ token: cohortToken, bust: true });
      setData(d);
      setStatus("live");
      saveCache(d);
    } catch (err) {
      if (err && err.name === "AuthError") {
        // Match the data-fetch AuthError handler: cohort token
        // rotation should reset both gates, not just the cohort one.
        // Prompts cache too — see the data-fetch handler comment.
        clearCohortToken();
        setCohortToken("");
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setSelectedPrompt(null);
        return;
      }
      console.error("Manual refresh failed:", err);
      setStatus((prev) => (prev === "refreshing" ? "cached" : "fallback"));
    }
  }, [cohortToken]);

  // Background prompts fetch. Fires once both gates are clear, and
  // again whenever the user changes (sign out + new sign in on the
  // same device). The lazy-init in useState already primed prompts
  // from cache, so this just refreshes silently — no loading state
  // surfaced to the UI. AuthError clears both credentials in lockstep
  // (matches the data-fetch handler); NoMatchError clears just the
  // user (the row was deleted from the Roster, e.g. after withdraw).
  useEffect(() => {
    if (!SHEET_ID) return;
    if (!cohortToken || !currentUser || !currentUser.cwid || !currentUser.birthday) return;
    let cancelled = false;
    fetchPrompts({
      token: cohortToken,
      cwid: currentUser.cwid,
      birthday: currentUser.birthday,
    })
      .then((list) => {
        if (cancelled) return;
        setPrompts(list);
        savePromptsCache(currentUser.cwid, list);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err && err.name === "AuthError") {
          clearCohortToken();
          setCohortToken("");
          clearUser();
          setCurrentUser(null);
          clearPromptsCache();
          setPrompts([]);
          setSelectedPrompt(null);
          return;
        }
        if (err && err.name === "NoMatchError") {
          // The student's row was removed from the Roster (or
          // program_status changed away from active). Clear the
          // stored user so they hit the user gate; cohort token
          // stays intact.
          clearUser();
          setCurrentUser(null);
          clearPromptsCache();
          setPrompts([]);
          setSelectedPrompt(null);
          return;
        }
        // Network failures, transient script errors, etc. — keep
        // whatever is in state (the cache, or []) and try again on
        // the next mount. No user-visible error: prompts are
        // best-effort, the rest of the app keeps working.
        console.warn("Prompts fetch failed:", err);
      });
    return () => { cancelled = true; };
  }, [cohortToken, currentUser && currentUser.cwid, currentUser && currentUser.birthday]);

  // Submit one prompt's field values back to the auth script. On
  // success, the script returns the refreshed prompt object (with
  // the updated responses + submitted_at); we splice it into local
  // state and rewrite the cache so the surfaces re-render with the
  // new values. Throws on failure so <PromptForm> can branch on
  // SubmitError.code (validation_failed, prompt_inactive, etc.) to
  // show a useful inline message. AuthError / NoMatchError follow
  // the same lockstep-clear pattern as the other auth flows.
  const handleSubmitPrompt = useCallback(async ({ promptId, fields }) => {
    if (!cohortToken || !currentUser || !currentUser.cwid || !currentUser.birthday) {
      throw new AuthError("missing identity");
    }
    try {
      const refreshed = await submitResponse({
        token: cohortToken,
        cwid: currentUser.cwid,
        birthday: currentUser.birthday,
        prompt_id: promptId,
        fields,
      });
      setPrompts((prev) => {
        const next = (prev || []).map((p) => p.prompt_id === refreshed.prompt_id ? refreshed : p);
        // If the prompt wasn't in the previous list (rare — e.g. the
        // form was opened from a cached snapshot that the server has
        // since dropped), append it so the surfaces still reflect
        // the just-saved state.
        if (!next.some((p) => p.prompt_id === refreshed.prompt_id)) next.push(refreshed);
        savePromptsCache(currentUser.cwid, next);
        return next;
      });
    } catch (err) {
      if (err && err.name === "AuthError") {
        clearCohortToken();
        setCohortToken("");
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setSelectedPrompt(null);
      } else if (err && err.name === "NoMatchError") {
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setSelectedPrompt(null);
      }
      throw err;
    }
  }, [cohortToken, currentUser]);

  // Position the bottom-nav pill under the active tab. Re-runs on tab
  // change and on window resize so the pill stays anchored when the
  // viewport changes width. Uses requestAnimationFrame to wait for
  // layout to settle (especially on first mount before fonts paint).
  useEffect(() => {
    function positionPill() {
      if (!navRef.current) return;
      const activeBtn = navBtnRefs.current[tab];
      if (!activeBtn) return;
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const pillWidth = 44;
      const x = (btnRect.left - navRect.left) + (btnRect.width - pillWidth) / 2;
      const t = TABS.find((t) => t.key === tab);
      setPillTransform({ x, color: t ? t.color : C.bapBlue });
    }
    requestAnimationFrame(positionPill);
    window.addEventListener("resize", positionPill);
    return () => window.removeEventListener("resize", positionPill);
  }, [tab]);

  const statusLabel = status === "live" ? "Synced"
    : status === "refreshing" ? "Refreshing..."
    : status === "loading" ? "Loading..."
    : status === "cached" ? "Saved version (offline)"
    : status === "fallback" ? "Using saved data (sheet unavailable)"
    : "Preview mode";

  // Treat "live" and "refreshing" as the healthy/synced visual state
  const isHealthy = status === "live" || status === "refreshing";

  // Auth gate. Three cases, in order:
  //   1. No SHEET_ID configured → preview mode, skip both gates.
  //   2. SHEET_ID set but no cohort token → <PasscodeGate>. Once
  //      the cohort code is entered, the gate's probe fetch primes
  //      content data into state via handleAuth.
  //   3. SHEET_ID set, cohort token present, but no current user →
  //      <UserGate>. The student enters CWID + birthday; the auth
  //      script (separate from the content script, see Roster
  //      docs) returns the curated user record on match, which is
  //      stashed via handleUserAuth.
  // Once both gates clear (or the app is in preview mode), the
  // main UI renders below.
  if (SHEET_ID && !cohortToken) {
    return <PasscodeGate onAuth={handleAuth} />;
  }
  if (SHEET_ID && cohortToken && !currentUser) {
    return (
      <UserGate
        cohortToken={cohortToken}
        onAuth={handleUserAuth}
        onCohortReset={handleCohortReset}
      />
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.parchment, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", background: `linear-gradient(135deg, ${C.pepBlue} 0%, ${C.ocean} 100%)`, color: C.white, position: "relative", overflow: "hidden" }}>
        <SouthernCrossDecoration />
        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Open settings"
          className="bap-press"
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 5,
            width: 36, height: 36, borderRadius: 18,
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0,
          }}
        >
          <GearIcon size={18} color={C.white} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={LOGO_URI} alt="Buenos Aires Program" style={{
            width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.bapBlue, marginBottom: 2 }}>
              Pepperdine University
            </div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.1 }}>
              Buenos Aires Program
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.fog }}>{data.semester}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "2px 8px", borderRadius: 10,
                background: isHealthy ? "rgba(100,181,246,0.25)" : "rgba(255,255,255,0.15)",
                color: isHealthy ? "#E3F2FD" : "rgba(255,255,255,0.6)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                {isHealthy && <span className="bap-pulse-dot" aria-hidden="true" />}
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 16px 100px", overflowY: "auto", overscrollBehaviorY: "contain" }}>
        {status === "loading" ? (
          <LoadingScreen tips={data.tips} />
        ) : (
          <>
            {tab !== "today" && <SectionTitle tabKey={tab} />}
            {tab === "today" && <TodayView data={data} onJumpToTab={setTab} profile={profile} currentUser={currentUser} onRefreshData={refreshAllData} prompts={prompts} onOpenPrompt={handleOpenPrompt} />}
            {tab === "schedule" && <ScheduleView data={data} profile={profile} onOpenSettings={() => setProfileOpen(true)} />}
            {tab === "calendar" && <CalendarView data={data} />}
            {tab === "local" && <LocalView data={data} />}
            {tab === "faq" && <FaqView data={data} />}
            {tab === "contacts" && <ContactsView data={data} />}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div ref={navRef} style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: C.white,
        borderTop: `1px solid ${C.fog}`, display: "flex", justifyContent: "space-around",
        padding: "8px 0 16px", zIndex: 100,
      }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const color = active ? t.color : C.stone;
          return (
            <button
              key={t.key}
              ref={(el) => { navBtnRefs.current[t.key] = el; }}
              onClick={() => setTab(t.key)}
              className="bap-press"
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "4px 8px", flex: 1,
              }}
            >
              <span className={`bap-nav-icon${active ? " lifted" : ""}`}>
                {t.icon(color)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400,
                color, fontFamily: "'Roboto', sans-serif",
                transition: "color 0.2s ease-out",
              }}>{t.label}</span>
            </button>
          );
        })}
        <span
          className="bap-nav-pill"
          aria-hidden="true"
          style={{
            transform: `translateX(${pillTransform.x}px)`,
            background: pillTransform.color,
          }}
        />
      </div>

      {/* Profile / settings modal */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onChange={updateProfile}
        classes={data.classes}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        prompts={prompts}
        onOpenPrompt={handleOpenPrompt}
      />

      {/* Prompts form bottom sheet. Rendered at App level (rather
          than inside Today or ProfileModal) so it shares one state
          across both surfaces and stacks cleanly above either.
          When opened from inside ProfileModal, the modal stays open
          beneath the sheet — closing the sheet returns to the
          settings page. */}
      <PromptForm
        open={!!selectedPrompt}
        onClose={handleClosePrompt}
        prompt={selectedPrompt}
        onSubmit={handleSubmitPrompt}
      />
    </div>
  );
}
