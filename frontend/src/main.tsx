import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import { Login } from "./pages/Login";
import { GuiaQR } from "./pages/GuiaQR";
import { PasajeroApp } from "./pages/pasajero/PasajeroApp";
import { ConductorApp } from "./pages/conductor/ConductorApp";
import { AdminApp } from "./pages/admin/AdminApp";

// Registro manual del service worker (ver vite.config.ts, injectRegister:
// false) para poder avisar y recargar solo cuando hay una versión nueva —
// antes una pestaña abierta podía seguir mostrando un bug ya arreglado en
// producción indefinidamente. Chequea cada hora (útil para el conductor,
// que deja la app abierta todo el turno) y al detectar una versión nueva
// muestra un aviso breve antes de recargar, para no cortar de golpe una
// pantalla que el usuario esté mirando (ej. mitad de un viaje).
if ("serviceWorker" in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      const banner = document.createElement("div");
      banner.textContent = "CabrasGo se actualizó — recargando en unos segundos...";
      banner.style.cssText =
        "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#0f766e;color:#fff;" +
        "text-align:center;padding:10px 16px;font:600 13px system-ui,sans-serif;";
      document.body.appendChild(banner);
      setTimeout(() => updateSW(true), 3000);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/guia" element={<GuiaQR />} />
        <Route path="/pasajero/*" element={<PasajeroApp />} />
        <Route path="/conductor/*" element={<ConductorApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
