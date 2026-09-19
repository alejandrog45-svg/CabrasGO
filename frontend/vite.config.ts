import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png"],
      manifest: {
        name: "CabrasGo",
        short_name: "CabrasGo",
        description: "Movilidad para Las Cabras, Peumo y la cuenca del Lago Rapel",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/logo.png", sizes: "240x240", type: "image/png" },
          { src: "/logo.png", sizes: "240x240", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\/v1/, /^\/socket\.io/],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api/v1": "http://localhost:8080",
      "/socket.io": {
        target: "http://localhost:8080",
        ws: true,
      },
    },
  },
});
