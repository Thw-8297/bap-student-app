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
  semester: "Summer 2026",
  classes: [
    { code: "IES 300", title: "Argentine History & Society", professor: "García", honorific: "Prof.", firstname: "Ana", days: ["Mon", "Wed"], time: "9:00–10:30", location: "Classroom A", color: "#0057B8", email: "" },
    { code: "SPA 201", title: "Intermediate Spanish II", professor: "Martínez", honorific: "Prof.", firstname: "Carlos", days: ["Mon", "Tue", "Thu"], time: "11:00–12:00", location: "Classroom B", color: "#64B5F6", email: "" },
    { code: "REL 100", title: "The Way of Jesus", professor: "Smith", honorific: "Dr.", firstname: "John", days: ["Tue", "Thu"], time: "14:00–15:30", location: "Classroom A", color: "#425563", email: "" },
    { code: "COM 300", title: "Intercultural Communication", professor: "Álvarez", honorific: "Prof.", firstname: "María", days: ["Wed", "Fri"], time: "14:00–15:30", location: "Classroom C", color: "#6CACE4", email: "" },
    { code: "ART 280", title: "Tango & Argentine Arts", professor: "Reyes", honorific: "Prof.", firstname: "Lucía", days: ["Fri"], time: "10:00–12:30", location: "Studio", color: "#E35205", email: "" },
  ],
  calendarEvents: [
    { date: "2026-08-10", title: "Arrival Day", type: "milestone", description: "Airport pickup and welcome dinner", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-11", title: "Orientation begins", type: "orientation", description: "Three-day orientation program", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-14", title: "Classes begin", type: "academic", description: "First day of classes", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-17", title: "Día del Paso a la Inmortalidad del Gral. San Martín", type: "holiday", description: "National holiday; no classes", start_time: "", end_time: "", visibility: "both" },
    { date: "2026-08-21", title: "City Tour", type: "excursion", description: "Guided walking tour of downtown BA", start_time: "10:00", end_time: "13:00", visibility: "both" },
    { date: "2026-09-04", title: "Asado", type: "program", description: "Weekly asado", start_time: "13:40", end_time: "14:40", visibility: "week" },
  ],
  healthProviders: [
    { name: "Dr. Example", type: "Doctor", address: "Av. Santa Fe 1234", phone: "+54 11 1234-5678", notes: "GeoBlue", link: "", insurance: "bcbs" },
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
  resources: [
    { name: "U.S. Embassy Buenos Aires", detail: "Av. Colombia 4300, Palermo", phone: "+54 11 5777-4533", url: "https://ar.usembassy.gov/" },
    { name: "International SOS (ISOS)", detail: "Pepperdine travel assistance", phone: "+1 215-842-9000", url: "https://www.internationalsos.com" },
    { name: "GeoBlue / BCBS", detail: "Student health insurance", phone: "+1 610-254-8771", url: "https://www.geo-blue.com" },
    { name: "Pepperdine Campus Safety", detail: "Malibu campus (24/7)", phone: "+1 310-506-4442", url: "" },
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

  // Resources tab is optional — don't break the whole fetch if it's missing
  let resourcesRaw = [];
  try { resourcesRaw = await fetchTab("Resources"); } catch (e) { /* tab not created yet */ }

  const settings = {};
  settingsRaw.forEach((r) => { if (r.Key && r.Value) settings[r.Key.trim()] = r.Value.trim(); });

  return {
    semester: settings.semester || "Summer 2026",
    classes: classesRaw.filter(r => r.code).map((r) => ({
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
    calendarEvents: calendarRaw.filter(r => r.date).map((r) => ({
      date: r.date.trim(),
      title: r.title.trim(),
      type: r.type ? r.type.trim() : "academic",
      description: r.description ? r.description.trim() : "",
      start_time: r.start_time ? r.start_time.trim() : "",
      end_time: r.end_time ? r.end_time.trim() : "",
      visibility: r.visibility ? r.visibility.trim().toLowerCase() : "both",
    })),
    healthProviders: healthRaw.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      type: r.type ? r.type.trim() : "",
      address: r.address ? r.address.trim() : "",
      phone: r.phone ? r.phone.trim() : "",
      notes: r.notes ? r.notes.trim() : "",
      link: r.link ? r.link.trim() : "",
      insurance: r.insurance ? r.insurance.trim() : "",
      category: r.category ? r.category.trim().toLowerCase() : "",
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
    resources: resourcesRaw.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      detail: r.detail ? r.detail.trim() : "",
      phone: r.phone ? r.phone.trim() : "",
      url: r.url ? r.url.trim() : "",
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


const LOGO_URI = "data:image/png;base64,/9j/4AAQSkZJRgABAgAAAQABAAD/wAARCAD8APwDACIAAREBAhEB/9sAQwAIBgYHBgUIBwcHCQkICgwUDQwLCwwZEhMPFB0aHx4dGhwcICQuJyAiLCMcHCg3KSwwMTQ0NB8nOT04MjwuMzQy/9sAQwEJCQkMCwwYDQ0YMiEcITIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMAAAERAhEAPwD5/ooooAKKKKACiiigAooooAWiuw0H4dazrQSaVBZWrDPmTA7mHqF6n8cD3r03Qvh9oulbQlob65JGHnUOc+y4wPyz7100sLUqapWRz1cVTpaN3fY8a0nwvrOtMPsNhK8Z/wCWrDan/fR4rstP+EV2+G1DUooh1KwIXP5nAH617nY+FtQuQC6Lbx/7fXHsBz+eK1h4e0bT8NfXe4+juFH4Ac/rW6o4en8crvsjmdfEVNYRsu7PG7P4XeHbbBnS4uj382QgZ+igfzNdLY+DNMjQfY9AgcDowtt5/Mgn9a77+2fD9hxa2nmMOjLHj9WqKXxm/wDyxslX3Z8/oAK2i7fw6X3mMrv+JV+45tPDUyY2aQV+kGP6VONC1AKQLCUD0CYrUPjHUM8Q22PdW/xo/wCEx1H/AJ5W3/fLf41sqmIX/Lv8TFww/wDO/uMaTw5cv/rNKZvrDn+lULrwhayAm58Pwt/tNaDj8cV1A8Y6j/zztj/wE/8AxVTR+M7gY820ib/dYr/PNS513vT/ABHGNFfDUaPLL34b+G7skize2c9TBKRj8DkD8q5y/wDhCpDNp2qEHslxHn/x5f8ACvfh4l0q8AF9YnPqUVwP6/pS/wBm+HdS/wCPWdY3PZZCpJ+jf4VjP2P/AC8ptfkbwdZfw6iZ8pat4D8QaSC8lmZ4h1ktv3gx6kDkD6iuaYEHByCPWvsW98IXUWWtJUnXsp+Vv8D+Yritf8HadqW6PVNMCTEcS7Nkn1DDr+ORWf1SFRXoyNVjJwdq0fuPm6kr0TXPhVfWm+bSJvtcQ58p8LIPp2b9D7VwM9vLbTvDPG0ciHDI64IPuDXHUpTp6SVjsp1YVFeLuQ0UUVmaBRRRQAUUUUAFfX/wS/5JDoX/AG8f+lElfIFfX/wS/wCSQ6F/28f+lElAHyBRRRQAUUUUALRSV2ng/wACXPiFlu7vdb6cD97o0vqFz/P+fOKhCU3yxWpMpxguaTsjC0Pw7qXiG68iwgLAY3ytwiD1J/p19BXsPhn4faZobRyyJ9tv+MSOvCn/AGV5wfc5PpjpXYeH/DaiFLLSrVYbaPgkD5V9yepJ/EmuxEel+GIQznzrsjr/ABH6D+EV6EaVOhbm1l2POlWqV78mke5mab4UnuFWW9YwR9dgA3Ef0/WtCTVdI0JTFYxLLN0JU5/Nj/8AXrB1PX7zUiVZjFAekaHAI9z3/l7Vl10qjVra1XZdl+pyutSpaU1d93+hrXniPUbzI87yU/uxcfmf/r1lEliSxJJOSSck0nGeeldhD4Z0yztxc31yZI+DknYvPTpz+taS9jh1tb9SI+2xD3v+hx9WLexursE28DygHBKqcZ9zXSahoum3elSX2mEDYC3BOGA6gg9+KPBcnzXcZP8Adb+f/wBapeLTpOcVqt0NYVqooSej6mOPDmqldxtSoAJyWUfpnNZ0UTTzJFGMu7BRzjknArsbseJGlnMckccKlivCnK9uxrnNCTzNctB/00z+QJ/pRQrynFuVtun6hWoxhJRjfew9/DuqoMm0Yj/ZZT/Ws6aGWCQxzRtG4/hYEfzrv9Ul1iO7iGnQpJCVG8vjrn6g9KyvGgixanA87kf8B/8A1/1rKjjJzlFSS17GtbCRhGTi3oclRXWeFLCF7G5ubmNGRztw4yMDr/P9KkfRNJ1e3ebTJAkg9CcZ9CDyK2ljIRm4yvoZRwk5QUo9TnbPWL+xI8i4cKP4GO5fyPT8K37fxNZ30Yg1S2UA8FwNy/4j9a5WWN4ZXikGHRirD3zgimVU8NSqe8tPNEwxFSn7r1XZnWXnhaC5i+0aXOCpGQhbIP0b/HP4V5/4l8HWGsBoNUszHcKMLMo2yL6YPcfXIrestQutPk320rJzyv8AC39K6i21bTtfjW11CJY5zwpJ4J/2T1B9v51hL2lJWqLmj+JvF06jvTfLL8D5V8TeBtS8OEzAG6sc8XEa/d/3h2/l71ylfXeteHJbBXYL9otGBBJGSAezD09+n0rxbxl8NwFk1DQozjlpLQfqU/8Aify9K5KuFjKPtKLuvxOylimpezrKz/A8sopSCDgggikrhO4KKKKACvr/AOCX/JIdC/7eP/SiSvkCvr/4Jf8AJIdC/wC3j/0okoA+QKKKKAFoorsvAvg5vEV59pu1ZdOgI3kceY390H+foPrmqhBzajHcmUlBc0tkWfAngZ9alTUtRRl05DlE6Gcjt7KO579B3I990HQGvtgCeTZRjb8oAGB/Co6f0H6U3w9oP251RUEVlCAp2jAwBwq/hj6D8K2db1yO0iOnadhNg2s68BR6D39T/Xp6kY+w/dUtZvd9jypS9v8AvKukFt5kup65b6RF9g0xE8xRgkfdT/E1yMssk8rSSuXkbqzHJzTOpya6PR/DfmR/a9R/dwAZEbHBI9T6D9fp33jTp4ePPN69zCU6mIlyQWnYxbGze/vEtkdEZ88t7DP511X9m6NoMKtffv5X6b13Zx1wvQda5SYx2t+zWkpZI3zG/wBOa7y2ltNZ02G7mgWUplimM4YdRg/56Vli6k0otP3Xvbc0wlOLck17y27GD4l0q0htYb60VUDthgowCCMg4/z1rW0Uw6t4cSC4BdU/duOR905H6Yrmdb1uTVXWNUMUCElVJ5J6ZP8AnirPhnVYdPkuEuX2RMoYH/a6YwO5z+lRKlVlh7yvdO6LjUpxxFls1Zk+pa/aJp72GmwlY2BUsRtGD1wOuf8AGo/B0m3VZUzw0RP4gj/E1i37wy308lvnymcsuRjGeelNtrqezm823kMcmMbgBn361vDDr2LS3ffcxlXftk3su3Y7W/sNbubuXyb+OK2J+Ve4GPp/WsPRLNrXxUsDMCYd3IHB+XH9RWZJq2oSfevZ/wAHI/QVXE0wlMglcSHqwY5P49ailh6kYuLtqraFVcRTlJSV9HfU7z+1jF4kawlb908a7PZuT+o/kPWuX8TW08Grs0rvIkg3Rs3OB/d/A/09ay2nlaYTNK7SAghixJBHQ59qsTaneXBj8+YyiNg6hwOv88e1OlhXSnGSt5hVxUasHF/I6u+/4k/hFYPuyMgQ/wC83Lf1qh4Mgl+03FxyIdmznoW9vp/WnW3jEldl7aBxjrGev4H/ABpLzxcDAYrG3MWQQHfA2/QDjP41goVlGUOTWT3Nuek5RnzaR6GTrI+0+IbhIBuLSBFA/vYAP65rZ1mwsdN0CKN4la5Hyo44O7qST6fWofCWn+ddPfyg7YyQhPdiOT+AP6+1UNdvn1XVykILoh8uIDnce5H1P6YrV8znCjF/DqzLRQlWkvi0RlxQyTlhFGzlVLEKCcAdSfamV6Homkx6VaAPg3EmDI39B7CuN11Ej1u6WNVVdwwF45wM8fXNbU8VGpVcF95lUwsqdNTf3Glo/iV4NttfkyQH5fMI5Ue/qP1+tSa34eUIb7TQGhI3NGnOPdcdfp27VzLI0bFHUqwOCCMEH3FbOh69JpsghmJe1Y8jqU9x7eo/yYqUJU37Sj80VTrRqL2dXbozyTx34DXUkfVNKiC3oBaaFRxMO5A/vfz+vXx4ggkHjBr7I8QaKjRnU7ABomG51XnGf4h7ev514Z8RfBKyJLrmmxYkGWuolH3h3cD1Hf169c55a1KNWPtae/VHZQrSpS9lVenRnlFFFFeceiFfX/wS/wCSQ6F/28f+lElfIFfX/wAEv+SQ6F/28f8ApRJQB8gUUUDk0Aa3h7Q7jxBrENhb5G75pHxkIg6k/wCepA719IeG/D0apbaVYR+XbwqATjO0DqT6kk/iTXJ+APDH9g6MjSxZv7vDSccgH7qD8+fcn0FewRrF4Y0Iu4U3UmOPVuw+gr06Ufq9PmavJ7HmVp+3qcifurch1vUotIs10ywIV9uGI6oD/U/56iuPp8srzStLIxZ2JLE9STW/4e0VJlN/fKBbICVVujY6k+38/wCfXTisPBzm9epxzk8RNQgtOhhW07W1zHMFVijBgGHBx613ciweJdJTy5niXcCwU8gjqCP89jUQj0rXrCcQQbPLJVXKbcEdCPb/ADiuU0fVZNKuxIMmJsCRB3HqPcdq56j+sq8E1KPc3gvq7tKzjLsa2uRWAWLStPt/MuUbqnY98nvnv6Y9sVHpF3J4e1CS1vwUidc5wTggcEfXkfWtq+1fTLBPtsKpLc3CDbt6sOxJ9P8AD2ri729nv7gzXDlm6ADgKPaigpVYODWnVvv5DruNKanFq/Rf5j9TngutQmntkZI3bOG9e5x2yecVUqe0s7i9mEVvE0jHrgcAepPQD611mn+EYItsl4/nP12Lwv4+tdU6tPDwSk/8zkhSqV5NxX+RyEFvNcvshieRvRVJ/lWvb+FdTnGXSOEH/no3P5DP611NpqukJqsui20kaXcIy0IjKj7qtgHGCcOpIByARTvEWpSaToF3ewoHmRQIw3TexCqT7AkE+wrgqZk94I76eWr7b18jCj8FyMP3l6in/Zjz/UVJ/wAIT/0//wDkL/7KtDwne3WoeH0nvZvOnE9xE0m0LuCTOgJAAGcKO1YXibU72DxlpsEF1NDDCbUsiPhZPOuPLIYdG+VSBnpuJHPNcc80qKHtObR26dzpWXUm+W2vqW28FMASt+CfQxf/AF6pz+EdRjBMbRS+wbBP58frXXatqMOk6Xc384YxwIX2qMsx7KPcnAHuaxPCeraxq0upS6itssEUqxxLCpGxtuXXJPzAAoN2Blt3AGANFmVSMlFtNsl5fSkrpbHLXWn3ll/x8W8kYzjJHB/EcVWr0nVtX03RrZJdTuo4IpXES7wTuY9gACTxkn0AJOAM1Uv/AAvY3nzRL9nk7FAMfiP/ANVdtPMYvSat6HJUy6SV4O5yNrrV7aWUlpG6+U6kAY5XPoRzn65rW8KpYxedeTyp50YJCt/Avdh/n+dZOpaPd6ZIRKm6I/dkUZB/wP1rPrplThUg3Tdr7s5VUnTmlUV7bI7HStUfVvErvysMcTCNfxAyfrUlpo/2jXrrULlR5aSny1PRiOM/QY/P6c4/hS4ht9UfzXVC8ZRM8ZJIOM/hWj4n1zaGsLV/mIxK4PQelcVSnKFVU6XVW/zO6FSM6XtKj6mT4i1GC/1DMCLtjyvmAcufr6DtWPXQaJ4bkvStxdho7fqF6M//ANb/AD71pazotve2Yn00RmSAFSsePmA7cd66o16VG1K/9eZyyoVa16trGZ4d1r7FKLS5bNrIcAn+An+n/wCv1pniPRRYTmeBc2sp6Doh9Poe35Vhng4Ndh4fvo9VsJNLvPmZVwuT95e34jilWj7GXtobdV+o6Mvax9jN69H+h8w/EHwn/YWo/bLRMWFyx2gDiN+pX6dx7fSuKr6e8T+Ho7q3vNHvVyjghWxyO6sPcHB/DFfN2qadPpOp3FjcrtlhcqfQ+hHsev41wYuiotTh8LPQwlZyThP4kUa+v/gl/wAkh0L/ALeP/SiSvkCvr/4Jf8kh0L/t4/8ASiSuM7D5B712Hw60Aaz4iWaZN1rZ4lkyOGbPyr+JGfoDXH1794A0M6V4ZtY/L/0m6xM4A5JbG0fljj1zXThaXtKivsjnxVX2VNtbvY9I8J6aLi5a9lX93CcJnu3r+A/n7VR8QamdS1JijZgiysY7H1P4n9MVv6pIuheHI7KJsTSDZke/LH/PrXF16VH99VdV7LRHl1n7Kkqa3erCup0PxGixrZX+3y8bVkIGMdMMPTtn8/WuWororUY1Y8sjmo1ZUpcyO+1S2lt9DeHSYVCtncE67T1I9/6VwOCODwa29H8RTaaPJlBltwOFzyp9s9vb/Jyru4a7upZ3UK0jFsL2rDC06lOcoyV/M6MTUhUjGUXbyIa1dG0SbVZdxJjt14Z/X2H+eKNE0d9VuTuytuhG9u59h7n9Pyrpdd1oeGLC08jTZblJJfJWOJlXb8rN34JIUgDjJwMgkVOMxkaMbR3/ACHhMI6zvLb8y3cG28O6DeXMMGY7WB5yoOC+1STz6nHWo/Dmstrml/aJYUguY5WhnhSQuEcehIBwQVYZA4YVatrix1vTPNidbi0uEKnPQg5DKQeQRyCDyCCDXnsEeqeFdamtrZt9zEgKpM2E1C3BwpJ7SqPlLAHnBIIYY+cxOKdNqrPWL3f5P0PfpUVbkirNbIv+LrabSvFFvqtpGTJKBOijjdNENrLn1kiYqPQIT2rqNXiTxD4Ru1snDre2bNbuOhLLlG/Mg1latdweJ/Bz6lpyO1xZP56wsuJY5Y874iAThipZepB3ZGQQaZ4J1FFa50jeGjUfa7JgfvQucsB67XJ+gdBWMZqGI5b+7NXXqt/vNHFyp36xKngvVUTUDbAn7LqsQvrXJ+6+1d6fiCrAeoc1W8Wf8juh9P7Jz7YvXJ/Q1Rh/0G+tTGMGx10wxgdAjzmIAfSOXH4Va8VsP+EovJP+eZ0//wAdmLf1rz41n9VlTf2JJfdJHQ4fvVLur/gdN44IPh1Y+73tqB+E6Mf0U1H4Ib/iW6hH3jv5Rn1yFb/2bH4VX8Y3An1DStNXko7XkvPG1VKqD7lnBH+4aqabfyaT4Bk1GDH2zUriR7QMMhmkYiJiO4CBXI9Aa7JVL45LpGLv83/wDBR/c+rM/VnPijxklqvNqs32JO42IQ9y30YqsXsQD3rutY1iy0Ow+130hVNwjRFBZ5XPRVUcsxx0HuegJrl/AumRx3N1druMVogsLdmOS2MNK2e5ZtoPvGazPFF1LqniCdrWQE2u3T7InBVbmUgPIPXbuVT3G1x3NKGJ5KMsTLXmen5Icqd5qmum/wCp1OgeJIPE7X0B0y7thbFVcXPlsrbs/LlGYbgByp5GR61m654aNsGurJWaLq0fdfceo/Ufy6mwsbbS9Phs7VPLghQKoz6dST3J6knkkkmsjTvFltq2vHTrO2mkh8l5RdgjYwVlUkdypLYDd8EjI5r1sPiZ0eVyer6HDXw8Kyat8ziK3fDMFlc6gRd5abG6NW6Hufqe+PrVvxJoPk7r60T92eZEH8PuPb/PTpzCO0UiujFXUggg4II6EV7yksRSbg7fmjw5QeHqpTV/1PQLjWBa6wtldQ7LeRcJKTwSfX27Vz7agvh/VriOydZrdusZP3W54z7H07cdRxFqevR6lpUUEkGbkH5pDwFx3H1H5flWHXNh8Lo+deT8/M6MRitVy+q8iSeZ7id5nxudixwMc57U62uJLS5juIjh0YEe/sfY9Khor0OSPLy20ODmfNzdTstct49Y0WPU7cfPGu4gcnb/ABA/T+hrwL4q6AJbeLXIE+eL91cYHVSflY/QnGfcV7n4Rv8AEkmnyHKSAsmfXHI/Ec/gfWud8S6LH5l7pc65t5kKj/dYHBHuPX1FefGn8WHl6o9F1NY4iPoz5Vr6/wDgl/ySHQv+3j/0okr5M1Kxl03UbiymGJIJDG2OhIOM19Z/BL/kkOhf9vH/AKUSV5LVnZnrJpq6PlrwppY1nxNY2TLmNpN0g/2F5b9Afzr6l8LWQudWVyBsgXfjtnoP8fwrwz4Rabvvr/UmXiJFhQkd2OTj3AA/Ovorw6g0/wAP3N+wGW3MM+i9B+efzrvo/u8PKfV6I8+v+8xEYdFqzF8TXv2vV3RT+7hGxfTPc/nx+ArHpzszsWYksxJJPcmm16lGn7OCieXWnzzcgooorUyCp7O1kvbuO3iGWdsZ9B3J9gMmoK7PwjpvlW7X0g+eX5Uz2X1/E/yrGvVVKDkbUKTqzUUXri80rwtp9st1cLbQPIIldgTuYgkk4HAwCSTgAAkkAVev7C21Syls7uISwSjDKTj3BBHIIIyCOQcEc1R8SaINd0s26OsVzE4lt5WXcFkAI5HdSCykejHvg1xdpqeteH3h0+ZjYNnZFbXg8+3kA7Qygg9BwpOQP4ABivk8TivZvmqq8Xu9/v8AI+no0VblhpYkVdT8Ja2Y0bzjLll3/Kl+gHcjhZ1AAJAwwAOMcJ0t3HZeM9AL2cuy4jYtA7Lh7acDgMOo64I7qT1BzVJtZ03xDH/Y2tW72FxMw8hjJlWkB+UxS4HzjqAQCecAjNYJTVdB1ptjxpqiJ1YFYdShB4JHOGGcEjJQnurAN58q0aMeZe9Rl+H/AAPyOjlc3baa/Em8Pah9i122vSpgi1A/Y72En/V3CkqhPuGDREjqWXsBVN93hrUmaNSP7FuSVRQcvZuNxUDqQqHAHdohUOo31pqF5cPAkyQ353S2/wB2WC4VRvTjoxULIpGdxViCetR6prLXlzp8sjxnVJITbkjhLvbmSGRSOApxIrDqDJjoQTwtunB0U9YPmg+8e33G6Sk1JrfR+pJqd1HbX95MXBgi1iO5ZxyNqvFMSD6bATn05p3jO42a7q5H8MkIP0SHzCfwyPzrn4VCQStIu/Snlt3iLHG+GRDAVI6gIjRqQeRtyetSXwnkuJY9SnRpbiK5WaRWJ/1dvHFuOQMEhdxA4G7GTjNROrHlqR/mlzfNatfIpQd4vsrG5q99Jqepam8LkSXtwtjC4OTGnmCBMexcyyA+ma0PEepRJqTQW0WbTRYPKghTo87KBtA9VUogPrIw7VzOnm4sSHWH7bcWF5bW4RTjzGSEMOTjjzHJJxkAE44psF5JbzWkoxcyG6lkR5BhJZIiS0rn+FfOYyEggERqByRVOpdVLvWbSv8A3bJ/kxcjTj2ivxO5nu5tA0a08OabKr6oIQ1zcgZWEsSXlIPVmYsVU8dzwMGPwxpsElwmpsyx6ZpquIHduJJMEPKWPUKCw3EnJZiegJw9LtU1Pzxe3jw6dEoutTu5G2PKG5VSRgqWAyQMFVCqACQRb1jVW1FLeBbR47AMsVhpcahXuXH3Sy8AAYyFPCgbmwQAvRKopSVappTi7Rj1b22/IzUWk4R+J7vsWNc1248RPHYWMTvZzsUhgyVa9Pcseqwjqc8sOowQrdZoGhxaLaNlxNeTYa5n243kdAB/Cq5wF7ck5JJNDTLG08K6fLqut3cC3koHnzscInpFHnkgHpjljzjkAc7rGs3/AIhuEt0hnis528u1sdxilu26lpSOUQAElfQEtkkKOzn9kvrGJ+J7JdL9F592Y8vN7lPbqzuIta0e8vpNNh1OxmvEBElslwjSL65UHI/KuN1/Sv7Mv8Rg+RLlkPp6j8P5EVu6J4Os9LktrmdjPdwZMQT93DASpUiOMYAGCRlsnk881q63p41HTZIgAZB80Z/2h0/wr2cDiJwkpSVk+h52MoKpBpatHm9FBBBIIIIOCD2or6Q+dCiiigRNa3D2l1FcJ96Ng31wen49K6jxXAt1Y22pRcjABI7qwyCfx/nXI12ekH+1PCs1m3LoGjGfzX/PtXFi/dcaq6P8DuwvvKVJ9V+J81fFfSRa63b6jGuFu49r/wC+uBn8QV/I1798Ev8AkkOhf9vH/o+SvNPiVp327whNIF+e1dZhxz/dP6HP4V6X8Ev+SQ6F/wBvH/o+SvOxsOWrddT0sFPmpWe60PMvhlZi18Gwy4+a5leU8c8HaP0XP417nJpbz+HotPSQRnYoZsZ9Cf1ry7wZZCPRNEtMY3QwhgfVsE/qTXtFbYl+zpU4r1McOvaVakn6HIf8IVL/AM/yf9+z/jR/whUv/P8AJ/37P+NdhRWX16v3/A1+o0e34nH/APCFS/8AP8n/AH7P+NH/AAhUv/P8n/fs/wCNdhRR9er9/wAA+oUe34nH/wDCFSf8/wAv/fs/41uanaX40GW10W4S2vFjVYZHUEDBHHIIGQCAcEAnODjB06ybrxLo9lq39mXd6sF0UWT96jKmGJCjzCNmSQcLnPB4rCtiJ1Vab0NaOGp0m3BHGw+L/EmkXSWmp2sVxI3Cw3Y+zTue+yRcxSnvhQuO+K3Y/F3h/V4jp+rRGyaYbWtdUiCpJ7BiTG59gxNaWpav4bliey1TUNKZH4aG5njIb2KseawZfC1rdQO/h3VYZYCMNaTuLiA+wbJZc/VgOy15lRYmlrG012ej+/qdqdOW+jKmueHP7Ht5ZED3mhOv76CQmR7X/aBOS0fQnOSuMg4+7A1+k+nJp+qST3VsgEtpqMA8y4tyBgMQMmTAONwBJBwwIJY1cXfhpgjG70LnC7HEllIc8BcgouTxghGPasW6ku7a6EEVpaTRytuNpDKbc7iSd0Ic/IRk8K5Unpt5J8WtUjTqOVFcje8GrJrv2/E7IwcopS17NFTU40u0a6F5HHLb4Ml1aHeqqCdsqjOSgIOVPKEMM4DBmavqNrpsg8yeNvNlUPEqbminILR3MKjJZWIyQvcnuGBTVtSfSJGkhhE13OViSRYk+0rKQdkcycb0bGAwIHAxyA1a/hfwrHo8SXd4qSakVIBBLJboSSIogSSqjJHqfpxXHUlRhD20m1FfCuvov68+3NvGMm+VbnP22jeJdas3ja2t9LtJjN8tyzNIizAF1VFxgBwWXJBHGRxWhP4G1G6Mr3HiWRpZFlUlbRQMSIqvwSTyFHQ8HOOtdrRXmzzWpzXpxUVrpa/5nR9XVtWziJ9B8VadJc3FjeWV+8jy3ARkMDCZowgYcsCFAyASM5PPTGdaapGv2bQrxZbJIwBcQXC7WFvEFwo7O0jnnaTlTjmvSKz9Y0Wz1u1WG6Rg0bB4ZoztkhcHIZW6gggH3xzmrpZlGVo146d15babO3yJlQa+F/I5j7bPbic6ncRxpBObq4WM5SKVzhASTiSbbsUZwqKATknJ09KvrxZTfoyWc00ZEdw6iSSOHgkRKwwq5wWkcHcccABa5u0uJ9E83Qr+2huL6FxLbNKhEDgnJupXYklixwR1BAAHPHQWKvBO02pWD3cplxEt7IscUzAnEjKu5nPdYwoVQR/Fkj14OampKSXRN7Jd0v6++5yyS5WrPzX+ZrWen3GsXKX1hZXGpT8hNS1CUiJAepQtkkH/AKZLtPTIrfsjonhS4lk1DUxea1KoWQRoXkVM5CpEuSiZ9evUk4GMS51TUNWuTaXF9d3twcFtP0tDEqjtvIO5Qf8AbkCn07Vp6Z4MvWhC3EkGlWuc/ZbBQZD/AL0hGAfXapPo1dWGcXU56MXUl/NLRL0/4CMal7Wm1FdkJqPje+aRYbK1SzaQHyhcKZ7iTHXbBGf13HHcDGK1/CkfiMR3M2vXLyJLsNvFKIhLHjdu3eWoUA5XAyxGDk84E+zw74Ps2lY29ispw0kjFpZ2HQZOXkb0HJotPGWg3sqxpf8AkO7BUW8ie2LknACiRV3E+2a9ilGqpXrS+S0X+ZyScbWivmVb3wkbq9mnjulRZGLbdmcE9ec1B/whUv8Az/L/AN+z/jXYUV6kcZWjFRT2OCWCotuTW5x//CFS/wDP8n/fs/40f8IVL/z/ACf9+z/jXYUVX16v3/AX1Cj2/E4//hCpf+f5P+/Z/wAa1tE0STSGmzcCVZMcBcYIz7n1raoqKmLq1I8snoVDCUoSUorU8o8T6as0mqacQAswdB7BgcfoRW18FVK/CPRFIwR9oBH/AG8SUniyPy9cZv8AnpGrfzH9K0/hrbi08DWsAGFS6vAo9vtMuP0rbE+9RpzMcL7tapA5nw9D5d/p0PHyMg/LH+Feo15tof8AyHLT/rp/Q16TVZjpKJOXaxkJR0oJ4rkrPUNQl0uSY3TCU7QpkdADludvHXtzxzXDCm56rodtSqob9TraWuZa7uLi3sJYb6dfNlEEmVTOeSTwCM8D2/GukA2qBknA6nvRODjuEKinsOrntf8AC0OtSR3cNzLZajEmxbiIBgyZJ2SKeGXJJHQg5wRk56DFcPqfiDxbbapcRjSBbWayFYJRZveeaoPDHypAyk9dpUY6ZPWuas4KD9orr0ubwUr+7uVx4H1aOM+XPoZc/eP2Bk3fgHOP1rMuvBt9A/nXfhzT7kryLjTJNsyjucMFYfRWJPYVonxT4nx/qv8Ay3L3/wCLqCXxN4h/5aagbf1zokyY/wC+ia8acMClePNF91zHZF1tnZr5EVnrd9bK1na6uLjA2tZarCZJVHoQzJJz6uWrm9VBacRzaKllYZP2iCC2lnhlGDgiNQwjIODuXBB5Oelaeo6rcalAYr7xJazL18uexgC/k6N/KsK0dNMmnmtL+S5LKcpHqNvHHH/tCMKqj8iK46mIdrKpzJbXVn99tzaNNXTcbej0IPCcEes+KZLvzXuLLSY9lr5zF2jeTOQGZVchVXgMDgt1PBrttUvGsrbzfNghQZ3zTklUHsowWJ7AEdznjB57wDcm+ttZvJJGklk1BgzO6McCOMDJQBTx3AxXU3NrDdIFmQHBBVscqRggg9iCAc+1eNmcl9aUJfDFL8Vfyvvv1OygvcutzmI/EdiLowy3+p+Yq+Y0jIihF7MVAztPYkHr1zW4uobUC7kndwphdDhZQTj3wR1OM4HOOcDFi8F+X4qm1/8AtEm6lTy2PkgEDaFyOSu7Ax93HtV2S2htbq2NtGEtdMXDADj5xhsn1VcMSeoOe9TWjhpNKm76a6W/y8vv2CLqK9yG91+wspSJtRuZHDiM+QqhFc9FGRgn2JJrTsL43EhRZRKo+8HXZLGfRh0IzxkAY44PJGP4g8D2Wv21vbPM0NvbyGSONVyFz1UYIwpPbkjsQMAb1tZJDIZ5CJblgA0pUAgDoqjsoycDJ6nJJJNZ1fqypLld32t939d+5Uefm12Ob8fWjJpttrlvlLvTJQwkVVZljYhXwGBXIyCCehGazk8mSRY7bUg1wVIuUtt95PJnoHnUqEA67eFzkciup8UosnhLWFf7pspjn0whOa5KyLS6BYxSRTW8SBWV55rJYmO3keXtZSOcgMpIwDnPNd2X1FOgozfwv8H/AJPWxjWVp6dUbuka3PBb/Y9O1PUGiRiGh06yhkCt34gibHvls+tazy6rexBDN4rfP/LNYZbcn/gQVcf99D8KyrbxTqFuixf8JhDFGvCpGttJgegCwgflWhH4s1hziDxHJP8ATSC//oIFev7SD9320/ktPyOTlf8AIvmy5pnhLV7qdpvskWjqww9zcuLq8cfXJA+rM3+7XQR+ANCCL9oW+u5Bjc89/Md5HqoYLj/ZAA9q55fEfirAKXMzjtu8N3RB/EEVND4l8ZFwEs47sd0/sW6tj/307kfpXbh/qcHfVvu1Jv72jGp7Vrol5NHotFV7KWeext5rq3NtcPErSwFw/luQCV3Dg4ORkdcVDqkxt7F5PtH2cKQS4UMSPQA9z0r2Fraxxt2V2XaWuTn1TUY4Yi90qOlv5xG1T5jbsYP0GM4xyam/ta8GoMfMyPOaL7NtGcBM7s9ev4Vt9XkYfWYHTUVgaJqFzcXOya4E6vAsxIUDy2JPy8f154rfrOcHB2ZrCamro4nxkuNSgb1i/kT/AI1t+EI/K8M2y+rzN+crn+tY/jT/AI/bb/rmf51u+GP+Rdtf+B/+htXbU/3SL8/8zipf73JeX+Rw+gSh9UsJezMpH4//AK69Orx3wjd+ZYaJdEj5o4WJ98Lkfzr2IdKrMHdxl3Fl65eaPYKqLplkqsq2luobhgIlGfrxVuivPTa2O9xT3IRawKkaiCMLGdyAIMKfUDt3qaiihtvcaSWwU0sASMjPWnVxniTwBba5rB1SOW0SeRFjmS8sVuY3A4BAJVlOOOGxwDjOSYnJxV0rlJK+uhc1LxpY2sz22nQTardIcOlrt8uM/wC3ISFGO4BLe1YF54012M5ll0DSx/cuJHnP55j/AJVrW3gK2MaJqd9NcxqMLbWwNrAP+Aodx+hYj2onbwd4ZmNtbaXZG+Az9msrVXmPoWwPlz/ecgH1rz5/W5pu6gvvf+RvH2S0s5M52bxpPNFm58X6TbgDk2YiiB+pkaQj8MGuekurS/1KIR6pqM11MrBGhMszuvBbbNICiL0ztC9ua6nUddun2s7WehwMcIIgslzIfQMRtUnphQx9GFYt3pssVpJdPp9ysU7BQbyVopLpucKQSZpGxnhwq4yTgAkeRVlOcmo1XUfklb5vb+uh1wSjq4qP5mb4SnisPE+saQZoWaUJdKqXbXDKw+R1Z2AJbhCR2DeldrXn2pWlzm01LTIoobjTmBjWPJjkkIwbaFVwCp5DPjqB0CkL2Oi6zba3YC6tyVYEpLE334XHDIw7EH8+o4NeNmlB3VaOuln5W277q3V/dZvtoSteH3F2cBreVTIYgUOZAcFRg8g9iOuaxvNupANtzesspz8lsFLADPyFvuDBGd+Sccckk7ciJLG0bgMjAqwI4IIwQa5u50ueaV54be2miVjzNGTI+Dz8oYK/IOC2CeM56nhwvLdqX6fqaTv0NzT+LQAzGZ9zFmKlSCSSQVPIxnAB7YqzVexgit7ZREzMHwxdhgscADIAAHAAAAAAAAAxU000VvA808iRxIpZ3YgBQOSSTwBWNZJVGo66lx21Oa8f3otfCc9uJI45r5ltIzI4VfnPzEkkAAKG5JArOt9NmdrGzuZnmupVLW8P2G2HTGdjA4J5BwrZwM4ArPN/N4n15dUNlfNpluhWzNvt3lSSGlMTgh1b7uBkgDkZIq3btAZZIbazhFhJLsVInHkSNkfK0UmFjbOMruRiSAA1fQ4ShOjTjTt717u1rrTa/R/jvscNSak3K+h0scOpaOQ0l3qVjsGTMFmSFB6tuMkOfqBXRWPi3U7eNTeWcepQkZW4sGVHI90dgpHuG57KKx9L1zUdMmFpb3paQDJ03VBIrYHXYzDeo9zvUDAAxzV2F/Ct9cbby0l0G+kPO2UwRysT1DIfLck9N3zH0r0sPKd7Yerr/LNf1+ByzSt+8h80byeNtMOPMt9Ri9c2btj/AL5Bz+FaWna7pmqNss7tHlA3GFwUlUZxkowDD8RWWvgqzz82o6mw7gzgZ/EKD+tVrrwOpuLaaw1S4geGZZQZx5xXBydpyGUkcHJIIJBU5r1aU8Yv4kY/Jv8AyOaSpfZbOvqKeCK4TZNEkiddrqCPyNS0V3amDS2ZXFjaqsai3iCxklBsGFPqPSn/AGeHzjMIkEuMb9o3Y9M1LRTcn3Fyx7EUVvFBuMUSJuOW2qBk++OtS0UUm29WNJJWRxXjNs6hbr6RE/mf/rVu+FH8zw3an0aRfykYf0rnPF8m/WQv9yJQfqSf8RWr8Pp/tPg6CTOR9qu1B9hcygfyrvq6YSC8/wDM4KWuLm/I8i+HV4LrwXZDdloC0TexDEj9CK9ym1WO10mK+kV3jZVJCAE8/Uivmn4Q6gGt9R05iAVZZ0HqCNrfyX86+gNM/wCJn4RltvvSRhkA9SOV/p+VVUSqYeEn0dvkTBuniJxXVX+ZL/wmVh/zwuf++V/+KpP+EysP+eFz/wB8r/8AFVxFFdH9n0u7Ob+0Kvkdv/wmVh/zwuf++V/+Ko/4TKw/54XP/fK//FVxFXY9JvZbN7sQMIUXduPGR3IHU+ufak8BRjq3Yax9Z7K51Q8ZWBP+puf++V/+Kq/rmsxaJok2qPG0qRhcKpAyWYKCSSAACwJJ6DJrzmu98Lah9r0xYWOZIPlPuvb9P5VzYrBqlDmgdOFxkqk3GZyT6v4h8TkrbR3H2Zv+WenkxREHu1y4UsP+uYBHQg1fs/BslrZs2oahBp1nGDJJDYAKqgcsWlcZIxySFU9812dzdW9lA1xdzxQQoMtJK4VVHuTwK8+17Wjr93AsUc76eJMWloF2vfS9QxU4IRcZGcDgscAKa+bxVKlCPtMS3LsvPskj2qcpN8tPTzJbfU7KzaQ+F9GiUsMHU74MTIPUZzLIP94qD1BIrEub7+0jcXCztq9zEpE9yziO1gXglWkA2oo4yq5Y4GQ3Wuwt/Clkls154kkiuSimR4nbFrCAMn5TgPgdWfPQkBRxWHqWqHVprZYraQWCuF07To0CvcOOQ7KcAAYyAcBQNzYOAvFXhV9nzYh8kekY7vyNoOPNanq+76HKrBqG15bm8njM4ESiKMr5KHokUQyRIwAAHJVRknJArLlsBZ30WoaBONPAtRM/lx7o0tVVtgdODJJIxJGSCAMA5GT3mrWR06AWs7rca3fRESCI5Wytjw4TODublAxwSSSMBSBz/mXEN1A8KJJbvJLLJhf+Pp4wFG0noqyGJF9Sp/u5PHOlOn8Ss2ruKtZLz7/5+tzeM1L07+f+RBaeOpYEKa5pNxBJGWWWe0HnRAqqs5IHzAKGAJwQCCMnFaP/AAnnhraWOqKoAyQ0Minpk8FQehz06c1kyWjzWX2GSNHgc+R54zumL3Ma3DHthnLAD/YPJBGH3Y0+eeS+YE28V9eC5AAzlbdkYD1yEGPqK4q2CwzXM4uN+z06Pzavf9DZVJ9GmTX/AMQ9Mt4XaxtL6/K7uUgaNAVQuQWcDkKC3APHOKy9QtdV1svNrsyLp8EgL2toTsjRlBS4DH/WBWyCGGAFY49bt+HsrS5voLTzJBbo8sEiglZLZxHKpwSMlGKEgkYXuOtnSrKWa50xbG5IYQtBZtIxCSoR5kSuOwKK6E4JDKpGRwdaGHpU2nRj7zdrve/Xsl2Wl+vQmdRtPnenkVvsoD3dlZ3KxvHIstzbIzxrHLgHeoUhhE4I3BTlScg5BrdttJN5ayalYrJeqg8q+sZlU3UOBkqSABOuDkAjcQcqSTg1ltbMva3pElvCHFrOQAstmQxVTnkZjYlSDlSjNnIANacialoutRuqxw6tChCgErBqEIPKg84wTnByYye6n5uiioKHNUjeN7N9Yvu/L+vN5zve0Hr0Xcl03UrC2so7PV/J1Dw3LgwTXCiQWhzgK5Of3eejHlDwTjBXduvBUTxH+y7+WCNlx9nuc3MDD6Mdw9gGwPSqX9kxa1DLrXh50jlnY/a7C5+VDKOGDYBMb+pAIbg4OQ1ZFtfX3hZ1jVp9LjB/48r9d1oc9o5ASEJ7BWwM5KE8V6C/dx9ni488ekkr6efW/mc3xPmpOz6onWy8S+F+bSCaO3X+G0zd2uOw8k4kT1xGMDuTXUeF/E3/AAkUdzG8KxXFqVEjRMXjbOcYJAIYYOVIyOPUE2dB8RW+tpJH5b217CAZraQglQejKRwynBww9CCAQQNC+vEsbGW5foikgep7D869PD0nGzpzbi+j1/Hc5qk/5lZmbe+J7Kxu3t3jmd04JQDGcZ7moP8AhMrD/nhc/wDfK/8AxVcXLK88ryucu7FmPqScmnx208sMk0cTGOPl27D6mvoo5fT5U5PU8OWPqczUVodj/wAJlYf88Ln/AL5X/wCKpf8AhMrD/nhc/wDfK/8AxVcPRVf2dS7sj+0Kvkdv/wAJlp/P7m5/75X/AOKq9pet2+rSSJBFKuwAsXAx9OCa86rsfDKLY6Fc37j72W+oX/6+awxGDp0qbkr3N8Pi6lWai7W6nNeJb1BqWoXTn93FuJOegUYP8jWn8GZWm+FOjSucs7XLE+5uJK89+IGpmy8IahKW/e3A8ke5c8/puP4V3/wT/wCSQ6H/ANvH/pRJU433Ywp9kaYL3pTqd2fM/gHU/wCy/F9mzNtiuCYH54w3TP8AwLafwr6f8IXnlX8lqx+WZcqP9oc/yJ/KvjtWKsGBIIOQRX0f4P146lo2n6tG2ZgB5gz/ABrwwPsSCfoRRhGqlOVFhjE4VI1l6HRa3Zmy1eeLGELb09MHnj6cj8KhsLGTUbtbeJlVmGcsew6/X6V0vie2S+0yDU4Pm2gZI7qf8D/M1ylvO9tcJNGcOjBh+H9K7sPUlOjputDgr04wq67PU7Ky0jSNMuYoriZJrxzhQ/TPbC9B7fpUq6tct4ibTZ7dVgKkLjnIxkMT6Y4x6n2qK406HxAbTUbafyWAG/HJ4OcexBpNV8TixvJLaGBJWVR8+7oe4Ix9O4rz3epLX3pa6dmeguWnHS0Ura9zl9WtFsdUuLZDlFb5fYHBA/AHFLpGotpl+k4J8v7sijuvf8uv4U6K0v8AWriadV3vyzseBnHAFUCCrFWBBBwQRgg+lepFKUPZzettTy5Nxn7SG1zu9Z8O2HiQ2d3JPNHJbhjDNDsOA2M8OrLztHOMjHBGTU2l+H9O0VnuIVdrh1xJc3Ehdyo7ZP3V4zhcD2rB8M64LVhY3LfumP7tifun0P1/n9eNLxhpeqa1p0Flp5h8iSb/AEtJJCnmRgHCkgElS2NwGCRkZwTXzuKwio1HOUbvoz38NiPawVnbuc3rOuyeJb2G2s42nsC/+iwKcfbXUg+ax7QqcEE8E4OD8oOnLAfCWmm8/d3niC+IgidwQikjO0DqsagFj3bHJyQBuaJoNvosDkMZ7uUDzrllAL46KB/CoycKOnJOSSTyPibUJLvxFc/ZdryWypp9oDyDcSkFunUDMWT22t6HHkVoSpxliaivPZLtfRfPzO6LUmqcfh6+ZDpWkT6tez2i3EzguG1TUTw8jED92p7MRgccIuAMEjEGok3epXC6ZGiFpU0rTUVcLGsZILbemFbzWOOqxj0FdnfmPwn4PkSyGZYkEcG/nzJ3bCs3qS7ZJ9yawPCdlBbTT6jIT9i0eA28Tt/E4UGWQ+pAAXPXJkBrnnhXGMaDd51HeT8l+nQ0VW7c1oo7GdrENlpupXEcIY2OjWMEBHVtyB5CM92IaIk9SfrWNc6O+n6ZqdhcAfaAsUk2O8stuqOR9WLfnWzoVpLq1/psF2P3l07arfD6MGCfQO0agHqqkVN4qX/ipdRT/nobH8cybf6VzVYOpGrWWzkkvRNI0jLl5YeV38yLxRYJHqfiO3xxPamdQOwljKMB9WiJ+pNQXdnLbSz29uArzImq6cT0Dlg5X6LLgkdAsiitjxVE3/CU3Axn7TpaIg9SjyZH/kVfzqe/tvtfgLRtXt1LzWNrFcrtGS8RjHmKO5ypJA7sq1pVwzqVq8I7rlkvUmNTlhBvzRQ1wWs89nq8aZ0rX4FjmRhjbKU+UsOxZcoc90UdTW1pMdv4l8N/2ZqbM95YsI3kDYkV1HyTKexZcHPTJZecEVU8OQ2mraRqvhy7Aktt/nRbDj91KSwZT2KyCTBHQBSO1Y5Oq+HdZhWdlGoICkMzfLDqUQ52k87XAycdVOSAVJB6FJQksWleE0uZb28/8yLXTpN6rYlY6p4W1tXdQ9w/ynbhY9RjUE4GThZlGSATzzyVJK95p9/Z63pqXVs4mt5QQQy8g9GVlPQg5BB6EYqsh03xZ4fBlhMlrOPmjf5XidTgjIOVdWBGQeCOD3rF8OeHdZ0LxJcs9xBPpc0J3ShysssgKhGdAu0MFDKWB+YbeBgAd1Ck6L5aesHt5f8AAMJy59ZaSX4l3TfCUGkeI21K0nKWogeKKzEYxFuZCQrZ4XKAhccEnBxgDM8U6r9qufscLfuoj85B+83p+H862PEWtrYQm2t2zcuMEg/cHr9fSuFPJya9zLsIl79tP1PIx+JdvZp6hXbXtteLotpZaXCrRSpiRxjoQPX1yTn2rDXQ1j0N7+7lMLt/qkx970GPf9Kr2mu6jZQeTDPhMYXcobb9OP8A61d1Ze20p68r1OKi1S/iacyN2PSdF01Y4NRkElxKQOp4J9AOg9zWHrumLpd/5cZJidQ6Z7dcj8Kt6MbCWSTUNTuszo+4K7/e6EHHU49uKo6zqX9p6g04XEajagPXAyefzNRSdVVrN379vkXV9k6V0rdu5RRGlkVEGWYgADuScAV2HiB10zw9Bp8ZG5wF47gck/nj86y/Cunm61E3Dj93AM/Vj0/Ln9KreJ9SS51KaRnAgt1K7icAAZLH888+gqqz9pWjT7asVFezoyqd9EeL/FvVMyWOlI2doM8g+vC/jjd+de3/AAS/5JDoX/bx/wCj5K+VvEerHW9fu9QOdssh2A9kHC/oBX1R8Ev+SQ6F/wBvH/pRJXmYmp7Sq2tj1cNT9nSSe58g16L8Kte+y6jLo8z4iuvniz0EgHT8QPzAHevOamt55bW4jnhcpJGwdGHUEHIP51nSqOnNSXQurTVSDi+p9leFr1Lm2l0q4wVIJQHup+8P1z+J9K57UrJ9OvpbZ84U5U/3lPT9P1zWF4R8SLq+mWuq27BZ0IEqA/ccYyD7HqPUEV6NqltH4h0eO+tFzPGPu9z6qff0/wDr16vMqVRVF8MvzPJ5HUpum/ij+RxyTSRZEcjoG4IViMj3xWlomiyatMSzFLdCA7DqT6D/ADxWVXV+GpBc6Re6ejiOdgzKenBGM/gf51viJOnTc4bmGHip1FGewaprcOnQf2dpQVdow8i8hfUA9z6n+vTm4ra4u/MeKN5NoLOR/jWtaeFr+a62XCeTEp+Z8g5+gB/z+lX9R1a20e3OnaWq7xw8nXae/wBW/lWEJRp2VP3pM2nGVS7n7sUcnXUaB4l8nbaX7kx9ElP8Psf8f6dM2z0C9v7B7uPHX5Fbgv6nP19evNZbo8UjI6srKcFSMEH0IroqRp104N6/kYU5VKDU0tPzPRdYXUZ9FuBo00SXzqPJkkPyjkZ7EZxnBIIzgkEcVheGfCEumTxXepSQvPCGMEELM6RM2d7l2AaR2ycsQOp45JOTpeu3WlsEU+ZD3jY9Poe38vauz07W7LUVAjk2yEf6t+G/+vXhYrL3GSlNXSPaw+NjNNJ2bOX8cag7ajZ2MCiSS3UXAiPG+aQmKBSfQkyE+mAe1bU+iiz8C3WjwOXf7DLGZCOZJGVtzkerMST7mmr4YU+L5NclumkQkSR25T7kgjEe7dnkbc4XHBZjk8YteJ7240/w5ez2kEs1zsEcSxRNIQzsEDbVBJCltxA7A1wwpP20qsvRei/zOxyTioo53wRKtzrV9MoG06dZsnsGaYn/ANBX8qqeKx/xWoTs/wDZWfxvJAf0Fa/gbSZrK0nvbiCW2a4WOGCGUYdIIwQm4dmJZ2x1AIBwQRWV4qH/ABXduv8Af/sz/wAdu3NcEaPs8CoNdV/6Ujfn5qzfr+Rr+NrfyY7DWRytnI0c5/uwyYBb8GWMk9gCe1TeCJs6LPYN/wAuF09uuf7hAkQD2CyKv4V0F1bQ3tnPa3CB4J0aORD/ABKwwR+RrjPhnHePpk93cpKnmxwKfNQqzSrGBIcHnGcL9VNdcqTWKjVWzVn8tUZKSdJwfqZtmf8AhFvGcNo3y28MgtlPY2s5HlH/AIDKojHoAT3ru9a0mHW9IuLCf5fMU7JMZMTj7rr6MpwR9Ky/FfhRPEsUey7NncorRecI9+Y2xuXGRzkKwOeCo6gkHbvL+2sIvMuJlQdgTyfoK1oUXCUorZu6+ZNSomlJ7ow/BenalYaXdHVIVgnuLky+SrhgnyIpwRxgsrMPZhnByBNrfiKKwRre2YSXJ4OOQn19/asbVfFNxdBobTMMR4LZ+Zh/T+fvXPHk5Nevg8t5YpS0SPKxWYK7UNx8krzStJIxd2OWYnJJqfT5LaG/iku42eBWyyj9MjuM9u9auk6ArxfbdSbybVRu2k43D3Pb+dW7rTNJ1DS5rrS8o8AJPXBwM4wfbvXozxFKP7tfh0OCNCpL3/z6l/VNM/t9rWe3uwbYfeUdPqPftzWLraW11qMOnadbr5kX7ssvGSO3uBznPvWdpmrXOlzb4WyhPzxk/K3+B966V9c0tbV9ThjX7cyhNh+9n39vf2rl5alBrrFbW7vudXNTrp9H1v2XY5jUtPk0y7MEjo5xuBU9vcdRVRVZ2CqCzMQAAOST0FPnmkuJnmlbc7kkmuj8LaUGc6lcDEUefL3cA4/i+n9fpXa6jpU+apucSpqpV5aexfmYeG/DoiUj7TIMZH989T+H9K8T+Jev/wBmeH/sML4uL7KHB6R/xfnkD8/SvRfEetR3VxNdyyCO0gUlSxwAo5Lfjj+XpXzP4p12TxFrs98dwizshU/woOn9SfcmuCUnSpOcvikd8IKrVUF8MTEr6/8Agl/ySHQv+3j/ANKJK+QK+v8A4Jf8kh0L/t4/9KJK8w9Q+QKKKKAOr8D+KD4c1cecx+w3BCTjrt9HA9R/LPtX0f4d1oWE4y4a0nAJI5HPRhjqPp2+gr5Gr1H4b+MgmzQtRkG3payP2P8AcJ/l+XoK7sLVi06NTZnDiqMk/bU91+R7t4l0byXOoWy5gk5fbztJ7/Q/z+tc/DPLbyrLDIUcdGFdF4e1xVUadekNC3yozc4z2Oe3p/h0qa9oTabKZoAWtWPB6lCex9vQ/h9e2jNwfsavyfdHBVgpr21L5+TIpvEmpzweS04UEYLKoDH8R0/DFM0TSm1S8CtkQIQZG/kB9azK63w/qVnJYHTSxtZ2BAcH7xPcE9D7H8KqslQpuVKO/wDVyaTdaaVSRe1ua/sreCTTUX7PFy4UZ46AY/u/T9MVz+sataapaROLbZeA4dx2A9+4PbPTn8X3D6p4bZ7YShoJQdjdRnuR6Hnp/Oqug2H9oarGjDMSfO+emO364/WsKNGMV7ST21uuvqbVqspPkit9LFa60y8soo5biBkRwCrZB5Izg46fj6VUBKkEEgg5BHau811or/RLwREFraTBPoVwT+hNc1omi/2t57O7RxRr94Y+8enX0AP6VvRxKnTc6mljKthnCooQ6jbTxHqVpgef5qj+GX5v16/rW3beM4iMXNqyn1jOc/njH61yMiqkrKjb1DEBsYyAeDjtmpEtLmRN6W8rJ/eVCR+YFE8LRqK9rfgKniq0NE7ndR+KtKcZM7p7NG39BUUur+HZ7mK5mMElxDnypXtyXTP90lcj8K4Qgg8jBFFYvLab6myzGouh6E3ijSFHFySfQRtn+VUp/GVmgPkwSyN23YUf1P6VxVFUsupJ6tilmFVrRI3LvxVqFxlYikCn+4Mn8z/9asaWWSaQySyNI5/iYkk/iaZXU6X4bs7zSUuJZXE0ykKcjCnJxgfhWrjRwyUrWMU62IfLc5atjU9CfT7CC6WUTI+N5UcAnkEeoPr/AI1n3tlNYXLQTrhl6H+8OxFdH4bvY76zl0i6+YbTsyeq9x+H+elOvUlGKqQ1XX0FRpxlJ056N/mP0jUIdasW0u/OZcfI5PLD1z6j9fzq5jSdGtjpc0jp5yEvIVI3Z4PI6f0rkLy1m0vUGiLFZImyrDjI6gitm81mz1PQyt2p+2pwu0dTj7wPoe//AOquWrQ2cPgl2OulWtdTXvIi1LRtNt7U3NtqIZOipw24+gIxWBRV3TNNn1S6EUQwo+++OFHr9fSu2mpU4v2kro4ptTkuSNibRdJk1W7C4KwIQZG9B6D3P/161/EuqxwxDSrMhVUASbewH8I/z7etWtS1CDw9YCwsQPPIznqVz1Y+pPYf/qryDx14wXw/YmKGQPqdwCUBOSgPVz+uM9T7A1yuSrS9pLSEdvM6lF0l7KGs5b+RzHxN8V7idAspMgc3Tr3I6J+Hf8B6ivLqfJI80rSSMWdiWLE5JNN54rzq9Z1Z8x6dCiqUOVDa+v8A4Jf8kh0L/t4/9KJK+QK+v/gl/wAkh0L/ALeP/SiSsDY+QKKKKAClBIII6ikooA9i8BeOhqSx6TqkgF4oCwysf9d6An+979/r19p0XxChjFjqRDwsNqyMM4HTDev17d/b43BKncCQR3r1LwX8Rgwj03XZeeFju2P5B/8A4r8/WvRpV41Y+zq79GedWoSpS9rR26o9v1vw49nuubPMlseSo5Kf4j3/AP11z9bWi+I5bALFKTNanGMclR6g9x7VrX2g2mrQ/bNLkRWbnaPut/8AEn/PvXVGtKjaFbVdGckqMat50tH1Ryk91Pc7PPlaTYNq7j0FdPo0kGleHLi9Do1w5xgHJB6KD+OT9DXMXFtNazGKeNo5B1DcfiPUe9Re1bVKMakOWOiMadV0580ld/qdT4Wf7XbajZyNkyjdknrkEE/yqa8xoXhdLUYFxPkNjrk9T+AwPyrB0XUl0u/890Z0ZSrBfQ45598U/XtTGqX++MnyUUKgPHuTj6/yFc1ShJ1rJe67N/I6YV4qjdv3ldfeXPDOnQTma+uwDDAOAwyM4ySfoO3vU8vjGYT/ALi2i8gHo5O4/iDgfkaXwtLDPaXemSttMoJHqQRg4/Ss6Tw1qiTmJbfeM8OCNpHryePxolGE60o1XotugRlOFGMqS336mnrdvbapo6avbJscf6wY6jOCD7g9/SqnhXTre9uppJ1DiFQVRhkEnPJHfGP1rQ1BV0XwsLF3Vp5jjA9zkn6Ad/pWBpEuoQ3Zk09GeQL8ygZBHXB/L6+lFPmdKcYPS+jFV5VVg5rXqjU1DWbC4tp4JdLEU6/LHkAEH1JAyMdcd65uu1sNRg8ReZaXtkA6qSWHIHbg9Qf8DXH3cItryaANkRyMgP0JGf0rTCtRbg0097XuRik5JTTTRFXYNFcS+EbIWquZ1ZWXZ1BBPPt9a4+uvOqHT/Clt5E0a3JUbVOCevPBp42/LG29xYOylK+mhoXGmPrGlIl8ixXqjhl5wf8AA9xXFOlzpWoYYGOeFs57fh6g/wAqX+0737Wt0bmRplOVZjn8MdMe1NvL65v5hLcyb2xxwAAPQAUqFGrB8srcr6dvQdarTmlJX5l17mhrurW+qmF44CkiLhnOPyHqM55+tY1Kqs7BVUsxOAAMkn0ArpdK8LMwFxqR8uMc+Vnk/U9v89K1vTw8LN2RlapiJ3SuzL0nRbjVZflykA4aQj9B610N/qVp4etPsNgoa4xznnaT3Y9z7VW1XxJHBF9j0oKqKNplUcD2Uf1/L1ryfxj49tdAV7e3K3OpsCdpOVjJ7t798dT3x35pN1lzVfdgunc6YpUny0tZvr2L3jLxjD4etXmmcT6hPkxRE5LH+83oo/XoPUeD39/c6ney3l3K0k0rbmZv5fSkv9QutTvJLu8maaaQ5ZmPNVa4cRiPae7HSKO/D4b2fvS1kxKKKK5TqCvr/wCCX/JIdC/7eP8A0okr5Ar6/wDgl/ySHQv+3j/0okoA+QKKKKACiiigAooooA7Pwn4/vPD5S1ut11p/Tyyfmj/3Sf5Hj6V7Z4d8UQXcQvdHvldTjegPI9mU8g/X8K+YKuWGo3mmXS3FlcyQSr0ZDj/9Yrro4pxXJPWJyVsKpvnhpI+x4Nd03WIxb6pCkb9mP3c+oPVf881XvfCLgeZp8wlQjhHOD+B714V4f+KyMFg12Haen2mFcg/7y/1H5V6jonibfCJ9J1FJoe4Rwy/Qjt+hrsprrh5fJnFUbWmIj80PuLWe1k2XETxt/tA8/T1qGusg8V21zH5WpWgIPUqAy/iDyP1qT+yNA1TmzufKc8hVbv8A7rc/litVinHSrFr8jH6qpa0pJ/mcgjvE4dGZWU5DA4IPqDWunifVUTb56txgFkGR79P51buPB12h/cTxSD/aBU/1qhL4d1WLrZsw9VYN/I5q3PD1rXsyVDEUr2uihcXM13MZbiRpJD3b09B6D2qfTtSn0yfzYCCD95W6N/n1pDpeoD/lxuf+/Tf4Un9m3/8Az43P/fpv8K1apuPLpbsZJ1FLm1ubM/jC5eIrDbRxMRyxO79MCudZmdizEliSSSckk96s/wBl6h/z43P/AH5b/Cp49B1SX7tlIP8Aewv8yKzpwo0btP8AEupOtVsmvwM6iugg8IahIQZXiiXvlix/Lp+tXx4a0uxUPf3hP1YID+HX9aJYulHr+o4YWrLp+hySI8rhI0Z2PACgkn8BW7YeFLy6w9yRbx9cHlj+Hb8fyrQbxDpGmoY9Ott5x1VdoP1J5/SsLU/E15PE7zXK20Cj5trbVA9zn+uKydatV/hxt5s0VKjT/iO/kjoWm0bw4pWECa674+Zs+56D6fpXNa14kluYpJby4S3tEGSC21APcnr/AJxXnGv/ABO0vTg0Wmj7fccjcOIlPuep/Dg+ory3W/E2q+IJt9/csyA5WJflRfoP69awlKlSfNN80jphCrVXLBcsTt/FnxNMiyWWgsyIeHuzwT67B2+vX0xXmTu0jl3YszHJJOc02l4z0rirV51XeR3UaEKStEbRRRWBsFFFFABX1/8ABL/kkOhf9vH/AKUSV8gV9f8AwS/5JDoX/bx/6USUAfIFFfX/APwpL4ef9C9/5O3H/wAco/4Ul8PP+he/8nbj/wCOUAfIFFfX/wDwpL4ef9C9/wCTtx/8co/4Ul8PP+he/wDJ24/+OUAfIFFfX/8AwpL4ef8AQvf+Ttx/8co/4Ul8PP8AoXv/ACduP/jlAHyBRX1//wAKS+Hn/Qvf+Ttx/wDHKP8AhSXw8/6F7/yduP8A45QB8gVas766sJxPaXEsEo6PG5U/pX1r/wAKS+Hn/Qvf+Ttx/wDHKP8AhSXw8/6F7/yduP8A45TTa2E0mtT5/wBL+K2r2gVL6CG9QfxH92/5jj9K7PTfid4fvQBcSTWUh6iVCVz7Fc/rivTf+FJfDz/oXv8AyduP/jlH/Ckvh5/0L3/k7cf/AByuqGNqx0vc5amCpT1tYwtN8VpOB/Z2tJL/ALEc4bH4ZOPyrci8VapGMNJHJ/vIP6Yp3/Ck/h5/0L//AJO3H/xyr1v8LfCNmALawu4QO0ep3S/ykrT61Rl8cDL6pVj8E9CFPGV4Pv28DfTI/qak/wCE0nxzZx5/3z/hWnF4J0GEfLbXJ/376dv5vVgeFtGAwLQ/9/n/APiqXtMJ/K/6+YeyxXSS/r5GC3jO7P3baIfXJ/wqvJ4t1N/umGP/AHU/xNdBJ4N0OUfNbTDP927mX+T1Rn+G3he5BE1reup6qdUusfl5lCq4VbQf9fMfscU95/19xzF/4nuI03XuqiBCOryiMY/DArkNS+Ifh2xLF9QN1J/dtwXJ/HgfrXorfBb4fuxZtBLE9Sb24/8AjlN/4Un8PP8AoXv/ACduP/jlP67GP8OCQLBOX8SbZ4XqfxcuZNyaZp6RDoJJ2LH67RgA/nXDapr2p61Jv1C9lnwchScKv0UcD8BX1Z/wpL4ef9C9/wCTtx/8co/4Ul8PP+he/wDJ24/+OVz1MTUqfEzop4anT+FHyBRX1/8A8KS+Hn/Qvf8Ak7cf/HKP+FJfDz/oXv8AyduP/jlYG58gUV9f/wDCkvh5/wBC9/5O3H/xyj/hSXw8/wChe/8AJ24/+OUAfIFFfX//AApL4ef9C9/5O3H/AMco/wCFJfDz/oXv/J24/wDjlAHyBRX1/wD8KS+Hn/Qvf+Ttx/8AHKP+FJfDz/oXv/J24/8AjlAHyBX1/wDBL/kkOhf9vH/pRJR/wpL4ef8AQvf+Ttx/8crsNE0TTvDmjwaTpNv9nsYN3lxb2fbuYseWJJ5JPJoA/9k=";
const BCBS_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAoCAYAAAB99ePgAAAJpklEQVR42r2YaWxdxRXHfzNz732L3/Oe2HEWsicmZAGKCoEmIBEglKgQpIaqakslSjdRIdQKEQmh9kO/UKkVEkhU6YemBdESGpBoEW1DoyIKEWEJTtIQ7CSA4yw2cWw/v+XeWfrh+tnPz34moaVXupq3zJk5539mzvIXpVLJhWGI7/torZFS4pxDCAGAtRbP89Ba43keURTh+/74qLVGKYW1FiEEzjkAhBDjspUyQRBQ3i+KIjzPwxgzvm9ZFkCMjIy48oTKTYBxJZ1zSCnH50w3Vhs1nUylomWjau0LIH3fn7RAtfUXophSapIh5c/Vc7TWUxQrr10tK4RA5HI5V8v68lP+zVo7rWKVLr1Y1GvJAohCoeCmm1CpmJRyyiIzjZWoV46VxlUCMZ0sgFdr0/JzoQrNhFwlgtbamopNOXMzKVY58WIUrIXIxcgCSP5PT7XRFzLfqwXz5+HWTz2rQiAq3VodBioVMw4iY7EIImMx5dHF46e5RttY1oyd6zIQtuI7QqCNxTouPJQ4B+mEBCXBOpACrAUp41FI8vkQOU04cIBwjlRCAaANFMIIIStCiDF4nkLiSAYeCNCRITQAY7e2WCy66qBonSNQkmcO9fPx+RCpBDZGPXaZdWSTHnevnYUHICTOjaHhHAklOTlS4id7etm6sokbFmRoa0gBFqQHVoNUoDXDoeOdvhGe6fqEBS0pHlrfzmjokAK8yvxWDooAvoLH3x5g36F+SPuxjwXxGzlSjQHbOptpSvmUtEGNoW4deL7ktd5Rnt13imcPDuB7ghWtKZY3J2mv8xFScGokomewQPdgidHQQmiY05zgvi+0oSivM006sdYBgqwn8OoS+EkPJ9z4WdShZXY6ge8pjIkDqyu71lqQguePDHDZkiYe//IS9p4Yovtcgd7hkO7zoxgHrSmPNXOybO2cxbLWFCXj+PYfj/BW3zAbFzWRK2lkFEUopYi0ASHjwwnxIR5zcaGkKY6EFIdDiqMabUFbSynSOCkJtcESXwBPSpy2vNtfZNPSRn7fdZY/vXsGKeDS1hR3drZwz+WzuW5BPUkl2fvRMD98/gOSStDckGD/mRIIh7VjyEVak0l4COlA+GAs+LGrbWS4dkULa9rqCJTg8ECBvx89R2RgdjaJFJZU4INz4CSF0FCILGdHQlpSPq99NMyB3hwH+nJsWNHMZSJNLlI8d3CAvrymOBKBsQwUNAsbkxw+MwKiA4TBK4URmXSCne+e5oXDgyhf4BB4OHoGQx6+eRFr5mQw1nF2NGLzsiZuWtzAk2+e5vanDpNK+Rhjscaxdk6ahzfOZ6igMQiUgISSSOe448p2nrhtGTve6uPW5c1sWd7MN3e9z0lt0XlHIbIEniByMr44DjypFBLLgbNFdu8/Cxk/vsmFiMfuWkkmkOw6NMCXLqlnsKD5a895fAlPbFnKTTveixFTEvKas6uaeOT6WCFfwHBoaEx6WODsaEQuNLRlEjQmPH7wYg8nzuQJ6hM4IFCCXMmSVG7s1oE0Jj5rSQUq7ZFKeyhPsGxxA61pn+HQcdnsOnYe6Ofprn4SStKeTTCQj9h0aTPKk6RSHirt0ZD0wDpSgWBhY8CxwRILGwOEJ3n1xDB3P3eElC8ZjSy7tnWyYn6WqGTAl9QnFH0jJTpn1cVxToCUUoJzOATGxkCYoubOzhZ6h0u8fmSA5S1JmlMe/fmIGxc38EbPIHtPDHFnZwvGOowbe63DORBKsn5uhv19I3TOSuEEBL7i1Q/Oc+B0Dk/C26dyhMbhrKMxE5D0JOdGQ9bNTuGMQ05N/BPhIhsoXjw6yB/eOs2pXIgvBeva6zjYP8ru7vM81TWAJwXIOJtMJGNw2vGVlS309BdoSHrUNyQIQ0O2PuCWpU2cK2gee6OP4/0FhIO17WmODZZIBx5XdmSItEUKkOWECxN5VQjBsfNFljYnWb+ujWJk2drZwsMb53NyOOLuK9pY0ZxksKgRkUFJgXACIeKl8pHhuvkZmtOSN07muH1lM4SGkZLhgZeP4xBs3zAfP5A4bdiyvIkX3j/HpkUZ6tMeJTOW+Cvd6qyjZCwuUOx6b4Dbljdz7xVtCAF//mCQ+/5yjIWNCVa2pvjFzQv5zf4zOCVj9ziHNrGhkXGkUj4/vqaDHftO8dVVraTrfGRo+NrqWSQUfPeFbnTRsGxelnkNCd7sOccDV3dgjRszUkxciEBCXVLRkJA0pD10ZPjV6yfJhYbL52TY9/EwH/bnaUwqWtMev37zNMc/GaWhPiAbSOoSikxCjYUAQSEf8aOrO8gGimcPDfDo5kXY0PDoP3sZKhrWX1KPy0f88pZFPPpqL9evaGHDogYKJYMsl1yFQtFZa8hrx1AhwvMU2liyKY9Nvz1E90CRB29YwOLGFFLEIeHx10/SOxrR9f21eM4gpIcxmnTCpyGIz6AF6gLJy8eG2fxkFzu/tYp/fTTC7945ze6vr2LrzoNsv3EhWMf2l45z5P51LGlKUowsSlb1rVhL4Me5EiHwfcGtTx/lpUMDcdgJFEKAKxpAMH9WivfuWUVD0iM0Fm8sN2smCkaLIJOQPLK3l5+99CG771nNv/vz/O39c2xc0kTn7BTbdnTx5F1LufeqDkYKGk+KqX2rk5J8qIkcFCKDs1CKNEoJUukAKUEgSNT5eEF8ya2UOM/HSkUh0mhEfH7LBaOz5EPHTzd2cN/GudyxowslBPdfO4/mtM+233TxyJYl3PvFheQKGiWYVGxOKpm8sZJJSYHAESExJUNBirjgFFCKBGhHLjREYcTB7qN0zJtPNpsZpzPKZbpSCm0MBa14bPMC2jMBD77Yw9L2Orr7cvz89mV8b7lizyv/YP01V09pqmp0/GARLMkqVs3LsqY9zeqODKva6lg7N8Olc1JcNbcenGXPnj0MDQ+hlJq24y+7Ox8Jtm/s4JXvrGZB2ue5b6zkoQ2X0PvJECeOH5vSwAshZuZKxHiDY8e6dotSE927NnYKjTETV4JUpKVDBB5ow2jkUFIQBAHFYnH6jn86xao7fmMtqmozWVlk1uj4qxWM+wiNlAqcndJoT2KZcrmcq9UaugkNx7olh5QT48W0hpOoiBpGVSPnzdizTiFkJo8Xw5VMQmgG3mUSVzKT9ZMg/oxN9WeV/VzoCDepRJn6/WLk/+dEzmelIqrdKoRA2hq37b/hSmpxcxdCgVXGSlkOITOxmuX/Khev5j1qUWDlOdNxyDPJCiGQ1Q11JXLVVl8odToT3TodUV0JzCTkgiCoSViXhaoVqswon0ZYV87VWhMEwRQFaxHW/wG6bNXpAmrN9QAAAABJRU5ErkJggg==";
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

function Card({ children, borderLeft, bg }) {
  return (
    <div style={{
      background: bg || C.white, borderRadius: 10, padding: 16,
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
    if (e.visibility === "semester") return false;
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
                            {e.title}
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

  // Sort courses by code for "All Courses"
  const sortedClasses = [...data.classes].sort((a, b) => a.code.localeCompare(b.code));

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
                return (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 44, textAlign: "right", paddingTop: 2 }}>
                      <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 16, fontWeight: 700, color: C.pepBlack }}>{formatDate(e.date).split(" ")[1]}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.stone }}>{getDayOfWeek(e.date)}</div>
                    </div>
                    <div style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${s.border}` }}>
                      <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14, color: C.pepBlack }}>{e.title}</div>
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
const FACILITY_TYPES = /hospital|clinic|clínica|sanatorio|laboratory|lab|pharmacy|farmacia|emergency|imaging|diagnóstico/i;
function isFacility(provider) {
  if (provider.category) return provider.category === "facility";
  return FACILITY_TYPES.test(provider.type);
}

// ─── Local ───
function LocalView({ data }) {
  const [sub, setSub] = useState("health");
  const [healthFilter, setHealthFilter] = useState("all");
  const [churchFilter, setChurchFilter] = useState("all");
  const [exploreFilter, setExploreFilter] = useState("all");

  // Extract unique types/denominations
  const healthTypes = [...new Set(data.healthProviders.map((h) => h.type).filter(Boolean))].sort();
  const churchDenoms = [...new Set(data.churches.map((c) => c.denomination).filter(Boolean))].sort();
  const exploreTypes = [...new Set((data.explore || []).map((p) => p.type).filter(Boolean))].sort();

  // Filtered lists
  const filteredHealth = healthFilter === "all" ? data.healthProviders : data.healthProviders.filter((h) => h.type === healthFilter);
  const filteredChurches = churchFilter === "all" ? data.churches : data.churches.filter((c) => c.denomination === churchFilter);
  const filteredExplore = exploreFilter === "all" ? (data.explore || []) : (data.explore || []).filter((p) => p.type === exploreFilter);

  // Badge style
  const badge = { fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12, whiteSpace: "nowrap", flexShrink: 0 };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        <Pill active={sub === "health"} onClick={() => setSub("health")}>Health Providers</Pill>
        <Pill active={sub === "churches"} onClick={() => setSub("churches")}>Churches</Pill>
        <Pill active={sub === "explore"} onClick={() => setSub("explore")}>Exploring BA</Pill>
      </div>

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
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>
                  {h.address && <>{h.address}<br /></>}
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
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>
                  {ch.address && <>{ch.address}<br /></>}
                  {ch.service && <>{ch.service}<br /></>}
                  {ch.notes && <span style={{ color: C.stone, fontStyle: "italic" }}>{ch.notes}</span>}
                </div>
                <LinkButton url={ch.link} />
              </Card>
            ))}
          </div>
        </div>
      )}

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
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>
                  {p.description && <>{p.description}<br /></>}
                  {p.address && <span style={{ color: C.stone }}>{p.address}<br /></span>}
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

      {/* Additional Resources */}
      {(data.resources || []).length > 0 && (
        <>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.stone, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Additional Resources</div>
          {data.resources.map((r, i) => (
            <Card key={`res-${i}`}>
              <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue, marginBottom: 2 }}>{r.name}</div>
              {r.detail && <div style={{ fontSize: 13, color: C.stone, fontFamily: "'Roboto', sans-serif", marginBottom: 8 }}>{r.detail}</div>}
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

  const statusLabel = status === "live" ? "Synced"
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
