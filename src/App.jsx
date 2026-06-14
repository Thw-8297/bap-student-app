import { useState, useEffect, useRef, useCallback, useMemo, Fragment, lazy, Suspense, Component } from "react";
import { createPortal } from "react-dom";

// Places map (SPIKE): Leaflet lives in a separate chunk loaded only when a
// student first opens the map view, so it never weighs on first paint or the
// offline shell. See src/PlacesMap.jsx.
const PlacesMap = lazy(() => import("./PlacesMap.jsx"));

// ============================================================
// BUILD VERSION — Update each time a new build is generated
// ============================================================
const BUILD_VERSION = "2026-06-14 — Greeting-strip polish: the Today refresh button now nests into the decorative sun (moved top:12/right:12 → top:5/right:5 so it centers on the sun, which sits ~22px from the top-right corner, and reads as the sun's disc with the rays radiating around it). SunIcon reworked from 8 straight pepBlue spokes on a blue dot into a Sol de Mayo–inspired form: 12 straight rays alternating with 12 wavy flame rays (S-curve quadratics), generated in a loop; rendered white/celeste (gold stays exclusive to the Mundial SolDeMayoIcon) with the day-watermark opacity bumped 0.22 → 0.3 so the new rays read around the button. App.jsx only; no CACHE_VERSION bump, no Apps Script change, no new dependency. PRIOR: 2026-06-13c — iOS safe-area insets (review backlog Tier 4 #12), shipped after two prior parked attempts. Tuned against a real Dynamic-Island standalone PWA (top 59 / bottom 34 / sides 0) using a temporary in-app env() readout, then removed. SAME-DAY FOLLOW-UP: fixed a home-indicator gap under the bottom nav — the fixed nav is now centered via left/right/margin instead of translateX (a transform on a position:fixed element made iOS anchor bottom:0 to the safe-area inset, letting the parchment page background show through the home-indicator zone) plus a downward white box-shadow as a self-correcting safe-area filler. index.html gets viewport-fit=cover + two parse-time :root tuning vars: --safe-top (env(safe-area-inset-top)) and --bap-nav-pad-bottom (max(16px, calc(env(safe-area-inset-bottom) - 10px)) — deliberately LESS than the full home-indicator inset, which read over-padded). The fix the two prior attempts missed is decoupling: the header + the 3 full-screen overlay headers bleed the navy gradient the full top inset behind the status bar (padding-top max(16px, var(--safe-top))) while the gear is offset (max(12px, calc(var(--safe-top) - 4px))) to clear the battery; the bottom nav reserves var(--bap-nav-pad-bottom) and the .bap-nav-pill bottom now TRACKS that reservation (fixes the 09i stranded-pill bug), with content padding-bottom, the Places FAB, PlaceToast, the 3 overlay footers, and the BottomSheet body all shifted by the same reservation. On non-notched / non-iOS the env()s are 0, so max(16px, …) preserves the prior flat layout byte-for-byte. Looseness is tunable in one line via --safe-top. Gates left untouched (centered full-bleed; cover only improves them). No CACHE_VERSION bump, no Apps Script change, no new dependency. index.html + App.jsx. PRIOR: 2026-06-13b — Category-disc contrast fix (WCAG 1.4.11/1.4.3). New discGlyphColor(fill) helper (with relLuminance) flips glyph ink to navy (pepBlue) on light category disc fills (bapBlue/sky/stone) while dark fills (pepOrange/ocean/mountain/pepBlue) keep white — threshold 3.5:1 white-on-fill cleanly separates the two groups. Applied at all 5 disc sites: PlaceCard, PlaceSubmitForm category picker, the Places category-picker grid (both the <Icon> and the ♥ span), EventCard, and EventsTodayTile. Also enriches the map-places objects with _glyphInk so PlacesMap.jsx pins consume the same rule for their category glyph (p._glyphInk || '#fff'). Category caption TEXT recolored from the category color to neutral Mountain gray at 3 sites: EventCard date badge, PlaceCard DM Mono uppercase caption, and DirectorPlacesView category chip — the colored disc still carries the category cue. The 7px legend dot (background: meta.color) in DirectorPlacesView and all selection borders (border: meta.color in PlaceSubmitForm) are deliberately left unchanged — color is fine for non-text UI elements above 3px. Brand color tokens, disc fills, ring colors, and the campus pin are all untouched. CACHE_VERSION stays 7, no Apps Script change, no new dependency. App.jsx + PlacesMap.jsx. PRIOR: 2026-06-13 — Add-to-calendar (.ics) export on Calendar-tab events + assigned Finals rows, plus a reduced-motion fix for inline transitions (BottomSheet slide/backdrop, FAQ + finals chevrons, settings toggle thumb) via a new useReducedMotion hook. No CACHE_VERSION bump, no Apps Script change, no new dependency. App.jsx only. PRIOR: 2026-06-11b — PWA auto-update reliability on installed Android PWAs. Added an app-level useEffect (top of <App>, runs once on mount) that forces a service-worker update check — navigator.serviceWorker.getRegistration().then(reg => reg.update()) — on every visibilitychange→visible (app regains focus), plus an hourly setInterval backstop and once on mount. Closes the gap where an installed Android PWA, resumed from background without a real navigation, never re-checked the worker script, so a freshly deployed build sat undetected (the '24h-cold open showed stale content until a double hard-close' report). DETECT-ONLY by design: we do NOT reload the page on update (no controllerchange-driven reload), so a session is never interrupted mid-task — the activated new worker's build simply shows on the student's next cold launch. The SW itself is unchanged (vite.config.js still registerType:'autoUpdate' + skipWaiting + clientsClaim); this only triggers the check more often. No CACHE_VERSION bump, no Apps Script change, no new dependency. App.jsx only. PRIOR: 2026-06-11 — Mundial game-day treatment on Today (Argentina). When a `mundial`-typed Calendar event dated today has a title containing 'Argentina' (e.g. 'Mundial: 🇦🇷 Argentina vs Austria 🇦🇹'), the Today tab puts on the albiceleste jersey. (1) Greeting strip: celeste-forward gradient (still ending in Pep Blue so the white text keeps contrast), a rotating Sol de Mayo in place of the sun, drifting papelitos (celeste/white/gold) over it, and the mono label flips to '¡Hoy juega Argentina! / Game day'; personalized greeting + date unchanged. (2) New <MundialGameTile> hero rendered between the greeting strip and the weather/dólar row: jersey-stripe background, an oversized number-10 watermark, the matchup with flags, a live 'Arranca en X' kickoff countdown from the row's start_time (falls back to '¡En cancha!' after kickoff), tap jumps to Schedule (where the game also shows in the Weekly Overview via visibility: week). New helpers getArgentinaGameForDate(data, dateStr) / cleanMundialTitle(title); new glyph <SolDeMayoIcon> (32-ray flag sun with a face, rays generated in a loop) and <Papelitos> (fixed-config confetti, stable across the minute-tick) + a bap-papel-fall keyframe. All motion honors prefers-reduced-motion (papelitos hidden, Sol de Mayo static; the gradient skin + tile still render). Detection is a title-match over the Calendar data the Director already maintains, so NO schema change, NO CACHE_VERSION bump (stays 7), no Apps Script change, no new dependency. App.jsx only. PRIOR: 2026-06-10m — Places List/Map/Near toggles are now icon-only. The three controls at the top of a Places listing swap their text labels for glyphs: a bulleted-list icon (List), a folded-map icon (Map), and a navigation-arrow icon (Near / distance sort). New inline-SVG components ListViewIcon, MapViewIcon, NavArrowIcon ({size,color}); each button keeps its active/inactive pill treatment + ≥34px height and carries a bilingual aria-label/title + aria-pressed (the row is now wordless). Scoped to Places only — the shared text 'Cerca / Near' pill on Health/Churches/Explore is unchanged (a Places-only nearMeIconButton was added alongside the existing nearMeButton). App.jsx only; no CACHE_VERSION bump, no Apps Script change, no new dependency. PRIOR: 2026-06-10l — Pull-to-refresh now also refreshes Places. The Today pull-to-refresh gesture (and the refresh button) call refreshAllData, which previously re-pulled only the CONTENT endpoint (fetchAllData with ?bust=1) and never touched Places — Places has its own fetch (auth-script ?action=places) wired to a mount-only effect + a 10-min bap-places-cache, so a Director's sheet edit to a place could not be picked up in-app without a full reload. Fix: refreshPlaces() (relocated above refreshAllData to avoid a TDZ in the dep array) is now kicked off in parallel inside refreshAllData and awaited in its finally, so one refresh re-pulls content AND Places and the spinner covers both. The auth-script handlePlaces has no server cache, so the re-pull returns the live sheet row immediately. Verified via a fetch spy: a single refresh fires action=places alongside the content bust. App.jsx only; no CACHE_VERSION bump, no Apps Script change, no new dependency. PRIOR: 2026-06-10k — Glyph-only contact/link buttons + Contacts reorder. (1) New inline-SVG link glyphs PhoneGlyph / WhatsAppGlyph / EnvelopeGlyph / MapPinGlyph / GlobeGlyph / InstagramGlyph ({size,color}). (2) ActionBtn (Contacts/Resources) refactored from `icon`+text to `Glyph`+bilingual aria-label/title, icon-only with a ≥40px tap target; an optional `value` keeps real data visible (the Emergency phone NUMBER, the office EMAIL). (3) LinkButton (all Local sub-views: events/places/health/churches) is now icon-only — globe=website, WhatsApp/Instagram marks, phone=tel — label in aria-label/title. (4) AddressLink, the two PlaceCard/Director 'Open in Maps' fallbacks, the Courses 'Email Prof.' button, and the 'Cerca / Near' toggle pin all swapped from emoji (📞💬✉📍📷→) to the SVG glyphs. (5) Contacts tab REORDERED: the Emergency card is pinned to the top, the Buenos Aires Program office card moved below it (Staff / Local numbers / Resources unchanged). Note: in the Local cards WhatsApp/Instagram render in the uniform pepOrange link-pill color (brand-color is used in the green Contacts WhatsApp button). App.jsx only; no CACHE_VERSION bump, no Apps Script change, no new dependency. PRIOR: 2026-06-10j — Removed the Apps sub-view from the Local tab. The 'Apps' entry is gone from the Local hub (LOCAL_SECTIONS) and its `sub === \"apps\"` render block + the now-dead derived locals (appsFilter, appsCategories, filteredApps, sortedApps) are deleted. DATA PLUMBING KEPT INTACT: the Apps sheet tab, Code.gs TABS entry, and normalizeData's data.apps parsing all remain, so NO CACHE_VERSION bump — resurrecting the feature is just re-adding the LOCAL_SECTIONS entry + the render block (see 'Removed / dormant features' in BAP_App_Project_Knowledge.md). AppGridIcon is retained (still used by the Places 'All' category tile); ColectivoIcon + SectionDivider are now unused but kept dormant for a future Apps resurrection. App.jsx only; no Apps Script change, no new dependency. PRIOR: 2026-06-10i — Local-tab reset reliability fix. Tapping the Local bottom-nav tab from any Local sub-view returns to the category hub more robustly: <LocalView>'s reset effect now compares the resetSignal VALUE against the last-seen value (lastResetSignal ref) instead of a boolean 'skip first run' guard. The old guard was defeated by React StrictMode's double-effect-invoke — the second mount invoke fired the reset and wiped a Today deep-link (e.g. the 'This Week' tile), landing on the hub instead of the intended listing. The value-compare is StrictMode-safe (mount runs are no-ops) and still fires on a genuine re-tap. App.jsx only; no CACHE_VERSION bump, no Apps Script change, no new dependency. PRIOR: 2026-06-10h — Weekly Overview now carries forward/backward week chevrons at the BOTTOM of the day list too (mirrors the existing top nav: same bounded MIN/MAX offsets, disabled treatment, and a centered week-range label), so a student who has scrolled through the week can move to the next/previous week without scrolling back up. PRIOR: 2026-06-10g — Schedule day headers now bilingual (Lunes / Monday) on both the Weekly Overview day cards and the Class Schedule Mon–Fri grid. New WEEK_DAYS_FULL_ES constant. PRIOR: 2026-06-10f — Android map fix: the Places map container now establishes its own stacking context (position:relative + zIndex:0 + isolation:isolate) so Leaflet's internal z-indices (panes/controls up to ~1000) stay contained instead of leaking to the root and painting over the place-info BottomSheet on Android (which lacks the iOS scroll-container stacking context that incidentally trapped them). PlacesMap.jsx only. PRIOR: 2026-06-10e — Local-tab polish: re-tapping the Local bottom-nav tab while already on Local now collapses back to the category hub (resetSignal → LocalView); nightlife glyph swapped from a cocktail to a crescent-moon-and-stars (non-alcoholic); museum/exhibit painting glyph reworked to read as a framed landscape; the Places list/map + 'Cerca / Near' pills now sit on one line (shortened from 'Cerca tuyo / Near you'). Front-end only, no CACHE_VERSION bump. PRIOR: 2026-06-10d — Tier 2 #5a security: auth GETs → POST. identifyUser / fetchPrompts / fetchAdminResponses / fetchAdminPlaces now POST text/plain (JSON body) instead of putting token + cwid + birthday in the URL query string, so per-user credentials no longer land in the Apps Script execution log. Same handlers serve both verbs server-side; doGet stays for backward compatibility with old cached builds. REQUIRES the matching AuthCode.gs re-deploy (doPost now routes identify/prompts/admin_responses/admin_places, plus #5b: an append-only PlacesVetLog audit tab + idempotent state-machine in handleVetPlace). The `places` read (token-only, no PII) stays GET. No CACHE_VERSION bump, no new dependency. PRIOR: 2026-06-10c — Calendar blank-tab fix + collapsible finals; 2026-06-10b — Tier 6 batch (search, announcement unread cue, saved count/share).";

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
// Single-letter day codes. R = Thursday (T is taken by Tuesday) and
// U = Sunday (S is taken by Saturday), mirroring the registrar convention
// already used for R. The named-day branch below handles the full
// "Mon, Sat" form; this map handles the concatenated "MWF" / "TR" form.
const DAY_LETTER_MAP = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri", S: "Sat", U: "Sun" };

function parseDays(raw) {
  if (!raw) return [];
  const s = raw.trim();
  // If it contains a comma/whitespace separator or a three-letter day
  // name, treat it as a list and split on commas OR whitespace. Splitting
  // on whitespace too means a comma-less typo like "Mon Wed" still parses
  // to ["Mon","Wed"] instead of silently dropping the class everywhere.
  if (/[,\s]/.test(s) || /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(s)) {
    return s
      .split(/[,\s]+/)
      .map((d) => d.trim())
      // Normalize casing/length to the canonical three-letter abbrev so
      // downstream `c.days.includes("Sat")` matches regardless of input.
      .map((d) => {
        if (!d) return "";
        const cap = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
        return cap.slice(0, 3);
      })
      .filter(Boolean);
  }
  // Otherwise treat each character as a single-letter day code (e.g. "MWF",
  // "TR", "MTWRF"). Sat = S, Sun = U.
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
      lat: parseCoord(r.lat),
      lng: parseCoord(r.lng),
    })),
    churches: Churches.filter(r => r.name).map((r) => ({
      name: r.name.trim(),
      denomination: r.denomination ? r.denomination.trim() : "",
      address: r.address ? r.address.trim() : "",
      location_note: r.location_note ? r.location_note.trim() : "",
      service: r.service ? r.service.trim() : "",
      notes: r.notes ? r.notes.trim() : "",
      link: r.link ? r.link.trim() : "",
      lat: parseCoord(r.lat),
      lng: parseCoord(r.lng),
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
      lat: parseCoord(r.lat),
      lng: parseCoord(r.lng),
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
  // POST text/plain (not a GET query) keeps cwid + birthday out of the
  // URL, which would otherwise land in the Apps Script execution log;
  // text/plain dodges the CORS preflight Apps Script can't answer.
  const res = await fetch(AUTH_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "identify", token, cwid, birthday }),
  });
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

// Thrown by fetchAdminResponses when the auth script returns
// { error: "forbidden" } — i.e. the requesting user's roster row
// has a role other than staff/faculty. Distinct from AuthError
// (cohort token bad) and NoMatchError (CWID/birthday wrong) so the
// caller can show a useful inline message instead of bouncing the
// student back to the gates. In practice this should only fire if
// a student finds the endpoint by accident; the gear-modal button
// that triggers the fetch is already hidden for non-staff/faculty.
class ForbiddenError extends Error {
  constructor() {
    super("forbidden");
    this.name = "ForbiddenError";
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
  // POST text/plain to keep cwid + birthday out of the URL/exec log.
  const res = await fetch(AUTH_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "prompts", token, cwid, birthday }),
  });
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

// Pull every prompt + every response across the cohort, plus the
// curated roster lookup needed to render submitter names. Director-
// only endpoint; the auth script gates it on the requester's role
// being staff or faculty. Returns the raw shape from the script:
//   { prompts: [...], roster: { cwid: { preferred_name, ... } } }
// AuthError / NoMatchError mirror fetchPrompts' conventions so the
// App's existing gate-clearing handlers apply unchanged; the new
// ForbiddenError covers the role check failing (a student finding
// the endpoint, the requester's role changing mid-session, etc.).
async function fetchAdminResponses({ token, cwid, birthday }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  if (!cwid || !birthday) throw new Error("missing cwid or birthday");
  // POST text/plain to keep cwid + birthday out of the URL/exec log.
  const res = await fetch(AUTH_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "admin_responses", token, cwid, birthday }),
  });
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error === "no_match") throw new NoMatchError();
  if (body && body.error === "forbidden") throw new ForbiddenError();
  if (body && body.error) throw new Error(`Auth script error: ${body.error}`);
  return {
    prompts: Array.isArray(body && body.prompts) ? body.prompts : [],
    roster: (body && body.roster && typeof body.roster === "object") ? body.roster : {},
  };
}

// ============================================================
// PLACES — fetch + submit + vet against the auth script
// ============================================================

// Read the cohort's approved Places. Gated only by the cohort token
// (no per-user identity needed to read public-ish approved places),
// so the list can prime as soon as the cohort gate is cleared. Returns
// an array of place row objects (header-keyed) or [].
async function fetchPlaces({ token }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  const params = new URLSearchParams({ action: "places", token });
  const url = `${AUTH_SCRIPT_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error) throw new Error(`Auth script error: ${body.error}`);
  return Array.isArray(body && body.places) ? body.places : [];
}

// Submit a student-suggested place. POSTs the fixed { name, category,
// address, maps_url, why } schema (NOT the prompts machinery) as
// text/plain to dodge the CORS preflight, mirroring submitResponse.
// Lands as a pending/community row for staff vetting. Throws
// SubmitError on validation_failed / missing_location so the form can
// show an inline message; AuthError / NoMatchError follow the gate
// flow. Returns the parsed body ({ ok: true }) on success.
async function submitPlace({ token, cwid, birthday, fields }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  if (!cwid || !birthday) throw new Error("missing cwid or birthday");
  const res = await fetch(AUTH_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "submit_place", token, cwid, birthday, fields: fields || {},
    }),
  });
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error === "no_match") throw new NoMatchError();
  if (body && body.error) throw new SubmitError(body.error, body.details);
  return body;
}

// Staff-only: read EVERY place row (all statuses) for the in-app
// vetting dashboard. Mirrors fetchAdminResponses (same Auth / NoMatch
// / Forbidden conventions). Returns an array of admin-shaped place rows.
async function fetchAdminPlaces({ token, cwid, birthday }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  if (!cwid || !birthday) throw new Error("missing cwid or birthday");
  // POST text/plain to keep cwid + birthday out of the URL/exec log.
  const res = await fetch(AUTH_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "admin_places", token, cwid, birthday }),
  });
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error === "no_match") throw new NoMatchError();
  if (body && body.error === "forbidden") throw new ForbiddenError();
  if (body && body.error) throw new Error(`Auth script error: ${body.error}`);
  return Array.isArray(body && body.places) ? body.places : [];
}

// Staff-only: flip a place's status (approve/reject), optionally set
// its show_credit. POSTs text/plain like submitPlace. Throws
// ForbiddenError when the role check fails, otherwise mirrors the
// usual gate conventions. Returns the parsed body ({ ok: true }).
async function vetPlace({ token, cwid, birthday, place_id, status, show_credit }) {
  if (!AUTH_SCRIPT_URL) throw new Error("AUTH_SCRIPT_URL not configured");
  if (!token) throw new AuthError("missing token");
  if (!cwid || !birthday) throw new Error("missing cwid or birthday");
  if (!place_id) throw new Error("missing place_id");
  const payload = { action: "vet_place", token, cwid, birthday, place_id, status };
  if (show_credit != null) payload.show_credit = show_credit ? "TRUE" : "FALSE";
  const res = await fetch(AUTH_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Auth Script endpoint returned ${res.status}`);
  const body = await res.json();
  if (body && body.error === "unauthorized") throw new AuthError();
  if (body && body.error === "no_match") throw new NoMatchError();
  if (body && body.error === "forbidden") throw new ForbiddenError();
  if (body && body.error) throw new SubmitError(body.error, body.details);
  return body;
}

// ============================================================
// LOCAL CACHE — Stale-while-revalidate
// Renders cached data instantly on repeat opens, then refreshes
// in the background. Drops perceived load time to ~zero.
// Bump CACHE_VERSION whenever the data shape changes so old
// caches are ignored instead of crashing the app.
// ============================================================

const CACHE_KEY = "bap-app-cache";
const CACHE_VERSION = 7;

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

// Strict staff-only gate. Used by the Director response dashboard,
// which intentionally excludes faculty (visiting professors who
// teach in BA) — they shouldn't see other students' submissions
// to t-shirt RSVPs, dietary preferences, etc. Same null/missing-
// user safety as isStaffOrFaculty so preview mode stays locked.
function isStaff(user) {
  if (!user || !user.role) return false;
  return String(user.role).trim().toLowerCase() === "staff";
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
const PROFILE_VERSION = 3;

const EMPTY_PROFILE = {
  version: PROFILE_VERSION,
  enrolledClasses: [],
  filterEnabled: false,
  dismissedAnnouncements: [],
  // Keys (announcementKey) of announcements the student has already
  // seen on the Today tab. Drives the unread dot on the Today nav tab.
  seenAnnouncements: [],
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw);

    // V1 → V2 and V2 → V3 migrations: salvage the load-bearing fields
    // (course selections + filter toggle) rather than nuking the profile,
    // so a student who already personalized doesn't lose their selections
    // on the deploy. V1 dropped `name` (moved to currentUser); V3 adds
    // `seenAnnouncements` (defaults to [], so the first cue read after the
    // bump treats every currently-active announcement as already seen,
    // which is correct — we don't want a deploy to light up the dot for
    // announcements the student has had on screen for days).
    if (parsed.version === 1 || parsed.version === 2) {
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
      seenAnnouncements: Array.isArray(parsed.seenAnnouncements) ? parsed.seenAnnouncements : [],
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

// ── Announcement "unread" cue helpers ──
// An announcement is active when today falls inside its date range
// (both bounds required). Shared by <AnnouncementBanner> and the
// Today-nav unread-dot logic so the two never disagree about what's
// on screen.
function isAnnouncementActive(a, todayStr) {
  if (!a || !a.start_date || !a.end_date) return false;
  return todayStr >= a.start_date && todayStr <= a.end_date;
}

// djb2 string hash → short stable key. Used to identify an announcement
// across sessions without storing its full text. Keyed on the message +
// its window, so editing the copy or shifting the dates resurfaces it as
// new (matching the existing dismissedAnnouncements convention).
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function announcementKey(a) {
  return djb2(`${a.message || ""}|${a.start_date || ""}|${a.end_date || ""}`);
}

// Keys for every announcement active today. Used both to detect unread
// (active keys not in profile.seenAnnouncements) and to mark-seen.
function activeAnnouncementKeys(announcements, todayStr) {
  return (announcements || [])
    .filter((a) => isAnnouncementActive(a, todayStr))
    .map(announcementKey);
}

// ============================================================
// REDUCED-MOTION HOOK
// Reads the user's reduced-motion preference at runtime so inline
// transition styles (which can't be reached by the CSS @media block)
// can be gated the same way as class-based animations.
// ============================================================

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return reduced;
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

// ============================================================
// PLACES CACHE + SAVES — both device-local
// The approved-places list is cohort-wide (not per-user), so the
// cache is a simple { places, ts } envelope with a 10-min TTL — long
// enough that repeat opens render instantly, short enough that Director
// approvals show up quickly (the auth script doesn't cache its own
// response). Saves are a personal list of place_ids, never synced
// across devices (matches the profile's local-only posture).
// ============================================================

const PLACES_CACHE_KEY = "bap-places-cache";
const PLACES_CACHE_TTL = 10 * 60 * 1000;

function loadPlacesCache() {
  try {
    const raw = localStorage.getItem(PLACES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > PLACES_CACHE_TTL) return null;
    return Array.isArray(parsed.places) ? parsed.places : null;
  } catch (e) {
    return null;
  }
}

function savePlacesCache(places) {
  try {
    localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify({
      places: Array.isArray(places) ? places : [],
      ts: Date.now(),
    }));
  } catch (e) {
    // Quota exceeded or storage disabled; silently skip
  }
}

const PLACES_SAVES_KEY = "bap-places-saves";

function loadSavedPlaces() {
  try {
    const raw = localStorage.getItem(PLACES_SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch (e) {
    return [];
  }
}

// Toggle a place_id in the saved list and persist. Returns the new
// array so the caller can update React state in the same tick.
function toggleSavedPlace(savedList, placeId) {
  const id = String(placeId || "");
  if (!id) return savedList;
  const next = savedList.includes(id)
    ? savedList.filter((x) => x !== id)
    : [...savedList, id];
  try {
    localStorage.setItem(PLACES_SAVES_KEY, JSON.stringify(next));
  } catch (e) {
    // Storage disabled; silently skip — state still updates in-memory
  }
  return next;
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

// True when the student has at least one stored value on this prompt.
// Used by the post-cutoff visibility rules (locked t-shirt size on
// Profile, locked meal selection on Today on the event date) — we
// only resurface a closed prompt when there's actually something to
// show the student about it.
function hasAnyResponse(prompt) {
  if (!prompt) return false;
  const responses = prompt.responses || {};
  for (const fid in responses) {
    if (String(responses[fid] == null ? "" : responses[fid]).trim() !== "") return true;
  }
  return false;
}

// Convenience: server now sets prompt.readonly explicitly (true when
// the prompt is past its submission window OR when lock_after_submit
// fired on a prior submission). This wrapper keeps callers from
// reaching for the raw field name AND defaults to false when an old
// cached prompt object lacks the field.
function isPromptReadonly(prompt) {
  return !!(prompt && prompt.readonly);
}

// One source of truth for "what should this prompt look like on
// screen right now?". Returns:
//   "hidden"          — don't render anywhere
//   "inline_event"    — render inline beneath the matching event in
//                       Today's activity card; suppress from PromptCard
//   "locked_readonly" — render in the usual surface but in a calmer,
//                       read-only treatment with a lock affordance
//   "editable"        — the existing pending/editable behavior
//
// Inline-event treatment is reserved for prompts whose event_date is
// today and which have a stored response (otherwise there's nothing
// to inline). Locked-readonly covers both lock_after_submit and
// past-window-with-a-stored-answer (e.g. t-shirt size on Profile
// after the cutoff). Editable is everything still inside the
// submission window.
function getPromptDisplayState(prompt, todayStr) {
  if (!prompt) return "hidden";
  const readonly = isPromptReadonly(prompt);
  const has = hasAnyResponse(prompt);
  const eventDate = String(prompt.event_date || "").trim();
  if (readonly && has && eventDate && eventDate === todayStr) return "inline_event";
  if (readonly && !has) return "hidden"; // locked but never answered — nothing to show
  if (readonly) return "locked_readonly";
  return "editable";
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
  const anchorStart = data.finals_window_start || "";
  const anchorEnd = data.finals_window_end || anchorStart;
  // Lower bound: once the finals window has fully passed, retire the UI
  // even though final_date cells stay populated in the sheet indefinitely.
  // Without this the FinalsCard and Today tile persisted forever after
  // finals ended (invisible for Summer, but wrong for Fall/Spring).
  if (anchorEnd) {
    const dEnd = daysUntil(anchorEnd, today);
    if (dEnd !== null && dEnd < 0) return false;
  }
  // Pre-window runway: surface up to 14 days before the window opens, and
  // throughout it (the end-bound above already cut off the trailing side).
  if (anchorStart) {
    const dStart = daysUntil(anchorStart, today);
    if (dStart !== null && dStart <= 14) return true;
  }
  // No window set (or outside the 14-day runway): fall back to "any class
  // has a final assigned" so an early-published final still surfaces.
  return finals.some((f) => !!f.final_date);
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
// Capitalized Spanish full weekdays, indexed by Date.getDay() to parallel
// WEEK_DAYS_FULL, for the bilingual "Lunes / Monday" day headers on Schedule.
const WEEK_DAYS_FULL_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEK_DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EVENT_STYLES = {
  program:     { bg: "#FFF3E0", border: C.pepOrange, icon: "★", label: "Program" },
  academic:    { bg: C.ice, border: C.ocean, icon: "◆", label: "Academic" },
  excursion:   { bg: "#E8F5E9", border: "#388E3C", icon: "▲", label: "Excursion" },
  holiday:     { bg: "#FCE4EC", border: "#C62828", icon: "●", label: "Holiday" },
  orientation: { bg: C.ice, border: C.sky, icon: "⬟", label: "Orientation" },
  mundial:     { bg: "#FFF8E1", border: "#F9A825", icon: "⚽", label: "Mundial" },
};

// ── Mundial (World Cup) game-day detection ──
// When Argentina plays, the Today tab puts on the albiceleste jersey:
// the greeting strip gets a celeste-forward skin with a Sol de Mayo and
// drifting papelitos, and a festive game tile surfaces above the fold.
// No schema change drives this — it reads the Calendar data the Director
// already maintains. Any `mundial`-typed event dated today whose title
// mentions "Argentina" (e.g. "Mundial: 🇦🇷 Argentina vs Austria 🇦🇹")
// triggers the treatment; kickoff comes from the row's `start_time`.
function getArgentinaGameForDate(data, dateStr) {
  if (!dateStr) return null;
  const events = (data && data.calendarEvents) || [];
  // Mundial games are single-day, so match on the start date directly.
  const game = events.find((e) =>
    String(e.type || "").toLowerCase() === "mundial" &&
    String(e.date || "").slice(0, 10) === dateStr &&
    /argentina/i.test(e.title || "")
  );
  return game || null;
}

// Strip a leading "Mundial:" / "Mundial –" label from the matchup title.
// The game tile already says "Mundial" in its own caption, so the prefix
// would just be redundant; the flags and "Argentina vs X" are what we
// want to show. Leaves a flag-led title like "🇦🇷 Argentina vs Austria 🇦🇹"
// intact when there's no prefix to strip.
function cleanMundialTitle(title) {
  return String(title || "").replace(/^\s*mundial\s*[:\-–·]\s*/i, "").trim();
}

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
// ICS / ADD-TO-CALENDAR HELPERS
// Generates a standards-compliant single-VEVENT .ics file and
// triggers a browser download. Buenos Aires is a constant GMT-3
// (no DST), so we hard-code +3h to convert local to UTC.
// ============================================================

function pad2(n) { return String(n).padStart(2, "0"); }

// RFC5545 text escaping: \, ; , and newline
function icsEscape(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Format a Date as YYYYMMDDTHHMMSSZ (UTC)
function icsUtcStamp(d) {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

// Parse YYYY-MM-DD → { y, m, d }
function parseYMD(dateStr) {
  const parts = dateStr.split("-").map(Number);
  return { y: parts[0], m: parts[1], d: parts[2] };
}

// Add 1 day to a YYYY-MM-DD string (handles month/year rollover)
function nextDayStr(dateStr) {
  const { y, m, d } = parseYMD(dateStr);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

// Format a YYYY-MM-DD as an ICS DATE value (no time)
function icsDate(dateStr) {
  return dateStr.replace(/-/g, "");
}

// Build a UTC timestamp from a BA local date + minutes-since-midnight
// BA is GMT-3 (constant), so UTC = local + 3h.
function icsUtcFromBAMinutes(dateStr, minutes) {
  const { y, m, d } = parseYMD(dateStr);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const utc = new Date(Date.UTC(y, m - 1, d, hh + 3, mm, 0));
  return icsUtcStamp(utc);
}

// Build a full VCALENDAR string for one event.
//   allDay: true  → DTSTART;VALUE=DATE / DTEND;VALUE=DATE (endDateStr = exclusive last day)
//   allDay: false → DTSTART/DTEND as UTC timestamps (startMin/endMin in minutes)
function buildEventIcs({ uid, title, description, location, allDay, startDateStr, endDateStr, startMin, endMin }) {
  const now = icsUtcStamp(new Date());
  const crlf = "\r\n";
  const sum = icsEscape(title || "");
  const desc = description ? `DESCRIPTION:${icsEscape(description)}${crlf}` : "";
  const loc  = location  ? `LOCATION:${icsEscape(location)}${crlf}` : "";
  let dtStart, dtEnd;
  if (allDay) {
    dtStart = `DTSTART;VALUE=DATE:${icsDate(startDateStr)}`;
    dtEnd   = `DTEND;VALUE=DATE:${icsDate(endDateStr)}`;
  } else {
    dtStart = `DTSTART:${icsUtcFromBAMinutes(startDateStr, startMin)}`;
    dtEnd   = `DTEND:${icsUtcFromBAMinutes(endDateStr ?? startDateStr, endMin ?? startMin + 60)}`;
  }
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Buenos Aires Program//BAP App//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtStart,
    dtEnd,
    `SUMMARY:${sum}`,
    desc.trimEnd(),
    loc.trimEnd(),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join(crlf) + crlf;
}

// Slugify a title for a safe filename
function slugifyForFilename(name) {
  return String(name || "event")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 60) || "event";
}

function downloadIcs(filename, icsString) {
  try {
    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (_) { /* non-critical */ }
}

// Build + download ICS for a Calendar-tab event row
function downloadCalendarEventIcs(e) {
  const uid = `bap-cal-${djb2((e.title || "") + (e.date || ""))}@baprogram.vercel.app`;
  const startMin = toMinutes(e.start_time);
  if (startMin !== null) {
    // Timed event
    const endMin = toMinutes(e.end_time) ?? startMin + 60;
    const ics = buildEventIcs({
      uid, title: e.title, description: e.description || "", location: "",
      allDay: false, startDateStr: e.date, startMin, endMin,
    });
    downloadIcs(slugifyForFilename(e.title) + ".ics", ics);
  } else {
    // All-day (possibly multi-day)
    const exclusiveEnd = nextDayStr(e.end_date || e.date);
    const ics = buildEventIcs({
      uid, title: e.title, description: e.description || "", location: "",
      allDay: true, startDateStr: e.date, endDateStr: exclusiveEnd,
    });
    downloadIcs(slugifyForFilename(e.title) + ".ics", ics);
  }
}

// Build + download ICS for a Finals row
function downloadFinalIcs(f) {
  const uid = `bap-final-${djb2((f.code || "") + (f.final_date || ""))}@baprogram.vercel.app`;
  const title = `Final · ${f.code} ${f.title}`;
  const description = "Examen final / Final exam";
  const location = f.location || "";

  if (f.final_time) {
    // Try to parse the time range (e.g. "9:00–11:00", "14:00")
    // Split on en-dash or hyphen
    const parts = f.final_time.split(/[–-]/);
    const startMin = toMinutes(parts[0] ? parts[0].trim() : "");
    if (startMin !== null) {
      const endMin = parts[1] ? (toMinutes(parts[1].trim()) ?? startMin + 60) : startMin + 60;
      const ics = buildEventIcs({
        uid, title, description, location,
        allDay: false, startDateStr: f.final_date, startMin, endMin,
      });
      downloadIcs(slugifyForFilename(title) + ".ics", ics);
      return;
    }
  }
  // Fallback: all-day
  const exclusiveEnd = nextDayStr(f.final_date);
  const ics = buildEventIcs({
    uid, title, description, location,
    allDay: true, startDateStr: f.final_date, endDateStr: exclusiveEnd,
  });
  downloadIcs(slugifyForFilename(title) + ".ics", ics);
}

// ─── Calendar Plus icon ───
function CalendarPlusIcon({ size = 15, color = C.ocean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="12" y1="14" x2="12" y2="18"/>
      <line x1="10" y1="16" x2="14" y2="16"/>
    </svg>
  );
}

// Compact "Add to calendar" pill — reusable for Calendar events and Finals rows
function AddToCalendarButton({ onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label="Agendar / Add to calendar"
      title="Agendar / Add to calendar"
      className="bap-press"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: "'DM Mono', monospace", fontSize: 10.5,
        color: C.ocean, background: C.ice,
        border: `1px solid ${C.fog}`,
        borderRadius: 8, padding: "3px 9px",
        cursor: "pointer", flexShrink: 0,
      }}
    >
      <CalendarPlusIcon size={13} color={C.ocean} />
      Agendar
    </button>
  );
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

// ============================================================
// PLACES — student-contributable BA directory (Local tab)
// ============================================================

// Same { label, es, color, Icon } shape as EVENT_CATEGORIES. Each Places
// category gets a BAP-palette color and a glyph rendered in a colored
// circle on the card. Unknown values fall through to "other" so the sheet
// can carry a tentative category without crashing the view.
//
// "Blended 12": the daily-life buckets students will submit (café,
// restaurant, nightlife, fitness, study) sit alongside the sightseeing
// buckets the seed content needs (museum, culture, theater, sights,
// markets, neighborhood). Filter pills are present-gated, so empty
// buckets stay hidden until rows exist — a student-life category simply
// doesn't show until someone submits one. The seven seed-present
// categories (museum, culture, theater, sights, markets, neighborhood,
// outdoors) carry distinct colors since they're what renders at launch.
const PLACE_CATEGORIES = {
  cafe:         { label: "Café",         es: "Café",            color: C.mountain,  Icon: CoffeeCupIcon },
  restaurant:   { label: "Restaurant",   es: "Gastronomía",     color: C.ocean,     Icon: ForkPlateIcon },
  nightlife:    { label: "Nightlife",    es: "Vida nocturna",   color: C.pepBlue,   Icon: MoonStarsIcon },
  outdoors:     { label: "Outdoors",     es: "Aire libre",      color: C.bapBlue,   Icon: PalmIcon },
  fitness:      { label: "Fitness",      es: "Deporte",         color: C.pepOrange, Icon: DumbbellIcon },
  study:        { label: "Study spot",   es: "Para estudiar",   color: C.stone,     Icon: BookIcon },
  museum:       { label: "Museum",       es: "Museo",           color: C.ocean,     Icon: PictureFrameIcon },
  culture:      { label: "Culture",      es: "Cultura",         color: C.sky,       Icon: ColumnsIcon },
  theater:      { label: "Theater",      es: "Teatro",          color: C.pepBlue,   Icon: TheaterMaskIcon },
  sights:       { label: "Sights",       es: "Lugares ícono",   color: C.bapBlue,   Icon: ObeliscoIcon },
  markets:      { label: "Markets",      es: "Ferias",          color: C.pepOrange, Icon: MarketIcon },
  neighborhood: { label: "Neighborhood", es: "Barrios",         color: C.mountain,  Icon: NeighborhoodIcon },
  other:        { label: "Other",        es: "Otro",            color: C.stone,     Icon: PinIcon },
};

function getPlaceCategory(key) {
  return PLACE_CATEGORIES[String(key || "").trim().toLowerCase()] || PLACE_CATEGORIES.other;
}

// ── WCAG glyph-ink helper ──────────────────────────────────────────────────
// Computes WCAG relative luminance of a #rrggbb hex.
function relLuminance(hex) {
  const h = String(hex).replace("#", "");
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
// Glyph ink for a category disc: white on dark fills, navy (pepBlue) on light
// fills. Threshold ~3.5:1 white-on-fill cleanly routes bapBlue/sky/stone →
// navy while pepOrange/ocean/mountain/pepBlue keep white. Fixes WCAG 1.4.11.
function discGlyphColor(fillHex) {
  const contrastWithWhite = 1.05 / (relLuminance(fillHex) + 0.05);
  return contrastWithWhite >= 3.5 ? C.white : C.pepBlue;
}
// ──────────────────────────────────────────────────────────────────────────

// Order for the Places category-picker grid (sightseeing-led, per Director
// preference). "All" is rendered as a fixed first tile by the grid itself, so
// it isn't listed here. Covers all twelve real categories; "other" is omitted
// (a place with an unrecognized category still surfaces under the "All" tile).
const PLACE_CATEGORY_ORDER = [
  "sights", "museum", "culture", "theater", "markets", "neighborhood",
  "cafe", "restaurant", "nightlife", "outdoors", "fitness", "study",
];

// Casa Holden — Pepperdine's Buenos Aires campus. Anchored on every Places
// map with a distinct Pep-Blue, orange-ringed campus pin (see PlacesMap.jsx)
// so students always have home base for reference. Coordinates resolved from
// the program-office Maps short link (11 de Septiembre de 1888 955, the corner
// of Federico Lacroze, Belgrano R).
const CAMPUS_ANCHOR = {
  name: "Casa Holden",
  subtitle: "Pepperdine · Campus BA",
  lat: -34.5687288,
  lng: -58.4416504,
  address: "11 de Septiembre de 1888 955, CABA",
  maps_url: "https://maps.app.goo.gl/HQt8A6ZQABrhL7rG7",
};

// The Local tab opens to a hub of these five category buttons; tapping one
// drills into that category's listing. Single source of truth for the hub —
// when the Places roadmap feature replaces "Explore BA," it's a one-line edit
// here (label + glyph), and the per-category listing screen becomes the home
// for Places' future "+ Suggest a place" entry point. Icon components are
// hoisted function declarations, so referencing them here (above their
// definitions) is fine.
const LOCAL_SECTIONS = [
  { key: "events",   en: "This Week",  es: "Esta semana en BA",      Icon: SparkleIcon,     accent: C.pepOrange },
  { key: "places",   en: "Places",     es: "Lugares para descubrir", Icon: ObeliscoIcon,    accent: C.ocean },
  { key: "health",   en: "Healthcare", es: "Salud y emergencias",    Icon: HealthCrossIcon, accent: C.bapBlue },
  { key: "churches", en: "Churches",   es: "Comunidades de fe",      Icon: ChurchIcon,      accent: C.sky },
  // NOTE: the "Apps" section was removed from the Local hub on 2026-06-10 (see
  // BAP_App_Project_Knowledge.md → "Removed / dormant features"). The data
  // plumbing (data.apps, the Apps sheet tab, Code.gs) is intact, so resurrecting
  // it is just re-adding this entry plus the `sub === "apps"` render block.
];

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
const DAY_ABBREV = { Mon: "M", Tue: "T", Wed: "W", Thu: "R", Fri: "F", Sat: "S", Sun: "U" };

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

// Stylized sun for the Today greeting strip during day hours. A Sol de
// Mayo–inspired form: a central disc ringed by 12 straight rays
// alternating with 12 wavy "flame" rays, generated in a loop so the
// geometry stays exact (same approach as SolDeMayoIcon). Rendered as a
// faint white/celeste watermark in the top-right of the strip with the
// refresh button nested at its center, so the button reads as the sun's
// disc and the rays radiate around it. Kept WHITE rather than gold so
// gold stays exclusive to the Mundial SolDeMayoIcon. Same 64×64 viewBox
// as MoonIcon so the two swap cleanly without layout shift.
function SunIcon({ size = 36 }) {
  const cx = 32, cy = 32, N = 12, ink = "#FFFFFF";
  const f1 = (n) => n.toFixed(1);
  const straight = [], flame = [];
  for (let i = 0; i < N; i++) {
    // Straight triangular ray
    const a = (i / N) * Math.PI * 2, ap = a + Math.PI / 2;
    const tx = cx + Math.cos(a) * 30, ty = cy + Math.sin(a) * 30;
    const s1x = cx + Math.cos(a) * 14 + Math.cos(ap) * 2.6, s1y = cy + Math.sin(a) * 14 + Math.sin(ap) * 2.6;
    const s2x = cx + Math.cos(a) * 14 - Math.cos(ap) * 2.6, s2y = cy + Math.sin(a) * 14 - Math.sin(ap) * 2.6;
    straight.push(`M${f1(s1x)} ${f1(s1y)}L${f1(tx)} ${f1(ty)}L${f1(s2x)} ${f1(s2y)}Z`);
    // Wavy "flame" ray, halfway between the straight ones — an S-curve via
    // two quadratics that bulge to opposite sides for a flickering look
    const w = ((i + 0.5) / N) * Math.PI * 2, wp = w + Math.PI / 2;
    const wtx = cx + Math.cos(w) * 26, wty = cy + Math.sin(w) * 26;
    const wb1x = cx + Math.cos(w) * 14 + Math.cos(wp) * 3.2, wb1y = cy + Math.sin(w) * 14 + Math.sin(wp) * 3.2;
    const wb2x = cx + Math.cos(w) * 14 - Math.cos(wp) * 3.2, wb2y = cy + Math.sin(w) * 14 - Math.sin(wp) * 3.2;
    const k1x = cx + Math.cos(w) * 21 + Math.cos(wp) * 4.4, k1y = cy + Math.sin(w) * 21 + Math.sin(wp) * 4.4;
    const k2x = cx + Math.cos(w) * 21 - Math.cos(wp) * 4.4, k2y = cy + Math.sin(w) * 21 - Math.sin(wp) * 4.4;
    flame.push(`M${f1(wb1x)} ${f1(wb1y)}Q${f1(k1x)} ${f1(k1y)} ${f1(wtx)} ${f1(wty)}Q${f1(k2x)} ${f1(k2y)} ${f1(wb2x)} ${f1(wb2y)}Z`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill={ink}>
        {flame.map((d, i) => <path key={`f${i}`} d={d} opacity="0.92" />)}
        {straight.map((d, i) => <path key={`s${i}`} d={d} opacity="0.6" />)}
      </g>
      {/* faint disc — mostly sits behind the nested refresh button */}
      <circle cx={cx} cy={cy} r="13" fill={ink} opacity="0.14" />
      <circle cx={cx} cy={cy} r="13" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.7" />
    </svg>
  );
}

// Sol de Mayo — the sun at the center of the Argentine flag. Shown in
// place of the rotating SunIcon on the greeting strip when Argentina
// plays in the Mundial. Gold disc + a face + two interleaved rings of
// straight rays (16 long + 16 short) approximating the flag's 32-ray
// sun. Rays are generated in a loop so the geometry stays exact.
function SolDeMayoIcon({ size = 64 }) {
  const cx = 32, cy = 32;
  const gold = "#F6B40E", face = "#B26B00";
  const rays = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    // Long straight ray
    const aL = (i / N) * Math.PI * 2;
    const lx = cx + Math.cos(aL) * 30, ly = cy + Math.sin(aL) * 30;
    const b1x = cx + Math.cos(aL - 0.10) * 14, b1y = cy + Math.sin(aL - 0.10) * 14;
    const b2x = cx + Math.cos(aL + 0.10) * 14, b2y = cy + Math.sin(aL + 0.10) * 14;
    rays.push(`M ${b1x.toFixed(1)} ${b1y.toFixed(1)} L ${lx.toFixed(1)} ${ly.toFixed(1)} L ${b2x.toFixed(1)} ${b2y.toFixed(1)} Z`);
    // Short ray, offset half a step between the long ones
    const aS = ((i + 0.5) / N) * Math.PI * 2;
    const sx = cx + Math.cos(aS) * 23, sy = cy + Math.sin(aS) * 23;
    const c1x = cx + Math.cos(aS - 0.08) * 14, c1y = cy + Math.sin(aS - 0.08) * 14;
    const c2x = cx + Math.cos(aS + 0.08) * 14, c2y = cy + Math.sin(aS + 0.08) * 14;
    rays.push(`M ${c1x.toFixed(1)} ${c1y.toFixed(1)} L ${sx.toFixed(1)} ${sy.toFixed(1)} L ${c2x.toFixed(1)} ${c2y.toFixed(1)} Z`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {rays.map((d, i) => <path key={i} d={d} fill={gold} />)}
      <circle cx={cx} cy={cy} r="13" fill={gold} stroke={face} strokeWidth="1.2" />
      <circle cx="28" cy="30" r="1.5" fill={face} />
      <circle cx="36" cy="30" r="1.5" fill={face} />
      <path d="M27 35 Q32 39 37 35" stroke={face} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Papelitos — the drifting paper confetti of a Bombonera matchday, in
// the flag's celeste / white / gold. Rendered as a full-bleed overlay
// inside the greeting strip on Argentina game days. Config is a fixed
// array (not Math.random) so the pattern is stable across renders and
// the minute-tick re-render doesn't reshuffle it. The whole layer is
// hidden under prefers-reduced-motion via the .bap-papelitos rule.
const PAPELITOS = [
  { left: "6%",  w: 6, h: 9,  color: "#75AADB", delay: "0s",   dur: "5.2s" },
  { left: "15%", w: 5, h: 8,  color: "#FFFFFF", delay: "1.6s", dur: "6.1s" },
  { left: "24%", w: 7, h: 10, color: "#F6B40E", delay: "0.8s", dur: "4.8s" },
  { left: "33%", w: 5, h: 7,  color: "#FFFFFF", delay: "2.7s", dur: "5.6s" },
  { left: "42%", w: 6, h: 9,  color: "#75AADB", delay: "0.3s", dur: "6.4s" },
  { left: "51%", w: 5, h: 8,  color: "#F6B40E", delay: "3.1s", dur: "5.0s" },
  { left: "60%", w: 7, h: 10, color: "#FFFFFF", delay: "1.1s", dur: "5.9s" },
  { left: "69%", w: 6, h: 9,  color: "#75AADB", delay: "2.2s", dur: "4.6s" },
  { left: "78%", w: 5, h: 8,  color: "#F6B40E", delay: "0.6s", dur: "6.2s" },
  { left: "87%", w: 6, h: 9,  color: "#FFFFFF", delay: "1.9s", dur: "5.3s" },
  { left: "94%", w: 5, h: 7,  color: "#75AADB", delay: "3.4s", dur: "5.7s" },
];

function Papelitos() {
  return (
    <div className="bap-papelitos" aria-hidden="true">
      {PAPELITOS.map((p, i) => (
        <span key={i} style={{
          position: "absolute", top: 0, left: p.left,
          width: p.w, height: p.h, background: p.color,
          borderRadius: 1, animationDelay: p.delay, animationDuration: p.dur,
        }} />
      ))}
    </div>
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
  // Single-colour glyph (rendered white on a coloured disc, or in the category
  // colour on a light card): an outlined frame so the surface shows through as
  // the canvas, with a sun + rolling hills painted inside. Reads as a framed
  // landscape painting either way.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Frame */}
      <rect x="11" y="13" width="42" height="38" rx="2.5" fill="none" stroke={color} strokeWidth="3" />
      {/* Sun */}
      <circle cx="23" cy="25" r="4.5" fill={color} />
      {/* Rolling hills */}
      <path d="M14 50 L25 36 L32 43 L41 31 L50 50 Z" fill={color} />
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

// ---- Places category glyphs (added with the Places feature) ----

function CoffeeCupIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Steam */}
      <path d="M26 8 Q22 12 26 16 Q30 20 26 24" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M36 8 Q32 12 36 16 Q40 20 36 24" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* Cup */}
      <path d="M14 30 H44 V42 Q44 52 32 52 Q20 52 20 42 Z" fill={C.white} stroke={color} strokeWidth="2.5" strokeLinejoin="round" transform="translate(-1 0)" />
      <path d="M13 30 H43 V42 Q43 52 31 52 Q19 52 19 42 Z" fill={color} opacity="0.18" />
      {/* Handle */}
      <path d="M43 33 Q52 33 52 40 Q52 47 44 47" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Saucer */}
      <ellipse cx="31" cy="55" rx="20" ry="3.5" fill={color} />
    </svg>
  );
}

function MoonStarsIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Crescent moon (a night out) */}
      <path d="M40 12 A20 20 0 1 0 40 52 A15 15 0 1 1 40 12 Z" fill={color} />
      {/* Sparkle star */}
      <path d="M50 13 L51.6 17.4 L56 19 L51.6 20.6 L50 25 L48.4 20.6 L44 19 L48.4 17.4 Z" fill={color} opacity="0.85" />
      {/* Small stars */}
      <circle cx="51" cy="33" r="2" fill={color} opacity="0.7" />
      <circle cx="43" cy="44" r="1.5" fill={color} opacity="0.55" />
    </svg>
  );
}

function DumbbellIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Bar */}
      <line x1="20" y1="32" x2="44" y2="32" stroke={color} strokeWidth="4" strokeLinecap="round" />
      {/* Left weights */}
      <rect x="8" y="20" width="7" height="24" rx="2.5" fill={color} />
      <rect x="15" y="24" width="6" height="16" rx="2.5" fill={color} opacity="0.7" />
      {/* Right weights */}
      <rect x="49" y="20" width="7" height="24" rx="2.5" fill={color} />
      <rect x="43" y="24" width="6" height="16" rx="2.5" fill={color} opacity="0.7" />
    </svg>
  );
}

function BookIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Spine */}
      <line x1="32" y1="16" x2="32" y2="50" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Left page */}
      <path d="M32 16 Q22 11 10 14 V46 Q22 43 32 48 Z" fill={C.white} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Right page */}
      <path d="M32 16 Q42 11 54 14 V46 Q42 43 32 48 Z" fill={C.white} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 20 Q42 16 50 18 V42 Q42 40 32 43 Z" fill={color} opacity="0.16" />
      <line x1="15" y1="22" x2="27" y2="24" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="37" y1="24" x2="49" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function MarketIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Feria stall: striped awning over an open counter */}
      <path d="M8 24 H56 L52 34 H12 Z" fill={color} />
      <path d="M20 24 L18 34 M32 24 L32 34 M44 24 L46 34" stroke={C.white} strokeWidth="2.5" opacity="0.7" />
      {/* Posts + counter */}
      <line x1="14" y1="34" x2="14" y2="54" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="34" x2="50" y2="54" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="14" y="42" width="36" height="6" fill={color} opacity="0.35" />
      <line x1="12" y1="54" x2="52" y2="54" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function NeighborhoodIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Cluster of rooftops — a barrio rather than a single spot */}
      <path d="M6 34 L18 24 L30 34 V52 H6 Z" fill={C.white} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M30 30 L44 18 L58 30 V52 H30 Z" fill={C.white} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="13" y="40" width="7" height="12" fill={color} opacity="0.35" />
      <rect x="40" y="36" width="8" height="16" fill={color} opacity="0.35" />
      <line x1="2" y1="52" x2="62" y2="52" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ColumnsIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Classical facade — pediment over columns, a cultural-institution mark */}
      <path d="M32 8 L56 22 H8 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <line x1="14" y1="26" x2="14" y2="50" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="24" y1="26" x2="24" y2="50" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="40" y1="26" x2="40" y2="50" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="26" x2="50" y2="50" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="8" y1="54" x2="56" y2="54" stroke={color} strokeWidth="3" strokeLinecap="round" />
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

// Rounded medical cross — Healthcare section glyph on the Local hub.
function HealthCrossIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="8" y="10" width="48" height="44" rx="10" fill={color} stroke={color} strokeWidth="2" />
      <path d="M28 18 H36 V28 H46 V36 H36 V46 H28 V36 H18 V28 H28 Z" fill={C.white} />
    </svg>
  );
}

// Simple steeple + cross — Churches section glyph on the Local hub.
function ChurchIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Cross atop the steeple */}
      <line x1="32" y1="6" x2="32" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="27" y1="11" x2="37" y2="11" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Steeple roof */}
      <path d="M32 18 L46 36 H18 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Nave body */}
      <rect x="20" y="36" width="24" height="22" rx="1.5" fill={color} stroke={color} strokeWidth="2" />
      {/* Arched door */}
      <path d="M28 58 V48 Q32 44 36 48 V58 Z" fill={C.white} />
    </svg>
  );
}

// 2×2 rounded-square grid — Apps section glyph on the Local hub.
function AppGridIcon({ size = 36, color = C.pepBlue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="12" width="17" height="17" rx="4" fill={color} />
      <rect x="35" y="12" width="17" height="17" rx="4" fill={color} opacity="0.7" />
      <rect x="12" y="35" width="17" height="17" rx="4" fill={color} opacity="0.7" />
      <rect x="35" y="35" width="17" height="17" rx="4" fill={color} />
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

// Small padlock glyph used on locked/read-only prompt surfaces (the
// <PromptForm> readonly banner, the <PromptProfileSection> row pill,
// and inline-event meal captions on Today). Stroke-only so it pairs
// cleanly with any background — the consumer picks the color.
function LockGlyph({ size = 14, color = C.mountain }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke={color} strokeWidth="1.7" />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" stroke={color} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="15.4" r="1.2" fill={color} />
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
      description: e.description || "",
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

// ─── MapErrorBoundary ───
//
// React Suspense catches the lazy chunk's *loading* state but NOT a
// rejected dynamic import. After a deploy, a student still running the
// old build who taps "Mapa" for the first time 404s on the old hashed
// PlacesMap-*.js chunk; without a boundary that rejection white-screens
// the whole app. This class scopes the failure to the map: the list and
// the rest of the app stay interactive, and a bilingual "reload" note
// points the student at the recovery (a reload pulls the new chunk).
// Class component because React error boundaries must be classes.
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    // Surface in the console for debugging; no user-facing telemetry.
    try { console.warn("PlacesMap failed to load:", err); } catch (e) { /* noop */ }
  }
  render() {
    if (this.state.failed) {
      return (
        <div style={{
          background: C.ice, border: `1px solid ${C.fog}`, borderRadius: 14,
          padding: "20px 16px", textAlign: "center",
          fontFamily: "'EB Garamond', serif", fontSize: 14, color: C.mountain,
          lineHeight: 1.5,
        }}>
          No se pudo cargar el mapa. Probá recargar la app.
          <br />
          <span style={{ fontStyle: "italic", color: C.mountain }}>
            Couldn't load the map — try reloading the app.
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

// Module-level ref count for the body-scroll lock. Each open BottomSheet
// increments it; only the first capture stashes the original overflow and
// only the last release restores it. A per-instance capture would restore
// out of order if two sheets ever stack (B opens over A, A closes first and
// restores "" while B is still open). Latent today, but correct here.
let __bottomSheetLockCount = 0;
let __bottomSheetPrevOverflow = "";

// ─── Dialog accessibility (focus trap + Escape + focus return) ───
//
// Shared by every modal/overlay surface (BottomSheet, ProfileModal, the
// two Director overlays, and ConfirmDialog) so keyboard + assistive-tech
// users get correct dialog semantics in one place instead of four copies.
//
// __dialogStack tracks the nesting order so a global keydown listener only
// closes the TOPMOST dialog on Escape — without this, a ConfirmDialog
// stacked over ProfileModal would close both on a single Escape. Each open
// dialog pushes on mount and splices off on unmount; the topmost entry is
// the live one.
const __dialogStack = [];

const DIALOG_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getDialogFocusable(node) {
  if (!node) return [];
  return Array.from(node.querySelectorAll(DIALOG_FOCUSABLE_SELECTOR))
    .filter((el) => el.getClientRects().length > 0);
}

// useDialogA11y(ref, { open, onClose })
//   ref     — points at the dialog's content container (made programmatically
//             focusable via tabIndex={-1} so focus has somewhere to land when
//             the dialog has no focusable children yet)
//   open    — whether the dialog is currently shown
//   onClose — called on Escape (topmost dialog only)
// On open it stashes the element that had focus, moves focus into the dialog,
// traps Tab/Shift+Tab inside it, and on close restores focus to the trigger.
function useDialogA11y(ref, { open = true, onClose } = {}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const restoreRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    restoreRef.current = document.activeElement;
    if (node) {
      const f = getDialogFocusable(node);
      (f[0] || node).focus();
    }
    const entry = { close: () => { if (onCloseRef.current) onCloseRef.current(); } };
    __dialogStack.push(entry);

    const handleKeyDown = (e) => {
      // Only the topmost dialog responds, so stacked overlays close one at
      // a time from the top.
      if (__dialogStack[__dialogStack.length - 1] !== entry) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        entry.close();
        return;
      }
      if (e.key === "Tab" && node) {
        const f = getDialogFocusable(node);
        if (f.length === 0) { e.preventDefault(); node.focus(); return; }
        const first = f[0];
        const last = f[f.length - 1];
        const active = document.activeElement;
        if (!node.contains(active)) { e.preventDefault(); first.focus(); return; }
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      const idx = __dialogStack.indexOf(entry);
      if (idx !== -1) __dialogStack.splice(idx, 1);
      const el = restoreRef.current;
      // Restore focus to the trigger. No-op if it's since unmounted (e.g.
      // sign-out tears down ProfileModal underneath the confirm).
      if (el && typeof el.focus === "function") el.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

// ─── ConfirmDialog ───
//
// Centered confirm card replacing native window.confirm for destructive
// actions (profile reset, sign out). Bilingual title + body, a destructive
// confirm button (Pep Orange) and a neutral cancel. Uses useDialogA11y for
// role="dialog" focus-trap/Escape/focus-return, and portals to <body> so it
// escapes any ancestor scroll/stacking context and floats above ProfileModal.
function ConfirmDialog({ open, onConfirm, onCancel, titleEs, titleEn, bodyEs, bodyEn, confirmEs, confirmEn }) {
  const cardRef = useRef(null);
  useDialogA11y(cardRef, { open, onClose: onCancel });
  if (!open) return null;
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(29, 37, 45, 0.55)",
        zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.parchment, width: "100%", maxWidth: 360,
          borderRadius: 16, overflow: "hidden", outline: "none",
          boxShadow: "0 12px 36px rgba(0, 32, 91, 0.28)",
        }}
      >
        <div style={{ padding: "20px 20px 8px" }}>
          <div style={{
            fontFamily: "'EB Garamond', serif", fontSize: 21, fontWeight: 700,
            color: C.pepBlue, lineHeight: 1.15, marginBottom: 2,
          }} lang="es">{titleEs}</div>
          {titleEn && titleEn !== titleEs && (
            <div style={{
              fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 15,
              color: C.mountain, lineHeight: 1.2,
            }}>{titleEn}</div>
          )}
        </div>
        <div style={{ padding: "0 20px 18px" }}>
          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 14, color: C.mountain, lineHeight: 1.45,
          }} lang="es">{bodyEs}</div>
          {bodyEn && bodyEn !== bodyEs && (
            <div style={{
              fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 13.5,
              color: C.stone, lineHeight: 1.4, marginTop: 4,
            }}>{bodyEn}</div>
          )}
        </div>
        <div style={{
          display: "flex", gap: 10, padding: "0 20px 20px",
        }}>
          <button
            onClick={onCancel}
            className="bap-press"
            style={{
              flex: 1, padding: "12px 14px", borderRadius: 10,
              background: C.white, border: `1px solid ${C.fog}`, color: C.mountain,
              fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500,
              cursor: "pointer", minHeight: 44,
            }}
          >Cancelar / Cancel</button>
          <button
            onClick={onConfirm}
            className="bap-press"
            style={{
              flex: 1, padding: "12px 14px", borderRadius: 10,
              background: C.pepOrange, border: `1px solid ${C.pepOrange}`, color: C.white,
              fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: "pointer", minHeight: 44,
            }}
          >{confirmEs || "Confirmar"} / {confirmEn || "Confirm"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
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
  const sheetRef = useRef(null);
  const reduced = useReducedMotion();
  // Focus-trap + Escape + focus-return. Keyed on `show` so focus moves in
  // when the sheet mounts and returns to the trigger when it unmounts.
  useDialogA11y(sheetRef, { open: show, onClose });

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
    if (__bottomSheetLockCount === 0) {
      __bottomSheetPrevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    __bottomSheetLockCount++;
    return () => {
      __bottomSheetLockCount = Math.max(0, __bottomSheetLockCount - 1);
      if (__bottomSheetLockCount === 0) {
        document.body.style.overflow = __bottomSheetPrevOverflow;
      }
    };
  }, [show]);

  if (!show) return null;

  // Portal to <body> so the position:fixed overlay escapes any
  // ancestor scroll container. Critical on iOS: a fixed element
  // nested inside a `-webkit-overflow-scrolling: touch` / overflow:auto
  // scroller is positioned/clipped relative to the scrolled content,
  // not the viewport — which left the WeatherSheet/DolarSheet backdrop
  // and × button off-screen and un-tappable (the "frozen, can't close"
  // bug). PromptForm escaped this only by being rendered at App level;
  // portaling fixes every BottomSheet caller regardless of where it
  // sits in the tree.
  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0,
        background: animateIn ? "rgba(29, 37, 45, 0.55)" : "rgba(29, 37, 45, 0)",
        zIndex: 200,
        transition: reduced ? "none" : "background 0.26s ease-out",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.parchment, width: "100%", maxWidth: 480,
          borderRadius: "20px 20px 0 0",
          maxHeight: "92vh", display: "flex", flexDirection: "column",
          transform: animateIn ? "translateY(0)" : "translateY(100%)",
          transition: reduced ? "none" : "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 -8px 28px rgba(0, 32, 91, 0.20)",
          overflow: "hidden", outline: "none",
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
            aria-label="Cerrar / Close"
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
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "14px 16px calc(12px + var(--bap-nav-pad-bottom))" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
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
        }}>Próximas 12 horas <span style={{ color: C.mountain }}>·</span> <span style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic", textTransform: "none",
          letterSpacing: 0, color: C.mountain, fontSize: 12,
        }}>Next 12 hours</span></div>
        {hourRows.length === 0 ? (
          <div style={{
            background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
            padding: "16px", color: C.mountain, fontSize: 12,
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
        }}>Próximos 7 días <span style={{ color: C.mountain }}>·</span> <span style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic", textTransform: "none",
          letterSpacing: 0, color: C.mountain, fontSize: 12,
        }}>Next 7 days</span></div>
        {dayRows.length === 0 ? (
          <div style={{
            background: C.white, border: `1px solid ${C.fog}`, borderRadius: 12,
            padding: "16px", color: C.mountain, fontSize: 12,
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
                    <span style={{ color: C.mountain, fontWeight: 400, margin: "0 4px" }}>/</span>
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
          color: C.mountain, marginTop: 10, lineHeight: 1.4, textAlign: "center",
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
          <span style={{ color: C.mountain, margin: "0 4px" }}>·</span>
          <span style={{
            fontFamily: "'EB Garamond', serif", fontStyle: "italic",
            textTransform: "none", letterSpacing: 0, color: C.mountain,
          }}>{direction === "ars-to-usd" ? "You have, in pesos" : "You have, in dollars"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700,
            color: C.mountain, lineHeight: 1,
          }}>{direction === "ars-to-usd" ? "$" : "US$"}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0"
            aria-label={direction === "ars-to-usd" ? "Monto en pesos / Amount in Argentine pesos" : "Monto en dólares / Amount in U.S. dollars"}
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
            <span style={{ color: C.mountain, margin: "0 4px" }}>·</span>
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
        }}>Comparación <span style={{ color: C.mountain }}>·</span> <span style={{
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
                    color: C.mountain, marginTop: 3,
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
    // Re-read the cache inside each .then (rather than merging onto a
    // single captured snapshot) so the weather and dólar writes — and a
    // concurrent mount-effect write — can't clobber each other's field
    // with a stale value.
    const weatherPromise = fetchWeather()
      .then((w) => {
        setWeather(w);
        saveTodayCache({ ...loadTodayCache(), weather: w });
      })
      .catch(() => { /* keep prior */ });
    const dolarPromise = fetchDolar()
      .then((d) => {
        setDolar(d);
        saveTodayCache({ ...loadTodayCache(), dolar: d });
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

    // Each write re-reads the cache so a concurrent pull-to-refresh write
    // can't be clobbered by a stale captured snapshot (and vice versa).
    if (!fresh(c.weather) || !weatherShapeOk) {
      fetchWeather()
        .then((w) => {
          setWeather(w);
          saveTodayCache({ ...loadTodayCache(), weather: w });
        })
        .catch(() => { /* keep cached or null */ });
    }
    if (!fresh(c.dolar)) {
      fetchDolar()
        .then((d) => {
          setDolar(d);
          saveTodayCache({ ...loadTodayCache(), dolar: d });
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
  // Mundial: is Argentina playing today? Drives the greeting-strip
  // albiceleste skin and the game tile below. Cheap find over the
  // calendar; recompute per render is fine.
  const argGame = getArgentinaGameForDate(data, todayStr);
  const { items, holiday } = useMemo(
    () => getTodayItems(data, profile),
    [data, profile, todayStr]
  );
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextItem = items.find((i) => i.sortMin !== null && i.sortMin > nowMin);
  const countdown = nextItem ? formatCountdown(nextItem.sortMin, nowMin) : null;

  // Inline-event prompts: a locked meal selection (or similar) whose
  // event_date is today. These don't render as a separate <PromptCard>
  // tile; they live as small captions at the bottom of the activity
  // card so the student sees their selection right beside the event
  // it belongs to. Filtered to today-surface prompts (a profile-only
  // prompt with event_date=today is a misconfiguration; render-on-Today
  // would surface it but profile is the canonical home for those).
  const inlineMealPrompts = useMemo(
    () => filterPromptsBySurface(prompts || [], "today")
      .filter((p) => getPromptDisplayState(p, todayStr) === "inline_event"),
    [prompts, todayStr]
  );

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
  // On Argentina game days the strip puts on the jersey: a celeste-
  // forward gradient (still ending in Pep Blue so the white text keeps
  // its contrast), a rotating Sol de Mayo in place of the sun, and
  // drifting papelitos. Everything else about the strip is unchanged.
  const argGradient = "linear-gradient(135deg, #6CACE4 0%, #5795D6 38%, #0057B8 78%, #00205B 100%)";
  const greetingStrip = (
    <div style={{
      background: argGame ? argGradient : gradient, color: "#FFFFFF", borderRadius: 16,
      padding: "20px 20px 18px", marginBottom: 14, position: "relative",
      overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 32, 91, 0.18)",
    }}>
      <div className={(argGame || isDayHour) ? "bap-sun-rotate" : ""} style={{
        position: "absolute", top: -10, right: -10, opacity: argGame ? 0.36 : 0.3,
        transform: "scale(1.7)", transformOrigin: "center",
      }}>
        {argGame ? <SolDeMayoIcon size={64} /> : isDayHour ? <SunIcon size={64} /> : <MoonIcon size={64} />}
      </div>
      {argGame && <Papelitos />}
      {/* Non-touch refresh affordance. The pull-to-refresh gesture is
          touch-only, so a desktop/keyboard/assistive-tech user (and the
          Director, who edits the sheet on a laptop) has no way to force a
          fresh fetch. This button runs the same triggerRefresh path. */}
      <button
        onClick={triggerRefresh}
        disabled={isRefreshing}
        aria-label="Actualizar / Refresh"
        aria-busy={isRefreshing}
        className="bap-press"
        style={{
          position: "absolute", top: 5, right: 5, zIndex: 2,
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.16)",
          border: "1px solid rgba(255, 255, 255, 0.30)",
          color: "#FFFFFF",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: isRefreshing ? "default" : "pointer",
          padding: 0,
        }}
      >
        <span className={isRefreshing ? "bap-spin" : ""} style={{ display: "flex" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </span>
      </button>
      <div style={{ position: "relative", zIndex: 2 }}>
        <div lang="es" style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
          letterSpacing: 2, color: argGame ? "#FFFFFF" : C.bapBlue, marginBottom: 4,
        }}>{argGame ? "¡Hoy juega Argentina! / Game day" : "Hoy / Today"}</div>
        <div lang="es" style={{
          fontFamily: "'EB Garamond', serif", fontSize: 26, fontWeight: 700,
          lineHeight: 1.05, letterSpacing: -0.4,
          textShadow: argGame ? "0 1px 3px rgba(0, 32, 91, 0.30)" : "none",
        }}>{(() => {
          // Prefer the preferred_name over first_name so a student
          // who goes by "Cris" instead of "Cristina" sees the right
          // greeting. Falls back to the bare greeting in preview
          // mode (no SHEET_ID, currentUser is null) or for users
          // whose roster row has no first/preferred name.
          const userName = (currentUser && (currentUser.preferred_name || currentUser.first_name)) || "";
          return userName ? `${greeting.es}, ${userName}` : greeting.es;
        })()}</div>
        <div lang="es" style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic",
          fontSize: 16, color: C.fog, marginTop: 4,
        }}>{dateLabel}</div>
      </div>
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
          aria-label={`Ver detalles / Open ${key} details`}
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
          aria-label={`Actualizar / Refresh ${key}`}
          style={{
            ...baseStyle,
            cursor: "pointer", textAlign: "left",
            font: "inherit", color: "inherit",
            display: "block",
          }}
        >{children}</button>
      );
    }
    // Non-interactive placeholder (no onClick): no press affordance — a
    // tile that doesn't respond to taps shouldn't scale as if it does.
    return (
      <div key={key} style={baseStyle}>{children}</div>
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
              <span style={{ color: C.mountain, margin: "0 4px" }}>/</span>
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
        <div style={{ height: 32, display: "flex", alignItems: "center", color: C.mountain, fontSize: 12 }}>—</div>
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
        <div style={{ height: 32, display: "flex", alignItems: "center", color: C.mountain, fontSize: 12 }}>—</div>
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
          {labelEs} <span style={{ color: C.mountain, margin: "0 2px" }}>/</span> {labelEn}
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

  // Inline meal-selection captions. Rendered as a small Ice-filled
  // block beneath the events on a day where the student RSVP'd to a
  // meal. Each row: lock glyph + bilingual title + the responses as
  // a comma-joined human-readable string. Tap opens the readonly
  // PromptForm for a fuller view. Returned as an array so the
  // activity-card branches can splice it in or render solo when the
  // day is otherwise empty.
  const renderInlineMealBlocks = () => inlineMealPrompts.map((p) => {
    const parts = [];
    for (let i = 0; i < (p.fields || []).length; i++) {
      const f = p.fields[i];
      const v = (p.responses || {})[f.field_id];
      const display = formatFieldValueForDisplay(f, v);
      if (display) parts.push(display);
    }
    const summary = parts.join(" · ");
    const titleEs = p.title_es || p.title_en || "";
    return (
      <button
        key={`inline-${p.prompt_id}`}
        type="button"
        onClick={() => onOpenPrompt(p)}
        className="bap-press"
        style={{
          marginTop: 10, width: "100%", textAlign: "left",
          background: C.ice, border: `1px solid ${C.fog}`,
          borderLeft: `3px solid ${C.ocean}`,
          borderRadius: 8, padding: "8px 12px", cursor: "pointer",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: C.ocean,
          textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3,
        }}>
          <LockGlyph size={11} color={C.ocean} />
          <span>Tu selección · {titleEs}</span>
        </div>
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.pepBlack,
          lineHeight: 1.4,
        }}>
          {summary || <span style={{ fontStyle: "italic", color: C.mountain }}>Sin respuesta / No answer</span>}
        </div>
      </button>
    );
  });
  const hasInlineMeals = inlineMealPrompts.length > 0;

  // ── Today's activity (or empty state) ──
  // Branches:
  //   - items > 0 → list of items (the holiday is already surfaced
  //     above as its own card). Inline meal captions append at bottom.
  //   - empty + class-cancelling holiday → no activityCard at all
  //     unless an inline meal selection exists (the locked meal is
  //     content the student should still see on the day).
  //   - empty otherwise → "¡Día libre!" empty state, OR if there's an
  //     inline meal, a minimal activity card with just the meal block
  //     (¡Día libre! would contradict "you have a dinner tonight").
  const suppressEmptyForHoliday = !!(holiday && holiday.cancels_classes);
  let activityCard;
  if (items.length === 0 && suppressEmptyForHoliday && !hasInlineMeals) {
    activityCard = null;
  } else if (items.length === 0 && hasInlineMeals) {
    activityCard = (
      <div style={{
        background: C.white,
        border: `1px solid ${C.fog}`, borderLeft: `4px solid ${C.bapBlue}`,
        borderRadius: 12,
        padding: "14px 16px 14px", marginBottom: 14,
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
          letterSpacing: 1.5, color: C.ocean, marginBottom: 2,
        }}>Agenda</div>
        {renderInlineMealBlocks()}
      </div>
    );
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
            onClick={() => onJumpToTab("local", "places")}
            className="bap-press"
            style={{
              marginTop: 14, background: "#FFF4ED", color: C.pepOrange,
              border: `1px solid #FFD8C2`, borderRadius: 10,
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
                    color: C.mountain, marginTop: 2,
                  }}>{item.location}</div>
                )}
                {item.description && (
                  <div style={{
                    fontFamily: "'Roboto', sans-serif", fontSize: 11.5,
                    color: C.mountain, marginTop: 2, lineHeight: 1.35,
                  }}>{item.description}</div>
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
        {renderInlineMealBlocks()}
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
        <MundialGameTile data={data} todayStr={todayStr} now={now} onJumpToTab={onJumpToTab} />
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {weatherTile}
          {dolarTile}
        </div>
        <AnnouncementBanner announcements={data.announcements} />
        <BirthdayCard birthdays={data.birthdays} />
        {holidayCard}
        {activityCard}
        <PromptCard prompts={prompts} onOpenPrompt={onOpenPrompt} todayStr={todayStr} />
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
function SectionTitle({ tabKey, override, onBack }) {
  // `override` lets a tab swap its headline/gloss contextually (e.g. the Local
  // tab reading "Places" with no gloss while in that section). An override with
  // a null/blank `es` suppresses the Spanish gloss line entirely; an optional
  // `sub` renders inline beside the headline as a lighter breadcrumb-style
  // sub-header (e.g. "Places · Café" for the chosen Places category). When
  // `onBack` is provided, a chevron sits at the conventional top-left, before
  // the headline — used by Places to drop the dedicated in-listing back row.
  const t = override || TAB_TITLES[tabKey];
  if (!t) return null;
  return (
    <div style={{ marginBottom: 18, lineHeight: 1 }}>
      <div style={{
        width: 28, height: 2, background: C.pepOrange,
        borderRadius: 1, marginBottom: 10,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button onClick={onBack} className="bap-press" aria-label="Volver / Back" style={{
            flexShrink: 0, width: 34, height: 34, borderRadius: 17,
            border: `1px solid ${C.fog}`, background: C.white, color: C.pepBlue,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 23, lineHeight: 1, paddingBottom: 3,
          }}>‹</button>
        )}
        <div style={{
          fontFamily: "'EB Garamond', serif", fontSize: 28, fontWeight: 700,
          color: C.pepBlue, letterSpacing: -0.5, lineHeight: 1.05,
        }}>
          {t.en}
          {t.sub && (
            <span style={{ fontWeight: 400, fontSize: 19, color: C.ocean, whiteSpace: "nowrap" }}>
              <span style={{ color: C.fog, margin: "0 9px" }}>·</span>{t.sub}
            </span>
          )}
        </div>
      </div>
      {t.es && (
        <div style={{
          marginTop: 4,
          fontFamily: "'DM Mono', monospace", fontSize: 11,
          textTransform: "uppercase", letterSpacing: 2.2, color: C.ocean,
        }}>{t.es}</div>
      )}
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
  const active = (announcements || []).filter((a) => isAnnouncementActive(a, todayStr));

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
                {labelEs} <span style={{ color: C.mountain, margin: "0 2px" }}>/</span> {labelEn}
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
  const todayRef = useRef(null);

  // Anchor the student on today's day card whenever this view mounts on
  // the current week, and again whenever the student taps "← Back to
  // This Week." The dep is weekOffset rather than a one-shot mount-only
  // effect because the same scroll behavior is wanted in both paths and
  // the condition guards against scrolling-on-other-weeks. Days of the
  // week sit ABOVE today (Mon→Sun layout, so Wed/Thu/Fri lands mid-list);
  // landing at the top of today's card maximizes how much of "what's
  // happening today" is on screen on first paint.
  useEffect(() => {
    if (weekOffset !== 0) return;
    const node = todayRef.current;
    if (!node) return;
    // Wait a frame so the layout has settled — scrollIntoView called
    // during the same paint pass as the mount can miss its target on
    // iOS Safari when the parent scroll container is still being sized.
    const id = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [weekOffset]);

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
          aria-label="Semana anterior / Previous week"
          style={{
            background: "none", border: `1px solid ${C.fog}`, borderRadius: 8, padding: "6px 12px",
            cursor: canGoBack ? "pointer" : "not-allowed", fontSize: 16,
            color: canGoBack ? C.pepBlue : C.stone, fontWeight: 700,
            opacity: canGoBack ? 1 : 0.4,
          }}
        >‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.mountain, letterSpacing: 0.5 }}>{weekLabel}</div>
          {weekOffset === 0 && (
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: C.ocean, fontWeight: 500, marginTop: 2 }}>This Week</div>
          )}
        </div>
        <button
          onClick={() => canGoForward && setWeekOffset((o) => Math.min(MAX_WEEK_OFFSET, o + 1))}
          disabled={!canGoForward}
          aria-label="Semana siguiente / Next week"
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
            <div key={ds} ref={isToday ? todayRef : null} style={{
              background: isToday ? "#F0F7FF" : C.white,
              borderRadius: 12, padding: "12px 14px",
              border: isToday ? `2px solid ${C.bapBlue}` : `1px solid ${C.fog}`,
              scrollMarginTop: 12,
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
                    {WEEK_DAYS_FULL_ES[d.getDay()]} / {WEEK_DAYS_FULL[d.getDay()]}
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
                              {e.type === "mundial" && <span style={{ marginRight: 5 }}>⚽</span>}{e.title}
                            </span>
                            {timeStr && (
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain, whiteSpace: "nowrap", marginLeft: 8 }}>{timeStr}</span>
                            )}
                          </div>
                          {isMulti && (
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain, marginTop: 3 }}>
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
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain, whiteSpace: "nowrap" }}>{c.final_time}</span>
                            )}
                          </div>
                          {c.location && (
                            <div style={{
                              fontFamily: "'Roboto', sans-serif", fontSize: 11.5,
                              color: C.mountain, marginTop: 3,
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
                            color: C.mountain, marginRight: 6,
                          }}>{c.code}</span>
                          {c.title}
                        </span>
                        {t && (
                          <span style={{
                            fontFamily: "'DM Mono', monospace", fontSize: 10,
                            color: C.mountain, whiteSpace: "nowrap",
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

      {/* Bottom week navigation — mirrors the top chevrons so a student
          who has scrolled through the week can move on without scrolling
          back up. Same bounded MIN/MAX offsets and disabled treatment. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
        <button
          onClick={() => canGoBack && setWeekOffset((o) => Math.max(MIN_WEEK_OFFSET, o - 1))}
          disabled={!canGoBack}
          aria-label="Semana anterior / Previous week"
          style={{
            background: "none", border: `1px solid ${C.fog}`, borderRadius: 8, padding: "6px 12px",
            cursor: canGoBack ? "pointer" : "not-allowed", fontSize: 16,
            color: canGoBack ? C.pepBlue : C.stone, fontWeight: 700,
            opacity: canGoBack ? 1 : 0.4,
          }}
        >‹</button>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.mountain, letterSpacing: 0.5 }}>{weekLabel}</div>
        <button
          onClick={() => canGoForward && setWeekOffset((o) => Math.min(MAX_WEEK_OFFSET, o + 1))}
          disabled={!canGoForward}
          aria-label="Semana siguiente / Next week"
          style={{
            background: "none", border: `1px solid ${C.fog}`, borderRadius: 8, padding: "6px 12px",
            cursor: canGoForward ? "pointer" : "not-allowed", fontSize: 16,
            color: canGoForward ? C.pepBlue : C.stone, fontWeight: 700,
            opacity: canGoForward ? 1 : 0.4,
          }}
        >›</button>
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
                    {day === "Mon" ? "Lunes / Monday" : day === "Tue" ? "Martes / Tuesday" : day === "Wed" ? "Miércoles / Wednesday" : day === "Thu" ? "Jueves / Thursday" : "Viernes / Friday"}
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
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.mountain, whiteSpace: "nowrap", marginLeft: 12 }}>{getTimeForDay(c.time, day)}</span>
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
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.mountain }}>{compactSchedule(c.days, c.time)}</span><br />
                  {c.location}
                </div>
                {c.email && (() => {
                  const profName = c.honorific ? `${c.honorific} ${c.professor}` : c.professor;
                  const emailLabel = `Escribir a ${profName} / Email ${profName}`;
                  return (
                    <a href={`mailto:${c.email}`} aria-label={emailLabel} title={emailLabel} style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 10,
                      minWidth: 40, minHeight: 40, color: C.pepOrange,
                      textDecoration: "none", borderRadius: 10,
                      background: "#FFF4ED", border: `1px solid #FFD8C2`, cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                      <EnvelopeGlyph size={18} color={C.pepOrange} />
                    </a>
                  );
                })()}
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
        <button
          onClick={onOpenSettings}
          className="bap-press"
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
            background: C.ice, border: `1px solid ${C.fog}`, borderRadius: 10,
            padding: "8px 12px", marginBottom: 14, cursor: "pointer", font: "inherit",
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
        </button>
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
  const todayDividerRef = useRef(null);

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

  // Anchor the student on the "Hoy · Today" divider on open and whenever
  // the active filter changes (a filtered list has its own first-not-past
  // event, so re-anchoring keeps the upcoming-events part of the list in
  // view rather than leaving the student looking at past events from a
  // different filter). If every event in the active filter is past,
  // firstNotPastKey is null and no divider renders; the effect no-ops
  // and the student lands at the natural top of the list. Wait a frame
  // so the layout has settled — scrollIntoView called during the same
  // paint pass as the mount can miss its target on iOS Safari when the
  // parent scroll container is still being sized.
  useEffect(() => {
    if (!firstNotPastKey) return;
    const node = todayDividerRef.current;
    if (!node) return;
    const id = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [firstNotPastKey]);

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
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.mountain, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.fog}` }}>{monthName}</div>
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
                      <div ref={todayDividerRef} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        margin: "6px 0 2px", scrollMarginTop: 12,
                      }}>
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
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain }}>{dayDisplay}</div>
                      </div>
                      <div style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${s.border}` }}>
                        <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14, color: C.pepBlack }}>{e.type === "mundial" && <span style={{ marginRight: 5 }}>⚽</span>}{e.title}</div>
                        {isMulti && (
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain, marginTop: 3 }}>
                            {countDays(e.date, e.end_date)} days
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                          <AddToCalendarButton onClick={() => downloadCalendarEventIcs(e)} />
                        </div>
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

// ─── Link / action glyphs ───
// Small inline-SVG icons used to label contact + link buttons without words
// (a telephone to call, the WhatsApp mark, an envelope to email, a map pin for
// Maps, a globe for a website, the Instagram camera). Each takes { size, color }
// so a caller can match the button's variant color. Every button that renders
// one of these icon-only MUST also carry an aria-label + title for a11y.
function PhoneGlyph({ size = 18, color = C.ocean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function WhatsAppGlyph({ size = 18, color = "#2E7D32" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/>
    </svg>
  );
}
function EnvelopeGlyph({ size = 18, color = C.ocean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function MapPinGlyph({ size = 18, color = C.ocean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>
    </svg>
  );
}
function GlobeGlyph({ size = 18, color = C.pepOrange }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
function InstagramGlyph({ size = 18, color = C.pepOrange }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

// View-toggle glyphs for the Places listing's List / Map / Near control
// (icon-only as of 2026-06-10m). ListViewIcon = bulleted list, MapViewIcon =
// folded map, NavArrowIcon = navigation arrow (location sort). Each { size,color }.
function ListViewIcon({ size = 17, color = C.ocean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <circle cx="4.5" cy="6" r="1.8"/>
      <rect x="9" y="4.6" width="12.5" height="2.8" rx="1.4"/>
      <circle cx="4.5" cy="12" r="1.8"/>
      <rect x="9" y="10.6" width="12.5" height="2.8" rx="1.4"/>
      <circle cx="4.5" cy="18" r="1.8"/>
      <rect x="9" y="16.6" width="12.5" height="2.8" rx="1.4"/>
    </svg>
  );
}
function MapViewIcon({ size = 17, color = C.ocean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}
function NavArrowIcon({ size = 17, color = C.ocean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  );
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
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <MapPinGlyph size={14} color={C.ocean} />{address}
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
  return <span style={{ color: C.mountain, fontStyle: "italic" }}>{note}</span>;
}

// ─── Link Helper ───
// Renders an external link as an icon-only pill: a globe for a generic website,
// the WhatsApp / Instagram marks for those services, a phone for a tel: link.
// The descriptive text lives in aria-label + title (visible on hover/long-press)
// so the button stays wordless while remaining accessible.
function LinkButton({ url }) {
  const safe = safeExternalUrl(url);
  if (!safe) return null;
  let Glyph = GlobeGlyph;
  let label = "Sitio web / Website";
  let external = true;
  if (safe.includes("wa.me")) { Glyph = WhatsAppGlyph; label = "WhatsApp"; }
  else if (safe.includes("instagram.com")) { Glyph = InstagramGlyph; label = "Instagram"; }
  else if (safe.startsWith("tel:")) { Glyph = PhoneGlyph; label = "Llamar / Call"; external = false; }
  return (
    <a href={safe} target={external ? "_blank" : undefined} rel="noopener noreferrer"
      aria-label={label} title={label} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 8,
      minWidth: 40, minHeight: 40, color: C.pepOrange,
      textDecoration: "none", borderRadius: 10,
      background: "#FFF4ED", border: `1px solid #FFD8C2`, cursor: "pointer",
    }}>
      <Glyph size={18} color={C.pepOrange} />
    </a>
  );
}

// ─── Filter Pills (smaller, for sub-filtering) ───
function FilterPill({ active, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={!!active} style={{
      padding: "9px 14px", borderRadius: 19, minHeight: 38,
      display: "inline-flex", alignItems: "center",
      border: active ? `1.5px solid ${C.ocean}` : "1.5px solid transparent",
      background: active ? C.ice : C.parchment,
      color: active ? C.ocean : C.mountain,
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

// ─── "Cerca tuyo / Near you": location-based distance sort ───
// Phase 1 of the Places spatial roadmap (no map, no new dependency).
// Powers the optional distance sort on the Local tab's Explore BA,
// Healthcare, and Churches sub-tabs. Coordinates live in optional lat/lng
// columns on those content-sheet tabs; rows without coordinates degrade
// gracefully (no distance caption, and they sink to the bottom when the
// list is sorted by distance).
function parseCoord(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).trim());
  return isNaN(n) ? null : n;
}

// Great-circle distance in kilometers between two lat/lng points.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Short, language-neutral distance label. Sub-1km rounds to the nearest
// 10 m; above that, one decimal under 10 km, whole km beyond. Spanish
// decimal comma to match the rest of the app's number formatting.
function formatDistance(km) {
  if (km == null || isNaN(km)) return null;
  if (km < 1) return `~${Math.round((km * 1000) / 10) * 10} m`;
  const v = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `~${v.replace(".", ",")} km`;
}

// Promise wrapper around the Geolocation API. Low accuracy (city-block
// precision is plenty and is faster/easier on battery), 8s timeout, and a
// 5-minute cached fix is acceptable. Rejects with a typed reason so the UI
// can distinguish "denied" (user said no) from "unavailable" (no API,
// timeout, position error) and show the right message.
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({ reason: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject({ reason: err && err.code === 1 ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

// Stable nearest-first sort. Rows without coordinates sort to the bottom
// while keeping their original relative order (Infinity distance, with the
// original index as the tiebreak so equal/coordless rows don't shuffle).
function sortByDistance(list, userLoc) {
  return list
    .map((item, idx) => {
      const has = item.lat != null && item.lng != null;
      const dist = has ? haversineKm(userLoc.lat, userLoc.lng, item.lat, item.lng) : Infinity;
      return { item, idx, dist };
    })
    .sort((a, b) => (a.dist - b.dist) || (a.idx - b.idx))
    .map((x) => x.item);
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
            letterSpacing: 1.5, color: C.mountain, marginBottom: 8,
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
            letterSpacing: 1.5, color: C.mountain, marginBottom: 8,
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
        <Icon size={26} color={discGlyphColor(meta.color)} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlack, lineHeight: 1.2 }}>
            {event.title}
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11,
            color: C.mountain, background: C.ice,
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
            fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.mountain,
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
                  <span style={{ color: C.mountain, margin: "0 4px" }}>·</span>
                  <span style={{ color: C.mountain }}>~{formatUsd(usdAmount)} USD</span>
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
// Game-day hero tile for the Today dashboard. Surfaces only when
// Argentina plays in the Mundial today (a `mundial`-typed calendar
// event dated today whose title mentions Argentina). Jersey stripes,
// a number-10 watermark, the matchup, and a live kickoff countdown
// driven by the row's start_time. Tap jumps to the Schedule tab, where
// the game also appears in the Weekly Overview (visibility: week).
function MundialGameTile({ data, todayStr, now, onJumpToTab }) {
  const game = getArgentinaGameForDate(data, todayStr);
  if (!game) return null;

  const matchup = cleanMundialTitle(game.title) || "¡Vamos, Argentina!";
  const kickoffMin = toMinutes(game.start_time);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const countdown = kickoffMin != null ? formatCountdown(kickoffMin, nowMin) : null;

  // Status pill: counting down before kickoff, "in play" after, and a
  // generic rally cry when no kickoff time is on the row.
  let pillEs, pillEn;
  if (countdown) { pillEs = `Arranca ${countdown}`; pillEn = "Kickoff soon"; }
  else if (kickoffMin != null && nowMin >= kickoffMin) { pillEs = "¡En cancha!"; pillEn = "In play"; }
  else { pillEs = "¡Vamos!"; pillEn = "Today"; }

  const stripes = "repeating-linear-gradient(90deg, rgba(117,170,219,0.16) 0 13px, rgba(255,255,255,0) 13px 26px)";

  return (
    <button
      onClick={() => { if (onJumpToTab) onJumpToTab("schedule"); }}
      className="bap-press"
      aria-label={`Mundial: ${matchup}. ${pillEs}`}
      style={{
        position: "relative", overflow: "hidden",
        background: C.white, border: "1px solid #9FC4E8", borderRadius: 14,
        padding: "13px 15px 15px", marginBottom: 14, cursor: "pointer",
        width: "100%", textAlign: "left", font: "inherit", display: "block",
        boxShadow: "0 3px 12px rgba(0, 87, 184, 0.10)",
      }}
    >
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: stripes, zIndex: 0 }} />
      <div aria-hidden="true" style={{
        position: "absolute", right: 8, bottom: -16, zIndex: 0,
        fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 78,
        lineHeight: 1, color: "#75AADB", opacity: 0.18, pointerEvents: "none",
      }}>10</div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div lang="es" style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.4, color: C.ocean,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <span aria-hidden="true">⚽</span> Hoy juega Argentina · Mundial
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.ocean }}>
            Ver →
          </span>
        </div>

        <div style={{
          fontFamily: "'EB Garamond', serif", fontSize: 20, fontWeight: 700,
          color: C.pepBlack, lineHeight: 1.12,
        }}>{matchup}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, flexWrap: "wrap" }}>
          <span lang="es" style={{
            background: C.pepBlue, color: C.white,
            fontFamily: "'DM Mono', monospace", fontSize: 12,
            padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap",
          }}>{pillEs}</span>
          {game.start_time ? (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.mountain }}>
              {game.start_time}{game.end_time ? `–${game.end_time}` : ""}
            </span>
          ) : null}
        </div>

        {game.description ? (
          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 12.5,
            color: C.mountain, marginTop: 8, lineHeight: 1.35,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{game.description}</div>
        ) : null}
      </div>
    </button>
  );
}

// Compact preview that appears on the Today dashboard 14 days before
// the program-wide finals window starts (or as soon as any enrolled
// class has a final_date assigned). Tapping the tile jumps to the
// Schedule tab, where <FinalsCard> shows the same data in fuller form.
// Mirrors <EventsTodayTile>'s shape but uses a Pep Blue accent so it
// reads as academic, not cultural.
function TodayFinalsTile({ data, profile, now, onJumpToTab }) {
  // Collapsed by default — the tile is a quiet header until tapped, so it
  // doesn't crowd the Today dashboard with exam rows the student isn't
  // actively checking.
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
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

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.fog}`, borderRadius: 14,
      padding: open ? "12px 14px 14px" : "12px 14px", marginBottom: 14,
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="bap-press"
        style={{
          width: "100%", background: "transparent", border: "none", padding: 0,
          cursor: "pointer", font: "inherit", textAlign: "left",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}
      >
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.pepBlue, marginBottom: 2,
          }}>Exámenes finales</div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: C.pepBlack, lineHeight: 1.1 }}>
            Finals coming up
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: C.ocean }}>
            {finals.length}{winLabel ? ` · ${winLabel}` : ""}
          </span>
          <span aria-hidden="true" style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: reduced ? "none" : "transform 0.2s",
            fontSize: 12, color: C.mountain,
          }}>▼</span>
        </span>
      </button>

      {open && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {finals.map((f) => (
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
                    color: C.mountain, marginTop: 1,
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

          {onJumpToTab && (
            <button
              onClick={() => onJumpToTab("schedule")}
              className="bap-press"
              style={{
                marginTop: 10, background: "transparent", border: "none", padding: 0,
                cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11,
                color: C.ocean, display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              Ver en Schedule / See all →
            </button>
          )}
        </>
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
  // Collapsed by default — pinned above the Schedule sub-tabs as a quiet
  // header the student expands when they want exam dates/times.
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  // Early-returns must come after all hook calls (Rules of Hooks).
  if (!shouldShowFinalsUI(data, profile, today)) return null;
  const finals = getStudentFinals(data, profile);
  if (finals.length === 0) return null;

  const winLabel = formatFinalsWindow(data.finals_window_start, data.finals_window_end);

  return (
    <div style={{
      background: C.parchment,
      border: `1px solid ${C.fog}`,
      borderLeft: `4px solid ${C.pepBlue}`,
      borderRadius: 12, padding: open ? "12px 14px 14px" : "12px 14px",
      marginBottom: 16,
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="bap-press"
        style={{
          width: "100%", background: "transparent", border: "none", padding: 0,
          cursor: "pointer", font: "inherit", textAlign: "left",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}
      >
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.pepBlue, marginBottom: 2,
          }}>Exámenes finales</div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 18, fontWeight: 700, color: C.pepBlack, lineHeight: 1.1 }}>
            Finals
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {winLabel && (
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: C.ocean,
              background: C.white, border: `1px solid ${C.fog}`,
              padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap",
            }}>{winLabel}</span>
          )}
          <span aria-hidden="true" style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: reduced ? "none" : "transform 0.2s",
            fontSize: 12, color: C.mountain,
          }}>▼</span>
        </span>
      </button>

      {open && (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
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
                    color: C.mountain, marginTop: 2,
                  }}>{f.location}</div>
                )}
                {hasDate && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <AddToCalendarButton onClick={() => downloadFinalIcs(f)} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
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
    <button
      onClick={() => { if (onJumpToTab) onJumpToTab("local", "events"); }}
      className="bap-press"
      style={{
        background: C.white, border: `1px solid ${C.fog}`, borderRadius: 14,
        padding: "12px 14px 14px", marginBottom: 14, cursor: "pointer",
        width: "100%", textAlign: "left", font: "inherit", display: "block",
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
                <Icon size={18} color={discGlyphColor(meta.color)} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'EB Garamond', serif", fontSize: 14, fontWeight: 700,
                  color: C.pepBlack, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{e.title}</div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                  color: C.mountain, marginTop: 1,
                }}>
                  {eventDateLabel(e)}{e.time ? ` · ${e.time}` : ""}
                  {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                </div>
                {e.description ? (
                  <div style={{
                    fontFamily: "'Roboto', sans-serif", fontSize: 11.5,
                    color: C.mountain, marginTop: 2, lineHeight: 1.3,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>{e.description}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {events.length > preview.length && (
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 11.5, color: C.mountain,
          marginTop: 8, textAlign: "center",
        }}>
          +{events.length - preview.length} more this week
        </div>
      )}
    </button>
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
      // A never-answered boolean stays "" so neither Sí/No pill is
      // pre-selected and a skipped required field is caught as missing
      // rather than recorded as a decline the student never made.
      // Only an actual stored TRUE/FALSE reflects as a selected pill.
      const raw = stored == null ? "" : String(stored).trim();
      out[f.field_id] = raw === "" ? "" : (raw.toUpperCase() === "TRUE");
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
    // Compare in minutes, not lexically: a non-zero-padded end_time like
    // "9:00" would read as still-open at 10:00 under string comparison
    // ("10:00" > "9:00" is false). toMinutes handles both "9:00" and
    // "09:00"; fall back to the original padded string compare if either
    // side won't parse.
    const nowMin = ref.getHours() * 60 + ref.getMinutes();
    const endMin = toMinutes(endTime);
    if (endMin !== null) {
      if (nowMin > endMin) return { es: "Cerrado", en: "Closed" };
    } else {
      const nowHm = `${String(ref.getHours()).padStart(2, "0")}:${String(ref.getMinutes()).padStart(2, "0")}`;
      if (nowHm > endTime) return { es: "Cerrado", en: "Closed" };
    }
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
// Map a stored field value back to its human-readable label. For
// select fields this resolves option values through option_labels_es
// / option_labels_en (Spanish primary, English fallback) so a stored
// value like "M" or "appetizer_2" comes back as the label the student
// originally saw. Used by the readonly renderers below and by
// PromptProfileSection's at-a-glance preview line.
function formatFieldValueForDisplay(field, rawValue) {
  if (!field) return "";
  const t = field.field_type;

  if (rawValue == null || (typeof rawValue === "string" && rawValue.trim() === "")) {
    if (Array.isArray(rawValue) && rawValue.length === 0) {
      // fall through to multi_select branch below; treated as empty
    } else {
      return "";
    }
  }

  if (t === "boolean") {
    const truthy = rawValue === true || rawValue === "TRUE" || rawValue === "true";
    return truthy ? "Sí / Yes" : "No";
  }

  if (t === "single_select") {
    const v = String(rawValue);
    const idx = (field.options || []).indexOf(v);
    if (idx < 0) return v;
    const es = (field.option_labels_es || [])[idx] || v;
    const en = (field.option_labels_en || [])[idx] || "";
    if (en && en !== es) return `${es} / ${en}`;
    return es;
  }

  if (t === "multi_select") {
    let arr;
    if (Array.isArray(rawValue)) arr = rawValue.map(String);
    else arr = String(rawValue).split(";");
    arr = arr.map((x) => x.trim()).filter(Boolean);
    if (arr.length === 0) return "";
    return arr.map((v) => {
      const idx = (field.options || []).indexOf(v);
      if (idx < 0) return v;
      return (field.option_labels_es || [])[idx] || v;
    }).join(", ");
  }

  return String(rawValue);
}

function PromptFieldInput({ field, value, onChange, readonly }) {
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
      {field.required && !readonly && (
        <span aria-label="Obligatorio / Required" title="Obligatorio / Required" style={{
          width: 6, height: 6, borderRadius: "50%", background: C.pepOrange,
          display: "inline-block", marginLeft: 2,
        }} />
      )}
    </div>
  );

  // Readonly branch: render the saved value as plain text in an Ice-
  // filled box (visually a step calmer than the editable inputs).
  // Empty answers on optional fields render as italic "Sin respuesta"
  // so a partially-answered prompt still reads cleanly when locked.
  if (readonly) {
    const display = formatFieldValueForDisplay(field, value);
    return (
      <div>
        {labelBlock}
        <div style={{
          width: "100%", boxSizing: "border-box",
          background: C.ice, border: `1px solid ${C.fog}`, borderRadius: 10,
          padding: "12px 14px",
          fontFamily: "'Roboto', sans-serif", fontSize: 14,
          color: display ? C.pepBlack : C.stone,
          fontStyle: display ? "normal" : "italic",
          lineHeight: 1.4, minHeight: 20,
        }}>
          {display || "Sin respuesta / No answer"}
        </div>
      </div>
    );
  }

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
        color: C.mountain, fontStyle: "italic",
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

  // Re-initialize from stored responses on the open transition (and on a
  // prompt swap), NOT just when promptKey changes. The sticky ref keeps
  // promptKey constant while the sheet is closed, so without gating on
  // `open` an open→edit→close-without-submitting→reopen sequence would
  // resurrect the abandoned edits as though they were saved. Gating on
  // `open` (and only re-initing when open) preserves the sticky-ref
  // behavior during the 260 ms close animation while wiping unsaved edits
  // on the next open. A background prompts refresh while open still won't
  // wipe in-progress edits, because submitted_at is not a dep and the
  // effect doesn't fire when only `displayPrompt`'s contents change.
  useEffect(() => {
    if (!open) return;
    setValues(initFormFromPrompt(displayPrompt));
    setErrorMsg("");
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, promptKey]);

  if (!displayPrompt) {
    // Render an empty sheet as a safety net; the parent shouldn't
    // open this without a prompt, but if it does the user can dismiss.
    return (
      <BottomSheet open={open} onClose={onClose} titleEs="Formulario" titleEn="Form">
        <div style={{ color: C.mountain, fontStyle: "italic", padding: 8 }}>
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
  const readonly = isPromptReadonly(displayPrompt);

  const setField = (fid, v) => setValues((prev) => ({ ...prev, [fid]: v }));

  const handleSubmit = async () => {
    if (submitting) return;
    setErrorMsg("");
    // Client-side required-field check before the 2-4s round trip, so a
    // skipped required field surfaces instantly instead of waiting on the
    // Apps Script to reject it. Mirrors PlaceSubmitForm. The server-side
    // validation below stays authoritative; this is just a fast pre-check.
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.required) continue;
      const v = values[f.field_id];
      const empty = f.field_type === "multi_select"
        ? !(Array.isArray(v) && v.length > 0)
        : (v == null || String(v).trim() === ""); // boolean unanswered is "" → caught here too
      if (empty) {
        const lbl = f.label_es || f.label_en || f.field_id;
        setErrorMsg(`Falta completar: ${lbl} / Missing: ${lbl}`);
        return;
      }
    }
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
      } else if (code === "already_submitted") {
        setErrorMsg("Ya enviaste este formulario. / You already submitted this form.");
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
      {readonly && (
        <div style={{
          marginBottom: 16,
          background: C.ice,
          border: `1px solid ${C.fog}`,
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <LockGlyph size={14} color={C.mountain} />
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: C.mountain,
            letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 1.2,
          }}>
            Cerrado · No editable / Closed · View only
          </div>
        </div>
      )}

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
            readonly={readonly}
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

      {readonly ? (
        <button
          type="button"
          onClick={onClose}
          className="bap-press"
          style={{
            marginTop: 20, width: "100%", padding: "13px 0", borderRadius: 10,
            background: C.white, color: C.pepBlue,
            border: `1px solid ${C.fog}`, cursor: "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500,
            letterSpacing: 0.5,
          }}
        >
          Listo / Done
        </button>
      ) : (
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
      )}

      {hasPriorSubmission && (
        <div style={{
          marginTop: 8, textAlign: "center",
          fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: C.mountain,
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
// the student has saved; calmer-still readonly treatment (Ice fill,
// Ocean stripe, "Ver tu selección" CTA, lock glyph) once a prompt is
// past its window or locked after submission.
//
// inline_event display state is suppressed here — those prompts
// render inside the activity card beneath their matching event row,
// not as a separate Pendientes tile (see TodayView for the wire-up).
function PromptCard({ prompts, onOpenPrompt, todayStr }) {
  const todayPrompts = filterPromptsBySurface(prompts, "today")
    .filter((p) => {
      const s = getPromptDisplayState(p, todayStr);
      return s === "editable" || s === "locked_readonly";
    });
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
          const state = getPromptDisplayState(p, todayStr);
          const locked = state === "locked_readonly";
          const pending = !locked && isPromptPending(p);
          const submitted = !!p.submitted_at;
          let cta;
          if (locked) cta = "Ver tu selección →";
          else if (submitted) cta = pending ? "Completar →" : "Editar →";
          else cta = "Responder →";
          const cutoff = formatPromptCutoff(p);
          const stripeColor = locked ? C.ocean : (pending ? C.pepOrange : C.ocean);
          const bg = locked ? C.ice : (pending ? C.parchment : C.ice);
          const ctaColor = locked ? C.mountain : (pending ? C.pepOrange : C.ocean);
          return (
            <button
              key={p.prompt_id}
              type="button"
              onClick={() => onOpenPrompt(p)}
              className="bap-press"
              style={{
                display: "flex", alignItems: "stretch", textAlign: "left",
                background: bg,
                border: `1px solid ${C.fog}`,
                borderRadius: 10, padding: 0, cursor: "pointer", width: "100%",
              }}
            >
              <div style={{ width: 4, background: stripeColor, flexShrink: 0 }} />
              <div style={{
                flex: 1, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
                minWidth: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14.5,
                    color: C.pepBlack, lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {locked && <LockGlyph size={12} color={C.mountain} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title_es || p.title_en}
                    </span>
                  </div>
                  {p.title_en && p.title_es && p.title_en !== p.title_es && (
                    <div style={{
                      fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12,
                      color: C.mountain, lineHeight: 1.2, marginTop: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{p.title_en}</div>
                  )}
                  {!locked && cutoff && (
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.mountain,
                      lineHeight: 1.3, marginTop: 3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{cutoff.es}</div>
                  )}
                </div>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: ctaColor,
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

// ─── Place card (Local > Places) ───
// One approved place. Category circle + glyph (getPlaceCategory), name with
// a ♥ save toggle, the one-line "why", neighborhood, address (via AddressLink,
// honoring maps_url), hours, an external link, and a "Suggested by …" credit
// line for community submissions the Director chose to attribute. Coordinates
// arrive already normalized to numbers-or-null by the caller.
function PlaceCard({ place, saved, onToggleSave, distance }) {
  const meta = getPlaceCategory(place.category);
  const Icon = meta.Icon;
  const distCap = { fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: C.ocean, fontWeight: 500 };

  // Attribution: community submissions show credit by default; a blank
  // show_credit is treated as ON, an explicit FALSE turns it off. Seed
  // rows (source !== "community") never show a submitter.
  const rawCredit = String(place.show_credit == null ? "" : place.show_credit).trim();
  const creditOn = rawCredit === "" ? true : parseBoolean(rawCredit);
  const showCredit = place.source === "community" && place.submitted_by_name && creditOn;

  // Share (#26): native share sheet where available, clipboard-copy
  // fallback (desktop) with a brief "¡Copiado!" confirmation.
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  const handleShare = async () => {
    const heading = place.neighborhood ? `${place.name} (${place.neighborhood})` : place.name;
    const text = `${heading} — recomendado en la app del Buenos Aires Program`;
    // Prefer an explicit Maps URL; otherwise build a Maps search from the address.
    let url = safeExternalUrl(place.maps_url) || "";
    if (!url && place.address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
    }
    const shareData = url ? { title: place.name, text, url } : { title: place.name, text };
    try {
      if (navigator.share) { await navigator.share(shareData); return; }
    } catch (e) {
      return; // user cancelled (AbortError) or the share failed — leave it be
    }
    // Fallback: copy text + link to the clipboard.
    try {
      await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Clipboard blocked (insecure context / permissions) — nothing to do.
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", background: meta.color, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={26} color={discGlyphColor(meta.color)} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue, lineHeight: 1.2 }}>{place.name}</span>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 2, margin: "-8px -6px -8px 0" }}>
              <span aria-live="polite" style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: "#2E7D32",
                opacity: copied ? 1 : 0, transition: "opacity 0.2s", whiteSpace: "nowrap",
              }}>{copied ? "¡Copiado! / Copied" : ""}</span>
              <button
                onClick={handleShare}
                className="bap-press"
                aria-label="Compartir / Share"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: 10, lineHeight: 0, color: copied ? "#2E7D32" : C.stone,
                }}
              >
                {copied
                  ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}
              </button>
              <button
                onClick={() => onToggleSave(place.place_id)}
                className="bap-press"
                aria-label={saved ? "Quitar de guardados / Remove from saved" : "Guardar / Save"}
                aria-pressed={saved}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: 10, fontSize: 19, lineHeight: 1,
                  color: saved ? C.pepOrange : C.stone,
                }}
              >{saved ? "♥" : "♡"}</button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, marginTop: 3, whiteSpace: "pre-line" }}>
            {distance && <span style={distCap}>{distance}<br /></span>}
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.8, color: C.mountain }}>
              {meta.label}{place.neighborhood ? ` · ${place.neighborhood}` : ""}
            </span><br />
            {place.why && <>{place.why}<br /></>}
            {place.address
              ? <span style={{ color: C.mountain }}><AddressLink address={place.address} mapsUrl={place.maps_url} /><br /></span>
              : (safeExternalUrl(place.maps_url) && (
                  <span style={{ color: C.mountain }}>
                    <a href={safeExternalUrl(place.maps_url)} target="_blank" rel="noopener noreferrer"
                      aria-label="Abrir en Maps / Open in Maps" title="Abrir en Maps / Open in Maps"
                      style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                      <MapPinGlyph size={16} color={C.ocean} />
                    </a><br />
                  </span>
                ))}
            {place.hours && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.mountain }}>{place.hours}<br /></span>}
            {showCredit && (
              <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12, color: C.mountain }}>
                Sugerido por {place.submitted_by_name} / Suggested by {place.submitted_by_name}
              </span>
            )}
          </div>
          <LinkButton url={place.link} />
        </div>
      </div>
    </Card>
  );
}

// ─── Place submission form (Local > Places, "+ Suggest a place") ───
// A fixed four-field BottomSheet — deliberately NOT the dynamic
// prompts machinery (the schema never varies). Name, category,
// "Maps link or address", and a one-line "why." On submit we split
// the location field: a value starting http(s) is treated as a Maps
// URL, anything else as a free-text address. The parent handles the
// network call + the confirmation toast; this component only owns
// the form state and the inline error.
function PlaceSubmitForm({ open, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [why, setWhy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reset every time the sheet opens so a fresh suggestion starts clean.
  useEffect(() => {
    if (open) {
      setName(""); setCategory(""); setLocation(""); setWhy("");
      setErrorMsg(""); setSubmitting(false);
    }
  }, [open]);

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: C.white, border: `1px solid ${C.fog}`, borderRadius: 10,
    padding: "12px 14px",
    fontFamily: "'Roboto', sans-serif", fontSize: 14, color: C.pepBlack,
    lineHeight: 1.4, outline: "none",
  };
  const labelStyle = {
    fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
    letterSpacing: 1.5, color: C.ocean, lineHeight: 1.2, marginBottom: 8,
    display: "flex", alignItems: "center", gap: 6,
  };
  const reqDot = (
    <span aria-label="Obligatorio / Required" title="Obligatorio / Required" style={{
      width: 6, height: 6, borderRadius: "50%", background: C.pepOrange, display: "inline-block",
    }} />
  );

  const handleSubmit = async () => {
    if (submitting) return;
    setErrorMsg("");
    // Client-side guard mirrors the server's validatePlaceSubmission so
    // the student gets instant feedback before the round-trip.
    if (!name.trim()) { setErrorMsg("Falta el nombre. / Name is required."); return; }
    if (!category) { setErrorMsg("Elegí una categoría. / Pick a category."); return; }
    if (!location.trim()) { setErrorMsg("Falta el link de Maps o la dirección. / Maps link or address is required."); return; }

    const loc = location.trim();
    const isUrl = /^https?:\/\//i.test(loc);
    const fields = {
      name: name.trim(),
      category,
      address: isUrl ? "" : loc,
      maps_url: isUrl ? loc : "",
      why: why.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(fields);   // parent closes the sheet + shows the toast
    } catch (err) {
      const code = err && err.code ? err.code : "";
      if (code === "validation_failed") {
        const d = String((err && err.details) || "");
        if (d === "missing_location") setErrorMsg("Falta el link de Maps o la dirección. / Maps link or address is required.");
        else if (d.startsWith("missing_field")) setErrorMsg("Faltan datos obligatorios. / Some required fields are missing.");
        else if (d.startsWith("bad_value")) setErrorMsg("Categoría inválida. / Invalid category.");
        else setErrorMsg("Hay datos inválidos. / The form has invalid data.");
      } else if (err && err.name === "AuthError") {
        setErrorMsg("Sesión expirada. Cerrá y volvé a abrir la app. / Session expired. Close and re-open the app.");
      } else if (err && err.name === "NoMatchError") {
        setErrorMsg("Tu usuario ya no es reconocido. / Your account isn't recognized.");
      } else if (code === "lock_failed") {
        setErrorMsg("La planilla está ocupada. Reintentá. / The sheet is busy. Please try again.");
      } else {
        setErrorMsg("No se pudo enviar. Reintentá. / Couldn't send. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} titleEs="Sugerir un lugar" titleEn="Suggest a place">
      <div style={{
        marginBottom: 18,
        fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 13,
        color: C.mountain, lineHeight: 1.45,
      }}>
        Compartí un lugar que te gustó. El equipo lo revisa antes de publicarlo. / Share a spot you
        liked. The team reviews it before it goes live.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Name */}
        <div>
          <div style={labelStyle}>Nombre / Name {reqDot}</div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Café Tortoni" style={inputStyle} maxLength={80} />
        </div>

        {/* Category — tappable cards from the canonical Places order */}
        <div>
          <div style={labelStyle}>Categoría / Category {reqDot}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PLACE_CATEGORY_ORDER.map((k) => {
              const meta = PLACE_CATEGORIES[k];
              const active = category === k;
              const Icon = meta.Icon;
              return (
                <button key={k} type="button" onClick={() => setCategory(k)} className="bap-press" style={{
                  display: "flex", alignItems: "center", gap: 8, textAlign: "left", cursor: "pointer",
                  padding: "10px 11px", borderRadius: 10,
                  border: active ? `1.5px solid ${meta.color}` : `1px solid ${C.fog}`,
                  background: active ? C.ice : C.white,
                }}>
                  <span style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: meta.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={15} color={discGlyphColor(meta.color)} />
                  </span>
                  <span style={{
                    fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 13.5,
                    color: active ? C.pepBlue : C.mountain, lineHeight: 1.1,
                  }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div>
          <div style={labelStyle}>Link de Maps o dirección / Maps link or address {reqDot}</div>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="maps.app.goo.gl/… o Av. de Mayo 825" style={inputStyle} />
          <div style={{
            marginTop: 5, fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12, color: C.mountain,
          }}>
            Pegá el link de Google Maps si lo tenés. / Paste a Google Maps link if you have one.
          </div>
        </div>

        {/* Why */}
        <div>
          <div style={labelStyle}>¿Por qué? / Why go?</div>
          <input type="text" value={why} onChange={(e) => setWhy(e.target.value)}
            placeholder="El mejor café con leche de San Telmo" style={inputStyle} maxLength={140} />
        </div>
      </div>

      {errorMsg && (
        <div style={{
          marginTop: 16, background: C.parchment, borderLeft: `3px solid ${C.pepOrange}`,
          borderRadius: 6, padding: "10px 12px",
          fontFamily: "'Roboto', sans-serif", fontSize: 12.5, color: C.pepBlack, lineHeight: 1.4,
        }}>{errorMsg}</div>
      )}

      <button type="button" onClick={handleSubmit} disabled={submitting} className="bap-press" style={{
        marginTop: 20, width: "100%", padding: "13px 0", borderRadius: 10,
        background: submitting ? C.stone : C.pepBlue, color: C.white,
        border: "none", cursor: submitting ? "wait" : "pointer",
        fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
      }}>
        {submitting ? "Enviando…" : "Enviar / Submit"}
      </button>
    </BottomSheet>
  );
}

// ─── Place confirmation toast ───
// A small fixed pill that slides up after a successful submission and
// auto-clears (the parent owns the timer). Sits above the bottom nav,
// below any open BottomSheet. Driven by a non-empty `message`.
function PlaceToast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", left: "50%", bottom: "calc(68px + var(--bap-nav-pad-bottom))", transform: "translateX(-50%)",
      zIndex: 210, width: "calc(100% - 32px)", maxWidth: 448,
      background: C.ice, borderLeft: `4px solid ${C.ocean}`, borderRadius: 10,
      boxShadow: "0 6px 22px rgba(29,37,45,0.18)",
      padding: "12px 16px",
      fontFamily: "'Roboto', sans-serif", fontSize: 13.5, color: C.pepBlack, lineHeight: 1.4,
    }}
      className="bap-toast-in"
      role="status" aria-live="polite"
    >
      {message}
    </div>
  );
}

// ─── Local ───
function LocalView({ data, initialSub, resetSignal, places = [], savedPlaces = [], onToggleSavePlace, onSubChange, onOpenSuggest, onRegisterBack }) {
  // The Local tab opens to the category hub (sub === null). Deep-links from
  // Today (the "This Week" events tile, the empty-state "Explorar BA" button)
  // pass an initialSub so they land straight on that listing; a normal
  // Local-nav tap leaves it null so the student sees the hub first.
  const [sub, setSub] = useState(initialSub || null);
  const [healthFilter, setHealthFilter] = useState("all");
  const [churchFilter, setChurchFilter] = useState("all");
  const [eventsFilter, setEventsFilter] = useState("all");
  // Places is two-level: null = the category-picker grid; "all" | <category key>
  // | "saved" = a chosen view showing that listing.
  const [placesFilter, setPlacesFilter] = useState(null);

  // Re-tapping the Local bottom-nav tab while already on Local bumps resetSignal
  // upstream; collapse all the way back to the category hub. We reset only when
  // the signal VALUE actually changes from what we last saw — not merely on the
  // effect's first run. Seeding the ref with the current resetSignal means the
  // mount run is a no-op (so a Today deep-link via initialSub survives), and it
  // stays a no-op under React StrictMode's double-invoke (a boolean "skip first
  // run" ref does not — the second invoke would fire the reset and wipe the
  // deep-link). On a genuine bump, value !== last, so the reset fires.
  const lastResetSignal = useRef(resetSignal);
  useEffect(() => {
    if (resetSignal === lastResetSignal.current) return;
    lastResetSignal.current = resetSignal;
    setSub(null);
    setPlacesFilter(null);
  }, [resetSignal]);

  // Free-text search across all approved places, shown on the Places hub
  // (the category grid). When non-empty it replaces the grid with a flat
  // list of matches across every category. Cleared whenever we leave the
  // grid (drill into a category) or leave the Places sub entirely, so it
  // never lingers behind a category listing.
  const [placesQuery, setPlacesQuery] = useState("");
  useEffect(() => { if (placesFilter !== null) setPlacesQuery(""); }, [placesFilter]);
  useEffect(() => { if (sub !== "places") setPlacesQuery(""); }, [sub]);

  // List ⇆ map toggle within a Places listing. Reset to "list" whenever the
  // chosen category changes (or we leave to the grid) so switching buckets
  // never strands the student on a stale map.
  const [placesView, setPlacesView] = useState("list");
  useEffect(() => { setPlacesView("list"); }, [placesFilter]);

  // The place whose detail card is open in a BottomSheet (set by tapping a map
  // pin). Reusing <PlaceCard> here gives a real, working save toggle.
  const [selectedMapPlace, setSelectedMapPlace] = useState(null);
  useEffect(() => { setSelectedMapPlace(null); }, [placesFilter, placesView]);

  // SPIKE: the map is online-only (tiles need network; we deliberately don't
  // SW-cache them). Track connectivity so the Map toggle can disable offline.
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Label for the chosen Places view (null on the grid), surfaced beside the
  // "Places" page header as a breadcrumb sub-header.
  const placesViewLabel = (sub === "places" && placesFilter !== null)
    ? (placesFilter === "all" ? "All"
        : placesFilter === "saved" ? "♥ Saved"
        : PLACE_CATEGORIES[placesFilter]?.label || "Places")
    : null;

  // Report the active sub (and the Places sub-header label) up to <App> so the
  // page header can read "Places · Café" while in that section. Other subs keep
  // "Local Resources".
  useEffect(() => { if (onSubChange) onSubChange(sub, placesViewLabel); }, [sub, placesViewLabel, onSubChange]);

  // Register a contextual "back" action so the App-level header chevron can
  // trigger it for every Local sub. From a Places listing it returns to the
  // category grid; from anywhere else (the Places grid, or any other sub) it
  // returns to the hub. Re-registers when sub/placesFilter change so the
  // closure stays fresh; the setters are stable so this is cheap.
  useEffect(() => {
    if (!onRegisterBack) return;
    onRegisterBack(() => {
      if (sub === "places" && placesFilter !== null) setPlacesFilter(null);
      else setSub(null);
    });
  }, [onRegisterBack, sub, placesFilter]);

  // "Cerca tuyo / Near you" distance sort. One geolocation permission is
  // requested on first tap and reused across all three sortable sub-tabs.
  const [nearMe, setNearMe] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle"); // idle | loading | granted | denied | unavailable

  const handleNearMe = async () => {
    if (nearMe) { setNearMe(false); return; }      // toggle off
    if (userLoc) { setNearMe(true); return; }       // already have a fix, just re-enable
    setGeoStatus("loading");
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setGeoStatus("granted");
      setNearMe(true);
    } catch (err) {
      setGeoStatus(err && err.reason === "denied" ? "denied" : "unavailable");
      setNearMe(false);
    }
  };

  // Extract unique types/denominations/categories
  const healthTypes = [...new Set(data.healthProviders.map((h) => h.type).filter(Boolean))].sort();
  const churchDenoms = [...new Set(data.churches.map((c) => c.denomination).filter(Boolean))].sort();
  const eventCategoriesPresent = [...new Set((data.events || []).map((e) => e.category).filter(Boolean))];

  // Filtered lists
  const filteredHealth = healthFilter === "all" ? data.healthProviders : data.healthProviders.filter((h) => h.type === healthFilter);
  const filteredChurches = churchFilter === "all" ? data.churches : data.churches.filter((c) => c.denomination === churchFilter);

  // Apply the distance sort when "Near you" is active and we have a fix.
  // Off-state ordering is left exactly as it was. (Places does its own
  // normalize-then-sort inline because its coords arrive as strings.)
  const displayHealth = nearMe && userLoc ? sortByDistance(filteredHealth, userLoc) : filteredHealth;
  const displayChurches = nearMe && userLoc ? sortByDistance(filteredChurches, userLoc) : filteredChurches;

  // Distance caption for a single row (null unless Near you is active, we
  // have a fix, and the row carries coordinates).
  const distanceCaption = (row) => {
    if (!nearMe || !userLoc || row.lat == null || row.lng == null) return null;
    return formatDistance(haversineKm(userLoc.lat, userLoc.lng, row.lat, row.lng));
  };

  // Show the toggle only on sub-tabs that have at least one located row, so
  // the feature stays invisible until coordinates are filled in the sheet.
  const anyCoords = (list) => list.some((x) => x.lat != null && x.lng != null);

  const distCap = { fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: C.ocean, fontWeight: 500 };

  // The "Near you" pill on its own; composed into nearMeControl for the
  // Health/Churches/Explore tabs, and into the Places view-toggle row so all
  // three pills (Lista / Mapa / Cerca) sit side-by-side on one line.
  const nearMeButton = (
    <button onClick={handleNearMe} className="bap-press" style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 13px", borderRadius: 14,
      border: nearMe ? `1.5px solid ${C.ocean}` : `1.5px solid ${C.fog}`,
      background: nearMe ? C.ice : C.white,
      color: nearMe ? C.ocean : C.stone,
      fontFamily: "'DM Mono', monospace", fontSize: 11.5, fontWeight: nearMe ? 500 : 400,
      cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>
      <MapPinGlyph size={13} color={nearMe ? C.ocean : C.stone} />
      {geoStatus === "loading" ? "Buscando…" : "Cerca / Near"}
    </button>
  );

  // Icon-only variant of the Near toggle, used only in the Places listing's
  // List / Map / Near control so all three sit as matching icon buttons. The
  // text "Cerca / Near" lives in aria-label + title. Other tabs keep nearMeButton.
  const nearMeIconLabel = geoStatus === "loading"
    ? "Buscando ubicación / Locating…"
    : "Cerca / Near — ordenar por distancia / sort by distance";
  const nearMeIconButton = (
    <button onClick={handleNearMe} className="bap-press" aria-label={nearMeIconLabel} aria-pressed={nearMe} title={nearMeIconLabel} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "6px 14px", minHeight: 34, borderRadius: 14,
      border: nearMe ? `1.5px solid ${C.ocean}` : `1.5px solid ${C.fog}`,
      background: nearMe ? C.ice : C.white,
      cursor: "pointer", transition: "all 0.2s",
    }}>
      <NavArrowIcon size={17} color={nearMe ? C.ocean : C.stone} />
    </button>
  );

  const nearMeNote = (geoStatus === "denied" || geoStatus === "unavailable") ? (
    <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12, color: C.mountain }}>
      {geoStatus === "denied"
        ? "No pudimos acceder a tu ubicación / Couldn't get your location"
        : "Ubicación no disponible / Location unavailable"}
    </span>
  ) : null;

  const nearMeControl = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
      {nearMeButton}
      {nearMeNote}
    </div>
  );

  // Badge style
  const badge = { fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12, whiteSpace: "nowrap", flexShrink: 0 };

  // Hub: the Local tab opens to a menu of five category buttons. Tapping one
  // sets `sub` and drills into that listing; the back header returns here. No
  // listing is previewed on the hub itself.
  if (sub == null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {LOCAL_SECTIONS.map((s) => {
          const Icon = s.Icon;
          return (
            <button key={s.key} onClick={() => setSub(s.key)} className="bap-press" style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
              cursor: "pointer", background: C.white, border: `1px solid ${C.fog}`,
              borderLeft: `4px solid ${s.accent}`, borderRadius: 12, padding: "14px 16px",
            }}>
              <span style={{
                flexShrink: 0, width: 46, height: 46, borderRadius: 12, background: C.ice,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon color={s.accent} size={28} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 17, color: C.pepBlue }}>{s.en}</span>
                <span style={{ display: "block", fontFamily: "'Roboto', sans-serif", fontSize: 12.5, color: C.mountain, marginTop: 1 }}>{s.es}</span>
              </span>
              <span aria-hidden="true" style={{ flexShrink: 0, color: C.mountain, fontSize: 18 }}>→</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* No in-listing back rows anywhere in Local: every sub's back action
          lives as a chevron in the page header (← next to the section title),
          freeing this space for content. Places' two-level nav (hub ⇆ grid ⇆
          listing) is handled by the same header chevron via the contextual
          back registration above. */}

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
          {anyCoords(data.healthProviders) && nearMeControl}
          {healthTypes.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              <FilterPill active={healthFilter === "all"} onClick={() => setHealthFilter("all")}>All</FilterPill>
              {healthTypes.map((t) => (
                <FilterPill key={t} active={healthFilter === t} onClick={() => setHealthFilter(t)}>{t}</FilterPill>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayHealth.map((h, i) => {
              const facility = isFacility(h);
              const cap = distanceCaption(h);
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
                  {cap && <span style={distCap}>{cap}<br /></span>}
                  {h.address && <><AddressLink address={h.address} /><br /></>}
                  {h.location_note && <><LocationNote note={h.location_note} /><br /></>}
                  {h.phone && <>{h.phone}<br /></>}
                  {h.notes && <span style={{ color: C.mountain, fontStyle: "italic" }}>{h.notes}</span>}
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
          {anyCoords(data.churches) && nearMeControl}
          {churchDenoms.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              <FilterPill active={churchFilter === "all"} onClick={() => setChurchFilter("all")}>All</FilterPill>
              {churchDenoms.map((d) => (
                <FilterPill key={d} active={churchFilter === d} onClick={() => setChurchFilter(d)}>{d}</FilterPill>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayChurches.map((ch, i) => {
              const cap = distanceCaption(ch);
              return (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{ch.name}</span>
                  {ch.denomination && <span style={badge}>{ch.denomination}</span>}
                </div>
                <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {cap && <span style={distCap}>{cap}<br /></span>}
                  {ch.address && <><AddressLink address={ch.address} /><br /></>}
                  {ch.location_note && <><LocationNote note={ch.location_note} /><br /></>}
                  {ch.service && <>{ch.service}<br /></>}
                  {ch.notes && <span style={{ color: C.mountain, fontStyle: "italic" }}>{ch.notes}</span>}
                </div>
                <LinkButton url={ch.link} />
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {sub === "places" && (() => {
        // Auth-script rows arrive header-keyed with string coords; normalize
        // to numbers-or-null so the distance helpers behave, and lower-case
        // the category for matching.
        const allPlaces = (places || []).map((p) => ({
          ...p,
          lat: parseCoord(p.lat),
          lng: parseCoord(p.lng),
          _cat: String(p.category || "").trim().toLowerCase(),
        }));
        const savedSet = new Set(savedPlaces);

        // ── Level 1: category-picker grid (placesFilter === null) ──
        // Shows All first, then every category (sightseeing-led order), plus a
        // ♥ Saved tile once the student has saved anything. Two columns; each
        // tile is a glyph in its category color with the label beneath.
        if (placesFilter === null) {
          const savedCount = allPlaces.filter((p) => savedSet.has(p.place_id)).length;
          const pq = placesQuery.trim().toLowerCase();

          // Search results replace the grid while there's a query. Matches
          // name / why / neighborhood / category label across every category.
          if (pq) {
            const results = allPlaces.filter((p) => {
              const hay = `${p.name || ""} ${p.why || ""} ${p.neighborhood || ""} ${getPlaceCategory(p._cat).label}`.toLowerCase();
              return hay.includes(pq);
            });
            return (
              <div>
                <SearchInput
                  value={placesQuery}
                  onChange={setPlacesQuery}
                  placeholder="Buscar lugares… / Search places…"
                  ariaLabel="Buscar lugares / Search places"
                />
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain, padding: "0 2px 8px" }}>
                  {results.length === 0
                    ? "Sin resultados / No results"
                    : `${results.length} resultado${results.length === 1 ? "" : "s"} / result${results.length === 1 ? "" : "s"}`}
                </div>
                {results.length === 0 ? (
                  <Card>
                    <div style={{ textAlign: "center", padding: "12px 4px", fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 15, color: C.mountain }}>
                      Probá con otra palabra. / Try another word.
                    </div>
                  </Card>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {results.map((p, i) => (
                      <PlaceCard
                        key={p.place_id || i}
                        place={p}
                        saved={savedSet.has(p.place_id)}
                        onToggleSave={onToggleSavePlace}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // "All" and "♥ Saved" are the two meta-views; they lead the grid,
          // then the twelve real categories follow. Saved is always shown
          // (even with nothing saved yet) so it reads as a permanent place
          // to find favorites; tapping it empty shows the "no saved places"
          // state, consistent with how empty category tiles behave. The Saved
          // tile shows its count once the student has saved anything (#26).
          const tiles = [
            { key: "all", label: "All", color: C.pepBlue, Icon: AppGridIcon },
            { key: "saved", label: savedCount > 0 ? `Saved · ${savedCount}` : "Saved", color: C.pepOrange, Icon: null },
            ...PLACE_CATEGORY_ORDER.map((k) => ({
              key: k, label: PLACE_CATEGORIES[k].label,
              color: PLACE_CATEGORIES[k].color, Icon: PLACE_CATEGORIES[k].Icon,
            })),
          ];
          return (
            <div>
              {/* Back to the hub is the header chevron (← Places). */}
              <SearchInput
                value={placesQuery}
                onChange={setPlacesQuery}
                placeholder="Buscar lugares… / Search places…"
                ariaLabel="Buscar lugares / Search places"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {tiles.map((t) => {
                  const Icon = t.Icon;
                  return (
                    <button key={t.key} onClick={() => setPlacesFilter(t.key)} className="bap-press" style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 9, padding: "18px 10px", minHeight: 104, cursor: "pointer",
                      background: C.white, border: `1px solid ${C.fog}`, borderRadius: 14,
                    }}>
                      <span style={{
                        width: 52, height: 52, borderRadius: "50%", background: t.color, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {Icon
                          ? <Icon size={28} color={discGlyphColor(t.color)} />
                          : <span style={{ fontSize: 24, color: discGlyphColor(t.color), lineHeight: 1 }}>♥</span>}
                      </span>
                      <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14.5, color: C.pepBlue, textAlign: "center", lineHeight: 1.15 }}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        // ── Level 2: the chosen category's listing ──
        let list = allPlaces;
        if (placesFilter === "saved") list = allPlaces.filter((p) => savedSet.has(p.place_id));
        else if (placesFilter !== "all") list = allPlaces.filter((p) => p._cat === placesFilter);

        const display = nearMe && userLoc ? sortByDistance(list, userLoc) : list;

        // Map view is always offered (Casa Holden anchors it even when a
        // listing has no located rows yet); it's online-only, so the toggle
        // disables — and the map falls back to the list — when offline.
        const showMap = placesView === "map" && online;
        const mapPlaces = display
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => {
            const meta = getPlaceCategory(p._cat);
            return { ...p, _color: meta.color, _catLabel: meta.label, _Icon: meta.Icon, _glyphInk: discGlyphColor(meta.color) };
          });

        // The "Near you" pill joins the list/map toggle on one line (list view
        // only — the map already centres on the located fix).
        const showNearMe = !showMap && anyCoords(allPlaces);
        // Icon-only toggles (2026-06-10m): a bulleted-list glyph for List, a
        // folded-map glyph for Map, and (appended) a navigation-arrow glyph for
        // Near. Labels live in aria-label/title so the row stays wordless.
        const viewToggle = (
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { key: "list", Icon: ListViewIcon, aria: "Lista / List view", enabled: true },
              { key: "map", Icon: MapViewIcon, aria: "Mapa / Map view", enabled: online },
            ].map((opt) => {
              const active = (opt.key === "map" ? showMap : !showMap);
              const iconColor = !opt.enabled ? C.fog : active ? C.ocean : C.stone;
              return (
                <button
                  key={opt.key}
                  onClick={() => opt.enabled && setPlacesView(opt.key)}
                  className="bap-press"
                  disabled={!opt.enabled}
                  aria-label={opt.aria}
                  aria-pressed={active}
                  title={!opt.enabled ? "Necesitás conexión / Needs connection" : opt.aria}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: "6px 14px", minHeight: 34, borderRadius: 14,
                    border: active ? `1.5px solid ${C.ocean}` : `1.5px solid ${C.fog}`,
                    background: active ? C.ice : C.white,
                    cursor: opt.enabled ? "pointer" : "not-allowed", transition: "all 0.2s",
                  }}
                ><opt.Icon size={17} color={iconColor} /></button>
              );
            })}
            {showNearMe && nearMeIconButton}
          </div>
        );

        return (
          <div>
            {/* No in-listing back row: the back chevron lives in the page
                header ("‹ Places · Café"), freeing this space for places. */}
            {viewToggle}
            {showNearMe && nearMeNote}
            {placesView === "map" && !online && (
              <div style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 13, color: C.mountain, marginBottom: 10 }}>
                El mapa necesita conexión. / The map needs a connection.
              </div>
            )}
            {showMap ? (
              <MapErrorBoundary>
                <Suspense fallback={
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.mountain }}>
                    Cargando mapa…
                  </div>
                }>
                  <PlacesMap
                    places={mapPlaces}
                    userLoc={nearMe ? userLoc : null}
                    campus={CAMPUS_ANCHOR}
                    onSelectPlace={(p) => setSelectedMapPlace(p)}
                  />
                </Suspense>
              </MapErrorBoundary>
            ) : (<>
            {display.length === 0 ? (
              <Card>
                <div style={{ textAlign: "center", padding: "12px 4px", fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 15, color: C.mountain }}>
                  {placesFilter === "saved"
                    ? "Todavía no guardaste ningún lugar. / No saved places yet."
                    : "Todavía no hay lugares acá. / Nothing here yet."}
                </div>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {display.map((p, i) => (
                  <PlaceCard
                    key={p.place_id || i}
                    place={p}
                    saved={savedSet.has(p.place_id)}
                    onToggleSave={onToggleSavePlace}
                    distance={distanceCaption(p)}
                  />
                ))}
              </div>
            )}
            </>)}
          </div>
        );
      })()}

      {/* "+ Suggest a place" floating action button. Pinned bottom-right
          within the 480-px column, floating over both the category grid
          and any listing. zIndex sits below the BottomSheet/modals so an
          open form covers it. */}
      {sub === "places" && onOpenSuggest && (
        <button
          type="button"
          onClick={onOpenSuggest}
          className="bap-press"
          aria-label="Sugerir un lugar / Suggest a place"
          style={{
            position: "fixed", bottom: "calc(74px + var(--bap-nav-pad-bottom))", zIndex: 90,
            right: "max(20px, calc(50% - 240px + 20px))",
            width: 56, height: 56, borderRadius: 28,
            background: C.pepBlue, color: C.white, border: "none", cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,32,91,0.32)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, lineHeight: 1, paddingBottom: 3,
          }}
        >
          +
        </button>
      )}

      {/* Place detail, opened by tapping a pin on the Places map. Reuses
          <PlaceCard> so the save toggle works exactly as it does in the list;
          `saved` reads live from the savedPlaces prop so toggling updates here
          and on the map's underlying list together. */}
      <BottomSheet
        open={!!selectedMapPlace}
        onClose={() => setSelectedMapPlace(null)}
        titleEn={selectedMapPlace ? getPlaceCategory(selectedMapPlace.category).label : "Place"}
        titleEs={selectedMapPlace ? getPlaceCategory(selectedMapPlace.category).es : "Lugar"}
      >
        {selectedMapPlace && (
          <PlaceCard
            place={selectedMapPlace}
            saved={savedPlaces.includes(selectedMapPlace.place_id)}
            onToggleSave={onToggleSavePlace}
            distance={distanceCaption(selectedMapPlace)}
          />
        )}
      </BottomSheet>
    </div>
  );
}

// ─── FAQ ───
// ─── Reusable search input ───
// A bordered text field with a magnifier glyph and a clear × that
// appears once there's text. Used by FAQ search and Places search.
function SearchInput({ value, onChange, placeholder, ariaLabel }) {
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <span aria-hidden="true" style={{
        position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
        fontSize: 14, color: C.stone, pointerEvents: "none",
      }}>🔍</span>
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          background: C.white, border: `1px solid ${C.fog}`, borderRadius: 10,
          padding: "11px 38px 11px 38px",
          fontFamily: "'Roboto', sans-serif", fontSize: 14, color: C.pepBlack,
          outline: "none",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar búsqueda / Clear search"
          className="bap-press"
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            width: 26, height: 26, borderRadius: "50%", border: "none",
            background: C.ice, color: C.mountain, cursor: "pointer",
            fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>
      )}
    </div>
  );
}

function FaqView({ data }) {
  const [open, setOpen] = useState(null);
  const [query, setQuery] = useState("");
  const reduced = useReducedMotion();

  // Filter on title + content, case-insensitive. Original index is kept
  // as the stable key for `open` so filtering doesn't reshuffle which
  // card is expanded.
  const q = query.trim().toLowerCase();
  const rows = (data.faq || []).map((p, i) => ({ p, i }));
  const filtered = q
    ? rows.filter(({ p }) =>
        `${p.title || ""} ${p.content || ""}`.toLowerCase().includes(q))
    : rows;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar… / Search…"
        ariaLabel="Buscar preguntas / Search FAQ"
      />
      {q && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain, padding: "2px 2px 8px" }}>
          {filtered.length === 0
            ? "Sin resultados / No results"
            : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} / result${filtered.length === 1 ? "" : "s"}`}
        </div>
      )}
      {filtered.map(({ p, i }) => (
        <div key={i} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.fog}`, overflow: "hidden" }}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="bap-press" style={{
            width: "100%", padding: "14px 16px", border: "none", background: "transparent",
            display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
            fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue, textAlign: "left",
          }}>
            {p.title}
            <span aria-hidden="true" style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: reduced ? "none" : "transform 0.2s", fontSize: 12, color: C.mountain }}>▼</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 16px 14px", fontSize: 14, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {p.content}
              {safeExternalUrl(p.link) && (
                <a href={safeExternalUrl(p.link)} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", gap: 5, marginTop: 10, width: "fit-content",
                  fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.pepOrange,
                  textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                  background: "#FFF4ED", border: `1px solid #FFD8C2`, cursor: "pointer",
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
// Renders a contact action as an icon-first pill. `Glyph` is one of the link/
// action glyph components; `label` is the bilingual accessible name (always set
// as aria-label + title since the button is otherwise wordless). `value` is
// optional visible text — used where the data itself is worth showing (an
// emergency phone NUMBER, the office EMAIL) rather than hidden behind the glyph.
function ActionBtn({ href, Glyph, label, value, variant }) {
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
  const hasValue = value != null && value !== "";
  return (
    <a href={safe} target={variant === "maps" || variant === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer"
      aria-label={label} title={label} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      fontFamily: "'DM Mono', monospace", fontSize: 12, color: s.color,
      textDecoration: "none", padding: hasValue ? "9px 12px" : "10px",
      minWidth: 40, minHeight: 40, borderRadius: 10,
      background: s.bg, border: `1px solid ${s.border}`, cursor: "pointer",
    }}>
      {Glyph && <Glyph size={18} color={s.color} />}
      {hasValue && <span>{value}</span>}
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
      {/* Emergency — pinned to the top: it's the most time-critical card. */}
      {emergency.length > 0 && (
        <>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.mountain, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Emergency</div>
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
                {/* Emergency keeps the dialable NUMBER visible beside the phone glyph. */}
                {e.phone && <ActionBtn href={`tel:${e.phone.replace(/[\s.]/g, "")}`} Glyph={PhoneGlyph} label="Llamar / Call" value={e.phone} variant="emergency" />}
                {e.whatsapp && <ActionBtn href={e.whatsapp} Glyph={WhatsAppGlyph} label="WhatsApp" variant="whatsapp" />}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Program Office */}
      {office.map((o, i) => (
        <Card key={`office-${i}`}>
          <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 17, color: C.pepBlue, marginBottom: 4 }}>{o.name}</div>
          {o.address && <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", marginBottom: 8 }}><AddressLink address={o.address} mapsUrl={o.maps} /></div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {o.phone && <ActionBtn href={`tel:${o.phone.replace(/[\s.]/g, "")}`} Glyph={PhoneGlyph} label="Llamar / Call" variant="phone" />}
            {o.maps && <ActionBtn href={o.maps} Glyph={MapPinGlyph} label="Abrir en Maps / Open in Maps" variant="maps" />}
            {/* Office keeps the EMAIL address visible beside the envelope glyph. */}
            {o.email && <ActionBtn href={`mailto:${o.email}`} Glyph={EnvelopeGlyph} label="Correo / Email" value={o.email} variant="email" />}
          </div>
        </Card>
      ))}

      {/* Staff */}
      {staff.length > 0 && (
        <>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.mountain, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Staff</div>
          {staff.map((s, i) => (
            <Card key={`staff-${i}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{s.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: C.ice, color: C.ocean, padding: "2px 10px", borderRadius: 12 }}>{s.role}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {s.phone && <ActionBtn href={`tel:${s.phone.replace(/[\s.]/g, "")}`} Glyph={PhoneGlyph} label="Llamar / Call" variant="phone" />}
                {s.whatsapp && <ActionBtn href={s.whatsapp} Glyph={WhatsAppGlyph} label="WhatsApp" variant="whatsapp" />}
                {s.email && <ActionBtn href={`mailto:${s.email}`} Glyph={EnvelopeGlyph} label="Correo / Email" variant="email" />}
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Local Emergency Numbers */}
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.mountain, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Local Emergency Numbers</div>
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
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.mountain, paddingBottom: 4, borderBottom: `1px solid ${C.fog}` }}>Additional Resources</div>
          {data.resources.map((r, i) => (
            <Card key={`res-${i}`}>
              <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue, marginBottom: 2 }}>{r.name}</div>
              {r.detail && <div style={{ fontSize: 13, color: C.mountain, fontFamily: "'Roboto', sans-serif", marginBottom: 8, whiteSpace: "pre-line" }}>{r.detail}</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {r.phone && <ActionBtn href={`tel:${r.phone.replace(/[\s\-().]/g, "")}`} Glyph={PhoneGlyph} label="Llamar / Call" value={r.phone} variant="phone" />}
                {r.url && <ActionBtn href={r.url} Glyph={GlobeGlyph} label="Sitio web / Website" variant="maps" />}
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
  // On Profile, drop entries that have nothing to show (hidden):
  // an unanswered prompt that has already closed is just noise here.
  // Locked-with-response prompts stay visible permanently (t-shirt
  // size after the cutoff is the canonical case).
  const profilePrompts = filterPromptsBySurface(prompts, "profile")
    .filter((p) => isPromptReadonly(p) ? hasAnyResponse(p) : true);
  if (profilePrompts.length === 0) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 1.5, color: C.mountain, marginBottom: 8,
      }}>About you / Tu información</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {profilePrompts.map((p) => {
          const locked = isPromptReadonly(p);
          const pending = !locked && isPromptPending(p);
          const submitted = !!p.submitted_at;
          let cta;
          if (locked) cta = "Ver →";
          else if (submitted) cta = pending ? "Completar →" : "Editar →";
          else cta = "Responder →";
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
          const cutoff = locked ? null : formatPromptCutoff(p);
          const stripeColor = locked ? C.ocean : (pending ? C.pepOrange : C.ocean);
          const ctaColor = locked ? C.mountain : (pending ? C.pepOrange : C.ocean);
          const bg = locked ? C.ice : C.white;

          return (
            <button
              key={p.prompt_id}
              type="button"
              onClick={() => onOpenPrompt(p)}
              className="bap-press"
              style={{
                display: "flex", alignItems: "stretch", textAlign: "left",
                background: bg,
                border: `1px solid ${C.fog}`,
                borderRadius: 10, padding: 0, cursor: "pointer", width: "100%",
              }}
            >
              <div style={{ width: 4, background: stripeColor, flexShrink: 0 }} />
              <div style={{
                flex: 1, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
                minWidth: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14.5,
                    color: C.pepBlack, lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {locked && <LockGlyph size={12} color={C.mountain} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title_es || p.title_en}
                    </span>
                  </div>
                  {preview ? (
                    <div style={{
                      fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.mountain,
                      marginTop: 2, lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{preview}</div>
                  ) : (
                    <div style={{
                      fontFamily: "'Roboto', sans-serif", fontStyle: "italic", fontSize: 12,
                      color: C.mountain, marginTop: 2, lineHeight: 1.3,
                    }}>Sin respuesta / No answer yet</div>
                  )}
                  {cutoff && (
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.mountain,
                      lineHeight: 1.3, marginTop: 3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{cutoff.es}</div>
                  )}
                </div>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: ctaColor,
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
function ProfileModal({ open, onClose, profile, onChange, classes, currentUser, onSignOut, prompts, onOpenPrompt, onOpenDirector, onOpenPlacesAdmin }) {
  // Hooks must run before the early return below. cardRef + useDialogA11y
  // give the modal role="dialog" focus-trap/Escape/focus-return; pendingConfirm
  // drives the in-app ConfirmDialog that replaced the native window.confirm.
  const cardRef = useRef(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const reduced = useReducedMotion();
  useDialogA11y(cardRef, { open, onClose });
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
  const clearAll = () => setPendingConfirm("reset");
  const handleSignOutClick = () => setPendingConfirm("signout");

  // Runs the action the student confirmed in the ConfirmDialog, then
  // dismisses it. Sign-out tears down this whole modal underneath the
  // confirm, which is fine — the focus-return no-ops on the unmounted node.
  const runPendingConfirm = () => {
    const action = pendingConfirm;
    setPendingConfirm(null);
    if (action === "reset") {
      onChange({
        ...profile,
        enrolledClasses: [],
        filterEnabled: false,
        dismissedAnnouncements: [],
      });
    } else if (action === "signout") {
      if (typeof onSignOut === "function") onSignOut();
    }
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
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Tu perfil / Your profile"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.parchment, width: "100%", maxWidth: 480,
          margin: "0 auto", display: "flex", flexDirection: "column",
          maxHeight: "100vh", outline: "none",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "max(16px, var(--safe-top)) 20px 16px",
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
            aria-label="Cerrar / Close"
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
                letterSpacing: 1.5, color: C.mountain, marginBottom: 6,
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
                fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain, marginTop: 4,
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
              {typeof onOpenDirector === "function" && (
                <button
                  onClick={onOpenDirector}
                  className="bap-press"
                  style={{
                    marginTop: 12, marginRight: 8,
                    background: C.ocean, border: `1px solid ${C.ocean}`, borderRadius: 8,
                    padding: "8px 14px", cursor: "pointer",
                    fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.white, letterSpacing: 0.5,
                  }}
                >
                  Ver respuestas&nbsp;/&nbsp;View responses
                </button>
              )}
              {typeof onOpenPlacesAdmin === "function" && (
                <button
                  onClick={onOpenPlacesAdmin}
                  className="bap-press"
                  style={{
                    marginTop: 12, marginRight: 8,
                    background: C.ocean, border: `1px solid ${C.ocean}`, borderRadius: 8,
                    padding: "8px 14px", cursor: "pointer",
                    fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.white, letterSpacing: 0.5,
                  }}
                >
                  Revisar lugares&nbsp;/&nbsp;Review places
                </button>
              )}
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
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: C.mountain, marginTop: 2 }}>
                Filters Today and Schedule to the courses you tick below.
              </div>
            </div>
            <button
              onClick={toggleFilter}
              aria-pressed={!!profile.filterEnabled}
              aria-label="Mostrar solo mis clases / Toggle My classes only"
              className="bap-press"
              style={{
                width: 48, height: 28, borderRadius: 14,
                background: profile.filterEnabled ? C.ocean : C.fog,
                border: "none", cursor: "pointer", position: "relative",
                transition: reduced ? "none" : "background 0.18s ease-out", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: profile.filterEnabled ? 23 : 3,
                width: 22, height: 22, borderRadius: "50%", background: C.white,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: reduced ? "none" : "left 0.18s ease-out",
              }} />
            </button>
          </div>

          {/* Class checklist */}
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.mountain, marginBottom: 8,
          }}>My courses</div>

          {sortedClasses.length === 0 ? (
            <div style={{
              fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain,
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
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.mountain,
            }}
          >Reset profile</button>

          <div style={{
            fontFamily: "'Roboto', sans-serif", fontSize: 11, color: C.mountain,
            marginTop: 18, lineHeight: 1.5, textAlign: "center",
          }}>
            Saved on this device only. Changes apply immediately.
          </div>
        </div>

        {/* Modal footer */}
        <div style={{
          padding: "12px 16px calc(2px + var(--bap-nav-pad-bottom))", background: C.white, borderTop: `1px solid ${C.fog}`,
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

      <ConfirmDialog
        open={!!pendingConfirm}
        onConfirm={runPendingConfirm}
        onCancel={() => setPendingConfirm(null)}
        titleEs={pendingConfirm === "signout" ? "¿Cerrar sesión?" : "¿Borrar tu perfil?"}
        titleEn={pendingConfirm === "signout" ? "Sign out?" : "Reset your profile?"}
        bodyEs={pendingConfirm === "signout"
          ? "Vas a tener que ingresar tu CWID y cumpleaños de nuevo."
          : "Esto borra las clases marcadas y la configuración."}
        bodyEn={pendingConfirm === "signout"
          ? "You'll need to enter your CWID and birthday again."
          : "This clears your selected classes and settings."}
        confirmEs={pendingConfirm === "signout" ? "Cerrar sesión" : "Borrar"}
        confirmEn={pendingConfirm === "signout" ? "Sign out" : "Reset"}
      />
    </div>
  );
}

// ============================================================
// DIRECTOR RESPONSE DASHBOARD
// ============================================================
// Director-only surface for reading every prompt's submissions
// across the cohort. Reached via a "Ver respuestas / View
// responses" button inside <ProfileModal> that only renders when
// isStaff(currentUser) — strict staff-only, faculty are excluded
// (visiting professors shouldn't read other students' RSVP /
// dietary / size submissions). The data comes from a separate
// auth-script endpoint (?action=admin_responses) that re-validates
// identity and role on every call, so the gate is enforced on the
// server side too — hiding the button on the client is just UX.
//
// Two internal screens stacked behind one open/close prop:
//   1. List view (selectedPromptId === null) — all prompts with
//      response counts and an Active/Closed pill. Active prompts
//      sit above closed ones; within each band, recently-edited
//      prompts surface first by simple date ordering.
//   2. Detail view — per-field breakdown for one prompt, with
//      per-option tallies on select fields, individual responses
//      grouped by responder, and a non-responder list pulled from
//      expected_cwids minus actual responders.
//
// All names render preferred-or-first plus last initial to match the
// rest of the app's first-names-only default; full names are
// available in the spreadsheet for any deeper drill-down.

// ─── Helpers ───

// Bilingual title pair with sensible fallbacks. Mirrors the
// patterns in PromptForm / PromptCard.
function directorPromptTitle(p) {
  return p.title_es || p.title_en || p.prompt_id;
}
function directorPromptTitleAlt(p) {
  if (p.title_es && p.title_en && p.title_es !== p.title_en) return p.title_en;
  return "";
}
function directorPromptDescription(p) {
  return p.description_es || p.description_en || "";
}
function directorFieldLabel(f) {
  return f.label_es || f.label_en || f.field_id;
}

// Display name for a responder. Falls back through the curated
// roster columns; if nothing populated, shows the CWID.
function directorResponderName(rosterEntry, cwid) {
  if (!rosterEntry) return cwid || "—";
  const first = rosterEntry.preferred_name || rosterEntry.first_name || "";
  const last = rosterEntry.last_name || "";
  if (first && last) return `${first} ${last.charAt(0)}.`;
  if (first) return first;
  if (last) return last;
  return cwid || "—";
}

// Active prompts above closed ones; within each band, most recent
// end_date first so the freshest live data leads. Prompts with no
// end_date (evergreen profile prompts like t-shirt size) sort last
// inside the active band — those don't have a deadline, so they're
// less time-sensitive than something with a close date next week.
function sortDirectorPrompts(prompts) {
  const list = [...(prompts || [])];
  list.sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    // Within the same band, descending by end_date (blanks last).
    const ae = a.end_date || "";
    const be = b.end_date || "";
    if (!ae && !be) return (a.prompt_id || "").localeCompare(b.prompt_id || "");
    if (!ae) return 1;
    if (!be) return -1;
    return be.localeCompare(ae);
  });
  return list;
}

// Group a prompt's response rows by cwid → field_id → value.
function groupResponsesByCwid(responses) {
  const out = {};
  (responses || []).forEach((r) => {
    if (!r || !r.cwid) return;
    if (!out[r.cwid]) out[r.cwid] = {};
    out[r.cwid][r.field_id] = r.value;
  });
  return out;
}

// Set of cwids that have at least one stored value for this prompt.
// Used both for the "X of Y responded" count and for splitting the
// expected audience into responders vs non-responders.
function respondedCwidSet(responses) {
  const s = new Set();
  (responses || []).forEach((r) => { if (r && r.cwid) s.add(r.cwid); });
  return s;
}

// For a select field, count how many submissions chose each
// option. multi_select values are stored semicolon-joined so we
// split before counting. Returns an array of { value, label, count }
// preserving the field's declared option order, with any "other"
// values (submissions that don't match a declared option) appended
// at the end. The bilingual label picks Spanish first then English
// to match the field's option_labels arrays.
function tallySelectField(field, responses) {
  const isMulti = field.field_type === "multi_select";
  const values = (responses || [])
    .filter((r) => r.field_id === field.field_id && r.value != null && r.value !== "")
    .flatMap((r) => isMulti
      ? String(r.value).split(";").map((v) => v.trim()).filter(Boolean)
      : [String(r.value).trim()]
    );
  const counts = {};
  values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });

  const declared = (field.options || []).map((opt, i) => {
    const lab = (field.option_labels_es && field.option_labels_es[i])
      || (field.option_labels_en && field.option_labels_en[i])
      || opt;
    return { value: opt, label: lab, count: counts[opt] || 0 };
  });
  const declaredSet = new Set((field.options || []).map((o) => o));
  const extras = Object.keys(counts)
    .filter((v) => !declaredSet.has(v))
    .map((v) => ({ value: v, label: v, count: counts[v] }));
  return declared.concat(extras);
}

// ─── DirectorResponsesView ───

function DirectorResponsesView({ open, onClose, loading, error, payload, onRefresh }) {
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const cardRef = useRef(null);
  useDialogA11y(cardRef, { open, onClose });

  // When the modal opens, reset the drilldown so we always land on
  // the list. Closing and reopening the modal feels like "starting
  // over"; remembering the previously-selected prompt would be a
  // small surprise.
  useEffect(() => {
    if (!open) setSelectedPromptId(null);
  }, [open]);

  if (!open) return null;

  const prompts = (payload && payload.prompts) || [];
  const roster = (payload && payload.roster) || {};
  const selectedPrompt = selectedPromptId
    ? prompts.find((p) => p.prompt_id === selectedPromptId)
    : null;
  const sorted = sortDirectorPrompts(prompts);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(29, 37, 45, 0.55)",
        zIndex: 220, display: "flex", justifyContent: "center", alignItems: "stretch",
        padding: 0,
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Respuestas / Responses"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.parchment, width: "100%", maxWidth: 480,
          margin: "0 auto", display: "flex", flexDirection: "column",
          maxHeight: "100vh", outline: "none",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "max(16px, var(--safe-top)) 20px 16px",
          background: `linear-gradient(135deg, ${C.pepBlue} 0%, ${C.ocean} 100%)`,
          color: C.white, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {selectedPrompt && (
              <button
                onClick={() => setSelectedPromptId(null)}
                aria-label="Volver / Back to prompt list"
                className="bap-press"
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none", color: C.white,
                  width: 32, height: 32, borderRadius: 16, cursor: "pointer",
                  fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >‹</button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase",
                letterSpacing: 2, color: C.bapBlue, marginBottom: 2,
              }}>
                Director · Solo personal
              </div>
              <div style={{
                fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 700,
                letterSpacing: -0.3, lineHeight: 1.1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {selectedPrompt ? directorPromptTitle(selectedPrompt) : "Respuestas"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar / Close"
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", color: C.white,
              width: 36, height: 36, borderRadius: 18, cursor: "pointer",
              fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
          {/* Loading / error states pinned to the top of the body.
              They sit above whatever cached content we already have
              so the Director still sees yesterday's data while a
              refresh is in flight. */}
          {loading && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: C.ice, border: `1px solid ${C.fog}`,
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div className="bap-spin" style={{
                width: 14, height: 14, borderRadius: "50%",
                border: `2px solid ${C.fog}`, borderTopColor: C.ocean,
              }} />
              Cargando&nbsp;/&nbsp;Loading…
            </div>
          )}
          {error && !loading && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: "#FFF3E0", borderLeft: `3px solid ${C.pepOrange}`,
              fontFamily: "'Roboto', sans-serif", fontSize: 12.5, color: C.pepBlack,
            }}>
              {error}
            </div>
          )}

          {selectedPrompt
            ? <DirectorPromptDetail prompt={selectedPrompt} roster={roster} />
            : <DirectorPromptList prompts={sorted} roster={roster}
                onSelect={setSelectedPromptId} loading={loading} error={error} />}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 16px calc(2px + var(--bap-nav-pad-bottom))", background: C.white, borderTop: `1px solid ${C.fog}`,
          display: "flex", gap: 10,
        }}>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="bap-press"
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10,
              background: C.white, color: C.ocean,
              border: `1px solid ${C.fog}`, cursor: loading ? "wait" : "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
              opacity: loading ? 0.6 : 1,
            }}
          >↻ Actualizar&nbsp;/&nbsp;Refresh</button>
          <button
            onClick={onClose}
            className="bap-press"
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10,
              background: C.pepBlue, color: C.white, border: "none", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
            }}
          >Cerrar&nbsp;/&nbsp;Close</button>
        </div>
      </div>
    </div>
  );
}

function DirectorPromptList({ prompts, roster, onSelect, loading, error }) {
  if (prompts.length === 0 && !loading && !error) {
    return (
      <div style={{
        padding: "30px 14px", textAlign: "center",
        fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 15, color: C.mountain,
      }}>
        No hay formularios definidos.<br />
        <span style={{ fontSize: 13 }}>No prompts defined yet.</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {prompts.map((p) => {
        const responders = respondedCwidSet(p.responses);
        const expected = (p.expected_cwids || []).length;
        const responded = responders.size;
        const allDone = expected > 0 && responded >= expected;
        const accent = p.is_active ? C.ocean : C.stone;
        const titleAlt = directorPromptTitleAlt(p);
        return (
          <button
            key={p.prompt_id}
            onClick={() => onSelect(p.prompt_id)}
            className="bap-press"
            style={{
              display: "block", textAlign: "left", width: "100%",
              padding: "12px 14px", background: C.white,
              border: `1px solid ${C.fog}`, borderLeft: `4px solid ${accent}`,
              borderRadius: 10, cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16,
                  color: C.pepBlack, lineHeight: 1.2,
                }}>
                  {directorPromptTitle(p)}
                </div>
                {titleAlt && (
                  <div style={{
                    fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                    fontSize: 12.5, color: C.mountain, marginTop: 1, lineHeight: 1.25,
                  }}>{titleAlt}</div>
                )}
              </div>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 700,
                color: C.white, background: accent,
                padding: "2px 7px", borderRadius: 8,
                textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap", flexShrink: 0,
              }}>{p.is_active ? "Activa" : "Cerrada"}</span>
            </div>
            <div style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 10,
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.mountain,
            }}>
              <span style={{
                fontWeight: 700, color: allDone ? "#1E8E3E" : C.pepBlue,
              }}>{responded} / {expected || "—"}</span>
              <span style={{ color: C.mountain, fontSize: 11 }}>
                {expected ? "respondieron" : "sin audiencia activa"}
              </span>
            </div>
            {(p.start_date || p.end_date) && (
              <div style={{
                marginTop: 4, fontFamily: "'DM Mono', monospace", fontSize: 10.5,
                color: C.mountain,
              }}>
                {p.start_date || "—"} → {p.end_date || "∞"}
                {p.end_time ? ` · ${p.end_time}` : ""}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DirectorPromptDetail({ prompt, roster }) {
  const responders = respondedCwidSet(prompt.responses);
  const expected = prompt.expected_cwids || [];
  const expectedSet = new Set(expected);
  const nonResponders = expected.filter((c) => !responders.has(c));
  const responseByCwid = groupResponsesByCwid(prompt.responses);

  // Surface any responders whose cwid is not in the expected audience.
  // Can happen when the Director changes a prompt's audience after
  // some students have already submitted; surfaces these as a small
  // "outside audience" note so the data isn't quietly dropped.
  const outsideResponders = [...responders].filter((c) => !expectedSet.has(c));

  const description = directorPromptDescription(prompt);
  const titleAlt = directorPromptTitleAlt(prompt);

  return (
    <div>
      {/* Description + window */}
      {titleAlt && (
        <div style={{
          fontFamily: "'EB Garamond', serif", fontStyle: "italic",
          fontSize: 14, color: C.mountain, marginBottom: 8, lineHeight: 1.3,
        }}>{titleAlt}</div>
      )}
      {description && (
        <div style={{
          fontFamily: "'Roboto', sans-serif", fontSize: 13.5, color: C.mountain,
          marginBottom: 10, lineHeight: 1.45, whiteSpace: "pre-line",
        }}>{description}</div>
      )}

      <div style={{
        padding: "10px 12px", background: C.white,
        border: `1px solid ${C.fog}`, borderRadius: 10, marginBottom: 16,
        fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: C.mountain,
      }}>
        <div>
          <span style={{ color: C.mountain }}>Audiencia · Audience:&nbsp;</span>
          <span>{prompt.audience || "all"}</span>
        </div>
        <div style={{ marginTop: 3 }}>
          <span style={{ color: C.mountain }}>Ventana · Window:&nbsp;</span>
          <span>
            {prompt.start_date || "—"} → {prompt.end_date || "∞"}
            {prompt.end_time ? ` · ${prompt.end_time}` : ""}
          </span>
        </div>
        <div style={{ marginTop: 3 }}>
          <span style={{ color: C.mountain }}>Respondieron · Responded:&nbsp;</span>
          <span style={{ fontWeight: 700, color: C.pepBlue }}>
            {responders.size} / {expected.length || "—"}
          </span>
        </div>
      </div>

      {/* Per-field breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(prompt.fields || []).map((f) => (
          <DirectorFieldSection
            key={f.field_id}
            field={f}
            responses={prompt.responses}
            roster={roster}
            responseByCwid={responseByCwid}
            respondedCwids={[...responders]}
          />
        ))}
      </div>

      {/* Non-responders */}
      {expected.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.mountain, marginBottom: 8,
          }}>
            Falta responder&nbsp;/&nbsp;Awaiting response · {nonResponders.length}
          </div>
          {nonResponders.length === 0 ? (
            <div style={{
              padding: "10px 12px", background: "#E8F5E9",
              border: `1px solid #C8E6C9`, borderLeft: `3px solid #1E8E3E`,
              borderRadius: 8,
              fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.pepBlack,
            }}>
              ¡Listo! Todos respondieron.&nbsp;<span style={{ fontStyle: "italic", color: C.mountain }}>All in.</span>
            </div>
          ) : (
            <div style={{
              padding: "10px 12px", background: C.white,
              border: `1px solid ${C.fog}`, borderRadius: 8,
              fontFamily: "'Roboto', sans-serif", fontSize: 13.5, color: C.mountain,
              lineHeight: 1.7,
            }}>
              {nonResponders.map((cwid, i) => (
                <span key={cwid}>
                  {directorResponderName(roster[cwid], cwid)}
                  {i < nonResponders.length - 1 ? <span style={{ color: C.mountain }}>, </span> : null}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Out-of-audience submissions (rare; happens when the
          Director narrows audience after some students submitted) */}
      {outsideResponders.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase",
            letterSpacing: 1.5, color: C.mountain, marginBottom: 8,
          }}>
            Fuera de la audiencia&nbsp;/&nbsp;Outside audience · {outsideResponders.length}
          </div>
          <div style={{
            padding: "10px 12px", background: C.parchment,
            border: `1px solid ${C.fog}`, borderRadius: 8,
            fontFamily: "'Roboto', sans-serif", fontSize: 12.5, color: C.mountain,
            lineHeight: 1.5,
          }}>
            {outsideResponders.map((cwid) => directorResponderName(roster[cwid], cwid)).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectorFieldSection({ field, responses, roster, responseByCwid, respondedCwids }) {
  const label = directorFieldLabel(field);
  const isSelect = field.field_type === "single_select" || field.field_type === "multi_select";
  const tally = isSelect ? tallySelectField(field, responses) : null;
  const totalForBar = tally
    ? Math.max(1, tally.reduce((acc, t) => acc + t.count, 0))
    : 0;

  // Rows: one per responder, showing their value for THIS field.
  // Skip responders who haven't submitted this particular field
  // (a partial submission on a multi-field prompt).
  const rows = respondedCwids
    .map((cwid) => ({
      cwid,
      name: directorResponderName(roster[cwid], cwid),
      value: responseByCwid[cwid] ? responseByCwid[cwid][field.field_id] : undefined,
    }))
    .filter((r) => r.value != null && r.value !== "");

  return (
    <div style={{
      padding: "12px 14px", background: C.white,
      border: `1px solid ${C.fog}`, borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{
          fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 15, color: C.pepBlack,
        }}>{label}</div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: C.mountain,
          textTransform: "uppercase", letterSpacing: 1,
        }}>{field.field_type}</div>
      </div>

      {/* Tally bars for select fields */}
      {tally && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {tally.map((t) => {
            const pct = (t.count / totalForBar) * 100;
            return (
              <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  flex: 1, height: 22, background: C.ice, borderRadius: 6,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0, width: `${pct}%`,
                    background: t.count > 0 ? C.ocean : "transparent",
                    transition: "width 0.3s ease-out",
                  }} />
                  <div style={{
                    position: "relative", padding: "0 8px", height: "100%",
                    display: "flex", alignItems: "center",
                    fontFamily: "'Roboto', sans-serif", fontSize: 12,
                    color: t.count > 0 && pct > 30 ? C.white : C.pepBlack,
                    fontWeight: 500,
                  }}>
                    {t.label}
                  </div>
                </div>
                <div style={{
                  width: 28, textAlign: "right",
                  fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700,
                  color: t.count > 0 ? C.pepBlue : C.stone,
                }}>{t.count}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual responses */}
      {rows.length === 0 ? (
        <div style={{
          marginTop: 10, fontFamily: "'EB Garamond', serif", fontStyle: "italic",
          fontSize: 13, color: C.mountain,
        }}>Sin respuestas todavía&nbsp;/&nbsp;No responses yet</div>
      ) : (
        <div style={{
          marginTop: tally ? 14 : 10,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {rows.map((r) => (
            <div key={r.cwid} style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10,
              padding: "5px 0", borderTop: `1px solid ${C.fog}`,
            }}>
              <span style={{
                fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain,
                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{r.name}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.pepBlack,
                textAlign: "right", maxWidth: "60%",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{String(r.value).replace(/;/g, ", ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DirectorPlacesView (staff Places vetting queue) ───
// Staff-only overlay for vetting student-submitted places. Mirrors
// <DirectorResponsesView>'s shell (gradient header, top-pinned
// loading/error, footer Refresh + Close). Pending submissions lead;
// approved + rejected history sits below. Approve / Reject flip the
// row's status via onVet; a per-place credit toggle decides whether
// the submitter's name shows publicly. Field tidying (hours, coords,
// fixing a typo) happens in the Sheet, not here.

// Default-on credit: a blank show_credit means "show the name."
function placeCreditOn(raw) {
  const s = String(raw == null ? "" : raw).trim().toUpperCase();
  if (s === "") return true;
  return !(s === "FALSE" || s === "NO" || s === "0" || s === "N");
}

// Pending first (newest submission leads), then approved, then
// rejected. Pure; safe to call each render.
function sortAdminPlaces(places) {
  const rank = { pending: 0, approved: 1, rejected: 2 };
  return [...(places || [])].sort((a, b) => {
    const ra = rank[a.status] == null ? 3 : rank[a.status];
    const rb = rank[b.status] == null ? 3 : rank[b.status];
    if (ra !== rb) return ra - rb;
    // Newest submission first within a band.
    return String(b.submitted_at || "").localeCompare(String(a.submitted_at || ""));
  });
}

function DirectorPlacesView({ open, onClose, loading, error, places, onRefresh, onVet }) {
  // Local credit choices keyed by place_id; seeded from show_credit on
  // first touch. The id currently being vetted disables its buttons.
  const [creditMap, setCreditMap] = useState({});
  const [vettingId, setVettingId] = useState("");
  const cardRef = useRef(null);
  useDialogA11y(cardRef, { open, onClose });

  useEffect(() => { if (!open) { setVettingId(""); } }, [open]);
  // Clear local credit overrides when the dashboard opens/closes or a
  // fresh admin payload lands. Otherwise a stale in-memory toggle could
  // silently overwrite a sheet-side show_credit edit on the next Approve,
  // since each row re-seeds from placeCreditOn(show_credit) only on first
  // touch. Dropping the overrides re-reads the canonical sheet value.
  useEffect(() => { setCreditMap({}); }, [open, places]);

  if (!open) return null;

  const list = sortAdminPlaces(places || []);
  const pending = list.filter((p) => p.status === "pending");
  const approved = list.filter((p) => p.status === "approved");
  const rejected = list.filter((p) => p.status === "rejected");

  const creditFor = (p) => (creditMap[p.place_id] != null ? creditMap[p.place_id] : placeCreditOn(p.show_credit));

  const doVet = async (placeId, status, showCredit) => {
    if (vettingId) return;
    setVettingId(placeId);
    try {
      await onVet({ place_id: placeId, status, show_credit: showCredit });
    } catch (e) {
      // Errors surface via the parent's `error` prop; nothing to do here.
    } finally {
      setVettingId("");
    }
  };

  const chip = (cat) => {
    const meta = getPlaceCategory(cat);
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "'DM Mono', monospace", fontSize: 10.5,
        background: C.ice, color: C.mountain, padding: "2px 9px", borderRadius: 11, whiteSpace: "nowrap",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color }} />
        {meta.label}
      </span>
    );
  };

  const renderPending = (p) => {
    const busy = vettingId === p.place_id;
    const credit = creditFor(p);
    return (
      <div key={p.place_id} style={{
        background: C.white, borderRadius: 12, border: `1px solid ${C.fog}`,
        borderLeft: `4px solid ${C.pepOrange}`, padding: "13px 15px", marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
          <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 17, color: C.pepBlue, lineHeight: 1.15 }}>{p.name}</span>
          {chip(p.category)}
        </div>
        {p.why && (
          <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: C.mountain, lineHeight: 1.5, marginBottom: 5 }}>{p.why}</div>
        )}
        <div style={{ fontSize: 12.5, color: C.mountain, fontFamily: "'Roboto', sans-serif", lineHeight: 1.5 }}>
          {p.neighborhood && <>{p.neighborhood}<br /></>}
          {p.address
            ? <AddressLink address={p.address} mapsUrl={p.maps_url} />
            : (safeExternalUrl(p.maps_url) && (
                <a href={safeExternalUrl(p.maps_url)} target="_blank" rel="noopener noreferrer" aria-label="Abrir en Maps / Open in Maps" title="Abrir en Maps / Open in Maps" style={{ color: C.ocean, textDecoration: "none", display: "inline-flex", alignItems: "center" }}><MapPinGlyph size={16} color={C.ocean} /></a>
              ))}
        </div>
        <div style={{ marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain }}>
          Sugerido por {p.submitted_by_name || "—"}
        </div>

        {/* Credit toggle */}
        <button
          type="button"
          onClick={() => setCreditMap((m) => ({ ...m, [p.place_id]: !credit }))}
          className="bap-press"
          style={{
            marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
            background: C.white, border: `1px solid ${C.fog}`, borderRadius: 9, padding: "6px 11px",
          }}
        >
          <span style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: `1.5px solid ${credit ? C.ocean : C.stone}`, background: credit ? C.ocean : C.white,
            color: C.white, fontSize: 11, lineHeight: "13px", textAlign: "center",
          }}>{credit ? "✓" : ""}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.mountain }}>
            Mostrar su nombre / Show their name
          </span>
        </button>

        {/* Approve / Reject */}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button type="button" disabled={busy} onClick={() => doVet(p.place_id, "approved", credit)} className="bap-press" style={{
            flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
            background: busy ? C.stone : C.pepBlue, color: C.white, cursor: busy ? "wait" : "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 12.5, fontWeight: 500, letterSpacing: 0.5,
          }}>{busy ? "…" : "Aprobar / Approve"}</button>
          <button type="button" disabled={busy} onClick={() => doVet(p.place_id, "rejected")} className="bap-press" style={{
            flex: 1, padding: "10px 0", borderRadius: 9,
            background: C.white, color: C.mountain, border: `1px solid ${C.fog}`, cursor: busy ? "wait" : "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 12.5, fontWeight: 500, letterSpacing: 0.5,
          }}>Rechazar / Reject</button>
        </div>
      </div>
    );
  };

  // Approved / rejected history rows: compact, one flip action each.
  const renderHistory = (p, flipTo, flipLabel) => {
    const busy = vettingId === p.place_id;
    return (
      <div key={p.place_id} style={{
        background: C.ice, borderRadius: 10, border: `1px solid ${C.fog}`,
        padding: "10px 13px", marginBottom: 8,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 14.5, color: C.pepBlue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            {chip(p.category)}
          </div>
          {p.source === "community" && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.mountain, marginTop: 3 }}>
              {p.submitted_by_name ? `por ${p.submitted_by_name}` : "comunidad"}
              {p.status === "approved" ? (placeCreditOn(p.show_credit) ? " · con crédito" : " · sin crédito") : ""}
            </div>
          )}
        </div>
        <button type="button" disabled={busy} onClick={() => doVet(p.place_id, flipTo, p.status === "rejected" ? creditFor(p) : undefined)} className="bap-press" style={{
          flexShrink: 0, padding: "7px 12px", borderRadius: 8,
          background: C.white, color: flipTo === "approved" ? C.ocean : C.mountain,
          border: `1px solid ${C.fog}`, cursor: busy ? "wait" : "pointer",
          fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
        }}>{busy ? "…" : flipLabel}</button>
      </div>
    );
  };

  const sectionHeader = (es, en, count) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "18px 0 10px" }}>
      <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 16, color: C.pepBlue }}>{es}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: C.mountain }}>{en} · {count}</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(29, 37, 45, 0.55)",
      zIndex: 220, display: "flex", justifyContent: "center", alignItems: "stretch", padding: 0,
    }}>
      <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Revisar lugares / Review places" onClick={(e) => e.stopPropagation()} style={{
        background: C.parchment, width: "100%", maxWidth: 480,
        margin: "0 auto", display: "flex", flexDirection: "column", maxHeight: "100vh", outline: "none",
      }}>
        {/* Header */}
        <div style={{
          padding: "max(16px, var(--safe-top)) 20px 16px",
          background: `linear-gradient(135deg, ${C.pepBlue} 0%, ${C.ocean} 100%)`,
          color: C.white, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.bapBlue, marginBottom: 2 }}>
              Director · Solo personal
            </div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.1 }}>
              Lugares · Revisión
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar / Close" style={{
            background: "rgba(255,255,255,0.15)", border: "none", color: C.white,
            width: 36, height: 36, borderRadius: 18, cursor: "pointer",
            fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
          {loading && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: C.ice, border: `1px solid ${C.fog}`,
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.ocean,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div className="bap-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.fog}`, borderTopColor: C.ocean }} />
              Cargando&nbsp;/&nbsp;Loading…
            </div>
          )}
          {error && !loading && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: "#FFF3E0", borderLeft: `3px solid ${C.pepOrange}`,
              fontFamily: "'Roboto', sans-serif", fontSize: 12.5, color: C.pepBlack,
            }}>{error}</div>
          )}

          {!loading && list.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 12px", fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 15, color: C.mountain }}>
              Todavía no hay lugares para revisar. / No places to review yet.
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, fontSize: 18, color: C.pepBlue }}>Pendientes</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.pepOrange }}>Pending · {pending.length}</span>
              </div>
              {pending.map(renderPending)}
            </>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <>
              {sectionHeader("Aprobados", "Approved", approved.length)}
              {approved.map((p) => renderHistory(p, "rejected", "Ocultar / Hide"))}
            </>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <>
              {sectionHeader("Rechazados", "Rejected", rejected.length)}
              {rejected.map((p) => renderHistory(p, "approved", "Publicar / Publish"))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px calc(2px + var(--bap-nav-pad-bottom))", background: C.white, borderTop: `1px solid ${C.fog}`, display: "flex", gap: 10 }}>
          <button onClick={onRefresh} disabled={loading} className="bap-press" style={{
            flex: 1, padding: "12px 0", borderRadius: 10,
            background: C.white, color: C.ocean, border: `1px solid ${C.fog}`, cursor: loading ? "wait" : "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, letterSpacing: 0.5, opacity: loading ? 0.6 : 1,
          }}>↻ Actualizar&nbsp;/&nbsp;Refresh</button>
          <button onClick={onClose} className="bap-press" style={{
            flex: 1, padding: "12px 0", borderRadius: 10,
            background: C.pepBlue, color: C.white, border: "none", cursor: "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
          }}>Cerrar&nbsp;/&nbsp;Close</button>
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
  // Which Local sub-section to open on the next Local-tab entry. Set by
  // Today's deep-links (events tile → "events", empty-state "Explorar BA"
  // button → "places") and consumed by <LocalView>'s initialSub; cleared
  // on a normal Local-nav tap so the tab defaults to its category hub.
  const [localInitialSub, setLocalInitialSub] = useState(null);
  // The Local sub-section currently open, reported up by <LocalView>. Lets the
  // page header read "Places" (no gloss) while in that section. `localPlacesLabel`
  // carries the chosen Places category so the header can read "Places · Café".
  const [localSub, setLocalSub] = useState(null);
  const [localPlacesLabel, setLocalPlacesLabel] = useState(null);
  // Bumped each time the Local bottom-nav tab is tapped while already on Local.
  // <LocalView> watches it and resets to its category hub, so re-tapping Local
  // is a reliable "take me back to the top" gesture even when the prop-level
  // initialSub hasn't changed (null → null wouldn't fire an effect on its own).
  const [localResetSignal, setLocalResetSignal] = useState(0);
  // Stable handler passed to <LocalView> as onSubChange; keeps both pieces of
  // header state in sync as the student navigates within Local.
  const reportLocalSub = useCallback((s, label) => {
    setLocalSub(s);
    setLocalPlacesLabel(label || null);
  }, []);
  // Down-channel for the header back chevron on a Places listing: <LocalView>
  // registers its "back to the category grid" function here, and the header
  // chevron calls it. A ref (not state) so registering doesn't re-render.
  const placesBackRef = useRef(null);
  const registerPlacesBack = useCallback((fn) => { placesBackRef.current = fn; }, []);
  // Tab navigation with an optional Local sub-section deep-link. Passed to
  // <TodayView> as onJumpToTab so its tiles can route into a specific
  // Local listing rather than the hub.
  const jumpToTab = useCallback((tabKey, sub = null) => {
    if (tabKey === "local") { setLocalInitialSub(sub); setLocalSub(sub); setLocalPlacesLabel(null); }
    setTab(tabKey);
  }, []);

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

  // Approved Places (Local tab). Cohort-wide, so lazy-init from the
  // device cache (no per-user key) and refresh in the background once
  // the cohort token is present. Saved/favorite place_ids are a
  // separate device-local list, never synced across devices.
  const [places, setPlaces] = useState(() => loadPlacesCache() || []);
  const [savedPlaces, setSavedPlaces] = useState(() => loadSavedPlaces());
  const handleToggleSavePlace = useCallback((placeId) => {
    setSavedPlaces((prev) => toggleSavedPlace(prev, placeId));
  }, []);

  // "+ Suggest a place" submission sheet + the confirmation toast it
  // fires on success. Toast auto-clears via a timer (see handleSubmitPlace).
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [placeToast, setPlaceToast] = useState("");
  // Held so a second toast within the 4 s window resets the timer instead
  // of being cut short by the first toast's still-pending clear.
  const placeToastTimerRef = useRef(null);

  // Staff Places vetting dashboard state. Same lazy posture as the
  // Director response dashboard below — loads on open, refreshes on
  // demand, no localStorage cache.
  const [placesAdminOpen, setPlacesAdminOpen] = useState(false);
  const [placesAdminPayload, setPlacesAdminPayload] = useState([]);
  const [placesAdminLoading, setPlacesAdminLoading] = useState(false);
  const [placesAdminError, setPlacesAdminError] = useState("");

  // The prompt currently being edited in the bottom-sheet form.
  // Set when the student taps a row in <PromptCard> or
  // <PromptProfileSection>; cleared when the form closes. Form sheet
  // renders at App level (rather than inside Today or ProfileModal)
  // so it stacks above either surface and shares one state.
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const handleOpenPrompt = useCallback((p) => setSelectedPrompt(p), []);
  const handleClosePrompt = useCallback(() => setSelectedPrompt(null), []);

  // Director response dashboard state. Lazy by design — the
  // payload only loads when the Director taps "Ver respuestas"
  // inside <ProfileModal>, and a refresh only fires when the
  // dashboard's own refresh button is tapped. No localStorage
  // cache: this view is opened a handful of times per week and
  // staleness is more confusing than a 1-second loading state.
  const [directorOpen, setDirectorOpen] = useState(false);
  const [directorPayload, setDirectorPayload] = useState(null);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [directorError, setDirectorError] = useState("");

  // Bottom-nav pill positioning. The pill slides under whichever tab is
  // active; its color adopts the active tab's color identity. We measure
  // each button via a ref-keyed map so re-positioning works on layout
  // changes (window resize, font load, etc.) without a layout-only
  // re-render of the whole component tree.
  const navRef = useRef(null);
  const navBtnRefs = useRef({});
  // The single scroll container wraps every tab; only its children swap on
  // a tab change, so without this it inherits the previous tab's scroll
  // offset. That left Calendar blank when arrived at from Schedule (which
  // auto-scrolls down to today's week) on days with no upcoming-event
  // anchor to pull it back. Reset to top on every tab change; the views
  // that auto-scroll to "today" (Schedule, Calendar) then re-anchor from a
  // clean baseline via their own rAF scrollIntoView effects.
  const contentRef = useRef(null);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [tab]);
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

  // ── Announcement "unread" cue (#24) ──
  // A dot on the Today nav tab when there's an active announcement the
  // student hasn't seen yet. "Seen" is recorded the moment the Today tab
  // is active (the banner is in view there). The dot is meaningful mainly
  // across tabs / sessions: a student parked on another tab when a new
  // announcement goes live gets a gentle nudge back to Today.
  const hasUnreadAnnouncements = useMemo(() => {
    const seen = new Set(profile.seenAnnouncements || []);
    return activeAnnouncementKeys(data.announcements, getTodayStr())
      .some((k) => !seen.has(k));
  }, [data.announcements, profile.seenAnnouncements]);

  useEffect(() => {
    if (tab !== "today") return;
    const active = activeAnnouncementKeys(data.announcements, getTodayStr());
    if (active.length === 0) return;
    const seen = new Set(profile.seenAnnouncements || []);
    const fresh = active.filter((k) => !seen.has(k));
    if (fresh.length === 0) return; // nothing new — avoid a needless write/re-render
    // Keep only still-active keys plus the freshly-seen ones, so the
    // stored list doesn't grow unbounded as old announcements expire.
    updateProfile({ ...profile, seenAnnouncements: active });
  }, [tab, data.announcements, profile, updateProfile]);

  // ── Service-worker update checks ──
  // The PWA service worker is set up for silent auto-updates
  // (registerType:'autoUpdate' + skipWaiting + clientsClaim in
  // vite.config.js), but an installed Android PWA only re-checks the
  // worker script on a real navigation — resuming a backgrounded app
  // usually just restores the existing page, so a freshly deployed build
  // can sit undetected (this is why a cold open after ~24h showed stale
  // content until a manual double hard-close). Force an update check
  // whenever the app regains focus, plus an hourly backstop while it's
  // open, so a new worker is found and activated promptly. We deliberately
  // do NOT reload the page here: the activated build shows on the student's
  // next cold launch, without ever interrupting an in-progress session.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const checkForUpdate = () => {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) reg.update().catch(() => {});
        })
        .catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(checkForUpdate, 60 * 60 * 1000); // hourly backstop
    checkForUpdate(); // once on mount
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, []);

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
        @keyframes bap-toast-in {
          0%   { opacity: 0; transform: translate(-50%, 12px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes bap-papel-fall {
          0%   { transform: translateY(-16px) rotate(0deg);    opacity: 0; }
          12%  { opacity: 0.92; }
          88%  { opacity: 0.92; }
          100% { transform: translateY(150px) rotate(220deg);  opacity: 0; }
        }
        .bap-toast-in { animation: bap-toast-in 260ms cubic-bezier(0.4, 0, 0.2, 1); }
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
        .bap-papelitos {
          position: absolute; inset: 0; overflow: hidden;
          pointer-events: none; z-index: 1;
        }
        .bap-papelitos > span {
          animation-name: bap-papel-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
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
          bottom: calc(var(--bap-nav-pad-bottom) - 10px);
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
          .bap-toast-in  { animation: none; }
          .bap-sun-rotate { animation: none; }
          .bap-steam     { animation: none; }
          .bap-papelitos { display: none; }
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

  // Re-pull the public approved-places list and rewrite the cache.
  // Shared by post-vet refresh (an approval changes what students see,
  // so the list updates right away rather than waiting on the 10-min
  // cache TTL) and by the Today pull-to-refresh path below — Places has
  // its own fetch separate from the content endpoint, so without this a
  // refresh gesture would never re-pull a Director's sheet edit to a place.
  // Best-effort: a failure keeps whatever's already in state.
  const refreshPlaces = useCallback(async () => {
    if (!cohortToken) return;
    try {
      const list = await fetchPlaces({ token: cohortToken });
      setPlaces(list);
      savePlacesCache(list);
    } catch (err) {
      console.warn("Places refresh failed:", err);
    }
  }, [cohortToken]);

  // Manual refresh path used by the Today pull-to-refresh gesture.
  // Calls fetchAllData with bust=true so the Apps Script's 1-hour
  // CacheService entry is bypassed and the spreadsheet is re-read on
  // this fetch. Returns a promise so the caller can await it and
  // keep its refresh indicator visible until the round trip lands.
  // Status flips to "refreshing" while in flight so the header pill
  // shows the same state as a normal background refresh. Places is
  // refreshed in parallel (its own endpoint, separate from the content
  // sheet) so a Director's pull-to-refresh also picks up place edits.
  const refreshAllData = useCallback(async () => {
    if (!SHEET_ID || !cohortToken) return;
    setStatus((prev) => (prev === "live" || prev === "cached" || prev === "fallback") ? "refreshing" : prev);
    // Kick the Places refresh off in parallel with the content fetch; it's
    // independent and best-effort, so it never blocks or fails the content
    // path. We await it at the end so the refresh indicator covers both.
    const placesPromise = refreshPlaces();
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
    } finally {
      await placesPromise;
    }
  }, [cohortToken, refreshPlaces]);

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

  // Background Places fetch. Fires once the cohort token is present —
  // approved places are cohort-wide and need no per-user identity to
  // read, so this doesn't wait on currentUser. The lazy-init already
  // primed `places` from the device cache, so this refreshes silently.
  // Best-effort: on any failure we keep whatever's in state (cache or
  // []) so the Local tab still renders. AuthError (rotated cohort code)
  // is left to the prompts/data effects to clear the gates; here we
  // just swallow it to avoid double-handling.
  useEffect(() => {
    if (!SHEET_ID) return;
    if (!cohortToken) return;
    let cancelled = false;
    fetchPlaces({ token: cohortToken })
      .then((list) => {
        if (cancelled) return;
        setPlaces(list);
        savePlacesCache(list);
      })
      .catch((err) => {
        if (cancelled) return;
        // Don't clear gates here — the data/prompts effects own that.
        console.warn("Places fetch failed:", err);
      });
    return () => { cancelled = true; };
  }, [cohortToken]);

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

  // Director response dashboard fetch. Called when the Director
  // taps "Ver respuestas" inside ProfileModal (which also opens
  // the dashboard) and again whenever they tap the dashboard's
  // own refresh button. AuthError / NoMatchError mirror the rest
  // of the auth flow: clear the relevant credentials, bounce
  // through the gates. ForbiddenError shouldn't fire in practice
  // (the button that triggers this only renders for staff/faculty)
  // but surfaces a clear bilingual message if it ever does.
  const loadDirectorResponses = useCallback(async () => {
    if (!cohortToken || !currentUser || !currentUser.cwid || !currentUser.birthday) return;
    setDirectorLoading(true);
    setDirectorError("");
    try {
      const payload = await fetchAdminResponses({
        token: cohortToken,
        cwid: currentUser.cwid,
        birthday: currentUser.birthday,
      });
      setDirectorPayload(payload);
    } catch (err) {
      if (err && err.name === "AuthError") {
        clearCohortToken();
        setCohortToken("");
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setSelectedPrompt(null);
        setDirectorOpen(false);
      } else if (err && err.name === "NoMatchError") {
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setSelectedPrompt(null);
        setDirectorOpen(false);
      } else if (err && err.name === "ForbiddenError") {
        setDirectorError("No tenés permiso para esta vista. / You don't have access to this view.");
      } else {
        setDirectorError("No se pudo cargar. Intentá de nuevo. / Couldn't load. Try again.");
      }
    } finally {
      setDirectorLoading(false);
    }
  }, [cohortToken, currentUser]);

  const handleOpenDirector = useCallback(() => {
    setDirectorOpen(true);
    setProfileOpen(false); // close the gear modal so the dashboard isn't stacked under it
    loadDirectorResponses();
  }, [loadDirectorResponses]);

  const handleCloseDirector = useCallback(() => {
    setDirectorOpen(false);
    setDirectorError("");
  }, []);

  // Student place submission. Calls submitPlace; on success closes the
  // sheet and fires the confirmation toast (auto-clears after 4 s).
  // AuthError / NoMatchError clear the gates in lockstep (same as
  // handleSubmitPrompt); SubmitError is re-thrown so <PlaceSubmitForm>
  // can show the inline validation message.
  const handleSubmitPlace = useCallback(async (fields) => {
    if (!cohortToken || !currentUser || !currentUser.cwid || !currentUser.birthday) {
      throw new AuthError("missing identity");
    }
    try {
      await submitPlace({
        token: cohortToken,
        cwid: currentUser.cwid,
        birthday: currentUser.birthday,
        fields,
      });
      setSuggestOpen(false);
      setPlaceToast("¡Gracias! Enviado para revisión / Thanks — sent for review");
      if (placeToastTimerRef.current) clearTimeout(placeToastTimerRef.current);
      placeToastTimerRef.current = setTimeout(() => setPlaceToast(""), 4000);
    } catch (err) {
      if (err && err.name === "AuthError") {
        clearCohortToken();
        setCohortToken("");
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setSuggestOpen(false);
      } else if (err && err.name === "NoMatchError") {
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setSuggestOpen(false);
      }
      throw err;
    }
  }, [cohortToken, currentUser]);

  // Staff Places vetting dashboard fetch. Mirrors loadDirectorResponses:
  // loads on open + on demand, clears gates on Auth/NoMatch, surfaces an
  // inline message on Forbidden.
  const loadAdminPlaces = useCallback(async () => {
    if (!cohortToken || !currentUser || !currentUser.cwid || !currentUser.birthday) return;
    setPlacesAdminLoading(true);
    setPlacesAdminError("");
    try {
      const list = await fetchAdminPlaces({
        token: cohortToken,
        cwid: currentUser.cwid,
        birthday: currentUser.birthday,
      });
      setPlacesAdminPayload(list);
    } catch (err) {
      if (err && err.name === "AuthError") {
        clearCohortToken();
        setCohortToken("");
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setPlacesAdminOpen(false);
      } else if (err && err.name === "NoMatchError") {
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setPlacesAdminOpen(false);
      } else if (err && err.name === "ForbiddenError") {
        setPlacesAdminError("No tenés permiso para esta vista. / You don't have access to this view.");
      } else {
        setPlacesAdminError("No se pudo cargar. Intentá de nuevo. / Couldn't load. Try again.");
      }
    } finally {
      setPlacesAdminLoading(false);
    }
  }, [cohortToken, currentUser]);

  const handleOpenPlacesAdmin = useCallback(() => {
    setPlacesAdminOpen(true);
    setProfileOpen(false); // close the gear modal so the dashboard isn't stacked under it
    loadAdminPlaces();
  }, [loadAdminPlaces]);

  const handleClosePlacesAdmin = useCallback(() => {
    setPlacesAdminOpen(false);
    setPlacesAdminError("");
  }, []);

  // Approve / reject a place. On success reload the admin payload AND
  // refresh the public list so an approval is visible to students
  // immediately. Errors surface in the dashboard's inline error row
  // (loadAdminPlaces sets it via the next reload, but a direct vet
  // failure also writes one here so the Director isn't left guessing).
  const handleVetPlace = useCallback(async ({ place_id, status, show_credit }) => {
    if (!cohortToken || !currentUser || !currentUser.cwid || !currentUser.birthday) return;
    setPlacesAdminError("");
    try {
      await vetPlace({
        token: cohortToken,
        cwid: currentUser.cwid,
        birthday: currentUser.birthday,
        place_id, status, show_credit,
      });
      await loadAdminPlaces();
      refreshPlaces();
    } catch (err) {
      if (err && err.name === "AuthError") {
        clearCohortToken();
        setCohortToken("");
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setPlacesAdminOpen(false);
      } else if (err && err.name === "NoMatchError") {
        clearUser();
        setCurrentUser(null);
        clearPromptsCache();
        setPrompts([]);
        setPlacesAdminOpen(false);
      } else if (err && err.name === "ForbiddenError") {
        setPlacesAdminError("No tenés permiso para esta acción. / You don't have permission for this action.");
      } else {
        setPlacesAdminError("No se pudo guardar el cambio. Reintentá. / Couldn't save the change. Try again.");
      }
    }
  }, [cohortToken, currentUser, loadAdminPlaces, refreshPlaces]);

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

  // Spanish-only status pill labels. The pill is narrow (10px DM Mono in
  // the header), so terse Spanish reads cleanly where a bilingual string
  // would overflow — and Spanish is the app's primary language. Wrapped in
  // lang="es" + aria-live below so a screen reader announces the offline
  // transition with correct pronunciation.
  const statusLabel = status === "live" ? "Sincronizado"
    : status === "refreshing" ? "Actualizando…"
    : status === "loading" ? "Cargando…"
    : status === "cached" ? "Guardado (offline)"
    : status === "fallback" ? "Sin conexión"
    : "Vista previa";

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
    <div style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", background: C.parchment, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "max(16px, var(--safe-top)) 20px 16px", background: `linear-gradient(135deg, ${C.pepBlue} 0%, ${C.ocean} 100%)`, color: C.white, position: "relative", overflow: "hidden" }}>
        <SouthernCrossDecoration />
        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Ajustes / Settings"
          className="bap-press"
          style={{
            position: "absolute", top: "max(12px, calc(var(--safe-top) - 4px))", right: 12, zIndex: 5,
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
              <span lang="es" role="status" aria-live="polite" style={{
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
      <div ref={contentRef} style={{ flex: 1, minHeight: 0, padding: "20px 16px calc(84px + var(--bap-nav-pad-bottom))", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}>
        {status === "loading" ? (
          <LoadingScreen tips={data.tips} />
        ) : (
          <>
            {tab !== "today" && (
              tab === "local" && localSub != null
                ? (() => {
                    // In any Local sub: section name + a back chevron in the header.
                    // Places keeps its breadcrumb sub ("Places · Café") and no gloss;
                    // other subs show their LOCAL_SECTIONS name + Spanish gloss.
                    const back = () => { if (placesBackRef.current) placesBackRef.current(); };
                    if (localSub === "places") {
                      return <SectionTitle override={{ en: "Places", es: null, sub: localPlacesLabel }} onBack={back} />;
                    }
                    const sec = LOCAL_SECTIONS.find((s) => s.key === localSub);
                    return <SectionTitle override={{ en: sec ? sec.en : "Local", es: sec ? sec.es : null }} onBack={back} />;
                  })()
                : <SectionTitle tabKey={tab} />
            )}
            {tab === "today" && <TodayView data={data} onJumpToTab={jumpToTab} profile={profile} currentUser={currentUser} onRefreshData={refreshAllData} prompts={prompts} onOpenPrompt={handleOpenPrompt} />}
            {tab === "schedule" && <ScheduleView data={data} profile={profile} onOpenSettings={() => setProfileOpen(true)} />}
            {tab === "calendar" && <CalendarView data={data} />}
            {tab === "local" && (
              <LocalView
                data={data}
                initialSub={localInitialSub}
                resetSignal={localResetSignal}
                places={places}
                savedPlaces={savedPlaces}
                onToggleSavePlace={handleToggleSavePlace}
                onSubChange={reportLocalSub}
                onOpenSuggest={() => setSuggestOpen(true)}
                onRegisterBack={registerPlacesBack}
              />
            )}
            {tab === "faq" && <FaqView data={data} />}
            {tab === "contacts" && <ContactsView data={data} />}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav ref={navRef} aria-label="Secciones / Sections" style={{
        // Centered via left/right/margin rather than translateX: a transform on a
        // position:fixed element is an iOS gotcha that can make bottom:0 anchor to
        // the safe-area inset instead of the true screen bottom, leaving the page
        // background showing through the home-indicator zone. The downward white
        // box-shadow is a self-correcting safe-area filler: it paints white below
        // the nav to cover that zone if any gap remains, and renders harmlessly
        // off-screen if bottom:0 already reaches the physical bottom.
        position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto",
        width: "100%", maxWidth: 480, background: C.white,
        boxShadow: `0 60px 0 0 ${C.white}`,
        borderTop: `1px solid ${C.fog}`, display: "flex", justifyContent: "space-around",
        padding: "8px 0 var(--bap-nav-pad-bottom)", zIndex: 100,
      }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const color = active ? t.color : C.stone;
          // Unread-announcement dot only on the Today tab, and only while
          // the student is somewhere else (on Today it's already in view).
          const showDot = t.key === "today" && hasUnreadAnnouncements && !active;
          return (
            <button
              key={t.key}
              ref={(el) => { navBtnRefs.current[t.key] = el; }}
              onClick={() => { if (t.key === "local") { if (tab === "local") setLocalResetSignal((n) => n + 1); setLocalInitialSub(null); setLocalSub(null); setLocalPlacesLabel(null); } setTab(t.key); }}
              aria-current={active ? "page" : undefined}
              aria-label={showDot ? `${t.label} — avisos sin leer / unread notices` : undefined}
              className="bap-press"
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "4px 8px", flex: 1,
              }}
            >
              <span className={`bap-nav-icon${active ? " lifted" : ""}`} style={{ position: "relative" }}>
                {t.icon(color)}
                {showDot && (
                  <span aria-hidden="true" style={{
                    position: "absolute", top: -2, right: -4,
                    width: 9, height: 9, borderRadius: "50%",
                    background: C.pepOrange, border: `1.5px solid ${C.white}`,
                  }} />
                )}
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
      </nav>

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
        onOpenDirector={isStaff(currentUser) ? handleOpenDirector : null}
        onOpenPlacesAdmin={isStaff(currentUser) ? handleOpenPlacesAdmin : null}
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

      {/* Director response dashboard. Rendered at App level so it
          stacks over ProfileModal (which is dismissed when the
          dashboard opens, but rendered here regardless so a stale
          open=true on ProfileModal doesn't pin two overlays). Only
          ever opened via the gated button on ProfileModal, so the
          render is effectively gated on isStaff too. */}
      <DirectorResponsesView
        open={directorOpen}
        onClose={handleCloseDirector}
        loading={directorLoading}
        error={directorError}
        payload={directorPayload}
        onRefresh={loadDirectorResponses}
      />

      {/* "+ Suggest a place" submission sheet (any signed-in user). */}
      <PlaceSubmitForm
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onSubmit={handleSubmitPlace}
      />

      {/* Staff Places vetting dashboard. Same staff-gated, App-level
          render posture as the response dashboard above. */}
      <DirectorPlacesView
        open={placesAdminOpen}
        onClose={handleClosePlacesAdmin}
        loading={placesAdminLoading}
        error={placesAdminError}
        places={placesAdminPayload}
        onRefresh={loadAdminPlaces}
        onVet={handleVetPlace}
      />

      {/* Confirmation toast fired after a successful place submission. */}
      <PlaceToast message={placeToast} />
    </div>
  );
}
