import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getUser, clearSession } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { formatClp, formatPatente } from "../../lib/format";
import { LiveMap } from "../../components/LiveMap";
import { AdBanner } from "../../components/AdBanner";
import { ManualModal } from "../../components/ManualModal";
import { PASAJERO_MANUAL } from "../../lib/manuals";
import { useInstallPrompt } from "../../lib/useInstallPrompt";
import { fetchRoute } from "../../lib/routing";

interface Landmark {
  code: string;
  name: string;
  lat: number;
  lng: number;
  note: string;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

interface FareBreakdown {
  baseFlag: number;
  pavedCost: number;
  dirtCost: number;
  timeCost: number;
  subtotal: number;
  dynamicMultiplier: number;
  fuelFactor: number;
  estimatedMinutes: number;
  totalFareClp: number;
}

interface QuoteCategory {
  category: "STANDARD_SEDAN" | "RURAL_4X4_XL";
  etaMinutes: number;
  totalFareClp: number;
  recommended: boolean;
  breakdown: FareBreakdown;
}

interface Quote {
  distanceTotalKm: number;
  distanceDirtKm: number;
  categories: QuoteCategory[];
  geofenceZoneName: string | null;
  dynamicMultiplier: number;
  fuelPriceClp: number;
}

type Screen = "home" | "categories" | "dispatching" | "tracking" | "payment" | "rating" | "done" | "history";

const CATEGORY_LABEL: Record<string, string> = {
  STANDARD_SEDAN: "CabrasGo Estándar",
  RURAL_4X4_XL: "CabrasGo Rural 4x4",
};

const FEEDBACK_TAGS = [
  "Conducción segura en caminos de tierra",
  "Auto limpio y fresco",
  "Puntualidad",
  "Muy amable",
];

export function PasajeroApp() {
  const navigate = useNavigate();
  const user = getUser();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [quickAccess, setQuickAccess] = useState<Landmark[]>([]);
  const [origin, setOrigin] = useState<Landmark | null>(null);
  const [destination, setDestination] = useState<Landmark | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedCategory, setSelectedCategory] = useState<QuoteCategory | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const [live, setLive] = useState<any>(null);
  const [error, setError] = useState("");
  const [payMethod, setPayMethodState] = useState<"WEBPAY_ONECLICK" | "CUENTARUT_BANCOESTADO" | "CASH">("WEBPAY_ONECLICK");
  const [scheduledFor, setScheduledFor] = useState("");
  const [scheduledTrips, setScheduledTrips] = useState<
    { id: string; destAddress: string; scheduledFor: string; fareGrossClp: number }[]
  >([]);
  const [tripHistory, setTripHistory] = useState<
    {
      id: string;
      destAddress: string;
      requestedAt: string;
      status: string;
      fareGrossClp: number;
      paymentMethod: string;
      driver: { name: string; rating: number } | null;
      rating: { score: number } | null;
    }[]
  >([]);
  const [score, setScore] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [ads, setAds] = useState<{ id: string; title: string; bodyText: string; imageUrl: string | null }[]>([]);
  const [cancelFeeClp, setCancelFeeClp] = useState<number | null>(null);
  const [rideFor, setRideFor] = useState<"me" | "other">("me");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"pending" | "active" | "denied" | "unsupported">("pending");
  const [myGeo, setMyGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();
  const pollRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastGeocodedRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const [originLoading, setOriginLoading] = useState(false);

  // GPS se activa apenas abre la app y queda persistente (watchPosition) mientras la app
  // esté abierta, no solo una foto única al montar. El navegador recuerda el permiso una
  // vez otorgado, así que esto no vuelve a preguntar si el usuario ya dijo que sí antes.
  function requestGps() {
    if (!navigator.geolocation) {
      setGpsStatus("unsupported");
      return;
    }
    setGpsStatus("pending");
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("active");
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
    );
  }

  useEffect(() => {
    if (!user || user.role !== "PASSENGER") {
      navigate("/");
      return;
    }
    api
      .get<{ landmarks: Landmark[]; quickAccess: Landmark[]; defaultOrigin: Landmark }>("/passenger/landmarks")
      .then((d) => {
        setLandmarks(d.landmarks);
        setQuickAccess(d.quickAccess);
        setOrigin(d.defaultOrigin);
      });
    api.get<{ ads: typeof ads }>("/passenger/ads").then((d) => setAds(d.ads)).catch(() => {});
    api
      .get<{ cancellationFeePassengerClp: number }>("/passenger/cancellation-policy")
      .then((d) => setCancelFeeClp(d.cancellationFeePassengerClp))
      .catch(() => {});
    api
      .get<{ preferredPaymentMethod: typeof payMethod }>("/passenger/payment-method")
      .then((d) => setPayMethodState(d.preferredPaymentMethod))
      .catch(() => {});
    loadScheduledTrips();
    loadHistory();

    requestGps();
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Punto de partida estilo Uber: la dirección real detectada por GPS, no un
  // landmark fijo. Nominatim (OpenStreetMap) es gratis y sin API key, pero su
  // política de uso pide no golpearlo seguido — por eso se debounce por
  // distancia (>120 m) y tiempo (>20 s) desde la última consulta.
  useEffect(() => {
    if (!myGeo) return;
    geocodeAndSetOrigin(myGeo);
  }, [myGeo]);

  // Botón estilo Uber (target sobre el mapa) para forzar una relectura de GPS
  // + dirección al toque, saltándose el debounce normal.
  function refreshGps() {
    lastGeocodedRef.current = null;
    requestGps();
  }

  async function geocodeAndSetOrigin(geo: { lat: number; lng: number }) {
    const last = lastGeocodedRef.current;
    const now = Date.now();
    if (last && haversineKm(last, geo) < 0.12 && now - last.at < 20000) return;
    lastGeocodedRef.current = { ...geo, at: now };
    setOriginLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${geo.lat}&lon=${geo.lng}&zoom=17&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      const a = data?.address ?? {};
      const road = a.road || a.pedestrian || a.residential || a.hamlet || a.village || a.suburb;
      const locality = a.town || a.city || a.municipality || a.county || "";
      const label = road
        ? `${road}${locality ? ", " + locality : ""}`
        : data?.display_name?.split(",").slice(0, 2).join(",") ?? "Tu ubicación actual";
      setOrigin({ code: "MI_UBICACION", name: label, lat: geo.lat, lng: geo.lng, note: "Ubicación GPS real" });
    } catch {
      // Sin conexión a Nominatim: no rompemos el flujo, se mantiene el origen anterior.
    } finally {
      setOriginLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId || screen !== "tracking") return;
    const socket = getSocket();
    socket.emit("join:trip", tripId);
    const onPos = (payload: any) => {
      if (payload.tripId === tripId) setLive((l: any) => ({ ...l, ...payload }));
    };
    const onStatus = (payload: any) => {
      if (payload.tripId === tripId) setLive((l: any) => ({ ...l, status: payload.status }));
    };
    socket.on("trip:live_position", onPos);
    socket.on("trip:status", onStatus);

    const interval = window.setInterval(refreshLive, 2500);
    pollRef.current = interval;
    return () => {
      socket.off("trip:live_position", onPos);
      socket.off("trip:status", onStatus);
      window.clearInterval(interval);
    };
  }, [tripId, screen]);

  async function refreshLive() {
    if (!tripId) return;
    try {
      const data = await api.get<any>(`/passenger/trips/${tripId}/live`);
      setLive((l: any) => ({ ...data, status: l?.status || data.status }));
      if (data.status === "IN_PROGRESS" || data.status === "DRIVER_ARRIVED" || data.status === "ACCEPTED") {
        setScreen("tracking");
      }
      if (data.paymentStatus === "CAPTURED" || data.paymentStatus === "AUTHORIZED") {
        // stays on tracking until trip completed
      }
    } catch {
      /* ignore transient errors while polling */
    }
  }

  function setPayMethod(m: "WEBPAY_ONECLICK" | "CUENTARUT_BANCOESTADO" | "CASH") {
    setPayMethodState(m);
    api.put("/passenger/payment-method", { method: m }).catch(() => {});
  }

  function loadHistory() {
    api
      .get<{ trips: any[] }>("/passenger/trips/history")
      .then((d) =>
        setTripHistory(
          d.trips.map((t) => ({
            id: t.id,
            destAddress: t.destAddress,
            requestedAt: t.requestedAt,
            status: t.status,
            fareGrossClp: t.fareGrossClp,
            paymentMethod: t.paymentMethod,
            driver: t.driver ? { name: `${t.driver.user.firstName} ${t.driver.user.lastName}`, rating: Number(t.driver.user.ratingAvg) } : null,
            rating: t.rating ? { score: t.rating.score } : null,
          }))
        )
      )
      .catch(() => {});
  }

  function loadScheduledTrips() {
    api
      .get<{ trips: typeof scheduledTrips }>("/passenger/trips/scheduled")
      .then((d) => setScheduledTrips(d.trips))
      .catch(() => {});
  }

  async function cancelScheduledTrip(id: string) {
    try {
      await api.post(`/passenger/trips/${id}/cancel`);
      loadScheduledTrips();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function getQuote(dest: Landmark) {
    setDestination(dest);
    setError("");
    if (!origin) return;
    try {
      const q = await api.post<Quote>("/passenger/quote", {
        origin: { lat: origin.lat, lng: origin.lng, address: origin.name },
        destination: { lat: dest.lat, lng: dest.lng, address: dest.name },
      });
      setQuote(q);
      setScreen("categories");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function requestTrip() {
    if (!origin || !destination || !selectedCategory) return;
    const forOther = rideFor === "other" && riderName.trim();
    const originPayload = {
      lat: origin.lat,
      lng: origin.lng,
      address: forOther ? `${origin.name} · Pasajero: ${riderName.trim()}${riderPhone.trim() ? ` (${riderPhone.trim()})` : ""}` : origin.name,
    };
    const destPayload = { lat: destination.lat, lng: destination.lng, address: destination.name };

    if (scheduledFor) {
      try {
        await api.post("/passenger/trips/schedule", {
          origin: originPayload,
          destination: destPayload,
          category: selectedCategory.category,
          paymentMethod: payMethod,
          scheduledFor: new Date(scheduledFor).toISOString(),
        });
        setScheduledFor("");
        setScreen("home");
        loadScheduledTrips();
      } catch (e: any) {
        setError(e.message);
      }
      return;
    }

    setScreen("dispatching");
    try {
      const res = await api.post<{ tripId: string; pin: string }>("/passenger/trips/request", {
        origin: originPayload,
        destination: destPayload,
        category: selectedCategory.category,
        paymentMethod: payMethod,
      });
      setTripId(res.tripId);
      setPin(res.pin);
      pollUntilAccepted(res.tripId);
    } catch (e: any) {
      setError(e.message);
      setScreen("categories");
    }
  }

  async function pollUntilAccepted(id: string) {
    const timer = window.setInterval(async () => {
      try {
        const data = await api.get<any>(`/passenger/trips/${id}/live`);
        setLive(data);
        if (data.status && data.status !== "DISPATCHING") {
          window.clearInterval(timer);
          setScreen("tracking");
        }
      } catch {
        /* ignore */
      }
    }, 2000);
  }

  async function cancelTrip() {
    if (!tripId) return;
    const status = live?.status ?? "DISPATCHING";
    const chargeable = ["ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS"].includes(status);
    const warning =
      chargeable && cancelFeeClp
        ? `El conductor ya aceptó tu viaje. Se cobrará una penalidad de cancelación de ${formatClp(cancelFeeClp)}. ¿Cancelar de todas formas?`
        : "¿Cancelar la solicitud de viaje?";
    if (!window.confirm(warning)) return;
    try {
      await api.post(`/passenger/trips/${tripId}/cancel`);
      resetTrip();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function pay() {
    if (!tripId) return;
    await api.post(`/passenger/trips/${tripId}/pay`, { method: payMethod });
    setScreen("rating");
  }

  async function submitRating() {
    if (!tripId) return;
    await api.post(`/passenger/trips/${tripId}/rate`, { score, feedbackTags: tags, tipClp: 0 });
    setScreen("done");
  }

  function resetTrip() {
    setTripId(null);
    setQuote(null);
    setDestination(null);
    setSelectedCategory(null);
    setLive(null);
    setScreen("home");
  }

  function logout() {
    clearSession();
    navigate("/");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cg-bg text-cg-primary page-enter">
      <header className="flex items-center justify-between px-4 py-3 bg-cg-surface border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="w-8 h-8 rounded-lg" />
          <span className="font-extrabold tracking-tight text-lg">CabrasGo</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {canInstall && (
            <button onClick={promptInstall} aria-label="Instalar app" title="Instalar app" className="w-7 h-7 rounded-full bg-cg-surfaceAlt flex items-center justify-center text-sm">
              📲
            </button>
          )}
          <button onClick={() => setScreen("history")} aria-label="Mis viajes" title="Mis viajes" className="w-7 h-7 rounded-full bg-cg-surfaceAlt flex items-center justify-center text-sm">
            🕓
          </button>
          <button onClick={() => setShowManual(true)} aria-label="Manual de uso" title="Manual de uso" className="w-7 h-7 rounded-full bg-cg-surfaceAlt flex items-center justify-center text-sm">
            📘
          </button>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="w-7 h-7 rounded-full bg-cg-primary text-white flex items-center justify-center text-xs font-bold"
              aria-label="Mi cuenta"
            >
              {user.firstName[0]}
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-[1999]" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-9 z-[2000] w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-3">
                  <p className="font-bold text-sm truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  <p className="text-xs text-slate-400">★ {Number(user.ratingAvg).toFixed(2)} de calificación</p>
                  <div className="h-px bg-slate-100 my-2" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setScreen("history");
                    }}
                    className="w-full text-left text-sm py-1.5 text-slate-600"
                  >
                    🕓 Mis viajes
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowManual(true);
                    }}
                    className="w-full text-left text-sm py-1.5 text-slate-600"
                  >
                    📘 Manual de uso
                  </button>
                  <div className="h-px bg-slate-100 my-2" />
                  <button onClick={logout} className="w-full text-left text-sm py-1.5 text-cg-danger font-semibold">
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {error && <div className="mb-3 text-sm text-cg-danger bg-red-50 rounded-lg p-2">{error}</div>}

        {screen === "home" && (
          <>
            <AdBanner ads={ads} />
            {scheduledTrips.length > 0 && (
              <div className="bg-cg-surface border border-slate-200 rounded-2xl p-4 mb-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Viajes programados</p>
                <div className="space-y-2">
                  {scheduledTrips.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{t.destAddress}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(t.scheduledFor).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })} · {formatClp(t.fareGrossClp)}
                        </p>
                      </div>
                      <button onClick={() => cancelScheduledTrip(t.id)} className="text-cg-danger text-xs font-semibold shrink-0">
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <HomeScreen
              origin={origin}
              originLoading={originLoading}
              onRefreshGps={refreshGps}
              landmarks={landmarks}
              quickAccess={quickAccess}
              onPick={getQuote}
              rideFor={rideFor}
              setRideFor={setRideFor}
              riderName={riderName}
              setRiderName={setRiderName}
              riderPhone={riderPhone}
              setRiderPhone={setRiderPhone}
            />
          </>
        )}

        {screen === "history" && (
          <HistoryScreen trips={tripHistory} onBack={() => setScreen("home")} />
        )}

        {screen === "categories" && quote && destination && (
          <CategoriesScreen
            quote={quote}
            origin={origin}
            destination={destination}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            onConfirm={requestTrip}
            onBack={() => setScreen("home")}
            scheduledFor={scheduledFor}
            setScheduledFor={setScheduledFor}
          />
        )}

        {screen === "dispatching" && (
          <div className="text-center py-16">
            <div className="animate-spin h-12 w-12 border-4 border-cg-accent border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-semibold">Buscando conductor cercano...</p>
            <p className="text-sm text-slate-500 mt-1">PIN de verificación: <b>{pin}</b></p>
            <button onClick={cancelTrip} className="mt-6 text-sm text-cg-danger font-semibold">
              Cancelar solicitud
            </button>
          </div>
        )}

        {screen === "tracking" && live && (
          <TrackingScreen live={live} pin={pin} onPay={() => setScreen("payment")} onCancel={cancelTrip} />
        )}

        {screen === "payment" && (
          <PaymentScreen
            fare={live?.fareGrossClp ?? 0}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            onConfirm={pay}
          />
        )}

        {screen === "rating" && (
          <RatingScreen score={score} setScore={setScore} tags={tags} setTags={setTags} onSubmit={submitRating} />
        )}

        {screen === "done" && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🐐</div>
            <p className="text-xl font-bold mb-2">¡Gracias por viajar con CabrasGo!</p>
            <button onClick={resetTrip} className="mt-4 bg-cg-accent text-white rounded-xl px-6 py-3 font-semibold">
              Pedir otro viaje
            </button>
          </div>
        )}
      </main>

      {(gpsStatus === "denied" || gpsStatus === "unsupported") && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-lg font-extrabold mb-2">Activa tu ubicación para continuar</p>
            <p className="text-sm text-slate-500 mb-5">
              {gpsStatus === "unsupported"
                ? "Este dispositivo o navegador no puede compartir tu ubicación. Prueba desde otro celular o actualiza tu navegador para pedir un viaje."
                : "CabrasGo necesita tu ubicación para calcular tu punto de partida y encontrar conductores cerca tuyo. Sin GPS activo no puedes pedir un viaje."}
            </p>
            {gpsStatus === "denied" && (
              <button
                onClick={requestGps}
                className="w-full bg-cg-accent text-white rounded-xl py-3.5 font-bold active:scale-95 transition-all duration-150"
              >
                Activar ubicación
              </button>
            )}
            <p className="text-[11px] text-slate-400 mt-3">
              Si tu navegador ya bloqueó el permiso, toca el ícono de candado junto a la dirección del sitio, habilita "Ubicación" y vuelve a tocar el botón.
            </p>
          </div>
        </div>
      )}

      {showManual && (
        <ManualModal
          title="Manual de uso"
          subtitle="CabrasGo Pasajero"
          sections={PASAJERO_MANUAL}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
}

function HomeScreen({
  origin,
  originLoading,
  onRefreshGps,
  landmarks,
  quickAccess,
  onPick,
  rideFor,
  setRideFor,
  riderName,
  setRiderName,
  riderPhone,
  setRiderPhone,
}: {
  origin: Landmark | null;
  originLoading: boolean;
  onRefreshGps: () => void;
  landmarks: Landmark[];
  quickAccess: Landmark[];
  onPick: (l: Landmark) => void;
  rideFor: "me" | "other";
  setRideFor: (v: "me" | "other") => void;
  riderName: string;
  setRiderName: (v: string) => void;
  riderPhone: string;
  setRiderPhone: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [forOpen, setForOpen] = useState(false);
  const normalized = search.trim().toLowerCase();
  const results = normalized
    ? landmarks.filter((l) => l.code !== origin?.code && l.name.toLowerCase().includes(normalized))
    : landmarks.filter((l) => l.code !== origin?.code);

  const originIsGps = origin?.code === "MI_UBICACION";
  const mapMarkers = origin
    ? [{ id: origin.code, lat: origin.lat, lng: origin.lng, label: origin.name, kind: originIsGps ? ("me" as const) : undefined }]
    : [];

  return (
    <div>
      <div className="mb-4 relative">
        <LiveMap center={origin ? [origin.lat, origin.lng] : [-34.2917, -71.3092]} markers={mapMarkers} height={180} />
        <button
          onClick={onRefreshGps}
          aria-label="Actualizar mi ubicación"
          title="Actualizar mi ubicación"
          className={`absolute bottom-3 right-3 z-[1001] w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-lg active:scale-90 transition-transform ${
            originLoading ? "animate-spin" : ""
          }`}
        >
          🎯
        </button>
      </div>
      <div className="flex items-center gap-3 bg-cg-surface border border-slate-200 rounded-2xl p-4 mb-3 card-enter">
        <span className="w-9 h-9 rounded-full bg-cg-primary text-white flex items-center justify-center text-sm shrink-0">●</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Tu ubicación</p>
          <p className="font-bold truncate">{originLoading && !origin ? "Detectando tu dirección..." : origin?.name ?? "Cargando..."}</p>
          {originIsGps && <p className="text-[11px] text-slate-400 mt-0.5">📍 GPS real · dirección detectada automáticamente</p>}
        </div>
        <button
          onClick={onRefreshGps}
          aria-label="Actualizar mi ubicación"
          title="Actualizar mi ubicación"
          className={`w-8 h-8 rounded-full bg-cg-surfaceAlt flex items-center justify-center text-sm shrink-0 active:scale-90 transition-transform ${
            originLoading ? "animate-spin" : ""
          }`}
        >
          🧭
        </button>
      </div>

      <div className="mb-4">
        <button
          onClick={() => setForOpen((o) => !o)}
          className="flex items-center gap-2 bg-cg-surfaceAlt rounded-full pl-1.5 pr-3 py-1.5 text-xs font-bold text-cg-primary"
        >
          <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sm">{rideFor === "me" ? "🧍" : "👥"}</span>
          {rideFor === "me" ? "Para mí" : riderName.trim() ? `Para ${riderName.trim().split(" ")[0]}` : "Para otra persona"}
          <span className="text-slate-400">▾</span>
        </button>

        {forOpen && (
          <div className="mt-2 bg-cg-surface border border-slate-200 rounded-2xl p-3 space-y-2 card-enter">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRideFor("me")}
                className={`rounded-xl py-2 text-xs font-bold border-2 transition ${
                  rideFor === "me" ? "border-cg-primary bg-cg-surfaceAlt" : "border-slate-200"
                }`}
              >
                🧍 Para mí
              </button>
              <button
                onClick={() => setRideFor("other")}
                className={`rounded-xl py-2 text-xs font-bold border-2 transition ${
                  rideFor === "other" ? "border-cg-primary bg-cg-surfaceAlt" : "border-slate-200"
                }`}
              >
                👥 Para otra persona
              </button>
            </div>
            {rideFor === "other" && (
              <div className="space-y-2 pt-1">
                <input
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="Nombre de quien viaja"
                  className="w-full bg-cg-surfaceAlt rounded-lg px-3 py-2 text-sm font-semibold outline-none"
                />
                <input
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="Teléfono (opcional, +569...)"
                  className="w-full bg-cg-surfaceAlt rounded-lg px-3 py-2 text-sm font-semibold outline-none"
                />
                <p className="text-[11px] text-slate-400">El conductor verá este nombre como referencia de recogida.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="¿A dónde vamos? Buscar destino..."
          className="w-full bg-cg-surface border-2 border-slate-200 focus:border-cg-primary outline-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold placeholder:font-normal placeholder:text-slate-400 transition"
        />
      </div>

      {!normalized && (
        <>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Destinos frecuentes</p>
          <div className="grid grid-cols-2 gap-2 mb-7">
            {quickAccess.map((l) => (
              <button
                key={l.code}
                onClick={() => onPick(l)}
                className="bg-cg-surface border border-slate-200 rounded-xl p-3 text-left hover:border-cg-primary transition"
              >
                <p className="text-sm font-bold truncate">{l.name}</p>
                <p className="text-xs text-slate-400 truncate">{l.note}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
        {normalized ? `Resultados (${results.length})` : "¿A dónde vamos?"}
      </p>
      <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-cg-surface">
        {results.map((l) => (
          <button
            key={l.code}
            onClick={() => onPick(l)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-cg-surfaceAlt transition"
          >
            <span className="w-8 h-8 rounded-full bg-cg-surfaceAlt text-cg-primary flex items-center justify-center text-xs shrink-0">▪</span>
            <span className="text-sm font-semibold flex-1 min-w-0 truncate">{l.name}</span>
            <span className="text-slate-300 text-base">›</span>
          </button>
        ))}
        {normalized && results.length === 0 && (
          <p className="text-sm text-slate-400 px-4 py-6 text-center">Sin resultados para "{search}". Prueba con otro sector.</p>
        )}
      </div>
    </div>
  );
}

function CategoriesScreen({
  quote,
  origin,
  destination,
  payMethod,
  setPayMethod,
  selected,
  onSelect,
  onConfirm,
  onBack,
  scheduledFor,
  setScheduledFor,
}: {
  quote: Quote;
  origin: Landmark | null;
  destination: Landmark;
  payMethod: string;
  setPayMethod: (m: any) => void;
  selected: QuoteCategory | null;
  onSelect: (c: QuoteCategory) => void;
  onConfirm: () => void;
  onBack: () => void;
  scheduledFor: string;
  setScheduledFor: (v: string) => void;
}) {
  const minSchedule = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [breakdownFor, setBreakdownFor] = useState<QuoteCategory | null>(null);

  useEffect(() => {
    setRoute(null);
    if (!origin) return;
    let cancelled = false;
    fetchRoute(origin, destination).then((r) => {
      if (!cancelled) setRoute(r);
    });
    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, destination.lat, destination.lng]);

  return (
    <div>
      <button onClick={onBack} className="text-sm text-slate-500 mb-3">
        ← Cambiar destino
      </button>

      {origin && (
        <div className="mb-4 shadow-sm">
          <LiveMap
            center={[
              (origin.lat + destination.lat) / 2,
              (origin.lng + destination.lng) / 2,
            ]}
            markers={[
              { id: "origin", lat: origin.lat, lng: origin.lng, label: "Origen", sub: origin.name, kind: origin.code === "MI_UBICACION" ? "me" : undefined },
              { id: "dest", lat: destination.lat, lng: destination.lng, label: "Destino", sub: destination.name },
            ]}
            route={route ?? undefined}
            height={200}
            zoom={12}
          />
        </div>
      )}

      <div className="bg-cg-surface border border-slate-200 rounded-2xl p-4 mb-5 card-enter">
        {origin && (
          <>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Origen</p>
            <p className="font-bold text-sm mb-2">{origin.name}</p>
          </>
        )}
        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Destino</p>
        <p className="font-bold">{destination.name}</p>
        <p className="text-xs text-slate-400 mt-1">
          {quote.distanceTotalKm} km · {quote.distanceDirtKm} km ripio
          {quote.geofenceZoneName ? ` · Zona ${quote.geofenceZoneName}` : ""}
          {quote.dynamicMultiplier !== 1 ? ` · Tarifa dinámica x${quote.dynamicMultiplier}` : ""}
        </p>
      </div>

      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Elige tu viaje</p>
      <div className="space-y-2 mb-5">
        {quote.categories.map((c) => (
          <button
            key={c.category}
            onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-3 rounded-xl p-3.5 border-2 transition text-left ${
              selected?.category === c.category ? "border-cg-primary bg-cg-surfaceAlt" : "border-slate-200 bg-cg-surface"
            }`}
          >
            <span className="w-11 h-11 rounded-full bg-cg-surfaceAlt flex items-center justify-center text-lg shrink-0">
              {c.category === "RURAL_4X4_XL" ? "🚙" : "🚗"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{CATEGORY_LABEL[c.category]}</p>
              <p className="text-xs text-slate-400">{c.etaMinutes} min de espera {c.recommended ? "· Recomendado" : ""}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBreakdownFor(c);
                }}
                className="text-[11px] font-bold text-cg-primary underline mt-0.5"
              >
                Ver desglose
              </button>
            </div>
            <span className="font-extrabold text-lg tabular-nums shrink-0">{formatClp(c.totalFareClp)}</span>
          </button>
        ))}
      </div>

      {breakdownFor && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[2000] p-0 sm:p-4"
          onClick={() => setBreakdownFor(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-lg font-extrabold">Desglose de precio</p>
                <p className="text-xs text-slate-500">{CATEGORY_LABEL[breakdownFor.category]}</p>
              </div>
              <button onClick={() => setBreakdownFor(null)} className="w-8 h-8 rounded-full bg-cg-surfaceAlt flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Bajada de bandera</span><span className="font-semibold">{formatClp(breakdownFor.breakdown.baseFlag)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tramo pavimentado</span><span className="font-semibold">{formatClp(breakdownFor.breakdown.pavedCost)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tramo ripio</span><span className="font-semibold">{formatClp(breakdownFor.breakdown.dirtCost)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tiempo estimado ({breakdownFor.breakdown.estimatedMinutes} min)</span><span className="font-semibold">{formatClp(breakdownFor.breakdown.timeCost)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatClp(breakdownFor.breakdown.subtotal)}</span></div>
              {breakdownFor.breakdown.dynamicMultiplier !== 1 && (
                <div className="flex justify-between"><span className="text-slate-500">Tarifa dinámica</span><span className="font-semibold">x{breakdownFor.breakdown.dynamicMultiplier}</span></div>
              )}
              {breakdownFor.breakdown.fuelFactor !== 1 && (
                <div className="flex justify-between"><span className="text-slate-500">Factor combustible</span><span className="font-semibold">x{breakdownFor.breakdown.fuelFactor}</span></div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-bold">Total</span><span className="font-extrabold">{formatClp(breakdownFor.breakdown.totalFareClp)}</span></div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Método de pago</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {(["WEBPAY_ONECLICK", "CUENTARUT_BANCOESTADO", "CASH"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPayMethod(m)}
            className={`rounded-xl py-2.5 text-xs font-bold border transition ${
              payMethod === m ? "bg-cg-primary text-white border-cg-primary" : "bg-cg-surface text-slate-600 border-slate-200"
            }`}
          >
            {m === "WEBPAY_ONECLICK" ? "Webpay" : m === "CUENTARUT_BANCOESTADO" ? "CuentaRUT" : "Efectivo"}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-2">
          <input
            type="checkbox"
            checked={scheduledFor !== ""}
            onChange={(e) => setScheduledFor(e.target.checked ? minSchedule : "")}
          />
          Programar para más tarde
        </label>
        {scheduledFor !== "" && (
          <input
            type="datetime-local"
            value={scheduledFor}
            min={minSchedule}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
        )}
      </div>

      <button
        disabled={!selected}
        onClick={onConfirm}
        className="btn-primary"
      >
        {scheduledFor !== "" ? "Programar viaje" : "Confirmar viaje"}
      </button>
    </div>
  );
}

function TrackingScreen({
  live,
  pin,
  onPay,
  onCancel,
}: {
  live: any;
  pin: string;
  onPay: () => void;
  onCancel: () => void;
}) {
  const status = live.status;
  const statusLabel: Record<string, string> = {
    ACCEPTED: "Conductor en camino",
    DRIVER_ARRIVED: "¡Tu conductor llegó!",
    IN_PROGRESS: "Viaje en curso",
    COMPLETED: "Viaje completado",
  };
  return (
    <div>
      <div className="bg-cg-primary text-white rounded-2xl p-4 mb-4">
        <p className="text-[11px] uppercase tracking-wide opacity-60 font-semibold">Estado</p>
        <p className="text-xl font-extrabold tracking-tight">{statusLabel[status] ?? status}</p>
      </div>

      <div className="mb-4 shadow-sm">
        <LiveMap
          center={[live.live?.lat ?? live.origin.lat, live.live?.lng ?? live.origin.lng]}
          markers={[
            { id: "origin", lat: live.origin.lat, lng: live.origin.lng, label: "Origen", sub: live.origin.address },
            { id: "dest", lat: live.destination.lat, lng: live.destination.lng, label: "Destino", sub: live.destination.address },
            ...(live.live
              ? [{ id: "car", lat: live.live.lat, lng: live.live.lng, label: live.driver?.name ?? "Conductor", kind: "car" as const }]
              : []),
          ]}
        />
      </div>

      {live.driver && (
        <div className="bg-cg-surface border border-slate-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full bg-cg-surfaceAlt flex items-center justify-center text-lg shrink-0">🚗</span>
            <div className="min-w-0">
              <p className="font-bold truncate">{live.driver.name}</p>
              <p className="text-xs text-slate-400 truncate">{live.driver.model} · {formatPatente(live.driver.plate)}</p>
              <p className="text-xs text-slate-400">⭐ {Number(live.driver.rating).toFixed(1)}</p>
            </div>
          </div>
          <div className="text-right shrink-0 pl-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">PIN</p>
            <p className="text-2xl font-extrabold tracking-widest tabular-nums">{pin}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <a
          href={`https://wa.me/?text=${encodeURIComponent("Voy en camino con CabrasGo, sigue mi viaje.")}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center bg-cg-surfaceAlt border border-slate-200 rounded-xl py-3 text-sm font-bold"
        >
          Compartir viaje
        </a>
        <a href={`tel:${live.sosPhone}`} className="flex-1 text-center bg-cg-danger text-white rounded-xl py-3 text-sm font-bold">
          SOS · 133
        </a>
      </div>

      {status === "IN_PROGRESS" && (
        <button onClick={onPay} className="btn-primary">
          Finalizar y pagar
        </button>
      )}

      {status !== "IN_PROGRESS" && (
        <button onClick={onCancel} className="w-full text-center text-cg-danger text-sm font-semibold py-2">
          Cancelar viaje
        </button>
      )}
    </div>
  );
}

function PaymentScreen({
  fare,
  payMethod,
  setPayMethod,
  onConfirm,
}: {
  fare: number;
  payMethod: string;
  setPayMethod: (m: any) => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <div className="bg-cg-surface rounded-2xl p-6 mb-4 shadow-sm text-center">
        <p className="text-sm text-slate-500">Total del viaje</p>
        <p className="text-3xl font-bold">{formatClp(fare)}</p>
      </div>
      <div className="space-y-2 mb-6">
        {(["WEBPAY_ONECLICK", "CUENTARUT_BANCOESTADO", "CASH"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPayMethod(m)}
            className={`w-full flex items-center justify-between rounded-xl px-4 py-3 ${
              payMethod === m ? "bg-cg-primary text-white" : "bg-cg-surface shadow-sm"
            }`}
          >
            <span>{m === "WEBPAY_ONECLICK" ? "Webpay Oneclick (Transbank)" : m === "CUENTARUT_BANCOESTADO" ? "CuentaRUT BancoEstado" : "Efectivo al conductor"}</span>
          </button>
        ))}
      </div>
      <button onClick={onConfirm} className="btn-primary">
        Pagar {formatClp(fare)}
      </button>
    </div>
  );
}

function RatingScreen({
  score,
  setScore,
  tags,
  setTags,
  onSubmit,
}: {
  score: number;
  setScore: (n: number) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  onSubmit: () => void;
}) {
  function toggleTag(t: string) {
    setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }
  return (
    <div className="text-center">
      <p className="text-lg font-bold mb-4">¿Cómo estuvo tu viaje?</p>
      <div className="flex justify-center gap-2 mb-6 text-3xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setScore(n)} className={n <= score ? "text-cg-warning" : "text-slate-300"}>
            ★
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {FEEDBACK_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            className={`text-xs rounded-full px-3 py-2 ${tags.includes(t) ? "bg-cg-accent text-white" : "bg-cg-surfaceAlt"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <button onClick={onSubmit} className="btn-primary">
        Enviar calificación
      </button>
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completado", className: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Cancelado", className: "bg-slate-100 text-slate-500" },
};

const PAYMENT_LABEL: Record<string, string> = {
  WEBPAY_ONECLICK: "Webpay",
  CUENTARUT_BANCOESTADO: "CuentaRUT",
  CASH: "Efectivo",
};

function HistoryScreen({
  trips,
  onBack,
}: {
  trips: {
    id: string;
    destAddress: string;
    requestedAt: string;
    status: string;
    fareGrossClp: number;
    paymentMethod: string;
    driver: { name: string; rating: number } | null;
    rating: { score: number } | null;
  }[];
  onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="text-sm text-slate-500 mb-3">
        ← Volver
      </button>
      <p className="text-lg font-extrabold mb-4">Mis viajes</p>

      {trips.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">Todavía no tienes viajes registrados.</p>
      )}

      <div className="space-y-2">
        {trips.map((t) => {
          const status = STATUS_LABEL[t.status] ?? { label: t.status, className: "bg-slate-100 text-slate-500" };
          return (
            <div key={t.id} className="bg-cg-surface border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-full bg-cg-surfaceAlt flex items-center justify-center text-lg shrink-0">🚗</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{t.destAddress}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.requestedAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold">{formatClp(t.fareGrossClp)}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                </div>
              </div>
              {(t.driver || t.rating) && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span>{t.driver ? `${t.driver.name} · ★ ${t.driver.rating.toFixed(1)}` : ""}</span>
                  <span>{PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod}{t.rating ? ` · Tu calificación: ★ ${t.rating.score}` : ""}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
