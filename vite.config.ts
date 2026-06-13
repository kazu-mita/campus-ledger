import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const isGitHubPages = Boolean(process.env.GITHUB_ACTIONS);
const base = isGitHubPages ? "/campus-ledger/" : "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.svg"],
      manifest: {
        name: "Campus Ledger 簿記3級",
        short_name: "Campus Ledger",
        description: "大学経費担当として14日で簿記3級を学ぶオフライン学習アプリ",
        theme_color: "#ffffff",
        background_color: "#f2f2f7",
        display: "standalone",
        start_url: base,
        scope: base,
        lang: "ja",
        icons: [
          {
            src: `${base}icons/icon.svg`,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: `${base}icons/icon-maskable.svg`,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
