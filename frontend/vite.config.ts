import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Se registra a mano en main.tsx (virtual:pwa-register) para poder
      // recargar la app sola cuando hay una versión nueva — con
      // injectRegister por defecto, el script inyectado solo hacía
      // `serviceWorker.register(...)` sin escuchar cuándo el SW nuevo ya
      // está listo, así que una pestaña abierta podía quedar mostrando un
      // bug ya arreglado hasta que el usuario la cerrara y reabriera.
      injectRegister: false,
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
