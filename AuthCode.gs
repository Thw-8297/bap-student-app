// BAP App — Roster auth + prompts/responses script
// =================================================
//
// Deployed as a Web App bound to the "BAP App Roster" spreadsheet
// (separate from the content spreadsheet by design — physical
// permission isolation, see project knowledge "Per-user
// identification"). Validates a per-user identity check against
// the Roster tab; also serves prompt definitions and accepts
// per-student submissions back into the spreadsheet.
//
// Auth (two layers):
//   - Cohort token: every request must carry token=<value>
//     matching the COHORT_TOKEN entry in Script Properties. Same
//     value as the content script's COHORT_TOKEN; rotate both
//     together each cohort.
//   - Per-user credentials: cwid=<value>&birthday=<value> matched
//     against the Roster tab. Returns a curated user record on
//     match; { error: "no_match" } otherwise.
//
// Endpoints:
//   GET ?action=identify&token=...&cwid=...&birthday=...
//     → { user: { cwid, first_name, last_name, ... } }      [ok]
//
//   GET ?action=prompts&token=...&cwid=...&birthday=...
//     → { prompts: [ { prompt_id, title_es, title_en, fields:[...],
//                     responses:{field_id:value,...}, readonly,
//                     lock_after_submit, event_date, ... }, ... ] }
//     Returns prompts the user is eligible to see — filtered by
//     audience (all / role / cwid-list). A prompt is visible if it
//     is either accepting submissions (inside [start_date, end_date])
//     OR meets a post-close visibility rule (profile-surface with a
//     stored response, or event_date === today with a stored
//     response). Already-submitted responses are pre-filled. The
//     `readonly` flag is true when the prompt is past its submission
//     window or when lock_after_submit fired on a prior submission.
//
//   POST  (Content-Type: text/plain;charset=utf-8, JSON body)
//     { action: "submit", token, cwid, birthday,
//       prompt_id, fields: { field_id: value, ... } }
//     → { prompt: { ... refreshed prompt with responses filled in } }
//     Validates the submission against the prompt's field schema,
//     then upserts rows in the Responses tab keyed on
//     (cwid, prompt_id, field_id). POST is used (a) because multi-
//     field payloads are awkward in URL params and (b) because
//     write actions belong on POST. text/plain content-type avoids
//     the CORS preflight that application/json would trigger
//     against an Apps Script Web App.
//
//   Common error responses (all return JSON 200 — Apps Script
//   doGet/doPost can't set status codes):
//     { error: "unauthorized" }       [bad cohort token]
//     { error: "bad_request" }        [missing/unparseable params]
//     { error: "no_match" }           [cwid not found, birthday
//                                      mismatch, or program_status
//                                      not active]
//     { error: "not_found" }          [prompt_id doesn't exist]
//     { error: "audience_mismatch" }  [user not in prompt audience]
//     { error: "prompt_inactive" }    [outside active window]
//     { error: "already_submitted" }  [prompt is lock_after_submit
//                                      and the user has a prior row]
//     { error: "validation_failed",
//       details: "missing_field:..." | "bad_value:..." }
//     { error: "lock_failed" }        [couldn't acquire write lock
//                                      within timeout]
//
// Birthday handling:
//   The roster's `birthday` column accepts MM-DD, M-D, or full
//   YYYY-MM-DD (year stripped on parse). The front end sends MM-DD
//   from the two-dropdown gate. Both sides are canonicalized to
//   MM-DD before comparison via parseBirthdayMD().
//
// No response caching:
//   identify is called ~once per device per cohort, and prompts
//   needs to reflect Director edits immediately, so neither uses
//   CacheService. Direct sheet reads are negligible at cohort
//   scale.
//
// Re-deploy after editing this file:
//   Apps Script editor → Deploy → Manage deployments → pencil icon
//   → Version: New version → Deploy. The URL stays the same.

const ROSTER_TAB_NAME = "Roster";
const PROMPTS_TAB_NAME = "Prompts";
const PROMPT_FIELDS_TAB_NAME = "PromptFields";
const RESPONSES_TAB_NAME = "Responses";
const PLACES_TAB_NAME = "Places";

// Source of truth for the Places tab schema. Used to auto-create the
// tab on first community submission (Stage 2) and to validate a
// human-edited / seed-migrated tab. The student app reads only
// approved rows; the Director vets pending ones in-app.
const PLACES_HEADERS = [
  "place_id", "name", "category", "why", "address", "lat", "lng",
  "maps_url", "neighborhood", "hours", "link", "status",
  "submitted_by_cwid", "submitted_by_name", "show_credit", "source",
  "submitted_at", "vetted_by",
];

// Recognized Places category keys — must stay in sync with
// PLACE_CATEGORIES in App.jsx. Used by validatePlaces() only; the
// read endpoint passes any category straight through (the app falls
// back to "other" for anything it doesn't recognize).
const PLACE_CATEGORY_KEYS = [
  "cafe", "restaurant", "nightlife", "outdoors", "fitness", "study",
  "museum", "culture", "theater", "sights", "markets", "neighborhood",
];
const PLACE_STATUSES = ["pending", "approved", "rejected"];
const PLACE_SOURCES = ["seed", "community"];

// Source of truth for the Responses tab schema. Used both to
// auto-create the tab on first submit and to validate that a
// human-edited tab still has the columns we need.
const RESPONSES_HEADERS = ["submitted_at", "cwid", "prompt_id", "field_id", "value"];

// Recognized field types for PromptFields.field_type. v1 covers
// the four use cases the Director called out (t-shirt size,
// meal RSVPs, activity sign-ups, free-form comments). multi_select
// and date are intentionally deferred until a concrete need shows
// up; adding them later is just two more branches in
// validateSubmissionValues + matching app-side renderers.
const PROMPT_FIELD_TYPES = [
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
  "number",
  "boolean",
];

// Fields returned in the identify response. Birthday is
// intentionally omitted — the student already knows it; echoing
// it back is a small leak surface for nothing. If Tier-C fields
// (medical notes, passport, emergency contacts) are ever added to
// the Roster sheet, do NOT add them to this list — they belong
// to the Director-only view of the spreadsheet, not the app.
const CURATED_FIELDS = [
  "cwid",
  "first_name",
  "last_name",
  "preferred_name",
  "pronouns",
  "role",
  "email",
  "whatsapp",
  "housing_assignment",
  "tshirt_size",
  "tshirt_fit",
  "dietary_restrictions",
  "food_allergies",
  "program_status",
];

const VALID_ROLES = ["student", "staff", "faculty"];

// =========================================================
// Web App entry points
// =========================================================

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};

    const tokenError = checkCohortToken(params.token);
    if (tokenError) return tokenError;

    const action = params.action || "";
    if (action === "identify")        return handleIdentify(params);
    if (action === "prompts")         return handlePrompts(params);
    if (action === "admin_responses") return handleAdminResponses(params);
    if (action === "places")          return handlePlaces(params);
    if (action === "admin_places")    return handleAdminPlaces(params);

    return jsonResponse({ error: "bad_request" });
  } catch (err) {
    // Catch-all so a runtime exception comes back as JSON with
    // CORS headers (vs Apps Script's default HTML error page that
    // strips CORS and confuses the browser as a cross-origin
    // failure). Carries just the error message — the stack trace
    // used to be echoed back too, but that leaked function names
    // and internal logic to anyone who could trigger an error.
    // Full stack still goes to the Apps Script execution log
    // (Logger.log), which only the Director can read.
    Logger.log("doGet error: " + ((err && err.stack) || err));
    return jsonResponse({
      error: "internal_error",
      message: String((err && err.message) || err),
    });
  }
}

function doPost(e) {
  try {
    let body = {};
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    } catch (err) {
      return jsonResponse({ error: "bad_request" });
    }

    const tokenError = checkCohortToken(body.token);
    if (tokenError) return tokenError;

    const action = body.action || "";
    if (action === "submit")       return handleSubmit(body);
    if (action === "submit_place") return handleSubmitPlace(body);
    if (action === "vet_place")    return handleVetPlace(body);

    return jsonResponse({ error: "bad_request" });
  } catch (err) {
    // Mirrors doGet's catch — stack stays in the Apps Script
    // execution log (Director-only) instead of riding back in the
    // response body.
    Logger.log("doPost error: " + ((err && err.stack) || err));
    return jsonResponse({
      error: "internal_error",
      message: String((err && err.message) || err),
    });
  }
}

// Returns null when the cohort token matches; otherwise returns the
// jsonResponse to send back. Same gate guards both doGet and doPost.
function checkCohortToken(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty("COHORT_TOKEN");
  if (!expected || (provided || "") !== expected) {
    return jsonResponse({ error: "unauthorized" });
  }
  return null;
}

// =========================================================
// identify
// =========================================================

// Validate the per-user credentials and return the curated row.
// Errors are intentionally generic ("no_match") and don't
// distinguish "cwid not found" from "cwid found but birthday
// wrong" — that distinction would help an attacker enumerate
// CWIDs.
function handleIdentify(params) {
  const result = verifyUserIdentity(params);
  if (result.error) return jsonResponse({ error: result.error });
  return jsonResponse({ user: curateUserRow(result.user) });
}

// Shared identity-check used by all three endpoints. Returns either
// { user: <raw roster row> } on success or { error: "<code>" } on
// failure. The raw row is what callers like userMatchesAudience()
// need; identify-the-endpoint additionally curates the row before
// emitting it to the client.
function verifyUserIdentity(params) {
  const cwid = normalizeCwid(params.cwid || "");
  const birthdayRaw = String(params.birthday || "").trim();

  if (!cwid || !birthdayRaw) return { error: "bad_request" };

  const expectedBirthday = parseBirthdayMD(birthdayRaw);
  if (!expectedBirthday) return { error: "bad_request" };

  const row = findRosterRow(cwid);
  if (!row) return { error: "no_match" };

  const rowBirthday = parseBirthdayMD(String(row.birthday || ""));
  if (!rowBirthday || rowBirthday !== expectedBirthday) return { error: "no_match" };

  // Treat blank program_status as active. Reject non-active rows
  // so a withdrawn or completed student can't sign in mid-cohort.
  const status = String(row.program_status || "active").trim().toLowerCase();
  if (status !== "active") return { error: "no_match" };

  return { user: row };
}

// Read the Roster tab and find the row whose cwid (trimmed)
// matches. Returns the matched row as a header-keyed object, or
// null if not found. Returns null if multiple rows match —
// defensive: a duplicate CWID is a roster-maintenance bug, and
// silently picking one arbitrarily would mask the bug. Run
// validateRoster() from the editor to find duplicates.
function findRosterRow(cwid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ROSTER_TAB_NAME);
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(function (h) {
    return String(h == null ? "" : h).trim();
  });
  const cwidColIdx = headers.indexOf("cwid");
  if (cwidColIdx < 0) return null;

  const tz = resolveTimeZone(ss);

  let match = null;
  let matchCount = 0;
  for (let r = 1; r < values.length; r++) {
    const rowCwid = normalizeCwid(values[r][cwidColIdx]);
    if (!rowCwid) continue;
    if (rowCwid === cwid) {
      matchCount++;
      if (matchCount > 1) return null; // duplicate CWID; refuse to disambiguate
      match = rowToObject(values[r], headers, tz);
    }
  }
  return match;
}

// =========================================================
// prompts
// =========================================================

function handlePrompts(params) {
  const result = verifyUserIdentity(params);
  if (result.error) return jsonResponse({ error: result.error });
  const prompts = loadPromptsForUser(result.user);
  return jsonResponse({ prompts: prompts });
}

// Read Prompts + PromptFields + Responses, filter to prompts the
// user can see, attach this user's existing responses, and return
// the joined list. The shape mirrors what the app's PromptForm
// component consumes; do not change it without updating the
// front-end side.
function loadPromptsForUser(user) {
  const promptRows = readTabAsObjects(PROMPTS_TAB_NAME);
  const fieldRows = readTabAsObjects(PROMPT_FIELDS_TAB_NAME);
  const responseRows = readTabAsObjects(RESPONSES_TAB_NAME);

  const today = todayInSpreadsheetTz();
  const userCwid = normalizeCwid(user.cwid);

  // Group fields by prompt_id, sorted by field_order.
  const fieldsByPrompt = {};
  for (let i = 0; i < fieldRows.length; i++) {
    const f = fieldRows[i];
    const pid = String(f.prompt_id || "").trim();
    if (!pid) continue;
    if (!fieldsByPrompt[pid]) fieldsByPrompt[pid] = [];
    fieldsByPrompt[pid].push(parseFieldRow(f));
  }
  for (const pid in fieldsByPrompt) {
    fieldsByPrompt[pid].sort(function (a, b) {
      return a.field_order - b.field_order;
    });
  }

  // Group this user's responses by prompt_id → field_id, and track
  // the most recent submitted_at per prompt.
  const responsesByPrompt = {};
  const submittedAtByPrompt = {};
  for (let i = 0; i < responseRows.length; i++) {
    const r = responseRows[i];
    if (normalizeCwid(r.cwid) !== userCwid) continue;
    const pid = String(r.prompt_id || "").trim();
    const fid = String(r.field_id || "").trim();
    if (!pid || !fid) continue;
    if (!responsesByPrompt[pid]) responsesByPrompt[pid] = {};
    responsesByPrompt[pid][fid] = String(r.value == null ? "" : r.value);
    const ts = String(r.submitted_at || "").trim();
    if (ts && (!submittedAtByPrompt[pid] || ts > submittedAtByPrompt[pid])) {
      submittedAtByPrompt[pid] = ts;
    }
  }

  // Build the response, filtering as we go.
  const out = [];
  for (let i = 0; i < promptRows.length; i++) {
    const p = promptRows[i];
    const pid = String(p.prompt_id || "").trim();
    if (!pid) continue;
    if (!userMatchesAudience(user, p)) continue;
    const fields = fieldsByPrompt[pid] || [];
    if (fields.length === 0) continue; // a prompt with no fields is a sheet bug; skip it
    const userResponses = responsesByPrompt[pid] || {};
    const hasResponses = Object.keys(userResponses).length > 0;
    if (!promptIsVisible(p, today, hasResponses)) continue;
    out.push(buildPromptResponse(
      p,
      fields,
      userResponses,
      submittedAtByPrompt[pid] || "",
      promptIsReadonly(p, today, hasResponses)
    ));
  }

  return out;
}

// Look up a single prompt by id. Returns { prompt, fields } where
// `prompt` is the raw row and `fields` is the parsed-and-sorted
// field array. Used by handleSubmit. Returns null if the prompt
// doesn't exist.
function findPromptById(promptId) {
  const promptRows = readTabAsObjects(PROMPTS_TAB_NAME);
  let prompt = null;
  for (let i = 0; i < promptRows.length; i++) {
    if (String(promptRows[i].prompt_id || "").trim() === promptId) {
      prompt = promptRows[i];
      break;
    }
  }
  if (!prompt) return null;

  const fieldRows = readTabAsObjects(PROMPT_FIELDS_TAB_NAME);
  const fields = [];
  for (let i = 0; i < fieldRows.length; i++) {
    if (String(fieldRows[i].prompt_id || "").trim() === promptId) {
      fields.push(parseFieldRow(fieldRows[i]));
    }
  }
  fields.sort(function (a, b) { return a.field_order - b.field_order; });

  return { prompt: prompt, fields: fields };
}

function parseFieldRow(f) {
  const order = parseFloat(f.field_order);
  return {
    field_id: String(f.field_id || "").trim(),
    field_order: isNaN(order) ? 0 : order,
    label_es: String(f.label_es || ""),
    label_en: String(f.label_en || ""),
    field_type: String(f.field_type || "short_text").trim().toLowerCase(),
    options: parseSemicolonList(f.options),
    option_labels_es: parseSemicolonList(f.option_labels_es),
    option_labels_en: parseSemicolonList(f.option_labels_en),
    required: parseBoolean(f.required),
    placeholder_es: String(f.placeholder_es || ""),
    placeholder_en: String(f.placeholder_en || ""),
  };
}

// Standardize the wire shape so loadPromptsForUser and handleSubmit
// emit identical-looking prompt objects. Keep the keys stable —
// renaming any of these means a coordinated front-end change.
//
// `readonly` is computed by the caller (loadPromptsForUser /
// handleSubmit) because it depends on the date check AND on whether
// the user has actually submitted yet (for the lock_after_submit
// case). It's wire-only — not stored in the sheet.
function buildPromptResponse(prompt, fields, responses, submittedAt, readonly) {
  return {
    prompt_id: String(prompt.prompt_id || "").trim(),
    title_es: String(prompt.title_es || ""),
    title_en: String(prompt.title_en || ""),
    description_es: String(prompt.description_es || ""),
    description_en: String(prompt.description_en || ""),
    category: String(prompt.category || "").trim().toLowerCase(),
    surface: String(prompt.surface || "today").trim().toLowerCase(),
    start_date: String(prompt.start_date || "").trim(),
    end_date: String(prompt.end_date || "").trim(),
    end_time: String(prompt.end_time || "").trim(),
    event_date: String(prompt.event_date || "").trim(),
    lock_after_submit: parseBoolean(prompt.lock_after_submit),
    fields: fields,
    responses: responses || {},
    submitted_at: submittedAt || "",
    readonly: !!readonly,
  };
}

// audience cell accepts:
//   "all" (or blank)             → everyone in the cohort
//   "student" | "staff" | "faculty" (or comma-list of these)
//   one or more 9-digit CWIDs    (comma-separated)
//   any mix of role tokens and CWIDs
// Tokens are case-insensitive and lenient on whitespace.
function userMatchesAudience(user, prompt) {
  const raw = String(prompt.audience || "all").trim().toLowerCase();
  if (!raw || raw === "all") return true;

  const tokens = raw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  const userRole = String(user.role || "").trim().toLowerCase();
  const userCwid = normalizeCwid(user.cwid);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "all") return true;
    if (VALID_ROLES.indexOf(t) >= 0) {
      if (t === userRole) return true;
    } else {
      // Treat anything else as a CWID candidate.
      if (normalizeCwid(t) === userCwid) return true;
    }
  }
  return false;
}

// Inclusive on both ends. Blank dates mean "no gate on that side";
// both blank means "always accepting" (used by evergreen profile
// prompts like t-shirt size). Optional end_time (HH:mm) tightens
// the close on end_date down to a specific time of day — useful for
// "RSVP closes at 8 PM" style cutoffs. Without end_time the prompt
// stays accepting through end-of-day on end_date.
//
// Submission gate. Used by handleSubmit (rejects writes past the
// window) and by loadPromptsForUser (to decide whether the prompt
// should render in read-only mode).
function promptAcceptsSubmissions(prompt, todayStr) {
  const start = String(prompt.start_date || "").trim();
  const end = String(prompt.end_date || "").trim();
  const endTime = String(prompt.end_time || "").trim();
  if (!start && !end) return true;
  if (start && todayStr < start) return false;
  if (end && todayStr > end) return false;
  // We're inside [start, end] inclusive. If end_time is set AND
  // today === end_date, do an additional time-of-day check so the
  // prompt closes at that exact moment rather than end-of-day.
  if (end && endTime && todayStr === end) {
    const nowHm = Utilities.formatDate(new Date(), resolveTimeZone(), "HH:mm");
    if (nowHm > endTime) return false;
  }
  return true;
}

// Visibility gate (broader than the submission gate). A prompt is
// visible if:
//   (a) it is currently accepting submissions, OR
//   (b) it is a profile-surface prompt with at least one stored
//       response (so locked answers like t-shirt size remain on
//       Profile permanently after the submission window closes), OR
//   (c) its event_date is today and the user has at least one stored
//       response (so a locked meal selection resurfaces on Today on
//       the day of the meal).
// hasResponses is a boolean — the caller has already grouped this
// user's responses, so passing the flag avoids re-walking the table.
function promptIsVisible(prompt, todayStr, hasResponses) {
  if (promptAcceptsSubmissions(prompt, todayStr)) return true;
  if (!hasResponses) return false;

  const surface = String(prompt.surface || "today").trim().toLowerCase();
  if (surface === "profile" || surface === "both") return true;

  const eventDate = String(prompt.event_date || "").trim();
  if (eventDate && eventDate === todayStr) return true;

  return false;
}

// A prompt is read-only when (a) it's past its submission window
// (visible-but-not-accepting) or (b) lock_after_submit is set AND
// the user has already submitted. Caller passes hasResponses so we
// don't walk the response table twice.
function promptIsReadonly(prompt, todayStr, hasResponses) {
  if (!promptAcceptsSubmissions(prompt, todayStr)) return true;
  if (parseBoolean(prompt.lock_after_submit) && hasResponses) return true;
  return false;
}

function todayInSpreadsheetTz() {
  return Utilities.formatDate(new Date(), resolveTimeZone(), "yyyy-MM-dd");
}

// Spreadsheets don't always have a timezone set (a freshly created
// "BAP App Roster" file can have ss.getSpreadsheetTimeZone() === null,
// which makes Utilities.formatDate throw "Invalid argument:
// timeZone"). Fall back through the script's own timezone, then to
// a hardcoded BA default — the program is in Buenos Aires by
// definition so this is always the correct fallback.
function resolveTimeZone(ssMaybe) {
  const ss = ssMaybe || SpreadsheetApp.getActiveSpreadsheet();
  let tz = "";
  try { tz = (ss && ss.getSpreadsheetTimeZone()) || ""; } catch (e) { tz = ""; }
  if (tz) return tz;
  try { tz = Session.getScriptTimeZone() || ""; } catch (e) { tz = ""; }
  if (tz) return tz;
  return "America/Argentina/Buenos_Aires";
}

// =========================================================
// admin_responses
// =========================================================
//
// Director-only endpoint for reading every prompt's submissions
// across the cohort. Returns:
//   {
//     prompts: [ { prompt_id, title_es/en, description_es/en, audience,
//                  start_date, end_date, end_time, category, surface,
//                  is_active, fields: [...], expected_cwids: [...],
//                  responses: [ { cwid, field_id, value, submitted_at } ] } ],
//     roster:  { cwid: { preferred_name, first_name, last_name, role } }
//   }
//
// Gated on role: only users whose Roster row is `staff` can hit
// this endpoint; `faculty`, `student`, or anything else gets
// `forbidden`. Faculty are visiting professors who teach in BA
// and don't need to read other students' RSVP / dietary / size
// submissions, so this is a strict staff-only gate. The cohort
// token + CWID + birthday check is the same triple the rest of
// the user-auth surface uses, so a stolen cohort token alone
// can't read responses — the requester also has to be a Director-
// level account on the roster.
//
// Returns ALL prompts (active and expired) so the Director can look at
// historical submissions inside the app instead of opening the
// spreadsheet. expected_cwids carries the active-roster CWIDs that
// match the prompt's audience expression, so the front end can render
// "X of Y responded" and a non-responder list without reimplementing
// the audience-matching logic. roster carries the curated subset
// (preferred_name + first_name + last_name + role) used to render
// submitter names; the keys are CWIDs to make front-end lookup O(1).
function handleAdminResponses(params) {
  const idResult = verifyUserIdentity(params);
  if (idResult.error) return jsonResponse({ error: idResult.error });

  const user = idResult.user;
  const role = String(user.role || "").trim().toLowerCase();
  if (role !== "staff") {
    return jsonResponse({ error: "forbidden" });
  }

  const today = todayInSpreadsheetTz();
  const promptRows = readTabAsObjects(PROMPTS_TAB_NAME);
  const fieldRows = readTabAsObjects(PROMPT_FIELDS_TAB_NAME);
  const responseRows = readTabAsObjects(RESPONSES_TAB_NAME);
  const rosterRows = readTabAsObjects(ROSTER_TAB_NAME);

  // Build the active roster (program_status = active or blank).
  // Withdrawn / completed students don't appear in expected_cwids
  // so the Director's "missing responses" view doesn't nag about
  // people who can't actually respond anymore.
  const activeRoster = [];
  const rosterByCwid = {};
  for (let i = 0; i < rosterRows.length; i++) {
    const r = rosterRows[i];
    const status = String(r.program_status || "active").trim().toLowerCase();
    if (status && status !== "active") continue;
    const cwid = normalizeCwid(r.cwid);
    if (!cwid) continue;
    const curated = {
      cwid: cwid,
      preferred_name: String(r.preferred_name || ""),
      first_name: String(r.first_name || ""),
      last_name: String(r.last_name || ""),
      role: String(r.role || "").trim().toLowerCase(),
    };
    activeRoster.push(curated);
    rosterByCwid[cwid] = curated;
  }

  // Group fields by prompt_id, sorted by field_order. Same logic as
  // loadPromptsForUser — split out into a local because we don't
  // want to call that function (it would re-read the tabs and apply
  // the student audience filter).
  const fieldsByPrompt = {};
  for (let i = 0; i < fieldRows.length; i++) {
    const f = fieldRows[i];
    const pid = String(f.prompt_id || "").trim();
    if (!pid) continue;
    if (!fieldsByPrompt[pid]) fieldsByPrompt[pid] = [];
    fieldsByPrompt[pid].push(parseFieldRow(f));
  }
  for (const pid in fieldsByPrompt) {
    fieldsByPrompt[pid].sort(function (a, b) {
      return a.field_order - b.field_order;
    });
  }

  // Group responses by prompt_id. Unlike loadPromptsForUser (which
  // collapses to a per-field { fid: value } map for one user), we
  // keep the full row list so the front end can render per-user
  // submissions and per-option tallies.
  const responsesByPrompt = {};
  for (let i = 0; i < responseRows.length; i++) {
    const r = responseRows[i];
    const pid = String(r.prompt_id || "").trim();
    const fid = String(r.field_id || "").trim();
    if (!pid || !fid) continue;
    if (!responsesByPrompt[pid]) responsesByPrompt[pid] = [];
    responsesByPrompt[pid].push({
      cwid: normalizeCwid(r.cwid),
      field_id: fid,
      value: String(r.value == null ? "" : r.value),
      submitted_at: String(r.submitted_at || ""),
    });
  }

  // Build the prompts array — every prompt with a prompt_id, no
  // audience or active-window filter. expected_cwids is computed
  // by walking the active roster against the prompt's audience.
  const out = [];
  for (let i = 0; i < promptRows.length; i++) {
    const p = promptRows[i];
    const pid = String(p.prompt_id || "").trim();
    if (!pid) continue;
    const fields = fieldsByPrompt[pid] || [];

    const expectedCwids = [];
    for (let j = 0; j < activeRoster.length; j++) {
      if (userMatchesAudience(activeRoster[j], p)) {
        expectedCwids.push(activeRoster[j].cwid);
      }
    }

    out.push({
      prompt_id: pid,
      title_es: String(p.title_es || ""),
      title_en: String(p.title_en || ""),
      description_es: String(p.description_es || ""),
      description_en: String(p.description_en || ""),
      category: String(p.category || "").trim().toLowerCase(),
      surface: String(p.surface || "today").trim().toLowerCase(),
      audience: String(p.audience || "all"),
      start_date: String(p.start_date || "").trim(),
      end_date: String(p.end_date || "").trim(),
      end_time: String(p.end_time || "").trim(),
      event_date: String(p.event_date || "").trim(),
      lock_after_submit: parseBoolean(p.lock_after_submit),
      is_active: promptAcceptsSubmissions(p, today),
      fields: fields,
      expected_cwids: expectedCwids,
      responses: responsesByPrompt[pid] || [],
    });
  }

  return jsonResponse({
    prompts: out,
    roster: rosterByCwid,
  });
}

// =========================================================
// Places — student-contributable BA directory
// =========================================================

// Public read: returns the cohort's APPROVED places. Cohort-token
// gated only (checkCohortToken already ran in doGet) — no per-user
// identity needed to read approved public-ish content, so the Local
// tab can prime the list as soon as the cohort gate is cleared.
// Each row is curated: the submitter's CWID and the internal vetting
// columns (status, vetted_by, submitted_at) are dropped, and the
// submitter's name is included only when credit is on for that place.
function handlePlaces(params) {
  const rows = readTabAsObjects(PLACES_TAB_NAME);
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const status = String(r.status || "").trim().toLowerCase();
    if (status !== "approved") continue;
    out.push(curatePlaceRow(r));
  }
  return jsonResponse({ places: out });
}

// Project a raw Places row to the public shape the app renders.
// Credit rule (default-on): a community place shows the submitter's
// name unless show_credit is explicitly falsy; a blank show_credit is
// treated as ON. Seed rows (source !== "community") never carry a name.
function curatePlaceRow(r) {
  const source = String(r.source || "").trim().toLowerCase();
  const rawCredit = String(r.show_credit == null ? "" : r.show_credit).trim();
  const creditOn = rawCredit === "" ? true : parseBoolean(rawCredit);
  const name = (source === "community" && creditOn) ? String(r.submitted_by_name || "") : "";
  return {
    place_id: String(r.place_id || ""),
    name: String(r.name || ""),
    category: String(r.category || "").trim().toLowerCase(),
    why: String(r.why || ""),
    address: String(r.address || ""),
    lat: String(r.lat == null ? "" : r.lat),
    lng: String(r.lng == null ? "" : r.lng),
    maps_url: String(r.maps_url || ""),
    neighborhood: String(r.neighborhood || ""),
    hours: String(r.hours || ""),
    link: String(r.link || ""),
    source: source,
    submitted_by_name: name,
    show_credit: creditOn ? "TRUE" : "FALSE",
  };
}

// =========================================================
// Places — Stage 2: submit (student) + admin/vet (staff)
// =========================================================

// Student-authenticated submission. A student suggests a place via
// the fixed-schema form in the app; it lands as a pending,
// community row that a staff member later approves (handleVetPlace).
// Mirrors handleSubmit's identity gate + LockService write pattern.
function handleSubmitPlace(body) {
  const idResult = verifyUserIdentity({ cwid: body.cwid, birthday: body.birthday });
  if (idResult.error) return jsonResponse({ error: idResult.error });
  const user = idResult.user;

  // The form posts a fixed { name, category, address, maps_url, why }
  // object — NOT the dynamic prompts machinery. Reject arrays/scalars.
  const fields = body.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return jsonResponse({ error: "bad_request" });
  }

  const v = validatePlaceSubmission(fields);
  if (v.error) return jsonResponse({ error: "validation_failed", details: v.error });

  const cwid = normalizeCwid(user.cwid);
  const submitterName = String(user.preferred_name || user.first_name || "").trim();
  const placeId = "c_" + slugifyPlaceName(v.clean.name) + "_" + Utilities.getUuid().slice(0, 8);

  // LockService serializes the read-headers + append so two
  // near-simultaneous submissions can't corrupt the tab.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse({ error: "lock_failed" });
  }
  try {
    appendPlaceRow({
      place_id: placeId,
      name: v.clean.name,
      category: v.clean.category,
      why: v.clean.why,
      address: v.clean.address,
      maps_url: v.clean.maps_url,
      status: "pending",
      submitted_by_cwid: cwid,
      submitted_by_name: submitterName,
      show_credit: "",           // blank = default-on (curatePlaceRow honors this)
      source: "community",
      submitted_at: new Date().toISOString(),
      vetted_by: "",
    });
  } finally {
    lock.releaseLock();
  }

  // Confirmation-only: the app shows a "sent for review" toast and
  // does not track per-submission status (roadmap v1).
  return jsonResponse({ ok: true });
}

// Validate the fixed submission schema. Returns { clean: {...} } on
// success (trimmed/normalized) or { error: "<code>" }. A place needs
// a name, a recognized category, and at least one way to be located.
function validatePlaceSubmission(fields) {
  const name = String(fields.name == null ? "" : fields.name).trim();
  if (!name) return { error: "missing_field:name" };

  const category = String(fields.category == null ? "" : fields.category).trim().toLowerCase();
  if (!category) return { error: "missing_field:category" };
  if (PLACE_CATEGORY_KEYS.indexOf(category) < 0) return { error: "bad_value:category" };

  const address = String(fields.address == null ? "" : fields.address).trim();
  const mapsUrl = String(fields.maps_url == null ? "" : fields.maps_url).trim();
  if (!address && !mapsUrl) return { error: "missing_location" };

  const why = String(fields.why == null ? "" : fields.why).trim();
  return { clean: { name: name, category: category, address: address, maps_url: mapsUrl, why: why } };
}

// Lowercase, ASCII-ish, dash-separated slug for a readable place_id.
// Strips accents so "Café Tortoni" → "cafe-tortoni".
function slugifyPlaceName(name) {
  let s = String(name || "").toLowerCase();
  s = s.replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
       .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.slice(0, 32) || "place";
}

// Append one place row, auto-creating the Places tab (with
// PLACES_HEADERS) on first use so a fresh deploy needs no manual
// setup. Maps the value object to columns by header name, so a
// human-reordered tab still works. Caller MUST hold the script lock.
function appendPlaceRow(place) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PLACES_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PLACES_TAB_NAME);
    sheet.getRange(1, 1, 1, PLACES_HEADERS.length).setValues([PLACES_HEADERS]);
  }

  let values = sheet.getDataRange().getValues();
  let headers;
  if (values.length === 0) {
    sheet.getRange(1, 1, 1, PLACES_HEADERS.length).setValues([PLACES_HEADERS]);
    headers = PLACES_HEADERS.slice();
  } else {
    headers = values[0].map(function (h) { return String(h == null ? "" : h).trim(); });
  }

  // Append any missing canonical columns at the end so the mapping
  // below always lands somewhere valid.
  for (let i = 0; i < PLACES_HEADERS.length; i++) {
    if (headers.indexOf(PLACES_HEADERS[i]) < 0) {
      headers.push(PLACES_HEADERS[i]);
      sheet.getRange(1, headers.length).setValue(PLACES_HEADERS[i]);
    }
  }

  const rowArr = new Array(headers.length).fill("");
  for (const key in place) {
    const idx = headers.indexOf(key);
    if (idx >= 0) rowArr[idx] = place[key];
  }
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([rowArr]);
}

// Staff-only: return EVERY place row (all statuses) with the
// vetting-relevant columns the public curatePlaceRow drops, so the
// in-app Director dashboard can show the pending queue + history.
// Mirrors handleAdminResponses' identity + strict-staff gate.
function handleAdminPlaces(params) {
  const idResult = verifyUserIdentity(params);
  if (idResult.error) return jsonResponse({ error: idResult.error });

  const role = String(idResult.user.role || "").trim().toLowerCase();
  if (role !== "staff") {
    return jsonResponse({ error: "forbidden" });
  }

  const rows = readTabAsObjects(PLACES_TAB_NAME);
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!String(r.place_id || "").trim()) continue;
    out.push(curateAdminPlaceRow(r));
  }
  return jsonResponse({ places: out });
}

// Project a raw row to the admin shape (keeps submitter + vetting
// columns; coords stay strings, matching curatePlaceRow).
function curateAdminPlaceRow(r) {
  return {
    place_id: String(r.place_id || ""),
    name: String(r.name || ""),
    category: String(r.category || "").trim().toLowerCase(),
    why: String(r.why || ""),
    address: String(r.address || ""),
    lat: String(r.lat == null ? "" : r.lat),
    lng: String(r.lng == null ? "" : r.lng),
    maps_url: String(r.maps_url || ""),
    neighborhood: String(r.neighborhood || ""),
    hours: String(r.hours || ""),
    link: String(r.link || ""),
    status: String(r.status || "").trim().toLowerCase(),
    submitted_by_cwid: normalizeCwid(r.submitted_by_cwid),
    submitted_by_name: String(r.submitted_by_name || ""),
    show_credit: String(r.show_credit == null ? "" : r.show_credit),
    source: String(r.source || "").trim().toLowerCase(),
    submitted_at: String(r.submitted_at || ""),
    vetted_by: String(r.vetted_by || ""),
  };
}

// Staff-only: flip a place's status (approve/reject), optionally set
// its show_credit, and stamp vetted_by. Field tidying (name, hours,
// coords) is done in the Sheet, not here, to keep this light.
function handleVetPlace(body) {
  const idResult = verifyUserIdentity({ cwid: body.cwid, birthday: body.birthday });
  if (idResult.error) return jsonResponse({ error: idResult.error });

  const role = String(idResult.user.role || "").trim().toLowerCase();
  if (role !== "staff") {
    return jsonResponse({ error: "forbidden" });
  }

  const placeId = String(body.place_id || "").trim();
  const status = String(body.status || "").trim().toLowerCase();
  if (!placeId) return jsonResponse({ error: "bad_request" });
  if (status !== "approved" && status !== "rejected") {
    return jsonResponse({ error: "bad_request" });
  }
  // show_credit is optional; only written when the key is present.
  const hasCredit = body.show_credit != null && String(body.show_credit).trim() !== "";
  const creditVal = parseBoolean(body.show_credit) ? "TRUE" : "FALSE";
  const vettedBy = String(idResult.user.preferred_name || idResult.user.first_name || "").trim();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse({ error: "lock_failed" });
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(PLACES_TAB_NAME);
    if (!sheet) return jsonResponse({ error: "not_found" });

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return jsonResponse({ error: "not_found" });

    const headers = values[0].map(function (h) { return String(h == null ? "" : h).trim(); });
    const colIdx = {};
    for (let i = 0; i < headers.length; i++) colIdx[headers[i]] = i;
    if (colIdx.place_id == null || colIdx.status == null) {
      return jsonResponse({ error: "not_found" });
    }

    let rowNum = -1;
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][colIdx.place_id] == null ? "" : values[r][colIdx.place_id]).trim() === placeId) {
        rowNum = r + 1; // 1-indexed sheet row
        break;
      }
    }
    if (rowNum < 0) return jsonResponse({ error: "not_found" });

    sheet.getRange(rowNum, colIdx.status + 1).setValue(status);
    if (hasCredit && colIdx.show_credit != null) {
      sheet.getRange(rowNum, colIdx.show_credit + 1).setValue(creditVal);
    }
    if (colIdx.vetted_by != null) {
      sheet.getRange(rowNum, colIdx.vetted_by + 1).setValue(vettedBy);
    }
  } finally {
    lock.releaseLock();
  }

  return jsonResponse({ ok: true });
}

// =========================================================
// submit
// =========================================================

function handleSubmit(body) {
  const idResult = verifyUserIdentity({ cwid: body.cwid, birthday: body.birthday });
  if (idResult.error) return jsonResponse({ error: idResult.error });
  const user = idResult.user;

  const promptId = String(body.prompt_id || "").trim();
  if (!promptId) return jsonResponse({ error: "bad_request" });

  // Body must carry a fields object; reject arrays or scalars.
  const submitted = body.fields;
  if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) {
    return jsonResponse({ error: "bad_request" });
  }

  const def = findPromptById(promptId);
  if (!def) return jsonResponse({ error: "not_found" });

  if (!userMatchesAudience(user, def.prompt)) {
    return jsonResponse({ error: "audience_mismatch" });
  }

  const today = todayInSpreadsheetTz();
  if (!promptAcceptsSubmissions(def.prompt, today)) {
    return jsonResponse({ error: "prompt_inactive" });
  }

  const validation = validateSubmissionValues(def.fields, submitted);
  if (validation.error) {
    return jsonResponse({ error: "validation_failed", details: validation.error });
  }

  const cwid = normalizeCwid(user.cwid);

  // lock_after_submit: if the prompt is set to lock once a student
  // has submitted, and there's already at least one stored response
  // for this (cwid, prompt_id), refuse the second write. Front end
  // shouldn't expose the submit button in this case, so this is a
  // defense-in-depth check — also covers the rare race where two
  // submits land near-simultaneously.
  if (parseBoolean(def.prompt.lock_after_submit)) {
    const responseRows = readTabAsObjects(RESPONSES_TAB_NAME);
    for (let i = 0; i < responseRows.length; i++) {
      const r = responseRows[i];
      if (normalizeCwid(r.cwid) !== cwid) continue;
      if (String(r.prompt_id || "").trim() !== promptId) continue;
      return jsonResponse({ error: "already_submitted" });
    }
  }

  // LockService prevents two concurrent submissions from
  // interleaving reads/writes against the Responses tab. 10s is a
  // generous ceiling — in practice this completes in <1s.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse({ error: "lock_failed" });
  }

  let submittedAt;
  try {
    submittedAt = new Date().toISOString();
    upsertResponses(cwid, promptId, validation.normalized, submittedAt);
  } finally {
    lock.releaseLock();
  }

  // Echo back the refreshed prompt so the app can update its local
  // state without a follow-up fetch. Includes ALL field values
  // (the union of just-submitted and previously-stored), so a
  // partial submission that only updated some fields still hands
  // back the full picture. After a successful submit there's by
  // definition at least one stored response, so we pass true for
  // hasResponses when computing the readonly flag.
  const merged = mergeStoredResponses(cwid, promptId, validation.normalized);
  const refreshed = buildPromptResponse(
    def.prompt,
    def.fields,
    merged,
    submittedAt,
    promptIsReadonly(def.prompt, today, true)
  );
  return jsonResponse({ prompt: refreshed });
}

// Validate every submitted field against its declared type and
// required flag. Returns { normalized: { field_id: stringValue } }
// on success or { error: "<code>:<field_id>" } on the first
// failure. Normalized values are always strings — booleans become
// "TRUE"/"FALSE" (matching the parseBoolean convention used
// elsewhere in the project), numbers become their string form,
// multi_select arrays become semicolon-joined strings.
function validateSubmissionValues(fields, submitted) {
  const normalized = {};
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const fid = f.field_id;
    if (!fid) continue;

    const raw = submitted[fid];
    const isPresent = raw != null && (Array.isArray(raw) ? raw.length > 0 : String(raw).trim() !== "");

    if (!isPresent) {
      if (f.required) return { error: "missing_field:" + fid };
      normalized[fid] = "";
      continue;
    }

    const t = f.field_type;

    if (t === "single_select") {
      const v = String(raw).trim();
      if (f.options.length > 0 && f.options.indexOf(v) < 0) {
        return { error: "bad_value:" + fid };
      }
      normalized[fid] = v;

    } else if (t === "multi_select") {
      let arr;
      if (Array.isArray(raw)) arr = raw.map(String);
      else arr = String(raw).split(";");
      arr = arr.map(function (x) { return x.trim(); }).filter(Boolean);
      for (let j = 0; j < arr.length; j++) {
        if (f.options.length > 0 && f.options.indexOf(arr[j]) < 0) {
          return { error: "bad_value:" + fid };
        }
      }
      normalized[fid] = arr.join(";");

    } else if (t === "number") {
      const n = parseFloat(raw);
      if (isNaN(n) || !isFinite(n)) return { error: "bad_value:" + fid };
      normalized[fid] = String(n);

    } else if (t === "boolean") {
      normalized[fid] = parseBoolean(raw) ? "TRUE" : "FALSE";

    } else if (t === "short_text" || t === "long_text") {
      normalized[fid] = String(raw);

    } else {
      return { error: "unknown_type:" + fid };
    }
  }
  return { normalized: normalized };
}

// Upsert keyed on (cwid, prompt_id, field_id). Creates the
// Responses tab on first call so a fresh deploy doesn't need a
// manual setup step. Caller MUST hold the script lock.
function upsertResponses(cwid, promptId, fieldValues, submittedAt) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RESPONSES_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(RESPONSES_TAB_NAME);
    sheet.getRange(1, 1, 1, RESPONSES_HEADERS.length).setValues([RESPONSES_HEADERS]);
  }

  let values = sheet.getDataRange().getValues();
  let headers;
  if (values.length === 0) {
    sheet.getRange(1, 1, 1, RESPONSES_HEADERS.length).setValues([RESPONSES_HEADERS]);
    headers = RESPONSES_HEADERS.slice();
    values = [headers];
  } else {
    headers = values[0].map(function (h) { return String(h == null ? "" : h).trim(); });
  }

  // If a required column is missing (someone manually edited the
  // headers), append it at the end so the upsert below still works.
  for (let i = 0; i < RESPONSES_HEADERS.length; i++) {
    if (headers.indexOf(RESPONSES_HEADERS[i]) < 0) {
      headers.push(RESPONSES_HEADERS[i]);
      sheet.getRange(1, headers.length).setValue(RESPONSES_HEADERS[i]);
    }
  }

  const colIdx = {};
  for (let i = 0; i < headers.length; i++) colIdx[headers[i]] = i;

  // Find existing rows for this (cwid, prompt_id) pair, indexed by
  // field_id. We re-read the freshly-written values shape rather
  // than trusting the in-memory `values` if we just appended a
  // header column — but since the data rows don't shift, the
  // sheet-row indexes are stable.
  const existingByField = {};
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowCwid = normalizeCwid(row[colIdx.cwid]);
    const rowPid = String(row[colIdx.prompt_id] == null ? "" : row[colIdx.prompt_id]).trim();
    if (rowCwid === cwid && rowPid === promptId) {
      const fid = String(row[colIdx.field_id] == null ? "" : row[colIdx.field_id]).trim();
      if (fid) existingByField[fid] = r + 1; // 1-indexed sheet row
    }
  }

  const appends = [];
  for (const fid in fieldValues) {
    const v = fieldValues[fid];
    if (existingByField[fid]) {
      const rowNum = existingByField[fid];
      sheet.getRange(rowNum, colIdx.value + 1).setValue(v);
      sheet.getRange(rowNum, colIdx.submitted_at + 1).setValue(submittedAt);
    } else {
      const rowArr = new Array(headers.length).fill("");
      rowArr[colIdx.submitted_at] = submittedAt;
      rowArr[colIdx.cwid] = cwid;
      rowArr[colIdx.prompt_id] = promptId;
      rowArr[colIdx.field_id] = fid;
      rowArr[colIdx.value] = v;
      appends.push(rowArr);
    }
  }

  if (appends.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, appends.length, headers.length).setValues(appends);
  }
}

// After a write, return the merged set of responses for this user
// and prompt: previously-stored values plus anything we just
// wrote (the just-written values win on overlap). Used to echo a
// fresh prompt back to the client without making it issue a
// follow-up GET.
function mergeStoredResponses(cwid, promptId, justWritten) {
  const stored = {};
  const responseRows = readTabAsObjects(RESPONSES_TAB_NAME);
  for (let i = 0; i < responseRows.length; i++) {
    const r = responseRows[i];
    if (normalizeCwid(r.cwid) !== cwid) continue;
    if (String(r.prompt_id || "").trim() !== promptId) continue;
    const fid = String(r.field_id || "").trim();
    if (!fid) continue;
    stored[fid] = String(r.value == null ? "" : r.value);
  }
  // Just-written values override stored — handles the case where
  // the read-back happens before the sheet write fully commits, or
  // a column isn't visible yet to the next getDataRange().
  for (const fid in justWritten) {
    stored[fid] = justWritten[fid];
  }
  return stored;
}

// =========================================================
// Shared helpers
// =========================================================

// Canonicalize a CWID for comparison. Strips non-digits and
// leading zeros so "123456789", " 123456789 ", "123-456-789", and
// "0123456789" all collapse to the same canonical "123456789".
// CWIDs are 9-digit integers by convention; this normalization
// is lenient on input variation but does not pad short values, so
// "12345" and "123456789" remain distinct.
function normalizeCwid(raw) {
  if (raw == null) return "";
  // Spreadsheet number cells come through as numbers; coerce to
  // string before regex.
  return String(raw).replace(/\D/g, "").replace(/^0+/, "");
}

// Convert a raw row of values into a header-keyed object. Mirrors
// Code.gs's readAllTabs() conversion so date cells are stringified
// consistently as YYYY-MM-DD instead of "Sun May 25 2026..." etc.
// Time-only Date cells (Sheets stores those anchored to its 1899
// serial-date epoch) are formatted as HH:mm so a Prompts.start_date
// or PromptFields.field_order entered as a time doesn't read as
// "1899-12-30".
function rowToObject(row, headers, tz) {
  const obj = {};
  for (let c = 0; c < headers.length; c++) {
    const key = headers[c];
    if (!key) continue;
    const cell = row[c];
    if (cell == null) {
      obj[key] = "";
    } else if (cell instanceof Date) {
      if (cell.getFullYear() === 1899) {
        obj[key] = Utilities.formatDate(cell, tz, "HH:mm");
      } else {
        obj[key] = Utilities.formatDate(cell, tz, "yyyy-MM-dd");
      }
    } else {
      obj[key] = String(cell);
    }
  }
  return obj;
}

// Generic tab reader — returns an array of header-keyed row
// objects, dropping wholly-empty rows. Used for Prompts,
// PromptFields, and Responses.
function readTabAsObjects(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (h) {
    return String(h == null ? "" : h).trim();
  });
  const tz = resolveTimeZone(ss);
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const obj = rowToObject(values[r], headers, tz);
    let any = false;
    for (const k in obj) {
      if (obj[k] !== "") { any = true; break; }
    }
    if (any) rows.push(obj);
  }
  return rows;
}

// Accept MM-DD, M-D, or YYYY-MM-DD; return canonical MM-DD.
// Returns null on unparseable input. Mirrors App.jsx
// parseBirthdayMD so a sheet row entered as a full ISO date still
// matches a front-end MM-DD submission.
function parseBirthdayMD(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;

  // Full ISO: YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return pad2(m[2]) + "-" + pad2(m[3]);

  // MM-DD or M-D
  m = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (m) return pad2(m[1]) + "-" + pad2(m[2]);

  return null;
}

function pad2(n) {
  const s = String(n);
  return s.length < 2 ? ("0" + s) : s;
}

// Mirrors App.jsx parseBoolean. TRUE/yes/y/1/x/✓/sí/si all read
// as truthy; everything else (including blank) is false.
function parseBoolean(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!s) return false;
  return ["true", "t", "yes", "y", "1", "x", "✓", "sí", "si"].indexOf(s) >= 0;
}

function parseSemicolonList(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return [];
  return s.split(";").map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; });
}

function curateUserRow(row) {
  const out = {};
  for (let i = 0; i < CURATED_FIELDS.length; i++) {
    const key = CURATED_FIELDS[i];
    out[key] = row[key] == null ? "" : row[key];
  }
  // Default program_status to "active" if blank, so the student's
  // app sees a stable value either way.
  if (!out.program_status) out.program_status = "active";
  return out;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================
// Editor helpers — run from the Apps Script editor
// =========================================================

// Authorization helper. Run once after pasting this script in to
// trigger the spreadsheet read-scope prompt and confirm the Roster
// tab is reachable. Output lands in the execution log
// (View → Execution log, or the bottom panel after running).
function testReadRoster() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROSTER_TAB_NAME);
  if (!sheet) {
    Logger.log("ERROR: No '" + ROSTER_TAB_NAME + "' tab found.");
    return;
  }
  const values = sheet.getDataRange().getValues();
  const dataRows = Math.max(0, values.length - 1);
  Logger.log(ROSTER_TAB_NAME + " tab found. " + dataRows + " data row(s).");
  if (values.length > 0) {
    const headers = values[0].map(function (h) { return String(h).trim(); });
    Logger.log("Headers: " + headers.join(", "));
  }
}

// Sanity check the roster. Run from the editor whenever you've
// done a meaningful edit (added a cohort, fixed typos). Flags
// duplicate CWIDs, missing required fields, unrecognized roles,
// and unparseable birthdays. All findings go to the execution log.
function validateRoster() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROSTER_TAB_NAME);
  if (!sheet) {
    Logger.log("ERROR: No '" + ROSTER_TAB_NAME + "' tab found.");
    return;
  }
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    Logger.log("Roster has no data rows.");
    return;
  }
  const headers = values[0].map(function (h) { return String(h).trim(); });
  const cwidIdx = headers.indexOf("cwid");
  const bdayIdx = headers.indexOf("birthday");
  const firstIdx = headers.indexOf("first_name");
  const roleIdx = headers.indexOf("role");
  const emailIdx = headers.indexOf("email");

  if (cwidIdx < 0 || bdayIdx < 0 || firstIdx < 0 || roleIdx < 0) {
    Logger.log("ERROR: Roster is missing one or more required headers (cwid, birthday, first_name, role).");
    return;
  }

  const seenCwidsRaw = {};
  const seenCwidsNormalized = {};
  const seenEmails = {};
  const issues = [];
  let checked = 0;

  for (let r = 1; r < values.length; r++) {
    const rowNum = r + 1; // 1-indexed sheet row
    const cwidRaw = String(values[r][cwidIdx] == null ? "" : values[r][cwidIdx]).trim();
    const cwidNorm = normalizeCwid(cwidRaw);
    const bday = String(values[r][bdayIdx] || "").trim();
    const first = String(values[r][firstIdx] || "").trim();
    const role = String(values[r][roleIdx] || "").trim().toLowerCase();
    const email = emailIdx >= 0 ? String(values[r][emailIdx] || "").trim().toLowerCase() : "";

    // Skip wholly empty rows
    if (!cwidRaw && !bday && !first) continue;
    checked++;

    if (!cwidRaw) issues.push("Row " + rowNum + ": missing cwid");
    if (!bday) issues.push("Row " + rowNum + ": missing birthday");
    if (!first) issues.push("Row " + rowNum + ": missing first_name");
    if (!role) issues.push("Row " + rowNum + ": missing role");

    if (role && VALID_ROLES.indexOf(role) < 0) {
      issues.push("Row " + rowNum + ": unrecognized role '" + role + "' (expected student, staff, or faculty)");
    }
    if (bday && !parseBirthdayMD(bday)) {
      issues.push("Row " + rowNum + ": birthday '" + bday + "' isn't MM-DD, M-D, or YYYY-MM-DD");
    }

    // CWID format checks. Convention: 9-digit numerics, no leading
    // zeros, no separators. The auth script normalizes for comparison
    // either way, but a heads-up here keeps the sheet clean.
    if (cwidRaw) {
      if (!/^\d+$/.test(cwidRaw)) {
        issues.push("Row " + rowNum + ": cwid '" + cwidRaw + "' contains non-digit characters (will still match, but worth cleaning up)");
      }
      if (cwidRaw.length !== 9 && /^\d+$/.test(cwidRaw)) {
        issues.push("Row " + rowNum + ": cwid '" + cwidRaw + "' is " + cwidRaw.length + " digits (expected 9)");
      }
      if (/^0\d/.test(cwidRaw)) {
        issues.push("Row " + rowNum + ": cwid '" + cwidRaw + "' starts with a leading zero (will still match, but CWIDs shouldn't have leading zeros)");
      }
      // Exact-string duplicates (same cell value)
      if (seenCwidsRaw[cwidRaw]) {
        issues.push("Row " + rowNum + ": duplicate cwid '" + cwidRaw + "' (also in row " + seenCwidsRaw[cwidRaw] + ")");
      } else {
        seenCwidsRaw[cwidRaw] = rowNum;
      }
      // Normalized duplicates (e.g., "123456789" vs "0123456789")
      // — different cell values that collide for matching purposes.
      if (cwidNorm && seenCwidsNormalized[cwidNorm] && seenCwidsNormalized[cwidNorm] !== rowNum) {
        const otherRow = seenCwidsNormalized[cwidNorm];
        if (cwidRaw !== String(values[otherRow - 1][cwidIdx]).trim()) {
          issues.push("Row " + rowNum + ": cwid '" + cwidRaw + "' normalizes to the same value as row " + otherRow + " (auth would refuse to disambiguate)");
        }
      } else if (cwidNorm) {
        seenCwidsNormalized[cwidNorm] = rowNum;
      }
    }
    if (email) {
      if (seenEmails[email]) {
        issues.push("Row " + rowNum + ": duplicate email '" + email + "' (also in row " + seenEmails[email] + ")");
      } else {
        seenEmails[email] = rowNum;
      }
      if (email.indexOf("@") < 0) {
        issues.push("Row " + rowNum + ": email '" + email + "' missing '@'");
      }
    }
  }

  if (issues.length === 0) {
    Logger.log("✓ Roster looks clean. " + checked + " row(s) checked.");
  } else {
    Logger.log("Found " + issues.length + " issue(s) across " + checked + " row(s):");
    for (let i = 0; i < issues.length; i++) Logger.log("  " + issues[i]);
  }
}

// Sanity check the Prompts + PromptFields tabs. Run after editing
// either tab. Flags:
//   - prompts with no fields, or fields pointing at an unknown prompt_id
//   - duplicate prompt_id values in Prompts
//   - duplicate (prompt_id, field_id) pairs in PromptFields
//   - unrecognized field_type values
//   - select fields with no options
//   - unparseable start_date/end_date
//   - unrecognized audience tokens (anything that isn't "all", a
//     valid role, or a CWID-shaped token)
//   - unrecognized surface values (anything other than "today",
//     "profile", or "both")
function validatePrompts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const promptsSheet = ss.getSheetByName(PROMPTS_TAB_NAME);
  const fieldsSheet = ss.getSheetByName(PROMPT_FIELDS_TAB_NAME);

  if (!promptsSheet) {
    Logger.log("ERROR: No '" + PROMPTS_TAB_NAME + "' tab found. Create it before running this validator.");
    return;
  }
  if (!fieldsSheet) {
    Logger.log("ERROR: No '" + PROMPT_FIELDS_TAB_NAME + "' tab found. Create it before running this validator.");
    return;
  }

  const promptRows = readTabAsObjects(PROMPTS_TAB_NAME);
  const fieldRows = readTabAsObjects(PROMPT_FIELDS_TAB_NAME);

  const issues = [];
  const knownPromptIds = {};
  const seenFieldKeys = {};
  const VALID_SURFACES = ["today", "profile", "both"];
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  // Pass 1: prompts
  for (let i = 0; i < promptRows.length; i++) {
    const sheetRow = i + 2; // header + 1-indexed
    const p = promptRows[i];
    const pid = String(p.prompt_id || "").trim();

    if (!pid) {
      issues.push("Prompts row " + sheetRow + ": missing prompt_id");
      continue;
    }
    if (knownPromptIds[pid]) {
      issues.push("Prompts row " + sheetRow + ": duplicate prompt_id '" + pid + "' (also in row " + knownPromptIds[pid] + ")");
    } else {
      knownPromptIds[pid] = sheetRow;
    }

    if (!String(p.title_es || "").trim() && !String(p.title_en || "").trim()) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): both title_es and title_en are blank — students will see an empty card title");
    }

    const surface = String(p.surface || "today").trim().toLowerCase();
    if (VALID_SURFACES.indexOf(surface) < 0) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): unrecognized surface '" + surface + "' (expected today, profile, or both)");
    }

    const startDate = String(p.start_date || "").trim();
    const endDate = String(p.end_date || "").trim();
    const endTime = String(p.end_time || "").trim();
    if (startDate && !ISO_DATE_RE.test(startDate)) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): start_date '" + startDate + "' is not YYYY-MM-DD");
    }
    if (endDate && !ISO_DATE_RE.test(endDate)) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): end_date '" + endDate + "' is not YYYY-MM-DD");
    }
    if (startDate && endDate && ISO_DATE_RE.test(startDate) && ISO_DATE_RE.test(endDate) && endDate < startDate) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): end_date '" + endDate + "' is before start_date '" + startDate + "'");
    }
    if (endTime && !/^\d{1,2}:\d{2}$/.test(endTime)) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): end_time '" + endTime + "' is not HH:mm (24-hour, e.g. 20:00)");
    }
    if (endTime && !endDate) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): end_time set but end_date is blank — end_time has no effect without an end_date");
    }

    const eventDate = String(p.event_date || "").trim();
    if (eventDate && !ISO_DATE_RE.test(eventDate)) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): event_date '" + eventDate + "' is not YYYY-MM-DD");
    }
    if (eventDate && ISO_DATE_RE.test(eventDate) && startDate && ISO_DATE_RE.test(startDate) && eventDate < startDate) {
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): event_date '" + eventDate + "' is before start_date '" + startDate + "' — the prompt would never reach its event date in an open state");
    }
    if (eventDate && ISO_DATE_RE.test(eventDate) && endDate && ISO_DATE_RE.test(endDate) && eventDate < endDate) {
      // Soft warning: a meal RSVP where event_date precedes end_date
      // means the cutoff is after the event, which is almost certainly
      // a mistake (kitchen needs the tally before service, not after).
      issues.push("Prompts row " + sheetRow + " ('" + pid + "'): event_date '" + eventDate + "' is before end_date '" + endDate + "' — the submission cutoff is after the event date (likely a mistake)");
    }

    // lock_after_submit accepts the same truthy/falsy values as
    // parseBoolean. Flag anything that doesn't parse cleanly so a typo
    // like "y3s" doesn't silently read as false.
    const lockRaw = String(p.lock_after_submit == null ? "" : p.lock_after_submit).trim();
    if (lockRaw) {
      const lockLower = lockRaw.toLowerCase();
      const TRUTHY = ["true", "t", "yes", "y", "1", "x", "✓", "sí", "si"];
      const FALSY  = ["false", "f", "no", "n", "0", ""];
      if (TRUTHY.indexOf(lockLower) < 0 && FALSY.indexOf(lockLower) < 0) {
        issues.push("Prompts row " + sheetRow + " ('" + pid + "'): lock_after_submit '" + lockRaw + "' isn't a recognized boolean (TRUE/FALSE)");
      }
    }

    const audience = String(p.audience || "all").trim().toLowerCase();
    if (audience && audience !== "all") {
      const tokens = audience.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      for (let j = 0; j < tokens.length; j++) {
        const t = tokens[j];
        if (t === "all") continue;
        if (VALID_ROLES.indexOf(t) >= 0) continue;
        // Anything left should be CWID-shaped.
        const norm = normalizeCwid(t);
        if (!norm) {
          issues.push("Prompts row " + sheetRow + " ('" + pid + "'): audience token '" + t + "' is neither a role (student/staff/faculty) nor a CWID");
        }
      }
    }
  }

  // Pass 2: fields
  const fieldsByPromptCount = {};
  for (let i = 0; i < fieldRows.length; i++) {
    const sheetRow = i + 2;
    const f = fieldRows[i];
    const pid = String(f.prompt_id || "").trim();
    const fid = String(f.field_id || "").trim();

    if (!pid) {
      issues.push("PromptFields row " + sheetRow + ": missing prompt_id");
      continue;
    }
    if (!knownPromptIds[pid]) {
      issues.push("PromptFields row " + sheetRow + ": prompt_id '" + pid + "' has no matching row in Prompts");
    }
    if (!fid) {
      issues.push("PromptFields row " + sheetRow + " ('" + pid + "'): missing field_id");
      continue;
    }

    const key = pid + "::" + fid;
    if (seenFieldKeys[key]) {
      issues.push("PromptFields row " + sheetRow + ": duplicate (prompt_id, field_id) = ('" + pid + "', '" + fid + "') (also in row " + seenFieldKeys[key] + ")");
    } else {
      seenFieldKeys[key] = sheetRow;
    }
    fieldsByPromptCount[pid] = (fieldsByPromptCount[pid] || 0) + 1;

    const ft = String(f.field_type || "").trim().toLowerCase();
    if (!ft) {
      issues.push("PromptFields row " + sheetRow + " ('" + pid + "/" + fid + "'): missing field_type");
    } else if (PROMPT_FIELD_TYPES.indexOf(ft) < 0) {
      issues.push("PromptFields row " + sheetRow + " ('" + pid + "/" + fid + "'): unknown field_type '" + ft + "' (expected one of: " + PROMPT_FIELD_TYPES.join(", ") + ")");
    }

    if ((ft === "single_select" || ft === "multi_select")) {
      const opts = parseSemicolonList(f.options);
      if (opts.length === 0) {
        issues.push("PromptFields row " + sheetRow + " ('" + pid + "/" + fid + "'): " + ft + " field has no options (separate with semicolons)");
      }
      const labelsEs = parseSemicolonList(f.option_labels_es);
      const labelsEn = parseSemicolonList(f.option_labels_en);
      if (labelsEs.length > 0 && labelsEs.length !== opts.length) {
        issues.push("PromptFields row " + sheetRow + " ('" + pid + "/" + fid + "'): option_labels_es count (" + labelsEs.length + ") doesn't match options count (" + opts.length + ")");
      }
      if (labelsEn.length > 0 && labelsEn.length !== opts.length) {
        issues.push("PromptFields row " + sheetRow + " ('" + pid + "/" + fid + "'): option_labels_en count (" + labelsEn.length + ") doesn't match options count (" + opts.length + ")");
      }
    }

    if (!String(f.label_es || "").trim() && !String(f.label_en || "").trim()) {
      issues.push("PromptFields row " + sheetRow + " ('" + pid + "/" + fid + "'): both label_es and label_en are blank");
    }

    const orderRaw = String(f.field_order == null ? "" : f.field_order).trim();
    if (orderRaw && isNaN(parseFloat(orderRaw))) {
      issues.push("PromptFields row " + sheetRow + " ('" + pid + "/" + fid + "'): field_order '" + orderRaw + "' isn't a number");
    }
  }

  // Pass 3: cross-checks
  for (const pid in knownPromptIds) {
    if (!fieldsByPromptCount[pid]) {
      issues.push("Prompts row " + knownPromptIds[pid] + " ('" + pid + "'): no fields defined in PromptFields — students would see an empty form");
    }
  }

  if (issues.length === 0) {
    Logger.log("✓ Prompts/PromptFields look clean. " + promptRows.length + " prompt(s), " + fieldRows.length + " field(s) checked.");
  } else {
    Logger.log("Found " + issues.length + " issue(s):");
    for (let i = 0; i < issues.length; i++) Logger.log("  " + issues[i]);
  }
}

// Editor helper — run from the Apps Script editor after editing the
// Places tab (seed migration, vetting, manual tidy). Mirrors
// validatePrompts: flags structural problems that would render badly
// in the app. Output goes to the execution log (View → Execution log).
function validatePlaces() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PLACES_TAB_NAME);
  if (!sheet) {
    Logger.log("No '" + PLACES_TAB_NAME + "' tab found yet. It's auto-created on the first community submission, or create it manually to seed-migrate Explore rows.");
    return;
  }

  const rows = readTabAsObjects(PLACES_TAB_NAME);
  const issues = [];
  const seenIds = {};
  const NUM_RE = /^-?\d+(\.\d+)?$/;

  for (let i = 0; i < rows.length; i++) {
    const sheetRow = i + 2; // header + 1-indexed
    const r = rows[i];
    const id = String(r.place_id || "").trim();

    if (!id) {
      issues.push("Places row " + sheetRow + ": missing place_id");
    } else if (seenIds[id]) {
      issues.push("Places row " + sheetRow + ": duplicate place_id '" + id + "' (also in row " + seenIds[id] + ")");
    } else {
      seenIds[id] = sheetRow;
    }

    if (!String(r.name || "").trim()) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): missing name");
    }

    const cat = String(r.category || "").trim().toLowerCase();
    if (!cat) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): missing category");
    } else if (PLACE_CATEGORY_KEYS.indexOf(cat) < 0) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): unrecognized category '" + cat + "' (will render as 'Other'; expected one of " + PLACE_CATEGORY_KEYS.join(", ") + ")");
    }

    // A place needs at least one way to be found on a map.
    if (!String(r.address || "").trim() && !String(r.maps_url || "").trim()) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): no address and no maps_url — students can't open it in Maps");
    }

    const lat = String(r.lat == null ? "" : r.lat).trim();
    const lng = String(r.lng == null ? "" : r.lng).trim();
    if (lat && !NUM_RE.test(lat)) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): lat '" + lat + "' isn't a decimal number");
    }
    if (lng && !NUM_RE.test(lng)) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): lng '" + lng + "' isn't a decimal number");
    }
    if ((lat && !lng) || (lng && !lat)) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): only one of lat/lng is filled — both are needed for the 'Near you' sort");
    }

    const status = String(r.status || "").trim().toLowerCase();
    if (!status) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): missing status (expected approved/pending/rejected)");
    } else if (PLACE_STATUSES.indexOf(status) < 0) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): unrecognized status '" + status + "' (expected " + PLACE_STATUSES.join(", ") + ")");
    }

    const source = String(r.source || "").trim().toLowerCase();
    if (source && PLACE_SOURCES.indexOf(source) < 0) {
      issues.push("Places row " + sheetRow + " ('" + id + "'): unrecognized source '" + source + "' (expected seed or community)");
    }

    const creditRaw = String(r.show_credit == null ? "" : r.show_credit).trim();
    if (creditRaw) {
      const cl = creditRaw.toLowerCase();
      const TRUTHY = ["true", "t", "yes", "y", "1", "x", "✓", "sí", "si"];
      const FALSY  = ["false", "f", "no", "n", "0"];
      if (TRUTHY.indexOf(cl) < 0 && FALSY.indexOf(cl) < 0) {
        issues.push("Places row " + sheetRow + " ('" + id + "'): show_credit '" + creditRaw + "' isn't a recognized boolean (TRUE/FALSE)");
      }
    }
  }

  if (issues.length === 0) {
    Logger.log("✓ Places look clean. " + rows.length + " place(s) checked.");
  } else {
    Logger.log("Found " + issues.length + " issue(s):");
    for (let i = 0; i < issues.length; i++) Logger.log("  " + issues[i]);
  }
}
