import { useState, useEffect, useRef, useCallback } from "react";
import Papa from "papaparse";

// ============================================================
// ★ CONFIGURATION — Only edit this section ★
// ============================================================
const SHEET_ID = "1Bn1wpsKr6-3eXRZtH-_6IxmTiQA4I157-nt-0tdmyaA";

// ============================================================
// DEFAULT DATA — Used when no Google Sheet is connected
// ============================================================

const DEFAULT_DATA = {
  semester: "Fall 2026",
  classes: [
    { code: "IES 300", title: "Argentine History & Society", professor: "García", honorific: "Prof.", firstname: "Ana", days: ["Mon", "Wed"], time: "9:00–10:30", location: "Classroom A", color: "#0057B8", email: "" },
    { code: "SPA 201", title: "Intermediate Spanish II", professor: "Martínez", honorific: "Prof.", firstname: "Carlos", days: ["Mon", "Tue", "Thu"], time: "11:00–12:00", location: "Classroom B", color: "#64B5F6", email: "" },
    { code: "REL 100", title: "The Way of Jesus", professor: "Smith", honorific: "Dr.", firstname: "John", days: ["Tue", "Thu"], time: "14:00–15:30", location: "Classroom A", color: "#425563", email: "" },
    { code: "COM 300", title: "Intercultural Communication", professor: "Álvarez", honorific: "Prof.", firstname: "María", days: ["Wed", "Fri"], time: "14:00–15:30", location: "Classroom C", color: "#6CACE4", email: "" },
    { code: "ART 280", title: "Tango & Argentine Arts", professor: "Reyes", honorific: "Prof.", firstname: "Lucía", days: ["Fri"], time: "10:00–12:30", location: "Studio", color: "#E35205", email: "" },
  ],
  calendarEvents: [
    { date: "2026-08-10", title: "Arrival Day", type: "milestone", description: "Airport pickup and welcome dinner", start_time: "", end_time: "" },
    { date: "2026-08-11", title: "Orientation begins", type: "orientation", description: "Three-day orientation program", start_time: "", end_time: "" },
    { date: "2026-08-14", title: "Classes begin", type: "academic", description: "First day of classes", start_time: "", end_time: "" },
    { date: "2026-08-17", title: "Día del Paso a la Inmortalidad del Gral. San Martín", type: "holiday", description: "National holiday; no classes", start_time: "", end_time: "" },
    { date: "2026-08-21", title: "City Tour", type: "excursion", description: "Guided walking tour of downtown BA", start_time: "10:00", end_time: "13:00" },
    { date: "2026-09-04", title: "Asado", type: "program", description: "Weekly asado", start_time: "13:40", end_time: "14:40" },
  ],
  healthProviders: [
    { name: "Dr. Example", type: "Doctor", address: "Av. Santa Fe 1234", phone: "+54 11 1234-5678", notes: "GeoBlue", link: "" },
  ],
  churches: [
    { name: "Saddleback Buenos Aires", denomination: "Non-denom.", address: "Mario Bravo 559", service: "11AM, 5PM, 7PM (Spanish & English)", notes: "35 mins by subte/bus", link: "" },
    { name: "Comunidad Cristiana BA", denomination: "Non-denom.", address: "Av. Medrano 951, Almagro", service: "Sun 11:00 (Spanish)", notes: "Young congregation; contemporary worship", link: "" },
  ],
  policies: [
    { title: "Independent Travel", content: "Students may travel independently on weekends and during break. A travel form must be submitted 48 hours in advance via the program portal. Group travel of 2+ is strongly encouraged.", link: "https://example.com/handbook/travel-policy" },
    { title: "Curfew", content: "There is no formal curfew, but students must be reachable by phone at all times. Quiet hours in the residences are 11:00 PM – 7:00 AM.", link: "" },
    { title: "Attendance", content: "Attendance is mandatory for all classes and program excursions. Two unexcused absences per course may result in a grade reduction.", link: "https://example.com/handbook/attendance" },
    { title: "Emergency Contact", content: "Program Director is available 24/7 at the emergency number provided during orientation. In a life-threatening emergency, call 107 (SAME ambulance) or 911.", link: "https://example.com/handbook/emergency" },
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
  const [settingsRaw, classesRaw, calendarRaw, healthRaw, churchesRaw, policiesRaw, contactsRaw, exploreRaw] =
    await Promise.all([
      fetchTab("Settings"),
      fetchTab("Classes"),
      fetchTab("Calendar"),
      fetchTab("Health"),
      fetchTab("Churches"),
      fetchTab("Policies"),
      fetchTab("Contacts"),
      fetchTab("Explore"),
    ]);

  const settings = {};
  settingsRaw.forEach((r) => { if (r.Key && r.Value) settings[r.Key.trim()] = r.Value.trim(); });

  return {
    semester: settings.semester || "Fall 2026",
    classes: classesRaw.filter(r => r.code).map((r) => ({
      code: r.code.trim(),
      title: r.title.trim(),
      professor: r.professor ? r.professor.trim() : "",
      honorific: r.honorific ? r.honorific.trim() : "",
      firstname: r.firstname ? r.firstname.trim() : "",
      days: r.days.split(",").map((d) => d.trim()),
      time: r.time.trim(),
      location: r.location.trim(),
      color: r.color ? r.color.trim() : "#64B5F6",
      email: r.email ? r.email.trim() : "",
    })),
    calendarEvents: calendarRaw.filter(r => r.date).map((r) => ({
      date: r.date.trim(),
      title: r.title.trim(),
      type: r.type ? r.type.trim() : "academic",
      description: r.description ? r.description.trim() : "",
      start_time: r.start_time ? r.start_time.trim() : "",
      end_time: r.end_time ? r.end_time.trim() : "",
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
    explore: exploreRaw.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      type: r.type ? r.type.trim() : "",
      description: r.description ? r.description.trim() : "",
      address: r.address ? r.address.trim() : "",
      hours: r.hours ? r.hours.trim() : "",
      link: r.link ? r.link.trim() : "",
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


const LOGO_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiB2aWV3Qm94PSIwIDAgMzc1IDM3NSI+PGRlZnM+PGNsaXBQYXRoIGlkPSJhIj48cGF0aCBkPSJNMTg3LjUgMGExODcuNiAxODcuNiAwIDEgMC0uMiAzNzUuMkExODcuNiAxODcuNiAwIDAgMCAxODcuNSAwbTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJjIj48cGF0aCBkPSJNMCAwaDM3NXYzNzVIMFptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImQiPjxwYXRoIGQ9Ik0xODcuNSAwYTE4Ny42IDE4Ny42IDAgMSAwLS4yIDM3NS4yQTE4Ny42IDE4Ny42IDAgMCAwIDE4Ny41IDBtMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImIiPjxwYXRoIGQ9Ik0wIDBoMzc1djM3NUgweiIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJlIj48cGF0aCBkPSJNOS4zIDkuNWgzNTYuNHYzNTYuNEg5LjNabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJmIj48cGF0aCBkPSJNMTg3LjUgOS41YTE3OC4xIDE3OC4xIDAgMSAwLS4yIDM1Ni4yIDE3OC4xIDE3OC4xIDAgMCAwIC4yLTM1Ni4ybTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJoIj48cGF0aCBkPSJNLjMuNWgzNTYuNHYzNTYuM0guM1ptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImkiPjxwYXRoIGQ9Ik0xNzguNS41YTE3OC4xIDE3OC4xIDAgMSAwLS4yIDM1Ni4yQTE3OC4xIDE3OC4xIDAgMCAwIDE3OC41LjVtMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImciPjxwYXRoIGQ9Ik0wIDBoMzU3djM1N0gweiIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJqIj48cGF0aCBkPSJNMTYgMjIzLjNoMzQzdjEzNS44SDE2Wm0wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0iayI+PHBhdGggZD0iTTE2IDE2LjJoMzQzdjEzNC4ySDE2Wm0wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0ibCI+PHBhdGggZD0iTTEzLjggMTU3LjZoMzQ3LjR2NTkuOEgxMy44Wm0wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0ibiI+PHBhdGggZD0iTS44LjZoMzQ3LjR2NTkuOEguOFptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9Im0iPjxwYXRoIGQ9Ik0wIDBoMzQ5djYxSDB6Ii8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9Im8iPjxwYXRoIGQ9Ik03Ny4zIDc3LjRIMjk4djIyMC4ySDc3LjNabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJwIj48cGF0aCBkPSJNMTg3LjUgNzcuNGExMTAuMiAxMTAuMiAwIDEgMC0uMSAyMjAuMyAxMTAuMiAxMTAuMiAwIDAgMCAuMS0yMjAuM20wIDAiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0iciI+PHBhdGggZD0iTS4zLjRoMjIwLjV2MjIwLjJILjNabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJzIj48cGF0aCBkPSJNMTEwLjUuNGExMTAuMiAxMTAuMiAwIDEgMC0uMSAyMjAuM0ExMTAuMiAxMTAuMiAwIDAgMCAxMTAuNS40bTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJxIj48cGF0aCBkPSJNMCAwaDIyMXYyMjFIMHoiLz48L2NsaXBQYXRoPjxjbGlwUGF0aCBpZD0idCI+PHBhdGggZD0iTTg1LjEgODZoMjA0Ljd2MjAzSDg1LjFabTAgMCIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJ1Ij48cGF0aCBkPSJNMTg3LjUgODZhMTAxLjYgMTAxLjYgMCAxIDAtLjEgMjAzLjIgMTAxLjYgMTAxLjYgMCAwIDAgLjEtMjAzLjJtMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9InciPjxwYXRoIGQ9Ik0uMi4xaDIwNC43VjIwM0guMlptMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9IngiPjxwYXRoIGQ9Ik0xMDIuNS4xYTEwMS42IDEwMS42IDAgMSAwLS4xIDIwMy4yQTEwMS42IDEwMS42IDAgMCAwIDEwMi41LjFtMCAwIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9InYiPjxwYXRoIGQ9Ik0wIDBoMjA1djIwNEgweiIvPjwvY2xpcFBhdGg+PC9kZWZzPjxnIGNsaXAtcGF0aD0idXJsKCNhKSI+PGcgY2xpcC1wYXRoPSJ1cmwoI2IpIj48ZyBjbGlwLXBhdGg9InVybCgjYykiPjxnIGNsaXAtcGF0aD0idXJsKCNkKSI+PHBhdGggZmlsbD0iIzAwMjA1YiIgZD0iTTAgMGgzNzV2Mzc1SDB6Ii8+PC9nPjwvZz48L2c+PC9nPjxnIGNsaXAtcGF0aD0idXJsKCNlKSI+PGcgY2xpcC1wYXRoPSJ1cmwoI2cpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5IDkpIj48ZyBjbGlwLXBhdGg9InVybCgjaCkiPjxnIGNsaXAtcGF0aD0idXJsKCNpKSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgzNTd2MzU3SDB6Ii8+PC9nPjwvZz48L2c+PC9nPjxnIGZpbGw9IiMwMDIwNWIiIGNsaXAtcGF0aD0idXJsKCNqKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYgMjIzKSI+PHBhdGggZD0iTTYwLjIgMTEuNHEtMi4zIDAtNCAxLjItMS43IDEuMS0xLjcgMy4zcTAgMi40IDEuNSAzLjUgMS41IDEuMiA0LjYgMS4yaDEuOHYyLjNINjBxLTQuNiAwLTcuMi0yLTIuNi0xLjktMi42LTUuOCAwLTMuNyAyLjctNiAyLjctMi4yIDYuOC0yLjIgNC4yIDAgNi44IDIgMi43IDIgMi43IDUuOSAwIDMuMi0yIDUuMi0yIDItNS40IDIuNWwuMi4xaC0yLjhsLS4yLS4ycS0xLjUtMS42LTEuNS00LjIgMC0yIDEuMi0zLjIgMS4yLTEuMyAyLjUtMS4zIDEuMiAwIDIuMS45dDEgMi4ycTAgMS4xLS44IDEuOC0uNy43LTIgLjctLjcgMC0xLjItLjQtLjUtLjMtLjUtMSAwLTEgMS4yLTEgLjkgMCAxLjUuNi42LjcgMi4yLjcgMi4zIDAgMy42LTEuNSAxLjMtMS41IDEuMy0zLjkgMC0yLjgtMS44LTQuNS0xLjgtMS42LTUtMS42bTM5LjQtNC40djIuM0g4OS4zdjEuMmgxMC42djYuN0g4OS4zdjUuMmg0LjN2Mi4zSDg2LjdWN2gxM1ptMTEuMyAwdjE1LjVoNC42djIuM0gxMDdWN2gzLjhabTEzLjQgMHYxNS41aDQuNnYyLjNIMTIxVjdoMy44Wm0yMC4xIDAgLjQgMTcuOGgtMy4xbC0uMi01LjZINTEuMmwtLjIgNS42aC0zTDQ4LjQgN2gzLjNsLS4yIDUuMyAzLjggOC43IDMuOS04LjdMNTkgN1ptMjUuNiAwdjE3LjhoLTMuMkwxNjIgMTMuM3YtLjZsLjIgMi4ydjkuOWgtMy4yVjdoMy4ybDguOCAxMS41di42bC0uMi0yLjJWN1ptMjIgMHYxNy44aC0zLjRsLTggMTEuN3YuM2wuMS0yLjNWN2gtMy4xdjE3LjhoMy4ybDguOC0xMS41di42bC0uMi0yLjJWN1ptMTguMSAwdjE3LjhIMjA3VjdoMy44Wm0xMS4zIDB2MTcuOGgtMy44VjdoMy44Wm0yMy4zIDcuM3EwIDIuMy0uNCA0LS40IDEuOC0xLjQgMy0xIDEuMi0yLjcgMi0xLjcuNy00IC43LTIgMC00LjEtLjktMS44LS42LTMuMi0xLjgtMS40LTEuMi0yLjEtMi44LS43LTEuNy0uNy00VjdoMy44djguMnEwIDIuNi45IDMuOS45IDEuMyAyLjggMS4zIDEuOSAwIDIuOC0xLjMuOS0xLjMuOS0zLjlWN1ptMjYuNSAwdjIuM2gtNS40djE1LjVoLTMuOFY5LjNoLTUuNFY3Wm0xMi42IDB2MTcuOGgtMy44VjdoMy44Wm0xNy42IDB2Mi4zaC00Ljd2Mmg0LjF2Mi4zaC00LjF2Mi40aDQuN3YyLjNIMjg1VjdoOC4yWm0xMS41IDIuM3YxNS41aC0zLjhWOS4zSDMxMFY3aDEzdjIuM1ptMCAwIi8+PC9nPjxnIGZpbGw9IiMwMDIwNWIiIGNsaXAtcGF0aD0idXJsKCNrKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYgMTYpIj48cGF0aCBkPSJNMTAuOCA4LjZRMTAuOCA1IDEzIDMgMTUuMS45IDE4IC45cTMgMCA1IDIuMSAyLjIgMi4yIDIuMiA1LjcgMCAzLjYtMi4xIDUuNy0yIDIuMS01IDIuMS0yLjkgMC01LTItMi4yLTIuMi0yLjItNS45bTMuNy4xcTAgMi40IDEuMiA0IDEuMiAxLjQgMy4zIDEuNCAxLjkgMCAzLjItMS4zIDEuMi0xLjMgMS4yLTR0LTEuMi00cS0xLjItMS40LTMuMi0xLjQtMiAwLTMuMyAxLjQtMS4yIDEuNC0xLjIgNE00MCA4LjZRNDAgNSA0Mi4xIDNxMi4xLTIgNS0ycTMgMCA1LjEgMi4xIDIuMSAyLjIgMi4xIDUuNyAwIDMuNi0yIDUuNy0yIDIuMS01LjEgMi4xLTIuOCAwLTUtMi0yLjEtMi4yLTIuMS01LjltMy44LjFxMCAyLjQgMS4xIDQgMS4yIDEuNCAzLjMgMS40dDMuMi0xLjNxMS4yLTEuMyAxLjItNHQtMS4yLTRxLTEuMS0xLjQtMy4yLTEuNC0yIDAtMy4yIDEuNC0xLjIgMS40LTEuMiA0bTM5LjIgMFE4MyA1IDg1LjEgM3EyLjEtMiA1LTJRMTIxIDE2IDk3IDEwLjlhMTMgMTMgMCAwIDAtNS4xIDEuOWMtLjQtLjctLjctMS44IDAtMi45bDIuMi0xLjlBMTAgMTAgMCAwIDEgOTcgN3ExLjQgMCAyLjQuNXQuOCAyLjVxLjYtLjIgMi0uOHQxLjQtLjRxLS42LTIuNS0yLjQtNEw5NyAycTMgMCA1LjEgMi4xIDIuMiAyLjIgMi4yIDUuNyAwIDMuNi0yLjEgNS43LTIgMi4xLTUgMi4xLTMgMC01LjEtMi0yLjEtMi4yLTIuMS01LjltMy43LjFxMCAyLjQgMS4yIDQgMS4yIDEuNCAzLjMgMS40dDMuMi0xLjNxMS4yLTEuMyAxLjItNHQtMS4yLTRxLTEuMi0xLjQtMy4yLTEuNC0yIDAtMy4zIDEuNC0xLjIgMS40LTEuMiA0bTI1LjgtNy40aDMuOHYxMC44aDUuNHYyLjNoLTkuMlptMjIuNiAwdjIuM2gtNS4xdjJoNC4zdjIuM2gtNC4zdjIuNGg1djIuM2gtOC43VjEuNFptMTEuNSAwdjIuM2gtNS4ydjJoNC40djIuM2gtNC40djIuNGg1djIuM2gtOC43VjEuNFptMTkuNCAwaC0zLjVsLTQgOC40LTQtOC40aC0zLjdsNS44IDExLjh2NmgzLjh2LTZabTM0LjUtLjFRMTk4IDUgMjAwLjEgM3EyLjEtMiA1LTIgMyAwIDUuMSAyLjEgMi4xIDIuMiAyLjEgNS43IDAgMy42LTIgNS43LTIgMi4xLTUuMSAyLjEtMi44IDAtNS0yLTIuMS0yLjItMi4xLTUuOW0zLjguMXEwIDIuNCAxLjEgNCAxLjIgMS40IDMuMyAxLjR0My4yLTEuM3ExLjItMS4zIDEuMi00dC0xLjItNHEtMS4xLTEuNC0zLjItMS40LTIgMC0zLjIgMS40LTEuMiAxLjQtMS4yIDRtMjkuMi03LjR2Mi4zaC01LjR2MTUuNWgtMy44VjMuN0gyMzFWMS40Wm0yOS43IDBoMy44djEwLjhoNS40djIuM2gtOS4yWm0yMi43IDB2Mi4zaC01djJoNC4ydjIuM2gtNC4ydjIuNGg1djIuM2gtOC44VjEuNFptMTEuNCAwdjIuM2gtNXYyaDQuNHYyLjNoLTQuNHYyLjRoNXYyLjNoLTguOFYxLjRabTIwLjktLjRoMy40bC0uNCAxNy44aC0zLjFsLS4yLTUuNkwzMDIgOC45bC0uMiA1LjNoLTNMOTkuMiAxNC4yaC0zLjRsLjItNS42aC0uNGwtMy44IDguN0w4OCA4LjZsLS4yIDUuNmgtMy4xTDg1LjEgMS40SDg4bC0uMiA1LjMgMy44IDguNyAzLjktOC43TC45NiAxLjRobTI1LjUgMHYxNy44aC0zLjJMMjIgMTMuM3YtLjZsLjIgMi4ydjkuOWgtMy4yVjEuNGgzLjJsOC44IDExLjV2LjZsLS4yLTIuMlYxLjRabTIyIDAtLjEgMTcuOGgtMy40bC04LTExLjd2LS4zbC4yIDIuM3Y5LjdoLTMuMlYxLjRoMy40bDcuOSAxMS41di42bC0uMi0yLjJWMS40Wm0xOC4yIDBoMy44djEwLjhoNS40djIuM2gtOS4yWm0xNy41IDIuMnYtMi4yaDEzdjIuM2gtNC43djE1LjVoLTMuN1YzLjZabTAgMCIvPjwvZz48ZyBjbGlwLXBhdGg9InVybCgjbCkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE0IDE1OCkiPjxnIGNsaXAtcGF0aD0idXJsKCNtKSI+PGcgY2xpcC1wYXRoPSJ1cmwoI24pIj48cGF0aCBmaWxsPSIjMDAyMDViIiBkPSJNMTYyLjEgMy41YTQzIDQzIDAgMCAxIDYuOSA4LjYgNDMgNDMgMCAwIDEtNi45IDguNiA0MCA0MCAwIDAgMS03LjMtOC42IDQwIDQwIDAgMCAxIDcuMy04LjZtLTE1LjMgMGE0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy4zLTguNiA0MCA0MCAwIDAgMSA3LjMtOC42bS0xNS4zIDBhNDMgNDMgMCAwIDEgNi45IDguNiA0MyA0MyAwIDAgMS02LjkgOC42IDQwIDQwIDAgMCAxLTcuNC04LjYgNDAgNDAgMCAwIDEgNy40LTguNm0tMTUuMiAwYTQzIDQzIDAgMCAxIDYuOSA4LjYgNDMgNDMgMCAwIDEtNi45IDguNiA0MCA0MCAwIDAgMS03LjQtOC42IDQwIDQwIDAgMCAxIDcuNC04LjZtLTE1LjMgMGE0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy4zLTguNiA0MCA0MCAwIDAgMSA3LjMtOC42bS0xNS4zIDBhNDMgNDMgMCAwIDEgNi45IDguNiA0MyA0MyAwIDAgMS02LjkgOC42IDQwIDQwIDAgMCAxLTcuMy04LjYgNDAgNDAgMCAwIDEgNy4zLTguNm0tMTUuMiAwYTQzIDQzIDAgMCAxIDYuOCA4LjYgNDMgNDMgMCAwIDEtNi44IDguNiA0MCA0MCAwIDAgMS03LjQtOC42IDQwIDQwIDAgMCAxIDcuNC04LjZtLTE1LjMgMGE0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy4zLTguNiA0MCA0MCAwIDAgMSA3LjMtOC42TTMwIDMuNWE0MyA0MyAwIDAgMSA2LjkgOC42QTQzIDQzIDAgMCAxIDMwIDIwLjcgNDAgNDAgMCAwIDEgMjIuNyAxMi4xIDQwIDQwIDAgMCAxIDMwIDMuNW0tMTUuMyAwYTQzIDQzIDAgMCAxIDYuOSA4LjYgNDMgNDMgMCAwIDEtNi45IDguNkE0MCA0MCAwIDAgMSA3LjQgMTIuMSA0MCA0MCAwIDAgMSAxNC43IDMuNW0xNjIuNiAwYTQzIDQzIDAgMCAxIDYuOCA4LjYgNDMgNDMgMCAwIDEtNi44IDguNiA0MCA0MCAwIDAgMS03LjQtOC42IDQwIDQwIDAgMCAxIDcuNC04LjZtMTUuMiAwYTQzIDQzIDAgMCAxIDYuOSA4LjYgNDMgNDMgMCAwIDEtNi45IDguNiA0MCA0MCAwIDAgMS03LjMtOC42IDQwIDQwIDAgMCAxIDcuMy04LjZtMTUuMyAwYTQzIDQzIDAgMCAxIDYuOCA4LjYgNDMgNDMgMCAwIDEtNi44IDguNkE0MCA0MCAwIDAgMSAyMDAgMTIuMSA0MCA0MCAwIDAgMSAyMDcuOCAzLjVtMTUuMiAwYTQzIDQzIDAgMCAxIDYuOSA4LjYgNDMgNDMgMCAwIDEtNi45IDguNiA0MCA0MCAwIDAgMS03LjMtOC42IDQwIDQwIDAgMCAxIDcuMy04LjZNMjM4LjMgM2E0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy4zLTguNiA0MCA0MCAwIDAgMSA3LjMtOC42bTE1LjIuNWE0MyA0MyAwIDAgMSA3IDguNiA0MyA0MyAwIDAgMS03IDguNiA0MCA0MCAwIDAgMS03LjMtOC42IDQwIDQwIDAgMCAxIDcuMy04LjZtMTUuMy0uNWE0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy4zLTguNiA0MCA0MCAwIDAgMSA3LjMtOC42bTE1LjIuNWE0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy4zLTguNiA0MCA0MCAwIDAgMSA3LjMtOC42bTE1LjMgMGE0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy40LTguNiA0MCA0MCAwIDAgMSA3LjQtOC42bTE1LjIgMGE0MyA0MyAwIDAgMSA2LjkgOC42IDQzIDQzIDAgMCAxLTYuOSA4LjYgNDAgNDAgMCAwIDEtNy4zLTguNiA0MCA0MCAwIDAgMSA3LjMtOC42TTMzMCAzYTQzIDQzIDAgMCAxIDcgOC42IDQzIDQzIDAgMCAxLTcgOC42IDQwIDQwIDAgMCAxLTcuMy04LjYgNDAgNDAgMCAwIDEgNy4zLTguNm0wIDAiLz48L2c+PC9nPjwvZz48ZyBjbGlwLXBhdGg9InVybCgjbykiPjxnIGNsaXAtcGF0aD0idXJsKCNxKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzcgNzcpIj48ZyBjbGlwLXBhdGg9InVybCgjcikiPjxnIGNsaXAtcGF0aD0idXJsKCNzKSI+PHBhdGggZmlsbD0iIzAwMjA1YiIgZD0iTTAgMGgyMjF2MjIxSDB6Ii8+PC9nPjwvZz48L2c+PC9nPjxnIGNsaXAtcGF0aD0idXJsKCN0KSI+PGcgY2xpcC1wYXRoPSJ1cmwoI3YpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4NSA4NikiPjxnIGNsaXAtcGF0aD0idXJsKCN3KSI+PGcgY2xpcC1wYXRoPSJ1cmwoI3gpIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMCAwaDIwNXYyMDRIMHoiLz48L2c+PC9nPjwvZz48L2c+PGcgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTE3MS42IDEyMy41YTggOCAwIDAgMC0yLjktMy43IDggOCAwIDAgMC00LjYtMi4yIDkgOSAwIDAgMC00IDEuNGMtLjMuMy0uOC41LTEuMy41bC0xLS41LS44LTEuNWMtLjItLjctLjMtMS40LS40LTIuMS0uMi0xLjItLjItMi40LS4yLTMuNWwuMS01LjIuNC04IC42LTEwIC44LTExIC45LTExLjEgMi41LTI3LjFjLjItMi41LjUtNSAuOS03LjIuMi0xIC41LTIuMi44LTMuMmwuNi0xLjUuOS0xLjUgMS0xLjQgMS4yLTEuMmMuOS0uNyAxLjktMS40IDMtMS44IDEtLjUgMi4xLS44IDMuMy0xLjEgMi4yLS41IDQuNi0uNiA2LjktLjQgMi4zLjMgNC42LjkgNi43IDEuOGE0MSA0MSAwIDAgMSA1LjMgMy4zYy43LjcgMS41IDEuMyAyLjIgMiAuNi44IDEuMyAxLjUgMS44IDIuNGwuOCAxLjQuNSAxLjVjLjIuOC4zIDEuNC4zIDIuMS4xIDEuMy4xIDIuMi0uMSAzLjFhMTYgMTYgMCAwIDEtLjggMi45bC0uNiAxLjRjLS40LjQtLjguOS0xLjIgMS4yYTEyIDEyIDAgMCAwLTMuMyAyLjFjLTIuNC44LTUuMi40LTcuNCAwLS44LS4yLTEuNC0uMi0yLjItLjUtMS4yLS4zLTIuNS0uOC00LjItMS41YTMzIDMzIDAgMCAwLTMuNC0xLjhjLS4yLS4yLS42IDAtLjUuMi4xLjkuNCAxLjcuNyAyLjUuNiAxLjcgMS41IDMuMyAyLjUgNC43IDEuMSAxLjUgMi40IDIuOCA0IDMuOGE5IDkgMCAwIDAgNS4zIDIuNyAxMyAxMyAwIDAgMCA1LjMtMi43IDEzIDEzIDAgMCAwIDEwLjkgMi4xYy4zLjMuMi44LjQtLjZtMCAwIi8+PHBhdGggZD0iTTE5OC44IDE0Ny4yYy0uMi0uNC0uMy0uOS0uNC0xLjMtLjItLjktLjEtMS44LS4zLTIuNy0uMS0uOS0uNC0xLjgtLjgtMi43bC0uNi0xLjRjLS4zLS40LS42LS45LTEtMS4yYTggOCAwIDAgMC0yLjUtMS43IDggOCAwIDAgMC0yLjgtLjQgNCA0IDAgMCAwLTEuNi40Yy0uNi4yLTEuMi43LTEuNiAxLjItLjQuNS0uNyAxLjEtMSAxLjctLjMuNS0uNCAxLjItLjYgMS44LS4yIDEuMi0uMiAyLjQtLjIgMy42bC0uMSA1LS4zIDcuOS0uNSA5LjgtLjcgMTEtLjggMTEuMS0yLjQgMjdjLS4zIDIuNS0uNiA0LjktMSA3LjItLjIgMS0uNSAyLjEtLjkgMy4xbC0uNiAxLjVjLS4yLjUtLjUgMS0uOCAxLjVsLTEgMS40Yy0uMyA0LS43LjgtMS4xIDEuMi0uOC44LTEuOCAxLjQtMi45IDItMSAuNS0yLjEuOS0zLjMgMS4xLTIuMi42LTQuNi44LTcgLjYtMi40LS4yLTQuOC0uNy03LTEuNS0yLjItLjgtNC4xLTIuMS02LTMuNWwtMS43LTEuNC0xLjktMS43Yy0uNy0uNi0xLjItMS4yLTEuOC0xLjlsLTEuNC0yLjNjLS40LS44LS43LTEuOC0uNi0yLjhsLjItMS45Yy4xLS43LjMtMS41LjYtMi4yLjItLjYuNC0xLjIuOC0xLjdsMS4xLTEuNGMuNC0uNC44LS44IDEuMi0xLjFhMTIgMTIgMCAwIDEgMy0xLjcgMTMgMTMgMCAwIDEgNy4yLjMgMTMgMTMgMCAwIDAgNS40LTIuMyA5IDkgMCAwIDAtNC44LTNsLTIuMi0xLjVjLTEuMS0uOS0yLjEtMS45LTMtMy0uOS0xLjEtMS43LTIuMi0yLjQtMy42LS43LTEuMy0xLjMtMi45LTEtNC41IDAtLjMuNS0uMy41IDBhMzIgMzIgMCAwIDAgMy42IDIgMzMgMzMgMCAwIDAgNC4xIDEuNmMxLjcuNSAzLjIgMSA0LjIgMS41LjguNCAxLjYuNiAyLjMuNSAyLjMtLjIgNC43LS4yIDcuMi41YTE1IDE1IDAgMCAxIDMuMiAyYy41LjMuOC44IDEuMiAxLjIuMy41LjUgMSAuNyAxLjVhMTYgMTYgMCAwIDEgLjkgMy4yYy4xIDEgLjIgMi4xLjEgMy4xIDAgLjctLjEgMS40LS4zIDItLjIuNS0uMy45LS41IDEuNW0wIDAiLz48L2c+PGcgZmlsbD0iIzY0YjVmNiIgY2xpcC1wYXRoPSJ1cmwoI3YpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNCAxNzQpIj48cGF0aCBkPSJNOSAxMC40SDQuN3YyaDMuN3YyLjNINC43djEuOUg5djIuM0gyVjguMWg3Wm01LjEgOC42YTUgNSAwIDAgMS00LjItMi40bDIuMi0xLjNhMiAyIDAgMCAwIDIgMS4zcS42IDAgMS0uMmwuMi0uNnEwLS41LS41LS44bC0xLjItLjUtMS41LS42YTMgMyAwIDAgMS0xLjItMXEtLjUtLjYtLjUtMS43IDAtMS42IDEtMi40IDEuMi0uOSAyLjUtLjkgMSAwIDIgLjVsMS41IDEuMS0xLjcgMS43cS0uOS0xLTEuOC0xbC0uNi4yLS4zLjZxMCAuNC40LjcuMy4zLjkuNGwyLjQgMSAuOSAxcS4zLjcuNCAxLjcgMCAxLjUtMS4xIDIuNFQxNCAxOU0yNi41IDh2Mi40aC0yLjdWMTloLTIuNnYtOC41aC0yLjdWOC4xWm0wIDAiLz48L2c+PGcgZmlsbD0iIzY0YjVmNiIgY2xpcC1wYXRoPSJ1cmwoI3cpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMDYgMTc0KSI+PHBhdGggZD0iTTUuNiAxNi43aDMuNnYyLjJoLTd2LTJMNi40IDEybC4yLS44cTAtLjUtLjMtLjhsLS43LS4yLS44LjNhMSAxIDAgMCAwLS4yLjlIMi4xcS0uMS0xLjUgMS0yLjUgMS0xIDIuNi0xIDEuNSAwIDIuNC45YTMgMyAwIDAgMSAxIDIuMnEwIDEuMy0uNyAyLjJ6bTguOCAyLjNxLTIgMC0zLTEuNC0xLTEuNS0xLjEtNC4xIDAtMi42IDEtNC4xIDEuMi0xLjUgMy4xLTEuNXQzIDEuNWE3IDcgMCAwIDEgMSA0LjFxMCAyLjYtMSA0LTEgMS42LTMgMS42bTAtMi40cS43IDAgMS0uOC41LTEgLjUtMi4zIDAtMS40LS40LTIuM3QtMS0uOHEtLjkgMC0xLjIuOC0uNCAxLS40IDIuMyAwIDEuNC40IDIuM3QxLjEuOG05LjQgMi4zcS0yIDAtMy0xLjQtMS4yLTEuNS0xLjItNC4xdDEuMS00LjEgMy0xLjVxMiAwIDMgMS41YTcgNyAwIDAgMSAxLjEgNC4xcTAgMi42LTEgNC0xLjEgMS42LTMgMS42bTAtMi40cS42IDAgMS0uOC40LTEgLjQtMi4zIDAtMS40LS40LTIuM3QtMS0uOHEtLjggMC0xLjEuOC0uNCAxLS40IDIuMy0uMSAxLjQuNCAyLjN0MSAuOG05LjQgMi4zcS0yIDAtMy0xLjQtMS0xLjUtMS4xLTQuMSAwLTIuNiAxLTQuMSAxLjItMS41IDMuMS0xLjV0MyAxLjVhNyA3IDAgMCAxIDEgNC4xcTAgMi42LTEgNC0xIDEuNi0zIDEuNm0wLTIuNHEuNyAwIDEtLjguNS0xIC41LTIuMyAwLTEuNC0uNC0yLjN0LTEuMS0uOC0xIC44cS0uNiAxLS41IDIuMyAwIDEuNC40IDIuM3QxLjEuOG0wIDAiLz48L2c+PC9zdmc+";
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

// ─── Weekly Overview ───
function WeeklyOverviewView({ data }) {
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

  // Filter events for this week
  const weekEvents = data.calendarEvents.filter((e) => {
    return e.date >= weekStartStr && e.date <= weekEndStr;
  });

  // Group events by date
  const eventsByDate = {};
  weekDates.forEach((d) => { eventsByDate[toDateStr(d)] = []; });
  weekEvents.forEach((e) => {
    if (eventsByDate[e.date]) eventsByDate[e.date].push(e);
  });

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
        <button onClick={() => setWeekOffset((o) => Math.min(o + 1, 1))} disabled={weekOffset >= 1} style={{
          background: "none", border: `1px solid ${weekOffset >= 1 ? C.parchment : C.fog}`, borderRadius: 8, padding: "6px 12px",
          cursor: weekOffset >= 1 ? "default" : "pointer", fontSize: 16,
          color: weekOffset >= 1 ? C.fog : C.pepBlue, fontWeight: 700,
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
          const isToday = ds === todayStr;
          const dayEvents = eventsByDate[ds] || [];
          const hasContent = dayEvents.length > 0;

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
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone }}>{formatDate(ds)}</div>
                </div>
              </div>

              {/* Events for the day */}
              {dayEvents.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dayEvents.map((e, i) => {
                    const s = EVENT_STYLES[e.type] || EVENT_STYLES.academic;
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
                            {s.icon} {e.title}
                          </span>
                          {timeStr && (
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone, whiteSpace: "nowrap", marginLeft: 8 }}>{timeStr}</span>
                          )}
                        </div>
                        {e.description && (
                          <div style={{ fontSize: 12, color: C.mountain, marginTop: 3, fontFamily: "'Roboto', sans-serif", lineHeight: 1.4 }}>{e.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!hasContent && (
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.fog, fontStyle: "italic", marginTop: -2 }}>No events</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule (Class Schedule) ───
function ClassScheduleView({ data }) {
  const [view, setView] = useState("week");
  const todayRef = useRef(null);

  const todayAbbrev = WEEK_DAYS_SHORT[new Date().getDay()];
  const isWeekday = DAYS_ORDER.includes(todayAbbrev);

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const classesForDay = (day) =>
    data.classes.filter((c) => c.days.includes(day)).sort((a, b) => getSortTime(a.time, day).localeCompare(getSortTime(b.time, day)));

  // Sort courses alphabetically by title for "All Courses"
  const sortedClasses = [...data.classes].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill active={view === "week"} onClick={() => setView("week")}>Weekly Schedule</Pill>
        <Pill active={view === "list"} onClick={() => setView("list")}>All Courses</Pill>
      </div>
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
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.stone }}>{c.days.join(", ")} · {c.time}</span><br />
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
                    Email {c.professor}
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

// ─── Schedule Tab (wraps Weekly Overview + Class Schedule) ───
function ScheduleView({ data }) {
  const [section, setSection] = useState("overview");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        <Pill active={section === "overview"} onClick={() => setSection("overview")}>Weekly Overview</Pill>
        <Pill active={section === "classes"} onClick={() => setSection("classes")}>Class Schedule</Pill>
      </div>
      {section === "overview" ? (
        <WeeklyOverviewView data={data} />
      ) : (
        <ClassScheduleView data={data} />
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

// ─── Link Helper ───
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
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        <Pill active={sub === "health"} onClick={() => setSub("health")}>Health Providers</Pill>
        <Pill active={sub === "churches"} onClick={() => setSub("churches")}>Churches</Pill>
        <Pill active={sub === "explore"} onClick={() => setSub("explore")}>Exploring BA</Pill>
      </div>
      {sub === "health" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.healthProviders.map((h, i) => (
            <Card key={i}>
              <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{h.name}</div>
              <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, marginTop: 4 }}>
                {h.type && <>{h.type}<br /></>}
                {h.address && <>{h.address}<br /></>}
                {h.phone && <>{h.phone}<br /></>}
                {h.notes && <span style={{ color: C.stone, fontStyle: "italic" }}>{h.notes}</span>}
              </div>
              <LinkButton url={h.link} />
            </Card>
          ))}
        </div>
      ) : sub === "churches" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.churches.map((ch, i) => (
            <Card key={i}>
              <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{ch.name}</div>
              <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, marginTop: 4 }}>
                {ch.denomination && <>{ch.denomination}<br /></>}
                {ch.address && <>{ch.address}<br /></>}
                {ch.service && <>{ch.service}<br /></>}
                {ch.notes && <span style={{ color: C.stone, fontStyle: "italic" }}>{ch.notes}</span>}
              </div>
              <LinkButton url={ch.link} />
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(data.explore || []).map((p, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{p.name}</span>
                {p.type && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12 }}>{p.type}</span>}
              </div>
              <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>
                {p.description && <>{p.description}<br /></>}
                {p.address && <span style={{ color: C.stone }}>{p.address}<br /></span>}
                {p.hours && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.stone }}>{p.hours}</span>}
              </div>
              <LinkButton url={p.link} />
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
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {data.policies.map((p, i) => (
        <div key={i} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.fog}`, overflow: "hidden" }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{
            width: "100%", padding: "14px 16px", border: "none", background: "transparent",
            display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
            fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue, textAlign: "left",
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
          {o.address && <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", marginBottom: 8 }}>{o.address}</div>}
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
    </div>
  );
}

// ─── Nav Icons ───
const icons = {
  schedule: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  calendar: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  local: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  policies: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  contacts: (clr) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
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
              {tab === "schedule" && "Program Schedule"}
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
