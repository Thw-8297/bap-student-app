// BAP App — Roster auth script
// =================================================
//
// Deployed as a Web App bound to the "BAP App Roster" spreadsheet
// (separate from the content spreadsheet by design — physical
// permission isolation, see project knowledge "Per-user
// identification"). Validates a per-user identity check against
// the Roster tab.
//
// Auth (two layers):
//   - Cohort token: every request must carry ?token=<value>
//     matching the COHORT_TOKEN entry in Script Properties. Same
//     value as the content script's COHORT_TOKEN; rotate both
//     together each cohort.
//   - Per-user credentials: ?cwid=<value>&birthday=<value> matched
//     against the Roster tab. Returns a curated user record on
//     match; { error: "no_match" } otherwise.
//
// Endpoint:
//   ?action=identify&token=...&cwid=...&birthday=...
//     → { user: { cwid, first_name, last_name, ... } }      [ok]
//     → { error: "unauthorized" }                            [bad cohort token]
//     → { error: "bad_request" }                             [missing/unparseable params]
//     → { error: "no_match" }                                [cwid not found, birthday mismatch, or program_status not active]
//
// Birthday handling:
//   The roster's `birthday` column accepts MM-DD, M-D, or full
//   YYYY-MM-DD (year stripped on parse). The front end sends MM-DD
//   from the two-dropdown gate. Both sides are canonicalized to
//   MM-DD before comparison via parseBirthdayMD().
//
// No response caching:
//   identify is called ~once per device per cohort, so the
//   spreadsheet reads are negligible. No-cache means roster edits
//   propagate immediately — useful when adding a late-add student
//   or fixing a typo mid-cohort.
//
// Re-deploy after editing this file:
//   Apps Script editor → Deploy → Manage deployments → pencil icon
//   → Version: New version → Deploy. The URL stays the same.

const ROSTER_TAB_NAME = "Roster";

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

function doGet(e) {
  const params = (e && e.parameter) || {};

  // Layer 1: cohort token
  const expected = PropertiesService.getScriptProperties().getProperty("COHORT_TOKEN");
  const provided = params.token || "";
  if (!expected || provided !== expected) {
    return jsonResponse({ error: "unauthorized" });
  }

  const action = params.action || "";
  if (action === "identify") {
    return handleIdentify(params);
  }

  return jsonResponse({ error: "bad_request" });
}

// Validate the per-user credentials and return the curated row.
// Errors are intentionally generic ("no_match") and don't
// distinguish "cwid not found" from "cwid found but birthday
// wrong" — that distinction would help an attacker enumerate
// CWIDs.
function handleIdentify(params) {
  const cwid = normalizeCwid(params.cwid || "");
  const birthdayRaw = String(params.birthday || "").trim();

  if (!cwid || !birthdayRaw) {
    return jsonResponse({ error: "bad_request" });
  }

  const expectedBirthday = parseBirthdayMD(birthdayRaw);
  if (!expectedBirthday) {
    return jsonResponse({ error: "bad_request" });
  }

  const row = findRosterRow(cwid);
  if (!row) {
    return jsonResponse({ error: "no_match" });
  }

  const rowBirthday = parseBirthdayMD(String(row.birthday || ""));
  if (!rowBirthday || rowBirthday !== expectedBirthday) {
    return jsonResponse({ error: "no_match" });
  }

  // Treat blank program_status as active. Reject non-active rows
  // so a withdrawn or completed student can't sign in mid-cohort.
  const status = String(row.program_status || "active").trim().toLowerCase();
  if (status !== "active") {
    return jsonResponse({ error: "no_match" });
  }

  return jsonResponse({ user: curateUserRow(row) });
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

  const tz = ss.getSpreadsheetTimeZone();

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
function rowToObject(row, headers, tz) {
  const obj = {};
  for (let c = 0; c < headers.length; c++) {
    const key = headers[c];
    if (!key) continue;
    const cell = row[c];
    if (cell == null) {
      obj[key] = "";
    } else if (cell instanceof Date) {
      obj[key] = Utilities.formatDate(cell, tz, "yyyy-MM-dd");
    } else {
      obj[key] = String(cell);
    }
  }
  return obj;
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
