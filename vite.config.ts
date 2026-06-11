/// <reference types="vitest" />
import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Mary's Thrift Finance",
        short_name: "Mary's Thrift",
        description: "Secure Thrift & Loan Management",
        theme_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        id: "/",
        launch_handler: {
          client_mode: "focus-existing",
        },
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true,
  },
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-core": [
            "react",
            "react-dom",
            "react-router-dom",
            "lucide-react",
            "framer-motion",
          ],
          "vendor-mui": [
            "@mui/material",
            "@mui/icons-material",
            "@emotion/react",
            "@emotion/styled",
          ],
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          "vendor-charts": ["recharts", "date-fns"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
