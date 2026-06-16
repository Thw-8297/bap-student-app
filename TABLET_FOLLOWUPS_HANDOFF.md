# Tablet UX — Follow-ups Handoff

Self-contained handoff for the deferred tablet follow-ups, written so a new
session can start cold. Read this top to bottom; it points at the exact code.

**As of:** main @ commit `3f1172f` (line numbers below are approximate; they will
drift as `App.jsx` changes, so search by the named anchor, not the line number).

---

## 0. Context (what already shipped)

The BAP app is a mobile-first React/Vite PWA (single giant file `src/App.jsx`,
~12k lines, inline-styled; the Leaflet map lives in `src/PlacesMap.jsx`). Tablet
support shipped in three phases (see the `## Changelog` rows dated 2026-06-15/16 in
`BAP_App_Project_Knowledge.md`, and the full design record in
`BAP_Tablet_UX_Roadmap.md`):

- **Phase 0:** `public/manifest.json` `orientation` → `"any"` (rotation unlocked).
- **Phase 1:** a `useBreakpoint()` hook + a landscape-iPad navy side rail
  (`RailNav`) replacing the bottom nav, widened content, and 5 bug fixes.
- **Phase 2:** master-detail in landscape iPad for Local (list + map), Calendar
  (list + detail), Schedule Weekly Overview (day list + agenda).

**The breakpoint model (critical to understand before touching anything):**
`useBreakpoint()` (App.jsx ~9681, `computeBreakpoint` ~9671) returns:
- `"phone"` — all phones (incl. landscape phone, kept here by a height floor).
- `"tablet-portrait"` — iPad portrait: bottom nav + a 640px column.
- `"rail"` — landscape iPad: the side rail + master-detail.

**Everything tablet is gated to `bp === "rail"` (or `"tablet-portrait"`). The
phone path must stay byte-identical. Every change below is rail-only; do not touch
the non-rail render branches.** Each master-detail view has an `if (bp === "rail")`
early-return block sitting just above the original (untouched) `return (...)`.

Anchors you will need:
- `RailNav` component — App.jsx ~9720.
- Local master-detail block — `if (lbp === "rail")` ~9192 (inside `LocalView`).
- Calendar master-detail block — `if (cbp === "rail")` ~6423 (inside `CalendarView`).
- Schedule master-detail block — `if (wbp === "rail")` ~5729 (inside `WeeklyOverviewView`).
- `selectedMapPlace` state — ~8747; pins open the card via
  `onSelectPlace={(p) => setSelectedMapPlace(p)}`.
- `PlacesMap` props — PlacesMap.jsx line 90:
  `PlacesMap({ places, userLoc, campus, onSelectPlace, fill = false })`.

---

## 1. Workflow rules (do not skip)

- **Pull first.** This repo lives on two machines; `git pull --rebase` before
  editing (there is a memory note about this).
- **Build to verify.** `npm run build` must pass; it is the only reliable check
  available, because the dev preview sits behind two live auth gates (cohort
  passcode + CWID/birthday) that need real credentials, so a logged-in browser
  preview is usually not reachable in-session. Do not claim visual verification you
  could not do.
- **Ship on a branch + PR.** Push a feature branch, open a PR, and read the Vercel
  preview URL off the PR (`gh pr view <n> --comments | grep vercel.app`). The
  Director rotate-tests a real iPad against the preview, then you merge to `main`
  (squash). Vercel auto-deploys `main` to https://baprogram.vercel.app/ in ~60s.
- **Bump `BUILD_VERSION`** (top of App.jsx) for any meaningful App.jsx change;
  prepend a `YYYY-MM-DD — …` line to the existing PRIOR chain.
- **Do NOT bump `CACHE_VERSION`** — these are layout-only, no fetched-data-shape
  change. No Apps Script change. No new dependencies (Leaflet is the only non-React
  dep and is already in).
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Update the living docs when done (`BAP_App_Project_Knowledge.md` changelog +
  `BAP_Tablet_UX_Roadmap.md`).

---

## 2. Follow-up A — Local: list-card tap should pan/select on the map

**✅ SHIPPED 2026-06-16** (build version `2026-06-16 — Tablet UX follow-up A`),
essentially as the "suggested approach" below. A `focusedPlaceId` state in
`LocalView` (cleared on `placesFilter` change) is set when a left-list
`<PlaceCard>` is tapped — wrapped in a click container with a 2 px Ocean
selection ring; a coordless place just shows the ring. It's threaded to
`<PlacesMap focusedPlaceId>`, which now keeps a `markersByIdRef` (id → `{ marker,
el }`) + `emphasizedRef` and runs a `focusedPlaceId` effect: `map.panTo` the
marker, swap its disc `boxShadow` to a focus ring (`DISC_SHADOW` ↔
`DISC_SHADOW_FOCUS`), `openTooltip`, clearing the prior pin first. `PlaceCard`'s
share + save buttons got `e.stopPropagation()` so they don't also pan. Pin-tap
still opens the place card (`selectedMapPlace` BottomSheet); list-tap is
pan/highlight only. Rail-only; phone + tablet-portrait untouched. The brief below
is the original task record.

**Status (original):** In the Local master-detail (rail), tapping a *map pin* works
(`onSelectPlace` → `selectedMapPlace` → the place-card dialog). Tapping a
`<PlaceCard>` in the LEFT list does **not** affect the map. Bidirectional sync was
deferred to keep the Stage 2a build clean.

**Goal:** tapping a place in the left list pans the map to it and highlights its
pin (and optionally opens its card), so the list and map feel like one surface.

**Where:**
- Left list renders `<PlaceCard>`s inside the `if (lbp === "rail")` block in
  `LocalView` (~9192). `<PlacesMap fill … onSelectPlace={…}>` is the right pane
  (~9273).
- `PlacesMap.jsx`: markers are built once per data signature; the click handler is
  `marker.on("click", () => selectRef.current(placesByIdRef.current[p.place_id] || p))`
  (lines ~172-173). There is already a `placesByIdRef` (id → place) and a
  `selectRef` (latest `onSelectPlace`, kept fresh via effect, lines ~95, ~103).
  Initial view is set with `map.setView(latlngs[0], 15)` (~190).

**Suggested approach (low-risk, mirrors existing patterns):**
1. In `LocalView`, add `const [focusedPlaceId, setFocusedPlaceId] = useState(null)`.
   Make each left-list `<PlaceCard>` call `setFocusedPlaceId(p.place_id)` on tap
   (PlaceCard may need a new `onSelect` prop, or wrap it in a button — check how
   PlaceCard currently handles body taps so you do not break the ♥ save / link
   buttons; those must keep working and must `stopPropagation`).
2. Pass `focusedPlaceId` into `<PlacesMap focusedPlaceId={focusedPlaceId} …>`.
3. In `PlacesMap.jsx`: add a `markersByIdRef` (mirror of `placesByIdRef`,
   id → Leaflet marker) populated where markers are created. Add a `useEffect` keyed
   on `focusedPlaceId` that, when set and the marker exists, calls
   `map.panTo(marker.getLatLng())` (or `setView` at the current zoom) and emphasizes
   it (e.g. `marker.openPopup()` if popups are used, or toggle a CSS class / bump the
   divIcon). Guard: place may have no coords (skip); do not fight a user who is
   mid-pan (only react to a *change* in `focusedPlaceId`).
4. Optional: keep the existing pin → card-dialog behavior; or unify so a pin tap
   also sets `focusedPlaceId` for a consistent highlight.

**Gotchas:** markers rebuild when the `places` data signature changes, so
`markersByIdRef` must be repopulated there, and the focus effect must no-op if the
marker is not yet present. Reduced-motion is not a concern for a pan. Keep all of
this inside the rail path / the map component; the phone map view is unaffected.

**Verify:** `npm run build`; then on the preview (iPad landscape, Local → a
category): tapping a card pans the map to that pin; pins still open the card; ♥ and
link buttons on the card still work; phone Local unchanged.

---

## 3. Follow-up B — Calendar: richer (or restructured) rail detail pane

**Status today:** The Calendar rail layout (`if (cbp === "rail")` ~6423) is a
two-pane master-detail: left = month-grouped selectable event list, right =
selected-event detail (type badge, title, date/range, time, description,
`AddressLink`, `AddToCalendarButton`). The detail block is centered
(`margin:"auto"`) so a thin event looks intentional. **But** many calendar events
carry little detail, so the right pane is still quiet — inherent to master-detail
when the data is thin. (This is why Calendar was flagged; Schedule too was the
lowest-confidence master-detail.)

**This one is a DESIGN decision before code.** Two viable directions; get the
Director to pick (the Director already floated option 2):

1. **Enrich the detail pane.** Add context that is actually useful next to an
   event: the other events the same day / that week, the day's classes (reuse the
   Schedule `renderDayContent`-style pipeline), a "what's around it" mini-agenda, or
   a small month-context strip. More build, keeps the master-detail shape.
2. **Drop the detail pane; use the width as a multi-column event list.** In rail,
   render the Calendar as a 2-column flowed event list (no right pane), which fills
   the screen without the empty-detail problem. Less build, arguably cleaner for
   thin data. This is the Director's floated alternative.

**Where / how:**
- All changes stay inside the `if (cbp === "rail")` block in `CalendarView`
  (~6423). The non-rail `return (...)` just below it must stay byte-identical.
- For option 2, replace the two-pane return with a single column whose event list
  uses `columns: 2` / a CSS grid of event cards; reuse the existing event-card JSX
  (the left-list `<button>` rows already exist there) and drop the right pane,
  `selectedEventKey`, `detailEvent`, and the `prevFilterRef` reset effect (or leave
  the state unused). Keep the filter pills and the "Hoy · Today" divider + the
  `todayDividerRef` auto-scroll.
- For option 1, keep the structure and expand the `rightDetail` `else` branch
  (~6522) with the extra context blocks.

**Verify:** build; iPad landscape Calendar fills the screen and reads as
intentional for both a thin event (a holiday) and a rich one (an excursion with a
description); filter pills still work; phone/portrait Calendar unchanged.

---

## 4. Follow-up C (minor) — master-detail pane height is approximate

**Status today:** all three master-detail blocks size their two-pane wrapper with a
magic-number `calc()`:
`height: "calc(100vh - 44px - var(--safe-top,0px) - var(--bap-nav-pad-bottom,16px) - 52px)"`
plus `minHeight: 480`, and escape the App-level content padding with
`margin: "-20px -16px -24px"` (App.jsx ~5833, ~6588, ~9234). The `44px` and `52px`
are guesses (roughly: nothing-above + the `SectionTitle` row). It works (with the
`minHeight` floor + the `ResizeObserver` in `PlacesMap`), but it is brittle and can
leave a slightly-off vertical fit on some iPad sizes.

**Cleaner fix (a small refactor, do it if you are already in here):** in `rail`
mode, make the content area a real flex column instead of a scroll-with-padding box:
the `SectionTitle` becomes a `flexShrink:0` header and the active view fills the rest
(`flex:1; minHeight:0`). Then each master-detail block can be plain
`height:"100%"` of a sized flex parent, deleting the `calc()` and the negative-margin
hack at all three sites. This touches the App-level rail content wrapper (search the
top-level `<App>` return for the `maxWidth: bp === "rail" ? … : 760` inner wrapper
and the `contentRef` scroll div) plus the three blocks. Keep the non-rail and
`tablet-portrait` paths exactly as they are.

**Verify:** build; on iPad landscape, all three master-detail tabs fill the
viewport height with no awkward gap or cutoff, on at least iPad regular and Pro
sizes (use the preview's resize or a real device); rotate to confirm the map/list
re-fit (the `ResizeObserver` should handle the map).

---

## 5. Quick start for a cold session

1. `git pull --rebase` on `main`.
2. Read this file + the 2026-06-16 changelog row in `BAP_App_Project_Knowledge.md`.
3. Pick a follow-up. For B, get the Director's option-1-vs-2 call first.
4. Branch (e.g. `tablet-followup-<x>`), implement rail-only, keep the phone path
   untouched, `npm run build`.
5. Bump `BUILD_VERSION`; do not bump `CACHE_VERSION`.
6. Push branch, open a PR, hand the Director the Vercel preview URL to rotate-test.
7. On approval, squash-merge to `main`; update the changelog + roadmap.
