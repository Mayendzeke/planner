import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Studyspace — Student Academic Planner",
        short_name: "Studyspace",
        description: "An offline-first planner for school, college and university.",
        theme_color: "#0a1020",
        background_color: "#0a1020",
        display: "standalone",
        orientation: "portrait",
        start_url: "/planner/",
        scope: "/planner/",
        icons: [{ src: "/planner/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }]
      },
      workbox: {
        navigateFallback: "/planner/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,mjs,wasm,webmanifest}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ],
  base: "/planner/"
});
