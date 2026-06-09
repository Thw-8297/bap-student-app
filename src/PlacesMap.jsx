// ─── Places map (Local > Places, online-only) ──────────────────────
// Leaflet map for a Places listing. Lives in its own file ON PURPOSE:
// App.jsx pulls it in via React.lazy(), so Leaflet (~45 KB gz) + its CSS
// land in a separate chunk that only downloads when a student first taps
// "Mapa / Map." First paint, the main bundle, and the precached offline
// shell stay untouched (the chunk is also excluded from the SW precache in
// vite.config.js, since the map is online-only).
//
// Uses the raw Leaflet API (no react-leaflet) to avoid a second dependency.
// Markers are divIcons — colored category discs with the category's own glyph
// component mounted into the disc via react-dom/client's createRoot — so we
// sidestep Leaflet's broken-default-marker problem and stay on-brand. We mount
// the live glyph component (rather than pre-rendering to an SVG string) so the
// pins never diverge from the app's icon set, and so this chunk doesn't have to
// pull in react-dom/server (~40 KB gz) just to stringify a dozen glyphs —
// react-dom/client is already in the main bundle, so it's shared at no chunk
// cost. Casa Holden (the Pepperdine campus) is always anchored with a distinct
// Pep-Blue, orange-ringed pin. Tiles are CARTO Positron raster (no key at
// cohort volume); offline this view isn't reachable (App.jsx gates the toggle
// on navigator.onLine), so the list stays the canonical offline experience.
import { useEffect, useRef } from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BA_CENTER = [-34.6037, -58.3816]; // CABA fallback center

// Leaflet's default .leaflet-div-icon paints a white box + gray border behind
// every divIcon; strip it so our discs float clean. Also style the campus's
// permanent label on-brand (Pep-Blue chip, no arrow). Injected once, idempotent.
function injectMapStyles() {
  if (typeof document === "undefined" || document.getElementById("bap-leaflet-styles")) return;
  const el = document.createElement("style");
  el.id = "bap-leaflet-styles";
  el.textContent = `
    .leaflet-div-icon{background:transparent;border:none;}
    .bap-campus-label{background:#00205B;color:#fff;border:none;border-radius:6px;
      font-family:'DM Mono',monospace;font-size:10px;font-weight:500;padding:2px 7px;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);white-space:nowrap;}
    .bap-campus-label::before{display:none;}
  `;
  document.head.appendChild(el);
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Best-effort Maps deep link for a popup: prefer a curated maps_url, else a
// Google Maps search by coordinates.
function mapsHref(p) {
  if (p.maps_url && /^https?:\/\//i.test(p.maps_url)) return p.maps_url;
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

// The disc element: colored circle + ring + soft shadow, flex-centered so a
// glyph (a static SVG string, or a React component mounted via createRoot)
// sits in the middle. Returned as an HTMLElement so a React root can be
// attached to it; Leaflet's divIcon accepts an element and appends it as-is.
function makeDiscEl({ size, bg, ringColor, ringWidth }) {
  const el = document.createElement("div");
  el.style.cssText =
    `width:${size}px;height:${size}px;border-radius:50%;background:${bg};` +
    `border:${ringWidth}px solid ${ringColor};box-shadow:0 1px 5px rgba(0,0,0,0.4);` +
    `box-sizing:border-box;display:flex;align-items:center;justify-content:center;`;
  return el;
}

// Wrap a disc element in a Leaflet divIcon, anchored at center.
function discIcon(el, size) {
  return L.divIcon({
    className: "bap-place-pin",
    html: el,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 2],
  });
}

// White mortarboard (graduation cap) for the campus pin.
const CAP_SVG =
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
     <path d="M12 3 1 8l11 5 9-4.09V14h2V8L12 3z"/>
     <path d="M5 11.5V15c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.5l-7 3.18-7-3.18z"/>
   </svg>`;

export default function PlacesMap({ places = [], userLoc = null, campus = null, onSelectPlace }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  // Hold the latest onSelectPlace so markers (built once per data signature)
  // always call the current handler rather than a stale closure.
  const selectRef = useRef(onSelectPlace);
  useEffect(() => { selectRef.current = onSelectPlace; }, [onSelectPlace]);

  // Hold the latest place objects keyed by place_id. Markers are rebuilt
  // only when the id+coords signature changes, so a background fetchPlaces
  // refresh that edits a place's name/why/hours (same id, same coords)
  // would otherwise leave the click handler closing over the stale object.
  // Looking up by id at click time hands the freshest record to the card.
  const placesByIdRef = useRef({});
  useEffect(() => {
    const m = {};
    for (const p of places) m[p.place_id] = p;
    placesByIdRef.current = m;
  }, [places]);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    injectMapStyles();

    const map = L.map(elRef.current, {
      center: BA_CENTER, zoom: 13, zoomControl: true, attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(map);

    const latlngs = [];
    // React roots mounted into place-pin discs; unmounted on cleanup.
    const roots = [];

    // Campus anchor — distinct from category pins: larger, Pep-Blue, orange
    // ring, mortarboard glyph (a static SVG string), with a permanent label so
    // it always reads as home base.
    if (campus && campus.lat != null && campus.lng != null) {
      const campusEl = makeDiscEl({ size: 38, bg: "#00205B", ringColor: "#E35205", ringWidth: 3 });
      campusEl.innerHTML = CAP_SVG;
      const m = L.marker([campus.lat, campus.lng], {
        icon: discIcon(campusEl, 38),
        zIndexOffset: 1000,
      }).addTo(map);
      m.bindPopup(
        `<div style="font-family:'Roboto',sans-serif;min-width:150px;max-width:230px;">
           <div style="font-family:'EB Garamond',serif;font-weight:700;font-size:15px;color:#00205B;line-height:1.2;">${escapeHtml(campus.name)}</div>
           <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.6px;color:#E35205;margin-top:2px;">${escapeHtml(campus.subtitle || "")}</div>
           ${campus.address ? `<div style="font-size:12.5px;color:#425563;margin-top:5px;line-height:1.45;">${escapeHtml(campus.address)}</div>` : ""}
           <a href="${mapsHref(campus)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:7px;font-family:'DM Mono',monospace;font-size:11px;color:#0057B8;text-decoration:none;">📍 Abrir en Maps</a>
         </div>`
      );
      m.bindTooltip(escapeHtml(campus.name), {
        permanent: true, direction: "right", offset: [14, 0], className: "bap-campus-label",
      });
      latlngs.push([campus.lat, campus.lng]);
    }

    const located = places.filter((p) => p.lat != null && p.lng != null);
    located.forEach((p) => {
      const color = p._color || "#00205B";
      // Mount the live category glyph component into the disc as a white SVG.
      const discEl = makeDiscEl({ size: 28, bg: color, ringColor: "#fff", ringWidth: 2 });
      if (p._Icon) {
        const root = createRoot(discEl);
        root.render(createElement(p._Icon, { size: 15, color: "#fff" }));
        roots.push(root);
      }
      const marker = L.marker([p.lat, p.lng], {
        icon: discIcon(discEl, 28),
      }).addTo(map);
      // Tap → open the real place card (with a working save toggle) in App.
      // Look the place up by id so a background refresh's edits are reflected.
      marker.on("click", () => {
        if (selectRef.current) selectRef.current(placesByIdRef.current[p.place_id] || p);
      });
      // Light hover/tap context without committing to the sheet.
      marker.bindTooltip(escapeHtml(p.name), { direction: "top", offset: [0, -14] });
      latlngs.push([p.lat, p.lng]);
    });

    if (userLoc) {
      L.circleMarker([userLoc.lat, userLoc.lng], {
        radius: 6, color: "#fff", weight: 2, fillColor: "#0057B8", fillOpacity: 1,
      }).addTo(map).bindPopup("Estás acá / You are here");
      latlngs.push([userLoc.lat, userLoc.lng]);
    }

    if (latlngs.length >= 2) {
      map.fitBounds(latlngs, { padding: [44, 44], maxZoom: 16 });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 15);
    }

    // iOS Safari sizes the parent after mount; nudge Leaflet to remeasure.
    const t = setTimeout(() => map.invalidateSize(), 120);

    return () => {
      clearTimeout(t);
      // Defer root unmounts a microtask so React isn't asked to unmount one
      // root while mid-render of another (a harmless but noisy warning).
      roots.forEach((r) => queueMicrotask(() => { try { r.unmount(); } catch { /* detached */ } }));
      map.remove();
      mapRef.current = null;
    };
    // Rebuild when the located set, the user fix, or the campus anchor change.
    // A place's identity is its id+coords, so a near-you re-sort (same set)
    // doesn't thrash the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    places.map((p) => `${p.place_id}:${p.lat},${p.lng}`).join("|"),
    userLoc ? `${userLoc.lat},${userLoc.lng}` : "",
    campus ? `${campus.lat},${campus.lng}` : "",
  ]);

  return (
    <div
      ref={elRef}
      style={{
        height: "min(68vh, 520px)", width: "100%",
        borderRadius: 14, overflow: "hidden", border: "1px solid #B9D9EB",
      }}
    />
  );
}
