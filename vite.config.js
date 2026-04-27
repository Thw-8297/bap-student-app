import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ============================================================
// Vite config for the BAP student app.
//
// The VitePWA plugin generates a Workbox-based service worker
// that precaches the app shell (JS bundle, fonts, icons, HTML)
// so the app launches with zero network on subsequent opens.
//
// Strategy:
//   - registerType: 'autoUpdate' with clientsClaim + skipWaiting
//     so a freshly deployed build activates on the next open
//     with no in-app refresh prompt. Students never see a
//     "new version available" UI; the update is silent.
//   - injectRegister: 'auto' so the plugin wires the SW
//     registration directly into index.html. No manual
//     registerSW() call needed in main.jsx.
//   - manifest: false so the existing public/manifest.json
//     stays the single source of truth for home-screen install
//     behavior. The plugin focuses purely on the service worker.
//   - Workbox runtime caching covers Google Fonts:
//     StaleWhileRevalidate for the stylesheet, CacheFirst for
//     the WOFF2 files, both with one-year expirations.
//   - Apps Script, Open-Meteo, and dolarapi calls are NOT
//     cached at the SW layer. They already have well-tuned
//     localStorage caches in App.jsx (bap-app-cache and
//     bap-today-cache); adding a second cache layer would
//     just create surprising staleness.
// ============================================================

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      strategies: "generateSW",
      manifest: false,
      workbox: {
        // Precache the full built shell. The default extension list
        // already covers JS, CSS, HTML, and most images; we extend
        // it explicitly so all fonts and the manifest itself are
        // included, regardless of how Vite hashes their filenames.
        globPatterns: [
          "**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,gif,woff,woff2,json,webmanifest}",
        ],
        // SPA fallback: any navigation request that doesn't match a
        // precached file falls back to index.html so deep links
        // (e.g., /local, /faq) still work offline.
        navigateFallback: "/index.html",
        // Don't try to fall back for asset requests; only navigations.
        navigateFallbackDenylist: [/^\/api\//, /\.[a-z0-9]{2,5}$/i],
        runtimeCaching: [
          // Google Fonts CSS — small, occasionally updated.
          // StaleWhileRevalidate gives instant load with quiet refresh.
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "bap-google-fonts-css",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts WOFF2 files — large, content-addressed,
          // basically immutable. CacheFirst is the right call.
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "bap-google-fonts-files",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Wipe old precaches on activation so we don't accumulate
        // stale revisions of asset bundles across deploys.
        cleanupOutdatedCaches: true,
        // Take control of open clients immediately on activation
        // so a refresh-free update propagates as fast as possible.
        clientsClaim: true,
        skipWaiting: true,
      },
      // Service worker is disabled in dev by default so HMR stays
      // clean. Flip to true if you ever need to debug SW behavior
      // against the dev server.
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
