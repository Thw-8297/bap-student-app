// BAP App — Apps Script consolidated data endpoint
// =================================================
//
// Deployed as a Web App bound to the BAP spreadsheet. Returns every
// tab the app reads as a single JSON blob, keyed by tab name. Each
// tab's value is an array of header-keyed row objects (matching the
// shape PapaParse produces in the per-tab fallback path), so App.jsx
// can pass the result straight into normalizeData() unchanged.
//
// Auth (added 2026-05-03):
//   Every request must carry ?token=<value> matching the
//   COHORT_TOKEN entry in Script Properties. Mismatched or missing
//   tokens get { error: "unauthorized" } with no data. Rotate the
//   token each cohort by editing the Script Property; no re-deploy
//   needed for token rotation.
//
// Caching:
//   The script's response is cached in CacheService for one hour
//   under CACHE_KEY. Sheet edits therefore take up to an hour to
//   appear via this endpoint. Append ?bust=1 to force a re-read.
//
// Re-deploy after editing this file:
//   Apps Script editor → Deploy → Manage deployments → pencil icon
//   → Version: New version → Deploy. The URL stays the same.

const TABS = [
  "Settings",
  "Classes",
  "Calendar",
  "Health",
  "Churches",
  "FAQ",
  "Contacts",
  "Explore",
  "Resources",
  "Announcements",
  "Apps",
  "Tips",
  "Events",
  "Holidays",
  "Birthdays",
];

const CACHE_KEY = "bap_app_data_v1";
const CACHE_TTL_SECONDS = 60 * 60;

function doGet(e) {
  const params = (e && e.parameter) || {};

  const expected = PropertiesService.getScriptProperties().getProperty("COHORT_TOKEN");
  const provided = params.token || "";
  if (!expected || provided !== expected) {
    return jsonResponse({ error: "unauthorized" });
  }

  const bust = params.bust === "1";
  const cache = CacheService.getScriptCache();

  if (!bust) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return ContentService
      .createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  const payload = readAllTabs();
  const json = JSON.stringify(payload);

  try {
    cache.put(CACHE_KEY, json, CACHE_TTL_SECONDS);
  } catch (err) {
    // CacheService entries are capped at 100KB. If we exceed that,
    // serve the fresh response uncached rather than failing the
    // request.
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// Read every tab listed in TABS and return an object keyed by tab
// name. Each value is an array of row objects, where each row is
// keyed by the lowercase header from row 1. Empty cells become "".
// Rows that are entirely empty are dropped so trailing blank rows
// in the sheet don't bloat the response.
function readAllTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const out = {};
  for (let i = 0; i < TABS.length; i++) {
    const tabName = TABS[i];
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      out[tabName] = [];
      continue;
    }
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      out[tabName] = [];
      continue;
    }
    const headers = values[0].map(function (h) {
      return String(h == null ? "" : h).trim();
    });
    const rows = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const obj = {};
      let hasAny = false;
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        if (!key) continue;
        const cell = row[c];
        let value;
        if (cell == null) {
          value = "";
        } else if (cell instanceof Date) {
          // Date cells must come through as YYYY-MM-DD strings —
          // App.jsx normalizeData does `r.date.trim().slice(0, 10)`
          // and downstream date arithmetic assumes ISO-like input.
          // String(dateObj) would emit "Sun May 25 2026 00:00:00
          // GMT-0300 ..." which slices to "Sun May 25" and parses
          // as year 2001 in V8, blowing up everywhere downstream.
          value = Utilities.formatDate(cell, tz, "yyyy-MM-dd");
        } else {
          value = String(cell);
        }
        obj[key] = value;
        if (value !== "") hasAny = true;
      }
      if (hasAny) rows.push(obj);
    }
    out[tabName] = rows;
  }
  return out;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Manual cache reset. Run from the Apps Script editor when you
// want to drop the cached value without bumping CACHE_KEY or
// hitting the URL with ?bust=1.
function clearCache() {
  CacheService.getScriptCache().remove(CACHE_KEY);
  Logger.log("Cleared cache key: " + CACHE_KEY);
}

// Authorization helper. Run once from the Apps Script editor to
// trigger the spreadsheet read scope prompt and confirm tab counts
// in the execution log.
function testReadAllTabs() {
  const data = readAllTabs();
  for (const tab in data) {
    Logger.log(tab + ": " + data[tab].length + " rows");
  }
}
