import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "student-icon-192.png", "student-icon-512.png"],
      manifest: {
        name: "StudySpace — Student Academic Planner",
        short_name: "SS Student",
        id: "https://mayendzeke.github.io/planner/",
        description: "An offline-first planner for school, college and university.",
        theme_color: "#242938",
        background_color: "#242938",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        start_url: "/planner/",
        scope: "/planner/",
        prefer_related_applications: false,
        icons: [
          { src: "/planner/student-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/planner/student-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "/planner/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
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
