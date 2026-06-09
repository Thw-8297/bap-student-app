// ─── Places map (SPIKE, online-only) ───────────────────────────────
// A throwaway-grade Leaflet map for the Local > Places listing. Lives in
// its own file ON PURPOSE: App.jsx pulls it in via React.lazy(), so Leaflet
// (~42 KB gz) + its CSS land in a separate chunk that only downloads when a
// student first taps "Mapa / Map." First paint, the main bundle, and the
// offline shell are untouched.
//
// Uses the raw Leaflet API (no react-leaflet) to avoid a second dependency.
// Markers are divIcons in the place's category color, so we sidestep
// Leaflet's broken-default-marker-image problem entirely (no L.Icon.Default
// path fixups needed). Tiles are CARTO Positron raster (no key at cohort
// volume); offline this view is intentionally not reachable — the list stays
// the canonical offline experience, and App.jsx gates the toggle on
// navigator.onLine.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BA_CENTER = [-34.6037, -58.3816]; // CABA fallback center

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Best-effort Maps deep link for the popup: prefer a curated maps_url, else
// a Google Maps search by coordinates (always present for a pinned place).
function mapsHref(p) {
  if (p.maps_url && /^https?:\/\//i.test(p.maps_url)) return p.maps_url;
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

// A small teardrop pin in the category color: colored disc + white ring +
// soft shadow, with a downward tail so it points at the coordinate.
function makePin(color) {
  return L.divIcon({
    className: "bap-place-pin",
    html: `<span style="
      display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${color};
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 22],   // tip of the tail sits on the point
    popupAnchor: [0, -20],
  });
}

export default function PlacesMap({ places = [], userLoc = null }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;

    const map = L.map(elRef.current, {
      center: BA_CENTER,
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
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

    const located = places.filter((p) => p.lat != null && p.lng != null);
    const latlngs = [];

    located.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: makePin(p._color || "#00205B") }).addTo(map);
      const href = mapsHref(p);
      marker.bindPopup(
        `<div style="font-family:'Roboto',sans-serif;min-width:150px;max-width:220px;">
           <div style="font-family:'EB Garamond',serif;font-weight:700;font-size:15px;color:#00205B;line-height:1.2;">${escapeHtml(p.name)}</div>
           <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.6px;color:${p._color || "#7A99AC"};margin-top:2px;">${escapeHtml(p._catLabel || "")}${p.neighborhood ? " · " + escapeHtml(p.neighborhood) : ""}</div>
           ${p.why ? `<div style="font-size:12.5px;color:#425563;margin-top:5px;line-height:1.45;">${escapeHtml(p.why)}</div>` : ""}
           <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:7px;font-family:'DM Mono',monospace;font-size:11px;color:#0057B8;text-decoration:none;">📍 Abrir en Maps</a>
         </div>`
      );
      latlngs.push([p.lat, p.lng]);
    });

    if (userLoc) {
      L.circleMarker([userLoc.lat, userLoc.lng], {
        radius: 6, color: "#fff", weight: 2, fillColor: "#0057B8", fillOpacity: 1,
      }).addTo(map).bindPopup("Estás acá / You are here");
      latlngs.push([userLoc.lat, userLoc.lng]);
    }

    if (latlngs.length >= 2) {
      map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 16 });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 15);
    }

    // iOS Safari sizes the parent after mount; nudge Leaflet to remeasure.
    const t = setTimeout(() => map.invalidateSize(), 120);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // Rebuild when the located set or the user fix changes. Place identity is
    // captured by id+coord signature so a near-you re-sort (same set) doesn't
    // thrash the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    places.map((p) => `${p.place_id}:${p.lat},${p.lng}`).join("|"),
    userLoc ? `${userLoc.lat},${userLoc.lng}` : "",
  ]);

  return (
    <div
      ref={elRef}
      style={{
        height: "min(68vh, 520px)",
        width: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #B9D9EB",
      }}
    />
  );
}
