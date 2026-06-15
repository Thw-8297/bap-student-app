# BAP Student App — Tablet UX Roadmap

**Status:** Version 3 — three additional Director decisions locked 2026-06-15: navy rail color; portrait iPad keeps the bottom nav (rail and master-detail are a landscape-only package); master-detail scope is Local, Calendar, and Schedule (Schedule pending a mockup-stage design check). The side-navigation rail is the target; iPad-first. All tablet work ships on a branch and is gated by a design mockup and Director sign-off, except Phase 0 (orientation safety baseline), which ships directly to `main`.

**Date:** 2026-06-15

---

## 1. Executive Summary

Six Director decisions are now locked (see Section 2; three from v1, three added in v3 on 2026-06-15). The effect on this document is significant: the side-navigation rail is no longer a speculative Phase 2/3; it is the centerpiece of the tablet work, with its color, orientation gating, and master-detail scope all settled. The responsive content reflow that was previously "Option B, the recommended finish line" is now the foundation layer underneath the rail, not the destination.

The phased plan is restructured accordingly:

- **Phase 0 (ships to `main`):** Unlock orientation globally, keep phones portrait-shaped, re-verify the recently reworked bottom nav in landscape. This is a safety baseline, not a tablet feature. It must land before any other phase because the manifest change is global. (Note: the horizontal safe-area padding originally scoped here was moved to Phase 1; see "iPhone landscape horizontal safe-area" in Section 6 for why it is a no-op, or actively wrong, while the layout is a centered narrow column.)
- **Phase 1 (branch + mockup sign-off, iPad-first centerpiece):** The side-navigation rail. The rail activates ONLY in landscape orientation with enough width; portrait iPad keeps the bottom nav. Rail color is navy (Pep Blue). Aspect-ratio-and-orientation-aware breakpoint hook; left rail replacing the bottom nav at landscape tablet widths; widened content pane with text-measure caps; all concrete bugs fixed (FAB formula, PlacesMap resize observer and height cap, overlay widths, pointer-device hover); Director dashboards widened. This is the identity-touching change. Code only starts after a design mockup has been reviewed and the Director has signed off.
- **Phase 2 (branch, per-view, follows Phase 1):** Master-detail layouts on top of the rail: Local list plus Leaflet map side by side (2a); Calendar month plus day detail (2b); Schedule week list plus day detail (2c, lowest confidence, design must be validated at mockup stage before code).

The work is iPad-first (iPad Safari, both installed-PWA and browser-tab). Android tablets must not break but are not the optimization target. Phones stay portrait-shaped throughout; the only phone-landscape commitment is "does not clip or break."

---

## 2. Decisions Locked

These are settled. They are recorded here as inputs, not open questions.

**Decision 1: The side-navigation rail (Option C) is the target.**
A persistent left rail replaces the bottom nav at landscape tablet widths. Full-width use of the screen. Master-detail patterns follow on top of the rail. The responsive-content foundation (widened columns, capped text measure) is required underneath the rail, not a standalone endpoint. The rail is identity-touching; it ships on a branch, gated by a design mockup and Director sign-off before code starts.

**Decision 2: Unlock orientation globally; keep phones portrait-shaped.**
`manifest.json` `orientation` flips to `"any"`. Phones stay portrait-designed; phone-landscape is a "does not clip or break" safety floor, not a polished layout. Minimal phone-landscape test surface.

**Decision 3: Audience is students on iPads plus the Director on his iPad.**
iPad-first optimization: iPad Safari (installed-PWA and browser-tab). Android tablets must not break. Because the Director uses the app too, the Director dashboards (`DirectorResponsesView`, `DirectorPlacesView`) get widened alongside the rest of the tablet work.

**Decision 4 (locked 2026-06-15): Rail color is navy (Pep Blue).**
The left rail carries the Pep Blue (`#00205B`) institutional identity. Accepted tradeoff: on a navy rail the darker per-tab colors (Pep Blue, Ocean, Mountain) do not read on inactive tabs, so per-tab color identity shows mainly on the ACTIVE tab via a light inset and a colored left-accent bar in that tab's color. This was chosen over a light/parchment rail (which would show every tab's color at all times) because the iPad is also used in admin and demo contexts where the institutional navy read matters more. This decision is final; the mockup will not show a parchment-rail alternative.

**Decision 5 (locked 2026-06-15): Portrait iPad keeps the bottom nav; the rail and master-detail are a landscape-only package.**
The rail and master-detail activate TOGETHER only when the iPad is in LANDSCAPE with enough width. In portrait the iPad gets the phone-style bottom nav with a wider single column (denser category grids, capped text measure). Rationale: portrait is the iPad's narrower dimension (~768-834pt wide); a rail there eats horizontal space where portrait has the least to spare, and master-detail (side-by-side panels) does not fit a portrait pane anyway, so a portrait rail gives the worst of both (permanent rail plus a narrowed single column). The rail trigger is therefore landscape-orientation-with-enough-width, not width alone. The accepted cost: rotating the iPad relocates the nav (bottom in portrait, left rail in landscape) and reflows the layout (single column to master-detail). This is a deliberate, expected "give me the big two-pane view" rotation gesture, familiar from iPad Mail and Calendar, not a bug.

**Decision 6 (locked 2026-06-15): Master-detail scope is Local, Calendar, and Schedule (Schedule lowest-confidence).**
Local (place list plus Leaflet map) and Calendar (month/list plus day detail) are locked, high-confidence two-pane patterns. Schedule is in scope but lowest-confidence: Schedule already has a Mon-Fri grid sub-view that inherently uses width well, so the "what is the master and what is the detail" split is less obvious than it is for Local and Calendar. Schedule master-detail must be validated during the mockup pass before code is written; we do not force a two-pane split the grid view does not want.

---

## 3. Current State

### The constraint mechanism

The entire app renders inside a single `<div>` in `src/App.jsx`:

```js
<div style={{ maxWidth: 480, margin: "0 auto", height: "100vh",
              background: C.parchment, display: "flex", flexDirection: "column" }}>
```

This is the root shell. `maxWidth: 480` with `margin: "0 auto"` centers a 480 px column on any screen wider than that. The layout inside the shell is:

- **Header** (gradient, always full-column-width, `position: relative`).
- **Content div** (`flex: 1`, `overflowY: auto`) — all tab views render here as scrollable children. Padding is `20px 16px 24px`.
- **Bottom nav** (`position: relative`, in normal flow as a flex child, `flexShrink: 0`) — a row of 6 tab buttons with the animated `.bap-nav-pill` positioned inside it.

The bottom nav is currently **in-flow** as a flex child of the root shell (not `position: fixed`). This is the result of several careful iterations to eliminate the iOS home-indicator parchment gap (2026-06-14b). The root shell uses `height: 100vh` (2026-06-14c, changed from `100dvh` to reach the physical screen bottom on the installed iOS PWA). The safe-area CSS variables `--safe-top` and `--bap-nav-pad-bottom` (added 2026-06-13c) carry `env(safe-area-inset-*)` values for the iPhone notch/Dynamic Island; on iPad these resolve to 0 and the `max()` guards fall back to base values.

Several elements use `position: fixed` and portal to `<body>`:

- `<BottomSheet>` portals to `<body>`, `maxWidth: 480`.
- `<ProfileModal>`, `<DirectorResponsesView>`, `<DirectorPlacesView>` use `position: fixed, inset: 0` with a centered content pane (`maxWidth: 480`).
- `<PlaceToast>` is `position: fixed, left: 50%, maxWidth: 448`.
- The Places FAB is `position: fixed, bottom: calc(74px + ...)` with its horizontal position expressed as `right: "max(20px, calc(50% - 240px + 20px))"` (the 240 = 480/2, half the 480 px column). This formula is hardcoded to the 480 px column and breaks as the column widens (see Section 6, Bug 1).

The `bap-personality-styles` block (injected once via `useEffect`, ~100 lines of CSS) contains all animation keyframes, `.bap-nav-pill` position logic, `.bap-nav-icon.lifted`, and the `@media (prefers-reduced-motion)` block. There are **zero `@media` width queries** anywhere in the app today. All responsive behavior would be added from scratch.

### The manifest situation

`public/manifest.json` currently has `"orientation": "portrait"`. iPadOS Safari ignores the `orientation` field and respects the device rotation lock, so the iPad behaves the same with or without this field. Android Chrome honors it for installed PWAs; the current setting locks installed Android PWAs to portrait, preventing landscape entirely. Phase 0 changes this to `"orientation": "any"`.

### What it looks like on an iPad today

**Portrait (iPad mini ~768 pt, regular ~834 pt):** A 480 px navy header and parchment content column floats in the center. Roughly 144 pt of empty parchment sits on each side (mini) or ~177 pt (regular). The bottom nav spans the full 480 px column but is visually disconnected from the screen edges. Readable; clearly designed for a phone.

**Landscape (any iPad):** The 480 px column represents about 40% of landscape width on an iPad mini, narrower on larger models. The column reads as a narrow tall strip with enormous empty side panels.

**iPad Pro 12.9" landscape:** At ~1366 pt wide, the 480 px column is ~35% of the screen. The parchment wings are each ~440 pt. Worst case.

---

## 4. Device Matrix

The primary optimization target is iPad Safari (installed-PWA and browser-tab). The secondary commitment is Android tablets must not break. Phones stay portrait-shaped regardless.

| Device class | Priority | Portrait CSS width | Landscape CSS width | Portrait layout | Landscape layout |
|---|---|---|---|---|---|
| iPad mini (6th gen) | Primary | ~768 pt | ~1024 pt | Bottom nav, wider column (`tablet-portrait`) | Rail + content pane (`tablet`) |
| iPad (10th gen) | Primary | ~820 pt | ~1180 pt | Bottom nav, wider column (`tablet-portrait`) | Rail + master-detail (`wide`) |
| iPad Air | Primary | ~834 pt | ~1194 pt | Bottom nav, wider column (`tablet-portrait`) | Rail + master-detail (`wide`) |
| iPad Pro 11" | Primary | ~834 pt | ~1194 pt | Bottom nav, wider column (`tablet-portrait`) | Rail + master-detail (`wide`) |
| iPad Pro 12.9" / 13" | Primary | ~1024 pt | ~1366 pt | Bottom nav, wider column (`tablet-portrait`) | Rail + master-detail (`wide`) |
| Android tablet (mid-range) | Must not break | ~800–960 dp | ~1280–1600 dp | Bottom nav, wider column | Rail or graceful fallback |
| iPhone (any, portrait) | Must stay identical | 375–430 pt | — | Current layout, zero regression | — |
| iPhone (any, landscape) | Must not clip/break | — | ~667–932 pt | — | Phone layout, no rail (`phone`) |

**Portrait iPad always keeps the bottom nav (Decision 5).** This is settled. A portrait iPad at 768-1024 pt wide gets the `"tablet-portrait"` tier: wider single column with denser category grids and a text-measure cap, but the bottom nav is retained. The rail only activates in landscape.

**iPhone landscape is the Phase 0 risk.** A landscape iPhone 15 Pro Max is ~932 pt wide and ~430 pt tall. Width-only logic would trip the ≥768 pt tablet tier and give it the rail layout intended for an iPad. The corrected hook (Section 6) uses the height floor AND the landscape-orientation gate together to ensure this returns `"phone"`, not `"tablet"`.

**iPadOS installed-PWA quirks:**

- `--safe-top` and `--bap-nav-pad-bottom` already resolve to base values on iPad (no notch, `env()` returns 0). No change needed.
- iPadOS evicts installed PWA service workers after ~7 days of non-use. The on-resume update check (2026-06-11b) mitigates content staleness but cannot override eviction. First open after eviction cold-loads from network; that is expected behavior.
- Split View / Stage Manager: the app receives a narrower viewport in Split View. The 480 px column is fine in that context; it already looks like a phone app in a phone-sized pane, which is acceptable.
- **iPad Safari browser-tab `100vh` quirk:** `100vh` in browser-tab Safari is the full viewport height including the address bar, so the root shell can be taller than the visual area and the bottom nav can sit behind the address bar until the user scrolls. In the installed-PWA (standalone mode), `100vh` equals the physical screen height and behaves correctly. This is a known iOS behavior; note it during testing but do not attempt to fix it with `100dvh` (which broke things on the installed-PWA, hence the 2026-06-14c revert).

---

## 5. Target Design: The Side-Rail Layout

This section describes what Phase 1 is building. Code starts only after a mockup has been reviewed and the Director has signed off.

### Rail structure

At tablet/landscape breakpoints (see Section 6 for the exact condition), the bottom nav is replaced by a persistent left rail. The root shell switches from a single-column flex column to a two-column layout: `display: flex; flex-direction: row`.

**Rail column (~64–72 px wide):** Sits flush to the left edge of the shell. Contains:
- The BAP logo mark (smaller, icon-only version) at the top, linking to Today.
- Six stacked tab icons (the same icon set used in the bottom nav), each ≥44 px tall.
- The active-tab indicator: a vertical accent bar on the left edge of the icon, using the same per-tab color identity currently carried by the bottom nav pill. The bar slides vertically between tabs via CSS `transform: translateY()`, directly analogous to the current horizontal pill but rotated 90 degrees.
- The status pill (Sincronizado / Actualizando...) at the bottom of the rail or in the header.
- No text labels at minimal rail width; add labels (or a wider "expanded rail") as a Phase 2 option if the Director wants them.

**Content pane (remaining width):** The content scrolls independently of the rail. The header gradient sits above the content pane only (not behind the rail column); or the rail itself carries the Pep Blue identity from top to bottom. This header treatment is one of the decisions a mockup needs to resolve.

**Rail identity (locked, Decision 4):** The rail background is Pep Blue (`#00205B`) — the institutional navy. Icon tints: inactive tabs use a light translucent overlay (white at ~45-55% opacity, similar to how the current bottom nav handles inactive labels) because the darker per-tab colors (Pep Blue, Ocean, Mountain) do not read on a navy background. The active-tab indicator is a colored left-edge bar in the active tab's own color (the same per-tab color identity the current bottom nav pill carries), plus a lighter navy inset or tint behind the active icon to visually lift it. The per-tab color identity is therefore concentrated on the ACTIVE tab rather than visible on all tabs simultaneously; this is the accepted tradeoff of the navy rail over a light/parchment rail. The mockup will show this treatment but will not show an alternative rail color; that decision is settled.

**The animated pill, translated:** The `.bap-nav-pill` currently slides horizontally using a JS-measured `translateX`. In the rail, it becomes a vertical left-edge bar using `translateY`. The same `navBtnRefs` approach applies: measure each tab button's `offsetTop`, set the bar's `top` and `height`. The pill-animation code in `bap-personality-styles` needs new CSS for the vertical bar, and the JS measurement runs on tab change and on resize (same as today, but measuring `offsetTop` instead of `offsetLeft`).

### Content pane width and text measure

The content pane width is (shell width minus rail width). The shell itself is no longer capped at 480 px in the rail layout; it fills the full device width (or up to a sensible desktop-browser maximum, discussed below). The content pane:

- Uses the full remaining width for card grids, the Leaflet map, and the Local category hub.
- Caps **text columns** independently: FAQ answers, Calendar event descriptions, Holiday descriptions, health provider notes, prompt descriptions, and similar text-heavy content should have a `maxWidth` on the text block of ~65 ch (~580–620 px at 16 px Roboto), regardless of how wide the pane is. This keeps reading measure in the comfortable 60–80 ch range and avoids the 100+ chars/line problem that a 720 px+ pane produces with the current `20px 16px` horizontal padding.

**Why a text-measure cap matters:** At a 720 px column with `16px` horizontal padding, the inner text width is ~688 px, putting body Roboto at ~95–100 characters per line. That is well past the comfortable 60–80 ch range, and FAQ answers, health notes, and calendar descriptions are the most text-heavy content in the app. The fix is a `maxWidth` on text blocks, not wider horizontal padding, so cards still fill the full pane while prose stays readable.

### Master-detail (Phase 2 on top of the rail)

With a rail in place, three views are in scope for side-by-side panels in landscape iPad (Decision 6). They ship sequentially, lowest-risk first.

**2a — Local (Places) master-detail (high confidence):** The Places category listing sits on the left ~45% of the content pane; the Leaflet map fills the right ~55%. Tapping a pin or a card in the list opens the place card in a right-side drawer (not a bottom sheet). This is the view that students and the Director will find most compelling on a large iPad.

**2b — Calendar master-detail (high confidence):** The month-grouped Semester Calendar sits on the left ~35%; the right ~65% shows an expanded day detail (the events for the day you tapped, with more space for descriptions). This eliminates the need to scroll to read event details on a large screen.

**2c — Schedule master-detail (in scope, lowest confidence):** Schedule is the least obvious two-pane candidate because it already has a Mon-Fri grid sub-view that inherently uses horizontal space well. The "what is the master and what is the detail" split is not settled: possible framings include a week-list left panel plus a day detail right panel, or simply letting the Mon-Fri grid breathe across the full content pane without a forced split. This must be resolved at the mockup stage during Phase 2 planning; do not write Schedule master-detail code until the two-pane design has been validated and the Director has confirmed it adds value over a wide grid. Sequence it after 2a and 2b are stable.

All three master-detail patterns are Phase 2, not Phase 1. They depend on the rail existing and are separate from the foundation work. All three apply only in landscape (the `"wide"` tier); portrait iPad keeps the single-column layout regardless of which view is open.

### BottomSheets in the rail layout

The current `<BottomSheet>` idiom (slides up from the bottom, portals to `<body>`) is a phone pattern that reads awkwardly on a landscape iPad. In the rail layout, at tablet/wide breakpoints, BottomSheets (WeatherSheet, DolarSheet, PromptForm, PlaceSubmitForm, PlaceCard detail) should become centered-overlay dialogs or right-side drawer panels instead of bottom slides. The `<BottomSheet>` component needs a `mode` prop (or a breakpoint-aware internal switch) to select the presentation style. This is part of Phase 1, not deferred.

### FAB and toast in the rail layout

The Places FAB and `<PlaceToast>` are `position: fixed` and currently position relative to the viewport. In the rail layout:
- The FAB repositions to the bottom-right of the **content pane**, not the viewport. Its `right` offset must account for the rail width. If the rail is 68 px wide, the FAB's `right` is `20px`, and its `bottom` tracks `--bap-nav-pad-bottom` as today (the rail layout has no bottom nav, so this may simplify to a fixed `24px` bottom offset).
- `<PlaceToast>` centers over the content pane, not the viewport. In a `left: 50%` centered toast, `50%` of the viewport is the viewport center; with a left rail, the content-pane center is `(rail width + (content width / 2))` from the left, which requires an explicit left value at tablet breakpoints or a different positioning approach (e.g., `left: calc(68px + 50%)` where 68px is the rail width).

### Director dashboards in the rail layout

`<DirectorResponsesView>` and `<DirectorPlacesView>` currently overlay the full screen at `maxWidth: 480`. In the rail layout, these should fill the content pane at its full width (minus the rail), not be constrained to 480 px. They are used by the Director on a large iPad where a wide response-tally view is genuinely better.

### Auth gates

`<PasscodeGate>` and `<UserGate>` should stay centered at ~480 px regardless of breakpoint. They are one-time entry points; a wide empty form is worse than a modestly centered one. No change here.

### Desktop/laptop browser-tab

At desktop viewport widths (1200+ px laptop browser), the same rail layout renders. The content pane becomes very wide. A sensible outer maximum on the root shell (e.g., `maxWidth: 1440px` on the shell, `margin: 0 auto`) prevents the app from looking absurd on a 27" monitor. This is a Phase 1 addition alongside the rail.

---

## 6. Technical Foundation

### The corrected breakpoint hook (orientation and aspect-ratio aware)

The v1 document proposed a `useBreakpoint()` hook keyed on `window.innerWidth` alone. This is wrong for two reasons. First, a landscape iPhone 15 Pro Max is ~932 pt wide and ~430 pt tall; width-only logic would classify it as a tablet and apply the rail to a wide-but-short phone. Second, and more importantly per Decision 5, a PORTRAIT iPad must not get the rail even when its width clears the tablet threshold: a portrait iPad mini is ~768 pt wide and ~1024 pt tall, which is a tall, narrow portrait pane where a rail would hurt not help.

The hook therefore needs two layered gates:

1. **Height floor** to separate tall iPads from wide-but-short landscape iPhones. A minimum height of 600 px is a reasonable separator: iPads in landscape (shortest dimension ~768 pt) clear it; iPhones in landscape (shortest dimension ~390-430 pt) do not.
2. **Landscape-orientation gate for the rail specifically.** A portrait iPad (wide >= 768, tall >= 1024) must return a "tablet-portrait" tier that gets the wider single column and bottom nav, NOT the rail. The rail activates only when width > height (landscape) AND width >= the threshold.

```js
function useBreakpoint() {
  function classify() {
    if (typeof window === "undefined") return "phone";
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w > h;

    // Portrait iPad: wide enough to qualify as tablet, but taller than wide.
    // Gets wider single column + bottom nav (no rail, no master-detail).
    if (w >= 768 && h >= 600 && !isLandscape) return "tablet-portrait";

    // Landscape tablet / wide: rail + master-detail territory.
    // Requires both width AND height floors so landscape iPhones don't qualify.
    if (w >= 1024 && h >= 600 && isLandscape) return "wide";
    if (w >= 768 && h >= 600 && isLandscape) return "tablet";

    return "phone";
  }
  const [bp, setBp] = useState(classify);
  useEffect(() => {
    const update = () => setBp(classify());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return bp;
}
```

`orientationchange` is included alongside `resize` because some iOS versions fire `orientationchange` before the viewport dimensions update in `resize`. Both listeners together ensure the hook reacts correctly on rotation.

Mapping the tiers to layouts:

| Tier | Example device/state | Layout |
|---|---|---|
| `"phone"` | Any iPhone portrait; landscape iPhone | Current layout: bottom nav, 480 px column |
| `"tablet-portrait"` | iPad in portrait (any size) | Bottom nav retained; column widens; denser grids; text-measure cap |
| `"tablet"` | iPad mini landscape (~1024×768) | Rail + single content pane (no master-detail) |
| `"wide"` | iPad regular/Pro landscape (~1180+ × 820+) | Rail + master-detail |

The `"tablet-portrait"` tier is new. It gives portrait iPad a better single-column experience (wider column, denser grids) without the rail. The phone path (`"phone"`) remains byte-identical to the current code.

### CSS strategy

The app uses inline styles almost exclusively, with the `bap-personality-styles` injected CSS block for animation keyframes and class-based behaviors. There are currently no `@media` width queries.

The approach:
- The `useBreakpoint()` hook drives inline-style decisions in JSX. Breakpoint-sensitive props are passed down from the App level or a module-level React context.
- The `bap-personality-styles` block gets new CSS rules for the rail layout: vertical `.bap-nav-pill` styles, rail-specific `.bap-nav-icon` positioning, and pointer-device hover affordances.
- `@media (pointer: fine)` rules in the injected block handle pointer-device hover states (see Bug 4 below).
- No new dependencies. No container queries (the root column is already the constraint; container queries add complexity without benefit).

### Concrete bugs Phase 1 must fix

**Bug 1 — FAB horizontal position hardcoded to 480 px column.**
The Places FAB uses `right: "max(20px, calc(50% - 240px + 20px))"` where 240 = 480/2. Widening the shell to a 640 or 720 px column (or eliminating the shell cap in the rail layout) moves the FAB out into the parchment wing, not the right edge of the content. Fix: the FAB's `right` must track the active column or content-pane width. In the phone layout, the current expression is correct and should be preserved exactly. In the tablet layout with a wider shell, the 240 should become half the current shell width. In the rail layout, the FAB repositions relative to the content pane's right edge (see Section 5).

**Bug 2 — PlacesMap.jsx: `invalidateSize()` fires only once, not on resize.**
The current `PlacesMap.jsx` calls `map.invalidateSize()` once at mount (approximately line 194). Rotating an iPad or dragging a Split View divider changes the map container's dimensions; without a follow-up `invalidateSize()`, the tile grid is mismatched and grey tiles appear until the user pans. Fix: attach a `ResizeObserver` to the map container div that calls `map.invalidateSize()` on any dimension change. Clean up the observer in the `useEffect` return. This also fixes the resize that will happen when the rail layout first activates.

**Bug 3 — PlacesMap.jsx: height cap `520px` clamps the proposed `76vh` to a no-op on target iPads.**
The map height is `min(68vh, 520px)`. On an iPad in landscape (~768 pt tall), 68vh = ~522 pt; the 520 px cap clips it to 520 px anyway, so there is no change. A proposed `76vh` increases the uncapped value but the cap still clamps at 520 px. In the rail layout, the map becomes a side panel filling the pane height (not a height-capped inline element), which supersedes the vh tweak entirely. Fix for Phase 1: in the standalone map view (not master-detail), lift the cap to ~700 px at tablet breakpoints so the vh value actually lands. In Phase 2, the map becomes the right panel of a master-detail and the height is determined by the pane height, not a vh value.

**Bug 4 — No pointer-device hover affordances.**
`.bap-press` is a scale-on-tap idiom that has no effect for mouse/trackpad users. The Director uses an iPad with a Magic Keyboard and trackpad; browser-tab desktop use is also common. Interactive elements (filter pills, accordion headers, nav tabs, card buttons, action buttons) need `@media (pointer: fine)` hover states: a background tint or border color change that signals "this is clickable" before the click. Keyboard navigation already works via `useDialogA11y` (focus-trap, Escape-to-close). Hover styles are a CSS-only addition to the `bap-personality-styles` block.

**Bug 5 — Overlay and toast widths fixed at 480/448 px.**
`<BottomSheet>` (`maxWidth: 480`), `<ProfileModal>` (`maxWidth: 480`), `<DirectorResponsesView>` (`maxWidth: 480`), `<DirectorPlacesView>` (`maxWidth: 480`), and `<PlaceToast>` (`maxWidth: 448`) are all hardcoded to phone widths. At tablet breakpoints these look like narrow strips centered in a wide screen. Fix: overlay widths track the active content-pane width. In the rail layout, BottomSheets become centered dialogs or right-side drawers (see Section 5), so their `maxWidth` is replaced by dialog-specific sizing.

### iPhone landscape horizontal safe-area (deferred to Phase 1)

`viewport-fit=cover` is already in the `index.html` viewport meta (added 2026-06-13c). The safe-area top and bottom are already consumed via `--safe-top` and `--bap-nav-pad-bottom`. There is currently no horizontal safe-area padding.

This was originally scoped into Phase 0 on the theory that unlocking landscape would expose a clip-behind-the-notch bug. On closer reading of the layout, that does not happen while the app is a centered narrow column, and adding the padding now would be actively wrong. The root shell is `maxWidth: 480, margin: 0 auto` (App.jsx). On a landscape iPhone (~932 pt wide), the 480 pt column is centered with roughly 226 pt of margin on each side, so the camera housing (inset ~44-59 pt from the screen edge) sits in the empty margin, not over content; nothing clips. Adding `padding-left: env(safe-area-inset-left)` to the inner content div in that state would shove content ~47 pt inward on one side, asymmetrically, flipping with rotation direction; that is a visible regression, not a fix.

Horizontal safe-area padding becomes correct (and necessary) only once content actually reaches the screen edge, which is the wider-column and rail layouts in Phase 1. It is therefore part of Phase 1, applied at the surfaces that go edge-to-edge, not a blanket padding on the centered column. Phase 0 ships the orientation unlock alone; the centered column already does not clip in landscape.

### Bottom nav regression surface

The bottom nav has been through multiple careful iterations:
- In-flow flex child (not `position: fixed`), since 2026-06-14b.
- `height: 100vh` on the root shell (not `100dvh`), since 2026-06-14c.
- `--safe-top` and `--bap-nav-pad-bottom` CSS variables with `env(safe-area-inset-*)`, since 2026-06-13c.
- The `.bap-nav-pill` CSS `bottom` tracking `--bap-nav-pad-bottom`, not a fixed pixel value.

Any Phase 1 change that introduces a conditional between "in-flow bottom nav" and "left rail" must leave the phone path byte-identical to the current code. The rail activates ONLY when `useBreakpoint()` returns `"tablet"` or `"wide"`, both of which require landscape orientation AND the height floor (Section 6). On any portrait device (phone or iPad) and on any landscape iPhone, the hook returns `"phone"` or `"tablet-portrait"`, and the existing bottom nav renders unchanged. The `"tablet-portrait"` tier widens the content column but does not touch the nav at all.

The `100vh` behavior in iPad Safari browser-tab (where the address bar consumes some visual height) is a known quirk to watch during testing; it is not a bug introduced by this work, and the fix (tolerating the address bar overlap) is to note it as a known non-issue rather than attempt to work around it with `100dvh`.

---

## 7. Phased Roadmap

### Phase 0: Orientation safety baseline (ships to `main`, no sign-off required)

**What ships:**
1. `manifest.json`: change `"orientation": "portrait"` to `"orientation": "any"`. One-line change. This is the entire code change in Phase 0.
2. Re-verify the bottom nav on iPhone portrait (must be byte-identical; this is a zero-tolerance check) and on iPhone landscape (must not clip or break). Use Preview MCP for a first pass; then real-device verification on an iPhone before merging to `main`.
3. Note the iPad Safari browser-tab `100vh` address-bar quirk in testing notes; do not attempt to fix it.

(The horizontal safe-area padding originally listed here was moved to Phase 1; see the "iPhone landscape horizontal safe-area" subsection in Section 6. While the layout is a centered narrow column, the notch sits in the empty side margin, so the padding is unnecessary and, applied to the centered content div, would create a visible asymmetric inset in landscape.)

**What does NOT change:** any visual layout, any column width, any component, any app logic, the service worker, `CACHE_VERSION`.

**Effort:** S (one-line code change; the time is in on-device verification). These estimates are floors, not ceilings.
**Risk:** Low. The orientation manifest change has zero visual impact; it just permits rotation where it was blocked for Android PWAs. The only thing to confirm is that landscape on an iPhone shows the centered column without breaking, which the layout already handles.
**Shipping path:** Build on a branch, push for a Vercel preview, rotate-test a real iPhone and iPad against the preview, then merge to `main`. The change is low-risk but the whole point of Phase 0 is "landscape does not break," which only a real-device rotation confirms.
**Android PWA note:** Existing Android PWA installs will not auto-unlock landscape rotation after the manifest update. Students would need to uninstall and reinstall the PWA. This is a known caveat of how PWA manifests work; it does not require any action.

---

### Phase 1: The rail (branch + design mockup + Director sign-off before code starts)

**Sequence:** (a) Design a mockup of the rail layout (rail column, header treatment, vertical pill animation, BottomSheet-as-dialog, FAB position). (b) Director reviews and signs off. (c) Code starts on a branch. (d) Thorough testing matrix (see below). (e) Merge to `main`.

**What ships:**
1. `useBreakpoint()` hook with the aspect-ratio-aware condition (width ≥768 AND height ≥600 for tablet; width ≥1024 AND height ≥600 for wide). Placed near the top of `App.jsx` alongside other helpers.
2. **The rail itself:** at `"tablet"` or `"wide"`, the root shell switches to `flex-direction: row`. Left rail column (~64–72 px, Pep Blue background, stacked icons, vertical accent bar). Content pane fills remaining width.
3. **Vertical pill animation:** new CSS in `bap-personality-styles` for the vertical left-edge bar, using `translateY` and measuring `offsetTop` via `navBtnRefs`. Replaces (conditionally) the horizontal pill. Phone path unchanged.
4. **BottomSheets become centered dialogs at tablet+:** a `mode` prop (or internal breakpoint-aware switch) in `<BottomSheet>` selects between bottom-slide (phone) and centered-overlay (tablet+). The slide animation remains for phone; a fade-in or center-expand for tablet.
5. **FAB formula corrected** (Bug 1): the `right` value tracks the content pane width, not a hardcoded 240 px. In the rail layout, the FAB sits in the content pane's bottom-right.
6. **PlacesMap.jsx: ResizeObserver** (Bug 2): attach to the map container, call `map.invalidateSize()` on dimension change. Clean up on unmount.
7. **PlacesMap.jsx: height cap lifted** (Bug 3): at tablet+, raise the `520px` cap to ~700 px (or remove the cap in the rail-layout context where the map fills pane height).
8. **Overlay widths widened** (Bug 5): `<ProfileModal>`, `<DirectorResponsesView>`, `<DirectorPlacesView>` fill the content pane at tablet+, not capped at 480 px.
9. **`<PlaceToast>` position corrected**: centers over the content pane, not the viewport, at tablet+.
10. **Text-measure cap**: text-heavy content blocks (FAQ answer text, Calendar event descriptions, Holiday descriptions, prompt descriptions, Health notes) get `maxWidth: "65ch"` or similar to keep reading measure in the 60–80 ch range, regardless of pane width.
11. **Pointer-device hover affordances** (Bug 4): `@media (pointer: fine)` rules in `bap-personality-styles` for filter pills, nav icons, card action buttons, accordion headers.
12. **Director dashboards widened**: `<DirectorResponsesView>` and `<DirectorPlacesView>` fill the content pane width at tablet+, giving the Director a real working surface for response tallies.
13. **Desktop-browser outer cap**: root shell gets a `maxWidth` guard at very wide viewport (e.g., 1440 px) with `margin: 0 auto` so the rail layout does not stretch absurdly on a large monitor.

**What does NOT change in Phase 1:** tab routing, data fetching, `CACHE_VERSION`, sheet schema, Apps Script, all component logic, all personality colors, type scale, the auth gates (stay at 480 px), the pull-to-refresh gesture.

**Effort:** L–XL (5–8 days coding + 2–3 days on-device testing across the matrix below). These are floors; the rail is a significant undertaking.
**Risk:** High. The bottom nav has been hard-won over multiple iterations. Introducing a conditional code path between in-flow bottom nav and left rail is the largest regression surface in the entire project. Every phone test after this change is a regression check first. The branch provides a clean rollback unit.
**Ship-gating:** Branch. Merge to `main` only after the testing matrix is complete and the Director has demoed the tablet layout on a real iPad. Never force-push `main`.

**Testing matrix for Phase 1 (minimum):**

| Device/Context | What to check |
|---|---|
| iPhone portrait, installed PWA | Bottom nav byte-identical; no regression; all tabs, overlays, FAB |
| iPhone portrait, Safari browser-tab | Same as above |
| iPhone landscape, installed PWA | Centered column does not break; notch sits in the side margin (no clip); bottom nav visible; hook returns `"phone"` |
| iPad mini portrait, installed PWA | Bottom nav retained (NOT rail); wider single column; denser grids; hook returns `"tablet-portrait"` |
| iPad mini landscape, installed PWA | Rail renders; accent bar slides; BottomSheets are dialogs; FAB in right position; hook returns `"tablet"` |
| iPad regular landscape, installed PWA | Rail + wider content pane; PlacesMap tiles after rotate; text measure cap on FAQ; hook returns `"wide"` |
| Rotate iPad during use | Portrait: bottom nav; landscape: rail. Rotation reflows cleanly. No white flash or broken nav pill. |
| iPad regular, Safari browser-tab | Same rail layout; note address-bar `100vh` quirk; not a bug, just note it |
| Director dashboards on iPad landscape | Width fills pane; response tallies readable; vetting queue usable |
| Pointer/trackpad on iPad | Hover states on pills, nav icons, buttons via `pointer: fine` |
| Android tablet, Chrome browser | Must not break; rail renders in landscape or falls back gracefully |
| Delete + reinstall PWA on iOS | New build loads; confirm no stale-cache issues per project memory |

---

### Phase 2: Master-detail (branch, per-view, follows Phase 1)

**Prerequisite:** Phase 1 is merged to `main` and the rail is stable.

**What ships (three separate sub-phases, each on its own branch, sequenced in order):**

**2a — Local master-detail (high confidence):**
At `"wide"` in landscape, `<LocalView>`'s Places listing (or any category listing) becomes the left panel (~45% of content pane width); the Leaflet map fills the right ~55%. Tapping a pin opens the place card inline in the right panel (not a BottomSheet). The list and the map share selection state. The "Lista / Mapa" toggle collapses to a "show/hide map" affordance when in master-detail mode, since both are already visible.

**2b — Calendar master-detail (high confidence):**
At `"wide"` in landscape, the Semester Calendar shows the month-grouped list on the left (~35%); tapping a day reveals the day's events in a right panel (~65%). The "Hoy · Today" anchor scroll adapts to scroll the left panel.

**2c — Schedule master-detail (in scope, lowest confidence — design must be validated before code):**
Schedule already has a Mon-Fri grid that uses horizontal space well, so the two-pane split is not pre-determined. Possible approaches: a week-list on the left with a day-detail right panel; or simply allowing the Mon-Fri grid to breathe across the full content pane in landscape without a forced split. The right approach must be settled at a mockup review during Phase 2 planning. Do not start 2c code until the two-pane design for Schedule has been validated and the Director confirms the split adds value over a wide grid. Sequence 2c after 2a and 2b are stable. All three sub-phases apply only at `"wide"` in landscape; portrait iPad is unaffected.

**What does NOT change in Phase 2:** Phase 1's foundation (rail, breakpoint hook, FAB, overlays), all phone behavior, all portrait iPad behavior, data fetching, `CACHE_VERSION`.

**Effort:** L–XL per sub-phase (3–5 days each for 2a/2b; 2c depends on what the mockup settles). Each requires a design mockup pass before coding. Selection state sharing between panels is the primary technical challenge for 2a and 2b.
**Risk:** Moderate per sub-phase in isolation (each is scoped to one view); high if sub-phases are attempted together. Ship 2a first, stabilize, then 2b, then 2c once its design is locked.
**Ship-gating:** Branch per sub-phase, merge after real-iPad testing. Director demos before merge.

---

## 8. Open Questions (still genuinely open after the six decisions)

These are the questions where the Director's input is needed at specific moments. Questions that were formerly open and have since been resolved are noted below each section heading for completeness.

**Resolved (no longer open):**
- Portrait iPad: rail or bottom nav? → DECIDED: bottom nav in portrait (Decision 5).
- Master-detail aggression / activate on portrait? → DECIDED: landscape-only (Decision 5).
- Rail color (navy vs. parchment)? → DECIDED: navy Pep Blue (Decision 4).

**At the design-mockup review (before Phase 1 code starts):**

1. **Rail width and label treatment:** 64-72 px for icons-only, or wider (100-120 px) to show text labels beneath each icon? Labels make the rail less ambiguous but take more horizontal space from the content pane. The mockup should show both; you pick.

2. **Header treatment in the rail layout:** Does the Pep Blue navy gradient sit above the content pane only (leaving the rail column solid Pep Blue top-to-bottom), or does a unified header span the full top (above both the rail and the content pane)? The two-surface approach is simpler; the unified header looks more polished but requires more layout decisions.

3. **BottomSheet-as-dialog: center or right-side drawer?** At tablet widths, the weather sheet, currency calculator, and prompt form could become centered overlay cards (simpler) or right-side drawers that slide in from the right (feels more native on iPad, but more animation work). Pick one style to standardize; mixing the two would be visually inconsistent.

**At Phase 2 planning (after Phase 1 ships):**

4. **Schedule master-detail design (2c):** What is the master and what is the detail? A week-list left panel plus a day-detail right panel is one option; letting the Mon-Fri grid breathe across the full content pane without a forced split is another. This must be settled at a mockup review before any 2c code is written.

5. **Does desktop/laptop browser use warrant a distinct treatment?** At 1200+ px laptop viewport widths, the rail layout renders by the same breakpoint logic. A distinct "desktop" tier with a wider rail (labels visible), a different header treatment, or a persistent Director-dashboard sidebar could be worth defining. Or the rail layout as designed is sufficient for the occasional browser-tab use case and no extra tier is needed.

---

*This document was last revised 2026-06-15 (v3). Decisions locked in this revision: navy (Pep Blue) rail color, with per-tab color identity concentrated on the active tab via a left-accent bar; portrait iPad retains the bottom nav, with the rail and master-detail activating together only in landscape (the breakpoint hook now returns a `"tablet-portrait"` tier for portrait iPads); master-detail scope expanded to Local, Calendar, and Schedule, with Schedule sequenced last and its two-pane design to be validated at the Phase 2 mockup stage. Two previously open questions (portrait iPad nav and master-detail portrait aggression) are resolved. No source files have been modified. Phase 1 requires a design mockup and Director sign-off before code starts.*
