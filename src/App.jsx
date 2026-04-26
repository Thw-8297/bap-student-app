import { useState, useEffect, useRef, useCallback } from "react";
import Papa from "papaparse";

// ============================================================
// BUILD VERSION — Update each time a new build is generated
// ============================================================
const BUILD_VERSION = "2026-04-26 — Today tile polish. Tip card cycle slowed from 7s to 15s so students have time to actually read each tip. Weather alert collapsed from a two-row stacked block (Spanish primary + English italic underneath) into a single-line Spanish / English treatment matching the dress-hint pattern right above it (Roboto + slash separator + italic EB Garamond English), wraps naturally when the bilingual phrase is long, saves a row of vertical space when it isn't. Dólar tile gains an Oficial line below MEP, so students see the full Blue / MEP / Oficial picture at a glance for currency decisions; fetchDolar() now hits dolarapi.com /v1/dolares/oficial in parallel with Blue and MEP via Promise.allSettled, so an oficial outage doesn't break the tile. Dólar shape gains an oficial field; lives in the separate bap-today-cache (30 min TTL), so no CACHE_VERSION bump needed.";

// ============================================================
// ★ CONFIGURATION — Only edit this section ★
// ============================================================
const SHEET_ID = "1Bn1wpsKr6-3eXRZtH-_6IxmTiQA4I157-nt-0tdmyaA";

// Optional Apps Script Web App that returns all sheet tabs as one
// JSON blob. When set, the app prefers this over 15 parallel gviz
// CSV fetches; on any failure (network error, non-200, non-JSON
// response, etc.) it falls back to the per-tab path automatically.
// Deploy via Extensions > Apps Script in the spreadsheet, with
// "Execute as: Me" and "Who has access: Anyone". Leave empty
// string to force the legacy per-tab path.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwZUxnUtb39W_LtY_DPdSp9RvUx_pXBqCtx7fnB7O9lqEeSMD5hrbqkQTKa72YdB_E/exec";

// ============================================================
// DEFAULT DATA — Used when no Google Sheet is connected
// ============================================================

const DEFAULT_DATA = {
  semester: "Summer 2026",
  classes: [
    { code: "IES 300", title: "Argentine History & Society", professor: "García", honorific: "Prof.", firstname: "Ana", days: ["Mon", "Wed"], time: "9:00–10:30", location: "Classroom A", color: "#0057B8", email: "" },
    { code: "SPA 201", title: "Intermediate Spanish II", professor: "Martínez", honorific: "Prof.", firstname: "Carlos", days: ["Mon", "Tue", "Thu"], time: "11:00–12:00", location: "Classroom B", color: "#64B5F6", email: "" },
    { code: "REL 100", title: "The Way of Jesus", professor: "Smith", honorific: "Dr.", firstname: "John", days: ["Tue", "Thu"], time: "14:00–15:30", location: "Classroom A", color: "#425563", email: "" },
    { code: "COM 300", title: "Intercultural Communication", professor: "Álvarez", honorific: "Prof.", firstname: "María", days: ["Wed", "Fri"], time: "14:00–15:30", location: "Classroom C", color: "#6CACE4", email: "" },
    { code: "ART 280", title: "Tango & Argentine Arts", professor: "Reyes", honorific: "Prof.", firstname: "Lucía", days: ["Fri"], time: "10:00–12:30", location: "Studio", color: "#E35205", email: "" },
  ],
  calendarEvents: [
    { date: "2026-08-10", end_date: "", title: "Arrival Day", type: "milestone", description: "Airport pickup and welcome dinner", start_time: "", end_time: "", visibility: "both" },
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

function sheetURL(tabName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

async function fetchTab(tabName) {
  const res = await fetch(sheetURL(tabName));
  if (!res.ok) throw new Error(`Failed to fetch ${tabName}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  return parsed.data;
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

// Spanish-style list join: "A, B, C y D". Different from English
// where the convention is "A, B, C, and D" (Oxford comma). Both
// variants are exposed so the bilingual title can use the right one
// per language.
function joinSpanish(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
function joinEnglish(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
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

// Consolidated path: one round trip to the Apps Script Web App, which
// returns all 15 tabs as a single JSON blob. The script caches its own
// response for 1 hour via CacheService, so most hits don't re-read the
// spreadsheet at all. Throws on any failure so the router can fall back.
async function fetchAllDataConsolidated() {
  if (!APPS_SCRIPT_URL) throw new Error("APPS_SCRIPT_URL not configured");
  const res = await fetch(APPS_SCRIPT_URL);
  if (!res.ok) throw new Error(`Apps Script endpoint returned ${res.status}`);
  // Guard against the Apps Script returning HTML instead of JSON (e.g.
  // a Google login page when the deploy was set to a restricted access
  // level by mistake). res.json() throws on non-JSON, which the router
  // catches and falls back from.
  const tabs = await res.json();
  return normalizeData(tabs);
}

// Legacy path: 15 parallel gviz CSV fetches, one per tab, parsed with
// PapaParse on the client. Slower than the consolidated path but has
// no script-deploy dependency, so it's the safety net if the Apps
// Script ever breaks.
async function fetchAllDataPerTab() {
  const [settingsRaw, classesRaw, calendarRaw, healthRaw, churchesRaw, faqRaw, contactsRaw, exploreRaw] =
    await Promise.all([
      fetchTab("Settings"),
      fetchTab("Classes"),
      fetchTab("Calendar"),
      fetchTab("Health"),
      fetchTab("Churches"),
      fetchTab("FAQ"),
      fetchTab("Contacts"),
      fetchTab("Explore"),
    ]);

  // Resources tab is optional — don't break the whole fetch if it's missing
  let resourcesRaw = [];
  try { resourcesRaw = await fetchTab("Resources"); } catch (e) { /* tab not created yet */ }

  // Announcements tab is optional — only populates when a reminder is active
  let announcementsRaw = [];
  try { announcementsRaw = await fetchTab("Announcements"); } catch (e) { /* tab not created yet */ }

  // Apps tab is optional — won't break if missing
  let appsRaw = [];
  try { appsRaw = await fetchTab("Apps"); } catch (e) { /* tab not created yet */ }

  // Tips tab is optional — used by the loading screen rotator
  let tipsRaw = [];
  try { tipsRaw = await fetchTab("Tips"); } catch (e) { /* tab not created yet */ }

  // Events tab is optional — populates the "This Week" sub-tab in Local
  // and the "Esta semana" tile on Today.
  let eventsRaw = [];
  try { eventsRaw = await fetchTab("Events"); } catch (e) { /* tab not created yet */ }

  // Holidays tab is optional — when present, takes over class-cancellation
  // logic from the calendar's holiday-typed events.
  let holidaysRaw = [];
  try { holidaysRaw = await fetchTab("Holidays"); } catch (e) { /* tab not created yet */ }

  // Birthdays tab is optional — populates the Today birthday card.
  let birthdaysRaw = [];
  try { birthdaysRaw = await fetchTab("Birthdays"); } catch (e) { /* tab not created yet */ }

  return normalizeData({
    Settings: settingsRaw,
    Classes: classesRaw,
    Calendar: calendarRaw,
    Health: healthRaw,
    Churches: churchesRaw,
    FAQ: faqRaw,
    Contacts: contactsRaw,
    Explore: exploreRaw,
    Resources: resourcesRaw,
    Announcements: announcementsRaw,
    Apps: appsRaw,
    Tips: tipsRaw,
    Events: eventsRaw,
    Holidays: holidaysRaw,
    Birthdays: birthdaysRaw,
  });
}

// Top-level fetcher used by the React app. Tries the consolidated
// Apps Script endpoint first when configured; on any failure (network
// error, non-200, non-JSON response), falls back transparently to the
// per-tab gviz path. This keeps the app robust against script outages
// without students ever seeing a difference.
async function fetchAllData() {
  if (APPS_SCRIPT_URL) {
    try {
      return await fetchAllDataConsolidated();
    } catch (e) {
      console.warn("[BAP] Consolidated endpoint failed, falling back to per-tab gviz fetches:", e && e.message ? e.message : e);
    }
  }
  return fetchAllDataPerTab();
}

// ============================================================
// LOCAL CACHE — Stale-while-revalidate
// Renders cached data instantly on repeat opens, then refreshes
// in the background. Drops perceived load time to ~zero.
// Bump CACHE_VERSION whenever the data shape changes so old
// caches are ignored instead of crashing the app.
// ============================================================

const CACHE_KEY = "bap-app-cache";
const CACHE_VERSION = 5;

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
// STUDENT PROFILE — Per-student personalization
// Stored at its own localStorage key (bap-profile) so it survives
// CACHE_VERSION bumps to the data cache. Profile is optional: an
// empty profile leaves the app behaving as it did before, showing
// every student every class. Bump PROFILE_VERSION only if the
// profile shape itself changes (new field, renamed field).
// ============================================================

const PROFILE_KEY = "bap-profile";
const PROFILE_VERSION = 1;

const EMPTY_PROFILE = {
  version: PROFILE_VERSION,
  name: "",
  enrolledClasses: [],
  filterEnabled: false,
  dismissedAnnouncements: [],
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw);
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


const LOGO_URI = "data:image/png;base64,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";
const BCBS_URI = "data:image/png;base64,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";
const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEK_DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EVENT_STYLES = {
  milestone:   { bg: "#FFF3E0", border: C.pepOrange, icon: "★", label: "Milestone" },
  academic:    { bg: C.ice, border: C.ocean, icon: "◆", label: "Academic" },
  excursion:   { bg: "#E8F5E9", border: "#388E3C", icon: "▲", label: "Excursion" },
  holiday:     { bg: "#FCE4EC", border: "#C62828", icon: "●", label: "Holiday" },
  program:     { bg: C.parchment, border: C.mountain, icon: "◇", label: "Program" },
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
  // Pull current conditions, today's high/low, and a 48-hour hourly
  // slice covering precipitation, precipitation probability, wind
  // gusts, weather code, and apparent temp. The hourly slice powers
  // the impending-weather alert rendered under the high/low line.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BA_LAT}&longitude=${BA_LON}` +
    `&current=temperature_2m,weather_code,is_day,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&hourly=temperature_2m,weather_code,precipitation,precipitation_probability,wind_gusts_10m` +
    `&forecast_days=3&timezone=America/Argentina/Buenos_Aires`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  const j = await res.json();
  const c = j.current || {};
  const d = j.daily || {};
  const h = j.hourly || {};
  const firstNum = (arr) => (Array.isArray(arr) && typeof arr[0] === "number" ? arr[0] : null);
  // Slice the hourly arrays to the next 48 hours starting from now.
  // Open-Meteo returns from midnight today, so we find the index of
  // the current hour and slice forward.
  const times = Array.isArray(h.time) ? h.time : [];
  const nowIso = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  let startIdx = times.findIndex((t) => typeof t === "string" && t.slice(0, 13) >= nowIso);
  if (startIdx < 0) startIdx = 0;
  const sliceN = (arr) => Array.isArray(arr) ? arr.slice(startIdx, startIdx + 48) : [];
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

  // Classes only render if (a) the student has personalized AND
  // (b) today's holiday (if any) doesn't cancel classes.
  const showClasses = shouldFilterClasses(profile) && !suppressClasses;
  const visibleClasses = showClasses
    ? filterClassesByProfile(data.classes || [], profile)
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

  const items = [...todayClasses, ...todayEvents].sort((a, b) => {
    if (a.sortMin === null && b.sortMin === null) return 0;
    if (a.sortMin === null) return -1;
    if (b.sortMin === null) return 1;
    return a.sortMin - b.sortMin;
  });

  return { items, holiday };
}

// ─── Today View ───
function TodayView({ data, onJumpToTab, profile }) {
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
  const cached = loadTodayCache();
  const [weather, setWeather] = useState(cached.weather || null);
  const [dolar, setDolar] = useState(cached.dolar || null);

  useEffect(() => {
    const c = loadTodayCache();
    const fresh = (entry) => entry && entry.ts && (Date.now() - entry.ts < TODAY_CACHE_TTL);

    let nextCache = { ...c };

    if (!fresh(c.weather)) {
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

  const { items, holiday } = getTodayItems(data, profile);
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
      }}>{profile && profile.name ? `${greeting.es}, ${profile.name}` : greeting.es}</div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontStyle: "italic",
        fontSize: 16, color: C.fog, marginTop: 4,
      }}>{dateLabel}</div>
    </div>
  );

  // ── Quick-stats row ──
  const statTile = (children, key) => (
    <div key={key} className="bap-press" style={{
      flex: 1, background: C.white, border: `1px solid ${C.fog}`,
      borderRadius: 12, padding: "12px 14px", minWidth: 0,
    }}>{children}</div>
  );

  const weatherAlert = weather ? computeWeatherAlert(weather) : null;

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
  );

  const dolarTile = statTile(
    dolar && dolar.venta ? (
      <>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9.5, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 4,
        }}>Dólar blue</div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700,
          color: C.pepBlue, lineHeight: 1,
        }}>{formatPesos(dolar.venta)}</div>
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
  if (items.length === 0 && !suppressEmptyForHoliday) {
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
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
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
      background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
      padding: "14px 16px",
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: C.ocean,
        textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span>¿Sabías que…?</span>
      </div>
      <div className={`bap-tip-text${tipFading ? " fading" : ""}`} style={{
        fontFamily: "'Roboto', sans-serif", fontSize: 13.5, lineHeight: 1.5,
        color: C.pepBlack, minHeight: 40,
      }}>{renderTip(tip.text)}</div>
    </div>
  );

  return (
    <div>
      {greetingStrip}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {weatherTile}
        {dolarTile}
      </div>
      <AnnouncementBanner announcements={data.announcements} />
      <BirthdayCard birthdays={data.birthdays} />
      {holidayCard}
      {activityCard}
      <EventsTodayTile data={data} onJumpToTab={onJumpToTab} />
      {tipCard}
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
                {a.link && (
                  <a
                    href={a.link}
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
//   - 2 people:  bilingual title with both names joined ("María y Carlos")
//   - 3+ people: generic "¡Feliz cumple!" header with names listed
//                beneath in a single comma-joined line
// Year of birth (if present in the source data) is intentionally
// stripped during parsing — the app never displays or computes age.
function BirthdayCard({ birthdays }) {
  const today = findTodayBirthdays(birthdays);
  if (today.length === 0) return null;
  const names = today.map((b) => b.name);

  let titleEs;
  let titleEn;
  let listLine = null;
  if (names.length === 1) {
    titleEs = `¡Feliz cumple, ${names[0]}!`;
    titleEn = `Happy birthday, ${names[0]}`;
  } else if (names.length === 2) {
    titleEs = `¡Feliz cumple a ${joinSpanish(names)}!`;
    titleEn = `Happy birthday, ${joinEnglish(names)}`;
  } else {
    titleEs = "¡Feliz cumple!";
    titleEn = "Happy birthday";
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
        }}>{titleEs}</div>
        <div style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic",
          fontSize: 14, color: C.mountain, marginTop: 2, lineHeight: 1.25,
        }}>{titleEn}</div>
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

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = toDateStr(today);
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

  // Filter events that overlap this week (handles multi-day events)
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
  // and never rendered on a day that has a holiday event.
  const showClasses = shouldFilterClasses(profile);
  const visibleClasses = showClasses
    ? filterClassesByProfile(data.classes || [], profile)
    : [];
  const classesByDow = {};
  if (showClasses) {
    DAYS_ORDER.forEach((dow) => {
      classesByDow[dow] = visibleClasses
        .filter((c) => c.days && c.days.includes(dow))
        .sort((a, b) =>
          getSortTime(a.time, dow).localeCompare(getSortTime(b.time, dow))
        );
    });
  }

  const weekLabel = `${formatDate(weekStartStr)} – ${formatDate(weekEndStr)}`;

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => setWeekOffset((o) => o - 1)} style={{
          background: "none", border: `1px solid ${C.fog}`, borderRadius: 8, padding: "6px 12px",
          cursor: "pointer", fontSize: 16, color: C.pepBlue, fontWeight: 700,
        }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.stone, letterSpacing: 0.5 }}>{weekLabel}</div>
          {weekOffset === 0 && (
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: C.ocean, fontWeight: 500, marginTop: 2 }}>This Week</div>
          )}
        </div>
        <button onClick={() => setWeekOffset((o) => o + 1)} style={{
          background: "none", border: `1px solid ${C.fog}`, borderRadius: 8, padding: "6px 12px",
          cursor: "pointer", fontSize: 16, color: C.pepBlue, fontWeight: 700,
        }}>›</button>
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
          // personalized AND (b) the day's holiday (if any) cancels
          // classes. Cultural observances (cancels_classes=false) do
          // NOT suppress classes. Class Schedule's own week view
          // stays unaffected; this is only for the weekly overview.
          const dayClasses = (showClasses && !cancelsClasses)
            ? (classesByDow[dow] || [])
            : [];
          const hasContent = dayEvents.length > 0 || dayClasses.length > 0 || !!holidayContext;

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

              {/* Events + classes for the day. Events render first
                  (they're typically time-blocked program events that
                  reshape the day's schedule); classes follow as a
                  thinner secondary list with a faint top divider. */}
              {(dayEvents.length > 0 || dayClasses.length > 0) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dayEvents.map((e, i) => {
                    // Skip legacy holiday events when there's already a
                    // Holidays-tab row driving the holiday banner above.
                    if (holidayContext && holidayContext.source === "legacy" && e.type === "holiday") return null;
                    const s = EVENT_STYLES[e.type] || EVENT_STYLES.academic;
                    const isMulti = e.end_date && e.end_date > e.date;
                    const timeStr = e.start_time
                      ? (e.end_time ? `${e.start_time}–${e.end_time}` : e.start_time)
                      : "";
                    return (
                      <div key={i} style={{
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
                  })}

                  {dayClasses.map((c, i) => {
                    const t = getTimeForDay(c.time, dow);
                    return (
                      <div key={`cls-${i}`} style={{
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
      {section === "overview" && <WeeklyOverviewView data={data} profile={profile} />}
      {(section === "week" || section === "list") && <ClassScheduleView data={data} view={section} profile={profile} />}
    </div>
  );
}

// ─── Calendar ───
function CalendarView({ data }) {
  const [filter, setFilter] = useState("all");
  const types = ["all", ...Object.keys(EVENT_STYLES)];
  const events = data.calendarEvents
    .filter((e) => filter === "all" || e.type === filter)
    .filter((e) => e.visibility !== "week")
    .sort((a, b) => a.date.localeCompare(b.date));

  const grouped = {};
  events.forEach((e) => {
    const mk = e.date.slice(0, 7);
    if (!grouped[mk]) grouped[mk] = [];
    grouped[mk].push(e);
  });

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
                return (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Address → Google Maps Link ───
// Renders an address as a tappable link that opens Google Maps (native app on
// mobile; maps.google.com on desktop). If `mapsUrl` is provided (e.g. from the
// spreadsheet's maps column), it takes precedence; otherwise the address is
// auto-encoded into a Google Maps search URL.
function AddressLink({ address, mapsUrl }) {
  if (!address) return null;
  const href = mapsUrl && mapsUrl.trim()
    ? mapsUrl.trim()
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
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
  if (!url) return null;
  let label = "Visit website";
  let icon = "→";
  let external = true;
  if (url.includes("wa.me")) { label = "WhatsApp"; icon = "💬"; }
  else if (url.includes("instagram.com")) { label = "Instagram"; icon = "📷"; }
  else if (url.startsWith("tel:")) { label = "Call"; icon = "📞"; external = false; }
  return (
    <a href={url} target={external ? "_blank" : undefined} rel="noopener noreferrer" style={{
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

  // Hide events that have already ended; sort chronologically.
  const upcoming = sortEventsChronological(filterUpcomingEvents(events, todayStr));

  // Apply category filter if the student picked one.
  const visible = activeFilter === "all" ? upcoming : upcoming.filter((e) => e.category === activeFilter);

  // Filter pills only show when 2+ categories are actually present.
  const showPills = (categoriesPresent || []).length > 1;

  // Group events into "This week" (today through +7d) vs "Coming up" so
  // students see the most actionable rows first without losing the rest.
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = toDateStr(weekEnd);
  const thisWeek = visible.filter((e) => e.start_date <= weekEndStr);
  const later = visible.filter((e) => e.start_date > weekEndStr);

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
            {thisWeek.map((e, i) => <EventCard key={`tw-${i}`} event={e} />)}
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
            {later.map((e, i) => <EventCard key={`lt-${i}`} event={e} />)}
          </div>
        </>
      )}
    </div>
  );
}

function EventCard({ event }) {
  const meta = getEventCategory(event.category);
  const Icon = meta.Icon;
  const dateLabel = eventDateLabel(event);

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
            </span>
          )}
          {event.link && <LinkButton url={event.link} />}
        </div>
      </div>
    </div>
  );
}

// ─── Today tile: Esta semana ───
// Compact preview for the Today dashboard. Shows the next 1-2 upcoming
// events from the weekly window. Renders nothing when no events are
// populated for the week, so weeks without curated content stay clean.
function EventsTodayTile({ data, onJumpToTab }) {
  const events = getThisWeekEvents(data);
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
                  {a.ios_url && (
                    <a href={a.ios_url} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                      background: C.white, border: `1px solid ${C.fog}`, cursor: "pointer",
                    }}>📱 iOS</a>
                  )}
                  {a.android_url && (
                    <a href={a.android_url} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                      background: C.white, border: `1px solid ${C.fog}`, cursor: "pointer",
                    }}>🤖 Android</a>
                  )}
                  {a.web_url && !a.ios_url && !a.android_url && (
                    <a href={a.web_url} target="_blank" rel="noopener noreferrer" style={{
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
              {p.link && (
                <a href={p.link} target="_blank" rel="noopener noreferrer" style={{
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
  const styles = {
    phone: { bg: C.ice, color: C.ocean, border: C.fog },
    whatsapp: { bg: "#E8F5E9", color: "#2E7D32", border: "#C8E6C9" },
    email: { bg: C.ice, color: C.ocean, border: C.fog },
    maps: { bg: C.ice, color: C.ocean, border: C.fog },
    emergency: { bg: "#FFF3E0", color: "#BF360C", border: "#FFCC80" },
  };
  const s = styles[variant] || styles.phone;
  return (
    <a href={href} target={variant === "maps" || variant === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" style={{
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

// ─── Profile / settings modal ───
// Full-screen overlay (within the 480px column) where a student sets
// their first name, ticks the courses they're enrolled in, and toggles
// "Show only my classes". Reads/writes the profile via the onChange
// callback so the App owns the source of truth.
function ProfileModal({ open, onClose, profile, onChange, classes }) {
  if (!open) return null;

  const sortedClasses = [...(classes || [])].sort((a, b) => a.code.localeCompare(b.code));
  const enrolledSet = new Set(profile.enrolledClasses || []);

  const setName = (v) => onChange({ ...profile, name: v });
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
  const clearAll = () => onChange({
    ...profile,
    name: "",
    enrolledClasses: [],
    filterEnabled: false,
    dismissedAnnouncements: [],
  });

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
          {/* Name */}
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
              letterSpacing: 1.5, color: C.stone, marginBottom: 8,
            }}>First name</div>
            <input
              type="text"
              value={profile.name || ""}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. María"
              maxLength={40}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${C.fog}`, background: C.white,
                fontFamily: "'EB Garamond', serif", fontSize: 16, color: C.pepBlack,
                outline: "none",
              }}
            />
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.stone, marginTop: 6 }}>
              Used in your daily greeting on the Today screen.
            </div>
          </div>

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
// MAIN APP
// ============================================================

export default function App() {
  const [tab, setTab] = useState("today");

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
    if (!SHEET_ID) return;
    fetchAllData()
      .then((d) => {
        setData(d);
        setStatus("live");
        saveCache(d);
      })
      .catch((err) => {
        console.error("Sheet fetch failed:", err);
        // If we were already showing cached data, keep it on screen.
        // Otherwise drop to the hardcoded defaults.
        setStatus((prev) => (prev === "refreshing" ? "cached" : "fallback"));
      });
  }, []);

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
      <div style={{ flex: 1, padding: "20px 16px 100px", overflowY: "auto" }}>
        {status === "loading" ? (
          <LoadingScreen tips={data.tips} />
        ) : (
          <>
            {tab !== "today" && <SectionTitle tabKey={tab} />}
            {tab === "today" && <TodayView data={data} onJumpToTab={setTab} profile={profile} />}
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
      />
    </div>
  );
}
