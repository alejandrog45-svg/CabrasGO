import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getUser, clearSession } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { formatClp, formatPatente } from "../../lib/format";
import { AdBanner } from "../../components/AdBanner";
import { ManualModal } from "../../components/ManualModal";
import { CONDUCTOR_MANUAL } from "../../lib/manuals";
import { useInstallPrompt } from "../../lib/useInstallPrompt";

interface DriverProfile {
  id: string;
  name: string;
  plate: string;
  model: string;
  operationalStatus: string;
  walletBalanceClp: number;
  rating: number;
  totalTrips: number;
  lat: number | null;
  lng: number | null;
  isVip: boolean;
}

interface EarningsBreakdown {
  fareBaseClp: number;
  surgeBonusClp: number;
  tipsClp: number;
  weeklyBonusClp: number;
  cancellationCompensationClp: number;
  cancellationPenaltiesClp: number;
}

interface TripOffer {
  tripId: string;
  expiresInSecs: number;
  netEarningsClp: number;
  grossFareClp: number;
  pickupAddress: string;
  destAddress: string;
  terrainType: string;
  pickupDistanceKm: number;
  requires4x4: boolean;
}

export function ConductorApp() {
  const navigate = useNavigate();
  const user = getUser();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [offer, setOffer] = useState<TripOffer | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [pinInput, setPinInput] = useState("");
  const [tab, setTab] = useState<"home" | "wallet" | "historial">("home");
  const [tripHistory, setTripHistory] = useState<any[] | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [wallet, setWallet] = useState<{
    walletBalanceClp: number;
    payouts: any[];
    completedTrips: number;
    earningsBreakdown: EarningsBreakdown;
    weeklyBonuses: any[];
  } | null>(null);
  const [ads, setAds] = useState<{ id: string; title: string; bodyText: string; imageUrl: string | null }[]>([]);
  const [gpsStatus, setGpsStatus] = useState<"pending" | "active" | "weak" | "denied" | "unsupported">("pending");
  const [showManual, setShowManual] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();
  const timerRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const profileRef = useRef<DriverProfile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!user || user.role !== "DRIVER") {
      navigate("/");
      return;
    }
    loadProfile();
    loadActiveTrip();
    api.get<{ ads: typeof ads }>("/driver/ads").then((d) => setAds(d.ads)).catch(() => {});
    const socket = getSocket();
    if (user.driverId) socket.emit("join:driver", user.driverId);
    socket.on("trip:dispatch:offer", (payload: TripOffer) => {
      setOffer(payload);
      setCountdown(payload.expiresInSecs);
    });

    // El GPS se activa apenas abre la app y queda persistente (watchPosition) mientras la
    // app esté abierta, esté "Conectado" o no — el ping al backend solo importa online, pero
    // el conductor debe ver su posición y el estado del permiso todo el tiempo que usa la app.
    requestGps();

    return () => {
      socket.off("trip:dispatch:offer");
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function requestGps() {
    if (!navigator.geolocation) {
      setGpsStatus("unsupported");
      return;
    }
    setGpsStatus((s) => (s === "active" ? s : "pending"));
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsStatus("active");
        const online = profileRef.current?.operationalStatus && profileRef.current.operationalStatus !== "OFFLINE";
        if (online) api.post("/driver/location/ping", lastPosRef.current).catch(() => {});
      },
      (err) => {
        // PERMISSION_DENIED (1) es el único caso real de "sin permiso" — bloquea con el
        // modal. POSITION_UNAVAILABLE (2) y TIMEOUT (3) son señal débil/momentánea, muy
        // común en zonas de ripio del área de cobertura: no bloquear, watchPosition sigue
        // reintentando solo y retoma "active" en cuanto llegue una posición nueva.
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("denied");
        } else {
          setGpsStatus((s) => (s === "denied" || s === "unsupported" ? s : "weak"));
        }
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 }
    );
  }

  useEffect(() => {
    if (!offer) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(timerRef.current!);
          setOffer(null);
          return 15;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [offer]);

  useEffect(() => {
    if (tab === "wallet") {
      api.get<any>("/driver/wallet").then(setWallet);
    }
    if (tab === "historial") {
      api.get<{ trips: any[] }>("/driver/trips/history").then((d) => setTripHistory(d.trips));
    }
  }, [tab]);

  async function loadProfile() {
    const p = await api.get<DriverProfile>("/driver/me");
    setProfile(p);
  }

  async function loadActiveTrip() {
    const res = await api.get<{ trip: any }>("/driver/trips/active");
    setActiveTrip(res.trip);
  }

  async function toggleStatus() {
    if (!profile) return;
    const next = profile.operationalStatus === "OFFLINE" ? "AVAILABLE" : "OFFLINE";
    let pos = lastPosRef.current;
    if (!pos && navigator.geolocation) {
      pos = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 3000 }
        );
      });
    }
    const body: any = { status: next, batteryPct: 70 + Math.floor(Math.random() * 30) };
    if (pos) {
      body.lat = pos.lat;
      body.lng = pos.lng;
    }
    await api.post("/driver/status/toggle", body);
    loadProfile();
  }

  async function acceptOffer() {
    if (!offer) return;
    await api.post(`/driver/trips/${offer.tripId}/accept`);
    setOffer(null);
    loadActiveTrip();
    loadProfile();
  }

  async function declineOffer() {
    if (!offer) return;
    await api.post(`/driver/trips/${offer.tripId}/decline`);
    setOffer(null);
  }

  async function verifyPin() {
    if (!activeTrip) return;
    try {
      await api.post(`/driver/trips/${activeTrip.id}/verify-pin`, { pinEntered: pinInput });
      loadActiveTrip();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function cancelActiveTrip() {
    if (!activeTrip) return;
    if (!window.confirm("Cancelar este viaje aplicará una penalidad de cancelación. ¿Continuar?")) return;
    try {
      await api.post(`/driver/trips/${activeTrip.id}/cancel`);
      setActiveTrip(null);
      setPinInput("");
      loadProfile();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function completeTrip() {
    if (!activeTrip) return;
    await api.post(`/driver/trips/${activeTrip.id}/complete`);
    setActiveTrip(null);
    setPinInput("");
    loadProfile();
  }

  async function requestPayout() {
    const amount = Number(payoutAmount);
    if (!amount) return;
    try {
      await api.post("/driver/wallet/payout-request", { amountClp: amount, targetAccount: "CuentaRUT BancoEstado" });
      setPayoutAmount("");
      api.get<any>("/driver/wallet").then(setWallet);
      loadProfile();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function logout() {
    clearSession();
    navigate("/");
  }

  if (!user || !profile) return <div className="min-h-screen bg-cg-darkBg" />;

  const online = profile.operationalStatus !== "OFFLINE";

  return (
    <div className="min-h-screen bg-cg-darkBg text-cg-darkPrimary page-enter">
      <header className="flex items-center justify-between px-4 py-3 bg-cg-darkSurface border-b border-slate-800">
        <div className="flex items-center gap-2">
          <img src="/logo-conductor.jpg" className="w-8 h-8 rounded-lg" />
          <span className="font-extrabold tracking-tight">CabrasGo Conductor</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
              gpsStatus === "active"
                ? "bg-emerald-500/15 text-cg-accent"
                : gpsStatus === "weak"
                ? "bg-amber-500/15 text-amber-400"
                : gpsStatus === "denied" || gpsStatus === "unsupported"
                ? "bg-red-500/15 text-cg-danger"
                : "bg-slate-700 text-slate-400"
            }`}
            title={
              gpsStatus === "active"
                ? "GPS activo"
                : gpsStatus === "weak"
                ? "Señal GPS débil — buscando tu ubicación, puedes seguir usando la app"
                : gpsStatus === "denied"
                ? "GPS denegado — actívalo en ajustes del navegador"
                : gpsStatus === "unsupported"
                ? "GPS no disponible en este dispositivo"
                : "Solicitando GPS..."
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${gpsStatus === "active" ? "bg-cg-accent animate-pulse" : gpsStatus === "weak" ? "bg-amber-400 animate-pulse" : "bg-current"}`} />
            GPS
          </span>
          {canInstall && (
            <button
              onClick={promptInstall}
              aria-label="Instalar app"
              title="Instalar app"
              className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sm"
            >
              📲
            </button>
          )}
          <button
            onClick={() => setShowManual(true)}
            aria-label="Manual de uso"
            title="Manual de uso"
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sm"
          >
            📘
          </button>
          <button onClick={logout} className="text-cg-danger text-sm font-semibold">
            Salir
          </button>
        </div>
      </header>

      <nav className="flex bg-cg-darkSurfaceAlt border-b border-slate-800">
        {(["home", "wallet", "historial"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold ${tab === t ? "text-cg-driverBright border-b-2 border-cg-driver" : "text-slate-500"}`}
          >
            {t === "home" ? "Operación" : t === "wallet" ? "Billetera" : "Historial"}
          </button>
        ))}
      </nav>

      <main className="max-w-md mx-auto p-4">
        {tab === "home" && (
          <div>
            <AdBanner ads={ads} dark />
            <div className="bg-cg-darkSurface border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${online ? "bg-cg-accent animate-pulse" : "bg-slate-600"}`} />
                <div>
                  <p className="text-xs text-slate-400">{profile.model} · {formatPatente(profile.plate)}</p>
                  <p className="font-bold flex items-center gap-2">
                    {profile.name}
                    {profile.isVip && (
                      <span className="text-[10px] font-bold bg-amber-400 text-black rounded-full px-2 py-0.5">VIP</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">⭐ {profile.rating.toFixed(1)} · {profile.totalTrips} viajes</p>
                </div>
              </div>
              <button
                onClick={toggleStatus}
                disabled={!!activeTrip}
                className={`rounded-full px-5 py-3 font-bold text-sm transition ${
                  online ? "bg-cg-accent text-black" : "bg-slate-800 text-slate-300 border border-slate-700"
                } disabled:opacity-50`}
              >
                {online ? "Conectado" : "Desconectado"}
              </button>
            </div>

            <div className="bg-cg-darkSurface border border-slate-800 rounded-2xl p-4 mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Saldo billetera</p>
              <p className="text-3xl font-extrabold text-cg-earningsBright tabular-nums tracking-tight">{formatClp(profile.walletBalanceClp)}</p>
            </div>

            {activeTrip && (
              <ActiveTripCard
                trip={activeTrip}
                pinInput={pinInput}
                setPinInput={setPinInput}
                onVerify={verifyPin}
                onComplete={completeTrip}
                onCancel={cancelActiveTrip}
              />
            )}

            {!activeTrip && !offer && (
              <div className="text-center text-slate-500 text-sm py-10">
                {online ? "Esperando solicitudes de viaje..." : "Conéctate para recibir viajes"}
              </div>
            )}
          </div>
        )}

        {tab === "wallet" && wallet && (
          <div>
            <div className="bg-cg-darkSurface rounded-2xl p-4 mb-4 text-center">
              <p className="text-xs text-slate-400 uppercase">Saldo disponible</p>
              <p className="text-3xl font-bold text-cg-earningsBright">{formatClp(wallet.walletBalanceClp)}</p>
              <p className="text-xs text-slate-400 mt-1">{wallet.completedTrips} viajes completados</p>
            </div>

            <p className="text-sm font-semibold text-slate-400 mb-2">Desglose de ingresos</p>
            <div className="bg-cg-darkSurface rounded-2xl p-4 mb-4 space-y-2 text-sm">
              <EarningsRow label="Tarifa base (split conductor)" value={wallet.earningsBreakdown.fareBaseClp} />
              <EarningsRow label="Tarifa dinámica / surge" value={wallet.earningsBreakdown.surgeBonusClp} />
              <EarningsRow label="Propinas" value={wallet.earningsBreakdown.tipsClp} />
              <EarningsRow label="Bono meta semanal" value={wallet.earningsBreakdown.weeklyBonusClp} />
              <EarningsRow label="Compensación por cancelación" value={wallet.earningsBreakdown.cancellationCompensationClp} />
              {wallet.earningsBreakdown.cancellationPenaltiesClp > 0 && (
                <EarningsRow
                  label="Penalidad por cancelación"
                  value={-wallet.earningsBreakdown.cancellationPenaltiesClp}
                  negative
                />
              )}
            </div>

            {wallet.weeklyBonuses.length > 0 && (
              <>
                <p className="text-sm font-semibold text-slate-400 mb-2">Bonos por meta semanal</p>
                <div className="space-y-2 mb-4">
                  {wallet.weeklyBonuses.map((b: any) => (
                    <div key={b.id} className="bg-cg-darkSurface rounded-xl p-3 flex justify-between text-sm">
                      <span>{b.tripsCompleted} viajes · semana {new Date(b.weekStart).toLocaleDateString("es-CL")}</span>
                      <span className="font-semibold text-cg-earningsBright">{formatClp(b.bonusClp)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder="Monto a transferir"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="flex-1 bg-cg-darkSurfaceAlt rounded-xl px-4 py-3 text-sm"
              />
              <button onClick={requestPayout} className="bg-cg-driver text-white font-semibold rounded-xl px-4">
                Transferir
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-400 mb-2">Historial de transferencias</p>
            <div className="space-y-2">
              {wallet.payouts.map((p) => (
                <div key={p.id} className="bg-cg-darkSurface rounded-xl p-3 flex justify-between text-sm">
                  <span>{p.tefRefCode}</span>
                  <span className="font-semibold">{formatClp(p.amountClp)}</span>
                </div>
              ))}
              {wallet.payouts.length === 0 && <p className="text-slate-500 text-sm">Sin transferencias aún.</p>}
            </div>
          </div>
        )}

        {tab === "historial" && (
          <div>
            <p className="text-sm font-semibold text-slate-400 mb-2">Viajes completados</p>
            {tripHistory === null && <p className="text-slate-500 text-sm">Cargando...</p>}
            {tripHistory !== null && tripHistory.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-10">Todavía no tienes viajes completados.</p>
            )}
            <div className="space-y-2">
              {(tripHistory ?? []).map((t) => (
                <div key={t.id} className="bg-cg-darkSurface border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-500">
                    {t.completedAt ? new Date(t.completedAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : ""}
                  </p>
                  <p className="font-semibold text-sm mt-1">{t.originAddress} → {t.destAddress}</p>
                  <p className="text-cg-earningsBright font-bold mt-1 tabular-nums">{formatClp(t.driverNetClp)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {offer && (
        <div className="fixed inset-0 bg-black/85 flex items-end sm:items-center justify-center z-50">
          <div className="bg-cg-darkSurface border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-[0_0_32px_-4px_rgba(16,185,129,0.25)]">
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="#334155" strokeWidth="6" fill="none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke={countdown <= 5 ? "#F59E0B" : "#10B981"}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - countdown / 15)}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold tabular-nums">{countdown}</span>
              </div>
            </div>
            <p className="text-center text-4xl font-extrabold text-cg-earningsBright mb-1 tabular-nums tracking-tight">{formatClp(offer.netEarningsClp)}</p>
            <p className="text-center text-xs text-slate-400 mb-4 font-medium">Ganancia neta (bruto {formatClp(offer.grossFareClp)})</p>
            <div className="bg-cg-darkSurfaceAlt border border-slate-800 rounded-xl p-3 mb-4 text-sm space-y-1.5">
              <p><span className="text-slate-400">Recogida:</span> <span className="font-semibold">{offer.pickupAddress}</span> ({offer.pickupDistanceKm} km)</p>
              <p><span className="text-slate-400">Destino:</span> <span className="font-semibold">{offer.destAddress}</span></p>
              <p className="text-cg-warning font-semibold">{offer.terrainType.includes("RIPIO") ? "⚠ Ripio compactado" : "Asfalto"} {offer.requires4x4 ? "· Requiere 4x4" : ""}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={declineOffer} className="w-[35%] bg-slate-800 border border-slate-700 rounded-xl py-4 font-bold transition-all duration-150 active:scale-95">
                Rechazar
              </button>
              <button onClick={acceptOffer} className="flex-1 bg-cg-driver text-white rounded-xl py-4 font-extrabold transition-all duration-150 active:scale-95 shadow-lg shadow-blue-500/20">
                Aceptar Viaje
              </button>
            </div>
          </div>
        </div>
      )}

      {(gpsStatus === "denied" || gpsStatus === "unsupported") && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cg-darkSurface border border-slate-800 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-lg font-extrabold mb-2">Activa tu ubicación para continuar</p>
            <p className="text-sm text-slate-400 mb-5">
              {gpsStatus === "unsupported"
                ? "Este dispositivo o navegador no puede compartir tu ubicación. Prueba desde otro celular o actualiza tu navegador para recibir viajes."
                : "CabrasGo necesita tu ubicación en todo momento para asignarte viajes cercanos y reportar tu posición en el mapa. Sin GPS activo no puedes conectarte."}
            </p>
            {gpsStatus === "denied" && (
              <button
                onClick={requestGps}
                className="w-full bg-cg-driver text-white rounded-xl py-3.5 font-extrabold active:scale-95 transition-all duration-150"
              >
                Activar ubicación
              </button>
            )}
            <p className="text-[11px] text-slate-500 mt-3">
              Si tu navegador ya bloqueó el permiso, toca el ícono de candado junto a la dirección del sitio, habilita "Ubicación" y vuelve a tocar el botón.
            </p>
          </div>
        </div>
      )}

      {showManual && (
        <ManualModal
          title="Manual de uso"
          subtitle="CabrasGo Conductor"
          sections={CONDUCTOR_MANUAL}
          onClose={() => setShowManual(false)}
          dark
        />
      )}
    </div>
  );
}

function ActiveTripCard({
  trip,
  pinInput,
  setPinInput,
  onVerify,
  onComplete,
  onCancel,
}: {
  trip: any;
  pinInput: string;
  setPinInput: (v: string) => void;
  onVerify: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const canCancel = trip.status === "ACCEPTED" || trip.status === "DRIVER_ARRIVED";
  return (
    <div className="bg-cg-darkSurface border border-slate-800 rounded-2xl p-4 mb-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Viaje activo · {trip.status}</p>
      <p className="font-bold mb-1">{trip.originAddress} → {trip.destAddress}</p>
      <p className="text-cg-earningsBright font-extrabold text-lg tabular-nums">{formatClp(trip.driverNetClp)}</p>
      <p className="text-xs text-slate-400 mb-3">Tu ganancia neta · tarifa del viaje {formatClp(trip.fareGrossClp)}</p>

      {canCancel ? (
        <div className="flex gap-2 mb-2">
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="PIN del pasajero"
            className="flex-1 bg-cg-darkSurfaceAlt border border-slate-700 rounded-xl px-4 py-3 text-sm tracking-widest font-bold"
            maxLength={4}
          />
          <button onClick={onVerify} className="bg-cg-driver text-white font-bold rounded-xl px-4">
            Iniciar viaje
          </button>
        </div>
      ) : (
        <button onClick={onComplete} className="btn-primary-dark mb-2">
          Finalizar viaje
        </button>
      )}

      {canCancel && (
        <button onClick={onCancel} className="w-full text-center text-cg-danger text-xs font-semibold py-1">
          Cancelar viaje (aplica penalidad)
        </button>
      )}
    </div>
  );
}

function EarningsRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${negative ? "text-cg-danger" : "text-cg-earningsBright"}`}>
        {negative ? "-" : ""}
        {formatClp(Math.abs(value))}
      </span>
    </div>
  );
}
