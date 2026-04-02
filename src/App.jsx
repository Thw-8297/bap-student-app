import { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";

// ============================================================
// ★ CONFIGURATION — Only edit this section ★
// ============================================================
// STEP 1: Upload the template spreadsheet to Google Sheets
// STEP 2: File > Share > Publish to web > Entire Document > CSV
// STEP 3: Paste JUST the spreadsheet ID below (the long string
//         between /d/ and /edit in your Google Sheets URL)
//
// Example URL: https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit
// You'd paste: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ

const SHEET_ID = "1Bn1wpsKr6-3eXRZtH-_6IxmTiQA4I157-nt-0tdmyaA";  // ← Paste your Google Sheet ID here

// ============================================================
// DEFAULT DATA — Used when no Google Sheet is connected
// ============================================================

const DEFAULT_DATA = {
  semester: "Fall 2026",
  classes: [
    { code: "IES 300", title: "Argentine History & Society", professor: "Prof. García", days: ["Mon", "Wed"], time: "9:00–10:30", location: "Classroom A", color: "#0057B8", email: "garcia@pepperdine.edu" },
    { code: "SPA 201", title: "Intermediate Spanish II", professor: "Prof. Martínez", days: ["Mon", "Tue", "Thu"], time: "11:00–12:00", location: "Classroom B", color: "#64B5F6", email: "martinez@pepperdine.edu" },
    { code: "REL 100", title: "The Way of Jesus", professor: "Prof. Smith", days: ["Tue", "Thu"], time: "14:00–15:30", location: "Classroom A", color: "#425563", email: "smith@pepperdine.edu" },
    { code: "COM 300", title: "Intercultural Communication", professor: "Prof. Álvarez", days: ["Wed", "Fri"], time: "14:00–15:30", location: "Classroom C", color: "#6CACE4", email: "alvarez@pepperdine.edu" },
    { code: "ART 280", title: "Tango & Argentine Arts", professor: "Prof. Reyes", days: ["Fri"], time: "10:00–12:30", location: "Studio", color: "#E35205", email: "reyes@pepperdine.edu" },
  ],
  calendarEvents: [
    { date: "2026-08-10", title: "Arrival Day", type: "milestone", description: "Airport pickup and welcome dinner" },
    { date: "2026-08-11", title: "Orientation begins", type: "milestone", description: "Three-day orientation program" },
    { date: "2026-08-14", title: "Classes begin", type: "academic", description: "First day of classes" },
    { date: "2026-08-17", title: "Día del Paso a la Inmortalidad del Gral. San Martín", type: "holiday", description: "National holiday — no classes" },
    { date: "2026-09-05", title: "Mendoza Excursion", type: "excursion", description: "Three-day trip to Mendoza wine region" },
    { date: "2026-09-21", title: "Día del Estudiante", type: "holiday", description: "Student Day — no classes" },
    { date: "2026-10-09", title: "Midterm exams begin", type: "academic", description: "Midterms through Oct 16" },
    { date: "2026-10-12", title: "Día del Respeto a la Diversidad Cultural", type: "holiday", description: "National holiday" },
    { date: "2026-11-07", title: "Iguazú Falls Excursion", type: "excursion", description: "Weekend trip to Iguazú Falls" },
    { date: "2026-11-20", title: "Día de la Soberanía Nacional", type: "holiday", description: "National holiday" },
    { date: "2026-12-04", title: "Final exams begin", type: "academic", description: "Finals through Dec 11" },
    { date: "2026-12-12", title: "Farewell Dinner", type: "milestone", description: "End-of-semester celebration" },
    { date: "2026-12-13", title: "Departure Day", type: "milestone", description: "Airport transfers" },
  ],
  healthProviders: [
    { name: "Clínica Zabala (Swiss Medical)", type: "Hospital/Clinic", address: "Av. Cabildo 1295, Belgrano", phone: "+54 11 5236-8500", notes: "24hr emergency; Swiss Medical Group", link: "https://www.swissmedical.com.ar/clinewsite/zabala/" },
    { name: "Dr. Alejandra Vidal", type: "General Practitioner", address: "Consultorio: Av. Santa Fe 2340, 3B", phone: "+54 9 11 4419-7092", notes: "English-speaking; house calls available", link: "https://wa.me/5491144197092" },
    { name: "Farmacia Belgrano", type: "Pharmacy", address: "Av. Cabildo 1502, Belgrano", phone: "+54 11 4783-0021", notes: "24hr pharmacy; accepts most insurance", link: "" },
  ],
  churches: [
    { name: "Saddleback Buenos Aires", denomination: "Non-denom.", address: "Mario Bravo 559", service: "11AM, 5PM, 7PM (Spanish & English)", notes: "35 mins by subte/bus", link: "https://saddleback.com/visit/locations/buenos-aires" },
    { name: "Catedral Metropolitana", denomination: "Catholic", address: "San Martín 27, Microcentro", service: "Mon–Sat 8:00, 10:00; Sun 9:00, 11:00, 18:00", notes: "Historic cathedral on Plaza de Mayo", link: "" },
    { name: "Iglesia Bautista del Centro", denomination: "Baptist", address: "Av. Rivadavia 3268, Balvanera", service: "Sun 10:30 (Spanish), 17:00 (English)", notes: "Active young adults ministry", link: "https://wa.me/5491155551234" },
    { name: "Comunidad Cristiana", denomination: "Evangelical", address: "Av. Medrano 951, Almagro", service: "Sun 11:00 (Spanish)", notes: "Young congregation; contemporary worship", link: "" },
  ],
  policies: [
    { title: "Independent Travel", content: "Students may travel independently on weekends and during break. A travel form must be submitted 48 hours in advance via the program portal. Group travel of 2+ is strongly encouraged.", link: "https://example.com/handbook/travel-policy" },
    { title: "Curfew", content: "There is no formal curfew, but students must be reachable by phone at all times. Quiet hours in the residences are 11:00 PM – 7:00 AM.", link: "" },
    { title: "Attendance", content: "Attendance is mandatory for all classes and program excursions. Two unexcused absences per course may result in a grade reduction.", link: "https://example.com/handbook/attendance" },
    { title: "Emergency Contact", content: "Program Director is available 24/7 at the emergency number provided during orientation. In a life-threatening emergency, call 107 (SAME ambulance) or 911.", link: "https://example.com/handbook/emergency" },
  ],
  contacts: [
    { name: "Buenos Aires Program", role: "Program Office", phone: "+54 11 5555-1234", whatsapp: "", email: "bap@pepperdine.edu", address: "Av. Callao 1234, Recoleta, Buenos Aires", maps: "https://maps.google.com/?q=Av.+Callao+1234,+Recoleta,+Buenos+Aires", type: "office" },
    { name: "Emergency Line", role: "24/7 Emergency", phone: "+54 9 11 5555-9999", whatsapp: "https://wa.me/5491155559999", email: "", address: "", maps: "", type: "emergency" },
    { name: "John Smith", role: "Program Director", phone: "+54 9 11 5555-0001", whatsapp: "https://wa.me/5491155550001", email: "john.smith@pepperdine.edu", address: "", maps: "", type: "staff" },
    { name: "María López", role: "Student Life Coordinator", phone: "+54 9 11 5555-0002", whatsapp: "https://wa.me/5491155550002", email: "maria.lopez@pepperdine.edu", address: "", maps: "", type: "staff" },
  ],
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

async function fetchAllData() {
  const [settingsRaw, classesRaw, calendarRaw, healthRaw, churchesRaw, policiesRaw, contactsRaw] =
    await Promise.all([
      fetchTab("Settings"),
      fetchTab("Classes"),
      fetchTab("Calendar"),
      fetchTab("Health"),
      fetchTab("Churches"),
      fetchTab("Policies"),
      fetchTab("Contacts"),
    ]);

  const settings = {};
  settingsRaw.forEach((r) => { if (r.Key && r.Value) settings[r.Key.trim()] = r.Value.trim(); });

  return {
    semester: settings.semester || "Fall 2026",
    classes: classesRaw.filter(r => r.code).map((r) => ({
      code: r.code.trim(),
      title: r.title.trim(),
      professor: r.professor.trim(),
      days: r.days.split(",").map((d) => d.trim()),
      time: r.time.trim(),
      location: r.location.trim(),
      color: r.color ? r.color.trim() : "#64B5F6",
      email: r.email ? r.email.trim() : "",
    })),
    calendarEvents: calendarRaw.filter(r => r.date).map((r) => ({
      date: r.date.trim(),
      title: r.title.trim(),
      type: r.type.trim(),
      description: r.description ? r.description.trim() : "",
    })),
    healthProviders: healthRaw.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      type: r.type ? r.type.trim() : "",
      address: r.address ? r.address.trim() : "",
      phone: r.phone ? r.phone.trim() : "",
      notes: r.notes ? r.notes.trim() : "",
      link: r.link ? r.link.trim() : "",
    })),
    churches: churchesRaw.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      denomination: r.denomination ? r.denomination.trim() : "",
      address: r.address ? r.address.trim() : "",
      service: r.service ? r.service.trim() : "",
      notes: r.notes ? r.notes.trim() : "",
      link: r.link ? r.link.trim() : "",
    })),
    policies: policiesRaw.filter(r => r.title).map((r) => ({
      title: r.title.trim(),
      content: r.content ? r.content.trim() : "",
      link: r.link ? r.link.trim() : "",
    })),
    contacts: contactsRaw.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      role: r.role ? r.role.trim() : "",
      phone: r.phone ? r.phone.trim() : "",
      whatsapp: r.whatsapp ? r.whatsapp.trim() : "",
      email: r.email ? r.email.trim() : "",
      address: r.address ? r.address.trim() : "",
      maps: r.maps ? r.maps.trim() : "",
      type: r.type ? r.type.trim() : "staff",
    })),
  };
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

// ============================================================
// LOGO (base64-encoded SVG)
// ============================================================

const LOGO_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiB2aWV3Qm94PSIwIDAgMzc1IDM3NSI+PGRlZnM+PGNsaXBQYXRoIGlkPSJhIj48cGF0aCBkPSJNMTg3LjUgMGExODcuNiAxODcuNiAwIDEgMC0uMiAzNzUuMkExODcuNiAxODcuNiAwIDAgMCAxODcuNSAwbTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJjIj48cGF0aCBkPSJNMCAwaDM3NXYzNzVIMFptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImQiPjxwYXRoIGQ9Ik0xODcuNSAwYTE4Ny42IDE4Ny42IDAgMSAwLS4yIDM3NS4yQTE4Ny42IDE4Ny42IDAgMCAwIDE4Ny41IDBtMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImIiPjxwYXRoIGQ9Ik0wIDBoMzc1djM3NUgweiIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJlIj48cGF0aCBkPSJNOS4zIDkuNWgzNTYuNHYzNTYuNEg5LjNabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJmIj48cGF0aCBkPSJNMTg3LjUgOS41YTE3OC4xIDE3OC4xIDAgMSAwLS4yIDM1Ni4yIDE3OC4xIDE3OC4xIDAgMCAwIC4yLTM1Ni4ybTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJoIj48cGF0aCBkPSJNLjMuNWgzNTYuNHYzNTYuM0guM1ptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImkiPjxwYXRoIGQ9Ik0xNzguNS41YTE3OC4xIDE3OC4xIDAgMSAwLS4yIDM1Ni4yQTE3OC4xIDE3OC4xIDAgMCAwIDE3OC41LjVtMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImciPjxwYXRoIGQ9Ik0wIDBoMzU3djM1N0gweiIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJqIj48cGF0aCBkPSJNMTYgMjIzLjNoMzQzdjEzNS44SDE2Wm0wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0iayI+PHBhdGggZD0iTTE2IDE2LjJoMzQzdjEzNC4ySDE2Wm0wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0ibCI+PHBhdGggZD0iTTEzLjggMTU3LjZoMzQ3LjR2NTkuOEgxMy44Wm0wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0ibiI+PHBhdGggZD0iTS44LjZoMzQ3LjR2NTkuOEguOFptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9Im0iPjxwYXRoIGQ9Ik0wIDBoMzQ5djYxSDB6Ii8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9Im8iPjxwYXRoIGQ9Ik03Ny4zIDc3LjRIMjk4djIyMC4ySDc3LjNabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJwIj48cGF0aCBkPSJNMTg3LjUgNzcuNGExMTAuMiAxMTAuMiAwIDEgMC0uMSAyMjAuMyAxMTAuMiAxMTAuMiAwIDAgMCAuMS0yMjAuM20wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0iciI+PHBhdGggZD0iTS4zLjRoMjIwLjV2MjIwLjJILjNabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJzIj48cGF0aCBkPSJNMTEwLjUuNGExMTAuMiAxMTAuMiAwIDEgMC0uMSAyMjAuM0ExMTAuMiAxMTAuMiAwIDAgMCAxMTAuNS40bTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJxIj48cGF0aCBkPSJNMCAwaDIyMXYyMjFIMHoiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0idCI+PHBhdGggZD0iTTg1LjEgODZoMjA0Ljd2MjAzSDg1LjFabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJ1Ij48cGF0aCBkPSJNMTg3LjUgODZhMTAxLjcgMTAxLjcgMCAxIDAtLjEgMjAzLjQgMTAxLjcgMTAxLjcgMCAwIDAgLjEtMjAzLjRtMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9InYiPjxwYXRoIGQ9Ik0uMy42aDIwNC43djIwM0guM1ptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9InciPjxwYXRoIGQ9Ik0xMDIuNy42YTEwMS43IDEwMS43IDAgMSAwLS4xIDIwMy40QTEwMS43IDEwMS43IDAgMCAwIDEwMi43LjZtMCAwIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgY2xpcC1wYXRoPSJ1cmwoI2EpIj48ZyBjbGlwLXBhdGg9InVybCgjYikiPjxnIGNsaXAtcGF0aD0idXJsKCNjKSI+PGcgY2xpcC1wYXRoPSJ1cmwoI2QpIj48cGF0aCBmaWxsPSIjMDAyMDViIiBkPSJNMCAwaDM3NXYzNzVIMHoiLz48L2c+PC9nPjwvZz48L2c+PGcgY2xpcC1wYXRoPSJ1cmwoI2UpIj48ZyBjbGlwLXBhdGg9InVybCgjZikiPjxnIGNsaXAtcGF0aD0idXJsKCNnKSI+PGcgY2xpcC1wYXRoPSJ1cmwoI2gpIj48ZyBjbGlwLXBhdGg9InVybCgjaSkiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0wIDBoMzU3djM1N0gweiIvPjwvZz48L2c+PC9nPjwvZz48L2c+PGcgY2xpcC1wYXRoPSJ1cmwoI2opIiBmaWxsPSIjNjRiNWY2Ij48cGF0aCBkPSJNMjQzIDczLjdsMTMuMS0yNSA2LjIgMy4zLTEzIDI1Wk0yMjUuOCA5MS42bC04LjUtNy0zLjUgNC41IDguNCA3LTMuOCAzLjEtOC40LTctMy41IDQuNCA4LjUgNy0zLjggMy4xLTEyLjEtMTQuNyAxOC0xNC41IDEyIDE0LjhabTE3LjctMTQuMy01LjUtNC40IDE3LjUtMjIgNS43IDQuNS0xIDIyLTExLjIgMTQtNS40LTQuMyAxNy41LTIyLjEgNS43IDQuNS0xIDIyWm0yMC44IDMxLjctNy04LjctMy45IDMuMiA2IDcuNC00LjcgMy44LTYtNy40LTMuOSAzIDcgOC43LTQuNyAzLjktMTEuNC0xNC4xIDIyLTE3LjcgMTEuMyAxNFpNNjQgMjU2LjlxLjcgNS0zLjggNy4yYTcgNyAwIDAgMS02IC42cS0zLTEuMS00LjctNC4zbC02LTExLjMgMjUtMTMuMiA1LjMgMTBhOSA5IDAgMCAxIDEgNi4zcS0uOSAzLTQgNC44LTMuNyAyLTYuOC0uMW0zLjUtNC44YTMgMyAwIDAgMCAxLjMtNC40bC0yLjMtNC4yLTUuNiAzIDIuMiA0LjJxLjcgMS4yIDIgMS43YTMgMyAwIDAgMCAyLjQtLjNtLTEzLjggNWEzLjMgMy4zIDAgMCAwIDQuNCAxLjVxMS4yLS42IDEuNi0xLjkuMy0xLjMtLjMtMi41bC0yLjktNS41LTUuNiAzWk02Ny42IDI4N2ExMiAxMiAwIDAgMS0zLjMtOC4xcS0uMS00LjMgMi45LTdsMTQuNS0xMi40IDMuOCA0LjUtMTMuNyAxMS43YTUgNSAwIDAgMC0xLjggMy43cTAgMi4zIDEuNSA0LjEgMS42IDEuOSAzLjkgMi4xdDMuOS0xLjJMOTMgMjcyLjdsMy44IDQuNC0xNC41IDEyLjVhOCA4IDAgMCAxLTcuMyAxLjlxLTQuMi0uOC03LjQtNC42bTQ1LjggOS45LTkuMi03LTMuOCA1IDcuOSA2LTMuMiA0LjItNy44LTYtMy44IDUgOSA3LTMgNC0xMy45LTEwLjQgMTcuMS0yMi41IDEzLjggMTAuNVptMjYuOCA3LjggNS4zIDIuNS0xMS43IDI1LjYtNS41LTIuNS00LjgtMjMuNi04IDE3LjgtNS40LTIuNSAxMS43LTI1LjYgNS41IDIuNSA0LjkgMjMuNVptMjAuNyAzNS4xcS02LTEtOS40LTZBMTQgMTQgMCAwIDEgMTQ5IDMyM2ExNCAxNCAwIDAgMSA2LTkuNHE0LjctMy41IDEwLjctMi41YTE0IDE0IDAgMCAxIDkuNCA1LjlxMy40IDQuOCAyLjUgMTAuOC0xIDUuOS02IDkuNGExNCAxNCAwIDAgMS0xMC43IDIuNW0xLTUuN3EzLjUuNyA2LjUtMS41IDIuOC0yIDMuNS01LjcuNy0zLjYtMS41LTYuNWE4IDggMCAwIDAtNS43LTMuNXEtMy42LS42LTYuNSAxLjRhOSA5IDAgMCAwLTMuNSA1LjdxLS43IDMuNyAxLjQgNi42dDUuNyAzLjVtMzQuOCA3LjZhMTIgMTIgMCAwIDEtMTAuOC01LjZsNC42LTMuM3EuOCAxLjcgMi40IDIuN2E2IDYgMCAwIDAgMy41LjhxMS43IDAgMi44LTEgMS0uNy44LTIuMSAwLTEuNS0xLjQtMi4zdC0zLjQtMS41bC00LTEuMmE4IDggMCAwIDEtMy40LTIuNCA3IDcgMCAwIDEtMS42LTQuNHEtLjItMy44IDIuMy02YTkgOSAwIDAgMSA2LTIuNiAxMSAxMSAwIDAgMSA4LjggMy40bC0zLjcgMy45cS0yLjItMi40LTQuOC0yLjItMS4zIDAtMi4xLjgtMSAuOC0uOCAyIDAgMSAuOCAxLjguOC42IDIgMS4xbDIuNi44YTI1IDI1IDAgMCAxIDUuNSAyLjRxMS4yLjkgMiAyLjRhOSA5IDAgMCAxIDEgMy43cS4xIDMuNy0yLjUgNi4xdC02LjYgMi43bTU1LjItMTMuOC0zLjgtNC40LTExLjYgNC41djUuOWwtNS45IDIuMy40LTMwLjQgNi0yLjQgMjAuOSAyMi4yWm0tMTUuNS01LjEgOC4yLTMuMi04LjQtOS40Wm0zMC4xLTIuNy0xNC43LTI0IDUtMyAxNC43IDI0Wm0xOS4xLTI4LjQgMTMuNyAzLjctNS4yIDQuNC0xMi41LTMuOS0yIDEuOCA3LjIgOC40LTQuNSAzLjgtMTguMy0yMS4zIDguOS03LjdhOCA4IDAgMCAxIDYuMS0ycTMuNS4zIDUuOCAzYTggOCAwIDAgMSAuOCA5LjhtLTUuNC0xYTMuNSAzLjUgMCAwIDAgLjUtNSAzIDMgMCAwIDAtMi40LTEuMnEtMS40IDAtMi42LjlsLTMuOSAzLjMgNC42IDUuM1ptMTguNy0zMS4yLTcgOSA1IDMuOSA2LTcuOCA0IDMuMi02IDcuOCA1IDMuOSA3LTkgNC4xIDMuMS0xMC42IDEzLjctMjIuMy0xNy40IDEwLjctMTMuNlptMjguNy0zLjRhMTIgMTIgMCAwIDEtMTAuMyA2LjRsLS40LTUuNnExLjggMCAzLjUtLjggMS41LS45IDIuNC0yLjYuOC0xLjcuMi0zLjQtLjYtMS41LTIuMS0yLjYtMS42LTEtMy4yLS4yLS45LjQtMi4yIDEuMmwtMi44IDMuNS01LTMuOSAxNS4yLTE5LjRhMTIgMTIgMCAwIDEgOC45LTIuOHEzIDEgNC40IDN0LjkgNC44cTAgMS44LTEuNCAzLjQtMS41IDEuOC0zLjQgMi4zIDEuNS4zIDMgMS40dDIuMyAyLjVxMS4yIDEuNyAxLjIgNC4xIDAgMi40LTEuNSA1LTEuNCAyLjQtMy44IDMuOGExMiAxMiAwIDAgMS01LjIgMS41bTMuNi00LjhhMy41IDMuNSAwIDAgMCAxLjMtNSAzIDMgMCAwIDAtMi40LTEuMnEtMS40IDAtMi42LjlsLTMuOSAzLjMgNC42IDUuM1ptLTctOC43YTMgMyAwIDAgMCAxLjMtNC40IDIuNiAyLjYgMCAwIDAtMi0xcS0xLjMgMC0yLjUuOGwtMy4zIDIuOCA0IDQuNlptMjcuNS0yMy4xYTQgNCAwIDAgMC0xLjQtMS42cS0uNy0uNC0xLjYtLjQtMS43IDAtMy4xIDEuNUwzMjIgMjM5bDQgNC42IDYuNS04LjNxMS4zLTEuNyAxLjQtMy4xIDAtMS40LS42LTIuMnQwIDBNMzE2IDI1Ny4xbDUuNiA0LjRhMTIuNiAxMi42IDAgMCAxLTExIDUuOHEtMy42LS44LTYuMy0zLjktMy43LTQuMi0zLjctOS4ycTAtNS4yIDQuMS05LjVhMTMgMTMgMCAwIDEgOS42LTQuOCAxMiAxMiAwIDAgMSA4LjkgNC41bC04LjEgMTAuNS03LjYtNS45LTIuOCAzLjVhNiA2IDAgMCAwLTEuNiA0LjJxMCAyLjYgMS44IDQuNyAxLjYgMS45IDMuOSAyLjF0My45LTEuMmwyLjMtMy0xLjctMS40Wk0yODUuNiAyMjUuN2w1IDMuOS04LjcgMTEuMSA4LjcgNi43LTMuOCA0LjktOC43LTYuOC04LjcgMTEtNS0zLjkgMjAtMjUuOW0tMjAuOC0xNS40IDUgMy45LTguNyAxMS4yIDguNyA2LjctMy44IDQuOC04LjctNi44LTguNiAxMS01LTMuOSAyMC0yNS45bS0yMS0xNS4xaDdhMTguNCAxOC40IDAgMCAxLS4zIDkuMnEtLjggMy4xLTIuNyA1LTEuMiAxLjMtMyAyLTIgLjYtNC4yLjgtNC42LjMtNi42LTIuN2E4IDggMCAwIDEtMy42LTUuMSA5IDkgMCAwIDEtMi40LTYuMyA4IDggMCAwIDAgMi40LTUuOHEyLjQtMS41IDMuNC0xLjUgMi42LjEgMy42LjcgMi40IDEuNSAzLjQgNC40Wm0tNS41LS4yLTIuOC0uNy0xLjgtLjNxLTEuMSAwLTIuMSAxLjItMS4xIDEuMy0xLjEgMy4xIDAgMi43IDEuNSAzLjdMMjQwIDE5NS40Wm0tLjYgMTIuMi0zLjgtMi40YTkgOSAwIDAgMS0xLjMgMS4xcS0uNC44LS40IDEuNXQuOSAyLjIgMS44IDEuM3EuOC4zIDEuOC4yIDIgMCAzLjctMi41IDEuNi0yLjUuNC0yLjQtLjItLjItLjUtLjYtLjMtLjZtMjUuOS0yOS40LTUgMTkuMS0uOCAyLjVxLjIuNy43LjkuNy41IDEuNC41IDEgMCAyLjItMS41bDEuOCA0LjFhMTEgMTEgMCAwIDEtNC41IDIuNXEtMi4yLjYtMy42LS4xYTUgNSAwIDAgMS0zLjItMi40IDIyIDIyIDAgMCAxLS44LTIuOHEtMi4xIDMtNC43IDQuM2EzIDMgMCAwIDEtMS4yLjFxLTEuMS0uMi0xLjctMS4xbC0uNS0xLjZxMy40LTIuMiA2LjItNS45bDUuMy0yMC44IDcuNC0xLjZNMjMwLjEgMjA5cS0uNiA0LTMuMSA2LjVhNCA0IDAgMCAwIDIuOC0yLjNxMi4xLTIuMyAyLjctNi45bC43LTIuNC0zLjMuOFptLTQzLjkgNC40cS0xLjUtLjctMi4xLS43LTIuMSAwLTQgMi40LTIgMi41LTIgNi4zIDAgMS43LjUgNC43LTUgMS4xLTcuNi00IDAgMCAwLTQgMi40Yy0uMy4zLjIuOC42LjVhMTMgMTMgMCAwIDEgNS4zLTIuNyAxMyAxMyAwIDAgMSAxMC45IDIuMWMuMy4zLjctLjQuMy0uNm0wIDAiLz48ZyBmaWxsPSIjNjRiNWY2IiBjbGlwLXBhdGg9InVybCgjdikiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM0IDE3NCkiPjxwYXRoIGQ9Ik05IDEwLjRINC43djJoMy43djIuM0g0Ljd2MS45SDl2Mi4zSDJWOC4xaDdabTUuMSA4LjZhNSA1IDAgMCAxLTQuMi0yLjRsMi4yLTEuM2EyIDIgMCAwIDAgMiAxLjNxLjYgMCAxLS4ybC4yLS42cTAtLjUtLjUtLjhsLTEuMi0uNS0xLjUtLjZhMyAzIDAgMCAxLTEuMi0xcS0uNS0uNi0uNS0xLjcgMC0xLjYgMS0yLjQgMS4yLS45IDIuNS0uOSAxIDAgMiAuNWwxLjUgMS4xLTEuNyAxLjdxLS45LTEtMS44LTFsLS42LjItLjMuNnEwIC40LjQuNy4zLjMuOS40bDIuNCAxIC45IDFxLjMuNy40IDEuNyAwIDEuNS0xLjEgMi40VDE0IDE5TTI2LjUgOHYyLjRoLTIuN1YxOWgtMi42di04LjVoLTIuN1Y4LjFabTAgMCIvPjwvZz48ZyBmaWxsPSIjNjRiNWY2IiBjbGlwLXBhdGg9InVybCgjdykiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMwNiAxNzQpIj48cGF0aCBkPSJNNS42IDE2LjdoMy42djIuMmgtN3YtMkw2LjQgMTJsLjItLjhxMC0uNS0uMy0uOGwtLjctLjItLjguM2ExIDEgMCAwIDAtLjIuOUgyLjFxLS4xLTEuNSAxLTIuNSAxLTEgMi42LTEgMS41IDAgMi40LjlhMyAzIDAgMCAxIDEgMi4ycTAgMS4zLS43IDIuMnptOC44IDIuM3EtMiAwLTMtMS40LTEtMS41LTEuMS00LjEgMC0yLjYgMS00LjEgMS4yLTEuNSAzLjEtMS41dDMgMS41YTcgNyAwIDAgMSAxIDQuMXEwIDIuNi0xIDQtMSAxLjYtMyAxLjZtMC0yLjRxLjcgMCAxLS44LjUtMSAuNS0yLjMgMC0xLjQtLjQtMi4zdC0xLS44cS0uOSAwLTEuMi44LS40IDEtLjQgMi4zIDAgMS40LjQgMi4zdDEuMS44bTkuNCAyLjNxLTIgMC0zLTEuNC0xLjItMS41LTEuMi00LjF0MS4xLTQuMSAzLTEuNXEyIDAgMyAxLjVhNyA3IDAgMCAxIDEuMSA0LjFxMCAyLjYtMSA0LTEuMSAxLjYtMyAxLjZtMC0yLjRxLjYgMCAxLS44LjQtMSAuNC0yLjMgMC0xLjQtLjQtMi4zdC0xLS44cS0uOCAwLTEuMS44LS40IDEtLjQgMi4zLS4xIDEuNC40IDIuM3QxIC44bTkuNCAyLjNxLTIgMC0zLTEuNC0xLTEuNS0xLjEtNC4xIDAtMi42IDEtNC4xIDEuMi0xLjUgMy4xLTEuNXQzIDEuNWE3IDcgMCAwIDEgMSA0LjFxMCAyLjYtMSA0LTEgMS42LTMgMS42bTAtMi40cS43IDAgMS0uOC41LTEgLjUtMi4zIDAtMS40LS40LTIuM3QtMS4xLS44LTEgLjhxLS42IDEtLjUgMi4zIDAgMS40LjQgMi4zdDEuMS44bTAgMCIvPjwvZz48L3N2Zz4=";
const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EVENT_STYLES = {
  milestone: { bg: "#FFF3E0", border: C.pepOrange, icon: "★", label: "Milestone" },
  academic:  { bg: C.ice, border: C.ocean, icon: "◆", label: "Academic" },
  excursion: { bg: "#E8F5E9", border: "#388E3C", icon: "▲", label: "Excursion" },
  holiday:   { bg: "#FCE4EC", border: "#C62828", icon: "●", label: "Holiday" },
};

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
}

// Extract the time range for a specific day from complex schedule strings
// e.g. "Mon 16:30–19:30; Tue 13:40–17:15; Thu 17:10–19:30" on "Tue" → "13:40–17:15"
// e.g. "Mon+Tue 14:00–17:15; Thu 14:40–17:10" on "Mon" → "14:00–17:15"
// e.g. "9:00–10:50" on any day → "9:00–10:50"
function getTimeForDay(timeStr, day) {
  if (!timeStr) return "";
  const t = timeStr.trim();
  // If no day names appear, it's the same time for all days
  if (!/\b(Mon|Tue|Wed|Thu|Fri)\b/.test(t)) return t;
  // Split on semicolons and find the segment matching this day
  const segments = t.split(";").map((s) => s.trim());
  for (const seg of segments) {
    // Match patterns like "Mon+Tue 14:00–17:15" or "Thu 14:40–17:10"
    const match = seg.match(/^([A-Za-z+\s]+?)\s+(\d{1,2}[:.]\d{2}.*)$/);
    if (match) {
      const days = match[1].split(/[+,\s]+/);
      if (days.some((d) => d.trim() === day)) return match[2].trim();
    }
  }
  return t; // fallback: show the full string
}

// Extract a sortable time (HH:MM) for a class on a given day
function getSortTime(timeStr, day) {
  const t = getTimeForDay(timeStr, day);
  const m = t.match(/(\d{1,2})[:.:](\d{2})/);
  if (m) return m[1].padStart(2, "0") + ":" + m[2];
  return "99:99"; // TBD goes last
}

// ============================================================
// UI COMPONENTS
// ============================================================

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20,
      border: active ? `2px solid ${C.pepBlue}` : "2px solid transparent",
      background: active ? C.pepBlue : C.ice,
      color: active ? C.white : C.mountain,
      fontFamily: "'Roboto', sans-serif", fontSize: 13, fontWeight: active ? 500 : 400,
      cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

function Card({ children, borderLeft }) {
  return (
    <div style={{
      background: C.white, borderRadius: 10, padding: 16,
      border: `1px solid ${C.fog}`, borderLeft: borderLeft ? `4px solid ${borderLeft}` : undefined,
    }}>{children}</div>
  );
}

// ─── Action button shared style ───
function ActionBtn({ href, icon, label, variant }) {
  const styles = {
    default: { bg: C.ice, border: C.fog, color: C.ocean },
    emergency: { bg: "#FFF3E0", border: "#FFCC80", color: "#E65100" },
    email: { bg: "#F3E5F5", border: "#CE93D8", color: "#6A1B9A" },
    maps: { bg: "#E8F5E9", border: "#A5D6A7", color: "#2E7D32" },
    phone: { bg: C.ice, border: C.fog, color: C.ocean },
    whatsapp: { bg: "#E8F5E9", border: "#A5D6A7", color: "#2E7D32" },
  };
  const s = styles[variant] || styles.default;
  return (
    <a href={href} target={href.startsWith("mailto:") || href.startsWith("tel:") ? "_self" : "_blank"} rel="noopener noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "'DM Mono', monospace", fontSize: 12, color: s.color,
      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
      background: s.bg, border: `1px solid ${s.border}`, cursor: "pointer",
      transition: "all 0.15s",
    }}>
      {icon} {label}
    </a>
  );
}

// ─── Schedule ───
function ScheduleView({ data }) {
  const [view, setView] = useState("week");
  const [expanded, setExpanded] = useState(null);
  const classesForDay = (day) =>
    data.classes.filter((c) => c.days.includes(day)).sort((a, b) => getSortTime(a.time, day).localeCompare(getSortTime(b.time, day)));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill active={view === "week"} onClick={() => { setView("week"); setExpanded(null); }}>Week View</Pill>
        <Pill active={view === "list"} onClick={() => { setView("list"); setExpanded(null); }}>All Courses</Pill>
      </div>
      {view === "week" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {DAYS_ORDER.map((day) => {
            const classes = classesForDay(day);
            return (
              <div key={day}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.stone, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>{day}</div>
                {classes.length === 0 ? (
                  <div style={{ padding: "10px 0", color: C.fog, fontStyle: "italic", fontSize: 14, fontFamily: "'Roboto', sans-serif" }}>No classes</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {classes.map((c) => (
                      <div key={c.code + day} style={{ display: "flex", alignItems: "stretch", background: C.white, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.fog}` }}>
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
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.classes.map((c, i) => {
            const isOpen = expanded === i;
            return (
              <div key={c.code} style={{
                background: C.white, borderRadius: 10,
                border: `1px solid ${C.fog}`, borderLeft: `4px solid ${c.color}`,
                overflow: "hidden", transition: "all 0.2s",
              }}>
                <button onClick={() => setExpanded(isOpen ? null : i)} style={{
                  width: "100%", padding: 16, background: "none", border: "none",
                  cursor: "pointer", textAlign: "left", display: "block",
                }}>
                  <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 17, color: C.pepBlue, marginBottom: 6 }}>{c.code}: {c.title}</div>
                  <div style={{ fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7 }}>
                    {c.professor}<br />
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.stone }}>{c.days.join(", ")} · {c.time}</span><br />
                    {c.location}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: C.stone, fontFamily: "'DM Mono', monospace" }}>{isOpen ? "▲ less" : "▼ more"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${C.fog}` }}>
                    {c.email ? (
                      <div style={{ marginTop: 10 }}>
                        <ActionBtn
                          href={`mailto:${c.email}`}
                          icon="✉"
                          label={`Email ${c.professor}`}
                          variant="email"
                        />
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, fontSize: 13, color: C.stone, fontStyle: "italic", fontFamily: "'Roboto', sans-serif" }}>
                        No email listed for this course.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Calendar ───
function CalendarView({ data }) {
  const [filter, setFilter] = useState("all");
  const types = ["all", ...Object.keys(EVENT_STYLES)];
  const events = data.calendarEvents
    .filter((e) => filter === "all" || e.type === filter)
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
                return (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 44, textAlign: "right", paddingTop: 2 }}>
                      <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 16, fontWeight: 700, color: C.pepBlack }}>{formatDate(e.date).split(" ")[1]}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone }}>{getDayOfWeek(e.date)}</div>
                    </div>
                    <div style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${s.border}` }}>
                      <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14, color: C.pepBlack }}>{s.icon} {e.title}</div>
                      {e.description && <div style={{ fontSize: 13, color: C.mountain, marginTop: 3, fontFamily: "'Roboto', sans-serif", lineHeight: 1.5 }}>{e.description}</div>}
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

// ─── Link Helper (for Local tab) ───
function LinkButton({ url }) {
  if (!url) return null;
  let label = "Visit website";
  let icon = "→";
  if (url.includes("wa.me")) { label = "WhatsApp"; icon = "💬"; }
  else if (url.includes("instagram.com")) { label = "Instagram"; icon = "📷"; }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
      fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
      textDecoration: "none", padding: "6px 14px", borderRadius: 8,
      background: C.ice, border: `1px solid ${C.fog}`, cursor: "pointer",
    }}>
      {icon} {label}
    </a>
  );
}

// ─── Local ───
function LocalView({ data }) {
  const [sub, setSub] = useState("health");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill active={sub === "health"} onClick={() => setSub("health")}>Health Providers</Pill>
        <Pill active={sub === "churches"} onClick={() => setSub("churches")}>Churches</Pill>
      </div>
      {sub === "health" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.healthProviders.map((h, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{h.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12 }}>{h.type}</span>
              </div>
              <div style={{ fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7 }}>
                {h.address && <>{h.address}<br /></>}
                {h.phone && <><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.stone }}>{h.phone}</span><br /></>}
                {h.notes && <em style={{ color: C.stone }}>{h.notes}</em>}
              </div>
              <LinkButton url={h.link} />
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.churches.map((ch, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{ch.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12 }}>{ch.denomination}</span>
              </div>
              <div style={{ fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7 }}>
                {ch.address}<br />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.stone }}>{ch.service}</span><br />
                <em style={{ color: C.stone }}>{ch.notes}</em>
              </div>
              <LinkButton url={ch.link} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Policies ───
function PoliciesView({ data }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.policies.map((p, i) => (
        <div key={i} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.fog}`, overflow: "hidden" }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{
            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
            fontFamily: "'EB Garamond', serif", fontSize: 15, fontWeight: 700, color: C.pepBlue, textAlign: "left",
          }}>
            {p.title}
            <span style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 12, color: C.stone }}>▼</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 16px 14px", fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7 }}>
              {p.content}
              {p.link && (
                <a href={p.link} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10,
                  fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
                  textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                  background: C.ice, border: `1px solid ${C.fog}`, cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  Read full policy in Student Handbook
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

// ─── Contacts ───
function ContactsView({ data }) {
  const office = data.contacts.filter((c) => c.type === "office");
  const emergency = data.contacts.filter((c) => c.type === "emergency");
  const staff = data.contacts.filter((c) => c.type === "staff");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Program Office */}
      {office.map((o, i) => (
        <Card key={`office-${i}`}>
          <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 17, color: C.pepBlue, marginBottom: 8 }}>{o.name}</div>
          {o.address && (
            <div style={{ fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7, marginBottom: 8 }}>
              {o.address}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {o.phone && <ActionBtn href={`tel:${o.phone.replace(/\s/g, "")}`} icon="📞" label={o.phone} variant="phone" />}
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
                {e.phone && <ActionBtn href={`tel:${e.phone.replace(/\s/g, "")}`} icon="📞" label={e.phone} variant="emergency" />}
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
                {s.phone && <ActionBtn href={`tel:${s.phone.replace(/\s/g, "")}`} icon="📞" label="Call" variant="phone" />}
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
    </div>
  );
}

// ─── Nav Icons ───
const icons = {
  schedule: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  calendar: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  local: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  policies: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  contacts: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
};

const TABS = [
  { key: "schedule", label: "Schedule", icon: icons.schedule },
  { key: "calendar", label: "Calendar", icon: icons.calendar },
  { key: "local",    label: "Local",    icon: icons.local },
  { key: "policies", label: "Policies", icon: icons.policies },
  { key: "contacts", label: "Contacts", icon: icons.contacts },
];

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [tab, setTab] = useState("schedule");
  const [data, setData] = useState(DEFAULT_DATA);
  const [status, setStatus] = useState(SHEET_ID ? "loading" : "default");

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=EB+Garamond:wght@400;700&family=Roboto:wght@400;500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!SHEET_ID) return;
    setStatus("loading");
    fetchAllData()
      .then((d) => { setData(d); setStatus("live"); })
      .catch((err) => { console.error("Sheet fetch failed:", err); setStatus("fallback"); });
  }, []);

  const statusLabel = status === "live" ? "Live from Google Sheets"
    : status === "loading" ? "Loading..."
    : status === "fallback" ? "Using saved data (sheet unavailable)"
    : "Preview mode";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.parchment, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", background: `linear-gradient(135deg, ${C.pepBlue} 0%, ${C.ocean} 100%)`, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", border: "2px solid rgba(100,181,246,0.2)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={LOGO_URI} alt="Buenos Aires Program" style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
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
                background: status === "live" ? "rgba(100,181,246,0.25)" : "rgba(255,255,255,0.15)",
                color: status === "live" ? "#E3F2FD" : "rgba(255,255,255,0.6)",
              }}>{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 16px 100px", overflowY: "auto" }}>
        {status === "loading" ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 18, color: C.pepBlue, marginBottom: 8 }}>Loading data...</div>
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: C.stone }}>Fetching from Google Sheets</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 700, color: C.pepBlue, marginBottom: 16 }}>
              {tab === "schedule" && "Class Schedule"}
              {tab === "calendar" && "Semester Calendar"}
              {tab === "local" && "Local Resources"}
              {tab === "policies" && "Policies & Travel"}
              {tab === "contacts" && "Contacts"}
            </div>
            {tab === "schedule" && <ScheduleView data={data} />}
            {tab === "calendar" && <CalendarView data={data} />}
            {tab === "local" && <LocalView data={data} />}
            {tab === "policies" && <PoliciesView data={data} />}
            {tab === "contacts" && <ContactsView data={data} />}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: C.white,
        borderTop: `1px solid ${C.fog}`, display: "flex", justifyContent: "space-around",
        padding: "8px 0 16px", zIndex: 100,
      }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "4px 8px", transition: "all 0.15s",
            }}>
              {t.icon(active ? C.pepBlue : C.stone)}
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? C.pepBlue : C.stone, fontFamily: "'Roboto', sans-serif" }}>{t.label}</span>
              {active && <div style={{ width: 4, height: 4, borderRadius: 2, background: C.bapBlue, marginTop: 1 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
