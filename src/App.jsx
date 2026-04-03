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
    { date: "2026-08-10", title: "Arrival Day", type: "milestone", description: "Airport pickup and welcome dinner", start_time: "", end_time: "" },
    { date: "2026-08-11", title: "Orientation begins", type: "orientation", description: "Three-day orientation program", start_time: "", end_time: "" },
    { date: "2026-08-14", title: "Classes begin", type: "academic", description: "First day of classes", start_time: "", end_time: "" },
    { date: "2026-08-17", title: "Día del Paso a la Inmortalidad del Gral. San Martín", type: "holiday", description: "National holiday; no classes", start_time: "", end_time: "" },
    { date: "2026-08-21", title: "City Tour", type: "excursion", description: "Guided walking tour of downtown BA", start_time: "10:00", end_time: "13:00" },
    { date: "2026-09-04", title: "Asado", type: "program", description: "Weekly asado", start_time: "13:40", end_time: "14:40" },
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
    semester: settings.semester || "Summer 2026",
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
      insurance: r.insurance ? r.insurance.trim() : "",
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


const LOGO_URI = "data:image/jpeg;base64,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";
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
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              <FilterPill active={healthFilter === "all"} onClick={() => setHealthFilter("all")}>All</FilterPill>
              {healthTypes.map((t) => (
                <FilterPill key={t} active={healthFilter === t} onClick={() => setHealthFilter(t)}>{t}</FilterPill>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredHealth.map((h, i) => (
              <Card key={i}>
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
            ))}
          </div>
        </div>
      )}

      {sub === "churches" && (
        <div>
          {churchDenoms.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
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
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
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
