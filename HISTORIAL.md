# HISTORIAL.md — CabrasGo, log de sesiones archivado

Detalle sesión a sesión, movido fuera de `CLAUDE.md` el 2026-09-23 para
mantener ese archivo por debajo de ~200 líneas (regla de `agnix`).
`CLAUDE.md` mantiene solo el conocimiento de negocio vigente + un resumen
ejecutivo y los pendientes abiertos; este archivo es el detalle completo
para quien necesite el porqué de una decisión pasada.

## Frontend visual redesign + real GPS activation (2026-09-19)

- **Uber-inspired visual pass** on all 3 apps (pasajero/conductor/admin):
  className/JSX-only changes (borders instead of soft shadows, bolder
  typography, icon rows, tighter cards). Zero business-logic changes. Base
  reference designs live in
  `../stitch_ride_sharing_app_platform EJEMPLO DISEÑO INICIAL/` (local only,
  not in this repo) and the Stitch project "Ride-Sharing App Platform"
  (id `12881645426853570551`).
- **PWA manifest fix**: `start_url` in `frontend/vite.config.ts`'s
  `VitePWA({ manifest: {...} })` changed from a hardcoded `/pasajero` to
  `/`. The old value meant any installed home-screen shortcut always
  launched straight into the passenger app regardless of which URL/role
  the person intended — this is why conductor/admin links looked "forced"
  into the passenger screen when opened from a home-screen icon.
- **Passenger — GPS-driven origin**: `PasajeroApp.tsx` requests
  `navigator.geolocation.getCurrentPosition` as soon as the app mounts
  (not on first trip request). If granted, it computes the nearest of the
  10 landmarks via a local `haversineKm()` helper and sets it as `origin`
  when within 6 km; beyond that it keeps the API's `defaultOrigin`
  (Plaza de Armas de Las Cabras). A small GPS-denied badge shows in the
  header when permission is refused/unavailable.
- **Passenger — destination text search**: `HomeScreen`'s `¿A dónde vamos?`
  list is now filterable by a text input (`search` state), client-side
  substring match over the existing `landmarks` array — no new backend
  endpoint, no geocoding.
- **Passenger — "Para mí / Para otra persona"**: `rideFor`/`riderName`/
  `riderPhone` state on `PasajeroApp`. When booking for someone else, the
  name+phone are appended as free text to `origin.address` sent to
  `POST /passenger/trips/request` (e.g. `"... · Pasajero: Ana (+56911112222)"`).
  No schema change — reuses the existing free-text address field, so the
  driver sees it as part of the pickup address.
- **Driver — GPS activates on app open, not on "Conectado"**:
  `ConductorApp.tsx` requests geolocation on mount and shows a GPS status
  pill in the header (`pending` / `active` pulsing green / `denied` red /
  `unsupported`). While `operationalStatus !== "OFFLINE"` it runs
  `navigator.geolocation.watchPosition` and reports every update to the
  new `POST /driver/location/ping` endpoint (`backend/src/routes/driver.ts`),
  which just updates `Driver.currentLatitude/currentLongitude/lastPingAt`
  (no-ops with `{ ok: false, reason: "offline" }` if the driver went
  offline). `toggleStatus()` reuses the already-known position instead of
  re-prompting for permission every time "Conectado" is tapped.
- **Verified against production** (not simulated locally): `POST
  /passenger/quote` and `POST /driver/location/ping` were called directly
  against `cabrasgo-backend-production.up.railway.app` for the 4 seeded
  zones (Las Cabras Centro, Marina Golf Rapel, El Manzano, Llallauquén) —
  correct `dynamicMultiplier` per zone (1.0 / 1.35 / 1.15 / 1.35) and
  successful GPS pings with immediate reflection in `GET /driver/me`. The
  demo driver (Osvaldo Bravo) was left back in `OFFLINE` after the test so
  production fleet state wasn't left dirty.

## GPS persistente + aviso obligatorio de permiso (2026-09-19, pendiente de confirmar en celular)

Auditoría pedida por el dueño de las 3 apps: estado general, botón "instalar
app" al abrir links, y comportamiento del permiso de GPS (debe quedar
predeterminado si se otorga, avisar de forma insistente/obligatoria si no,
activarse de inmediato al aceptar).

- **`PasajeroApp.tsx` y `ConductorApp.tsx`**: el GPS pasó de una lectura
  única (`getCurrentPosition` al montar) a seguimiento continuo
  (`watchPosition`) activo todo el tiempo que la app está abierta. En
  conductor, antes el `watchPosition` solo corría mientras
  `operationalStatus !== OFFLINE`; ahora corre siempre que la app está
  abierta (el ping a `POST /driver/location/ping` se sigue mandando solo si
  está online — el backend ya no-opea si está offline, ver
  `backend/src/routes/driver.ts`).
- **Permiso denegado o dispositivo sin soporte**: aparece un modal
  bloqueante (sin botón de cerrar) explicando por qué se necesita el GPS,
  con botón "Activar ubicación" que reintenta `watchPosition` al toque. Si
  es "unsupported" (no hay nada que reintentar) el modal no muestra ese
  botón, solo la explicación.
- **Permiso concedido**: se activa de inmediato (ya funcionaba así) y queda
  predeterminado siempre — eso lo maneja el propio navegador, la app nunca
  vuelve a pedirlo si ya fue concedido una vez.
- **Botón "instalar app"**: no existe componente propio en el repo — hoy
  depende 100% del banner nativo del navegador vía el
  `manifest.webmanifest` de `VitePWA` (`frontend/vite.config.ts`). Queda
  pendiente que el dueño decida si se construye un botón in-app propio
  (escuchando `beforeinstallprompt`) o se deja así.
- **Verificación**: `tsc -b && vite build` sin errores (Node portátil de
  `E:\nodejs-portable`, ya que el PATH del sistema en esta sesión no tenía
  Node). Deployado a un canal preview de Firebase Hosting (no toca
  `cabrasgo.web.app`): `https://cabrasgo--preview-gps-j80yi8xb.web.app`
  (expira 2026-09-22). **Todavía sin probar en celular real ni commiteado**
  — falta confirmación del dueño antes de mergear a `alejandro main` y
  deployar a producción.
  (Nota sesión 2026-09-19 noche: esto ya se mergeó y deployó — ver commit
  `d1812f9` y la sección siguiente. El punto de "instalar app" que quedaba
  pendiente de decisión se resolvió abajo.)

## Sesión 2026-09-19 noche — instalar app, QR, tarifas, historial, registro real

Se avanzó 1 a 1 sobre los 4 pendientes de la sesión anterior, más varios
bugs encontrados en el camino. Todo verificado con `tsc -b`/`vite
build`/`npm run build` sin errores antes de cada deploy a preview.

- **Botón "instalar app"**: dueño decidió construir uno propio.
  `frontend/src/lib/useInstallPrompt.ts` (hook que escucha
  `beforeinstallprompt`) + botón 📲 en las 3 apps, junto al 📘 de manual.
  Solo aparece en navegadores que soportan el evento (Android
  Chrome/Edge; no existe en iOS Safari, ahí no cambia nada).
- **QR + guía paso a paso**: nueva página pública `/guia`
  (`frontend/src/pages/GuiaQR.tsx`), sin login, reusa textualmente
  `PASAJERO_MANUAL` (no se inventó contenido nuevo). QR generado con
  `qrcode` (Python) en `marketing/output/qr/qr-guia-cabrasgo.png`, apunta a
  `cabrasgo.web.app/guia` (URL real de producción, no al preview).
- **Programar viaje para más tarde + método de pago preferido**: requirió
  schema nuevo — `Trip.scheduledFor` (`DateTime?`), status `SCHEDULED`, y
  `User.preferredPaymentMethod`. Backend: `POST /passenger/trips/schedule`,
  `GET /passenger/trips/scheduled`, `GET`/`PUT /passenger/payment-method`,
  y `dispatchDueScheduledTrips()` en `src/routes/passenger.ts` corrida cada
  30s desde `src/index.ts` (pasa `SCHEDULED` → `DISPATCHING` cuando llega la
  hora, reusa el mismo `dispatchTrip` de siempre). Frontend: toggle
  "Programar para más tarde" en `CategoriesScreen`, lista "Viajes
  programados" en home de pasajero con botón cancelar.
  **Pendiente real**: correr `npx prisma db push` contra la base de
  Railway de producción para crear las columnas nuevas — no se hizo en
  esta sesión, requiere aprobación explícita antes de tocar la DB de
  producción. (Sigue pendiente — ver "Pendientes abiertos" en `CLAUDE.md`.)
- **Ruta real en el mapa (estilo Uber)**: `frontend/src/lib/routing.ts`
  llama a OSRM público (`router.project-osrm.org`, gratis, sin API key,
  mismo espíritu que Leaflet+OSM) y dibuja el `Polyline` real en
  `CategoriesScreen`. `LiveMap.tsx` ahora acepta prop `route`.
- **Desglose de tarifa**: modal "Ver desglose" en cada categoría de
  `CategoriesScreen`, con los valores reales que ya calculaba
  `backend/src/lib/fare.ts` (bajada de bandera, tramo pavimentado/ripio,
  tiempo, tarifa dinámica, factor combustible) — antes se calculaban pero
  no se mostraban al pasajero.
- **Historial de viajes + menú de usuario**: pantalla `HistoryScreen` en
  pasajero (ícono 🕓 en el header), consume `GET
  /passenger/trips/history` que ya existía. Menú de usuario (avatar con
  inicial) reemplaza el simple "Salir": muestra nombre, email, rating real,
  accesos a Mis viajes / Manual, y Cerrar sesión.
- **Registro real de usuarios** (antes bloqueado por decisión de negocio
  pendiente — el dueño confirmó explícitamente en esta sesión que procede):
  - `POST /auth/register` (pasajero): RUT validado con `isValidRut`
    (`src/lib/chile.ts`), password mín. 8 caracteres, chequea email/RUT
    duplicado. Pantalla "Crear cuenta nueva" en `Login.tsx`.
  - `POST /auth/register-driver` (conductor, KYC): pide licencia,
    vencimiento licencia/SOAP/revisión técnica, patente, modelo, categoría,
    RUT de cuenta bancaria. Crea `Driver.isKycVerified = false` — un admin
    debe aprobarlo. Pantalla "Súmate como conductor" en `Login.tsx`.
  - Admin: botón real "⏳ Aprobar" / "✅ Verificado" en Radar de Flotas
    (antes esa columna era solo texto de solo lectura) — llama al endpoint
    `PUT /admin/drivers/:id/kyc` que ya existía en el backend pero no tenía
    UI conectada.
  - **Explícitamente fuera de alcance** (necesitan credenciales que no
    existen en el proyecto — no se simularon botones falsos): login con
    Google/Apple (requiere client ID/secret OAuth) y verificación por SMS
    (requiere cuenta Twilio u otro proveedor).

### Bugs reales encontrados y corregidos (no eran parte del pedido original)

- **Coordenada de "Marina Golf Rapel" mal calculada**: en
  `backend/src/lib/landmarks.ts` estaba a ~10 km de su ubicación real,
  inflando tarifas hasta 8x para viajes cortos reales (~500m). Corregida
  contra datos reales de OpenStreetMap/Nominatim (lat -34.1586649, lng
  -71.4567144, antes -34.2486/-71.4312). El resto de landmarks se
  verificó por muestreo (Plaza de Armas coincide casi exacto; Llallauquén
  tiene un desvío de ~5km que NO se tocó — queda para revisar si hace
  falta).
- **Pantalla de categorías no mostraba el origen**, solo destino — se
  agregó la dirección de origen a la tarjeta y al mapa.
- **Idioma**: se encontró voseo rioplatense ("vos", "pedí", "tenés",
  "instalá", "manejá", "sumate", "registrate", "escaneá", "deslizá") en
  manuales in-app y en los 8 flyers de marketing — corregido a tuteo
  chileno estándar en todo el proyecto (`frontend/src/lib/manuals.ts`,
  textos de GPS en las 3 apps, `marketing/gen_flyers.py` y los templates de
  post/story de lanzamiento).

### Bug de infraestructura — RESUELTO (2026-09-20, doc, sin Docker)

`backend/prisma/schema.prisma` tiene `provider = "postgresql"` (desde el
commit `25dde10`) pero `.env.example`/`README.md` seguían documentando
SQLite — el dev local fallaba con "the URL must start with the protocol
postgresql://" siguiendo la guía tal cual estaba escrita. Se optó por
documentar Postgres real (no volver a SQLite, ya que produção usa Postgres
y mantener dos datasources vivos es más frágil que pedir una connection
string): `.env.example` y `README.md` ahora piden una Postgres gratis de
Neon.tech o Supabase (sin tarjeta, sin Docker) en vez de `file:./dev.db`.
El propio dueño necesita crear esa cuenta y pegar la URL — Claude Code no
puede provisionarla por él.

### Verificación pendiente del dueño antes del próximo deploy a producción

Todo lo de esta sesión está en un canal preview de Firebase (no toca
`cabrasgo.web.app`): **`https://cabrasgo--preview-install-btn-4twwvd7c.web.app`**
(expira 2026-09-22). El registro real (`/auth/register` y
`/auth/register-driver`) SÍ pega contra el backend de Railway en
producción (el preview solo cambia el frontend) — probarlo ahí crea
usuarios reales en la base de producción.

## Login con Google + Teléfono/SMS vía Firebase Auth — solo pasajero (2026-09-20)

Decisión de negocio confirmada por el dueño antes de implementar: el RUT
queda **opcional** al registrarse por Google/teléfono (se pide después solo
si el usuario paga con CuentaRUT BancoEstado), y esto aplica **solo al
pasajero** — el conductor sigue exclusivamente por `/auth/register-driver`
con KYC completo (licencia, patente, revisión técnica, etc.), sin atajo de
login social.

- **Prisma**: `User.rut`, `User.email`, `User.passwordHash` pasaron de
  obligatorios a `String?` opcionales; se agregó `User.firebaseUid String?
  @unique`. Aplicado a la Postgres de producción vía `npx prisma db push`
  contra el túnel SSH (`herramientas/tunel-postgres-railway.bat`) — cambio
  aditivo, sin pérdida de datos (las filas existentes quedan con
  `firebaseUid = NULL`, permitido en una columna única de Postgres).
- **Backend**: `backend/src/lib/firebaseAdmin.ts` inicializa
  `firebase-admin` v14 (API modular: `initializeApp`/`cert` de
  `firebase-admin/app`, `getAuth` de `firebase-admin/auth`) leyendo el JSON
  completo del service account desde `FIREBASE_SERVICE_ACCOUNT` (una sola
  línea en `.env` local y en las variables de Railway — mismo patrón que el
  bot de WhatsApp de Ferretería Oviedo). Nuevo `POST /auth/firebase`
  (`backend/src/routes/auth.ts`) con la lógica de 3 riesgos reales
  detectados en revisión (ver más abajo):
  1. Busca por `firebaseUid` → si no, por email **solo si
     `email_verified === true`** (nunca por email sin verificar — evita que
     alguien reclame la cuenta de otra persona registrando su email en
     Firebase) → si no, por teléfono.
  2. Si la cuenta encontrada es `role: DRIVER`, responde 403 explícito — un
     conductor no puede colarse como pasajero por Google/SMS con su mismo
     email o teléfono.
  3. El `create()` de usuario nuevo está en `try/catch` capturando
     `Prisma.PrismaClientKnownRequestError` código `P2002`, para el caso de
     doble clic/doble submit disparando dos requests concurrentes con el
     mismo `firebaseUid`.
- **Frontend**: `frontend/src/lib/firebase.ts` (config pública del SDK web,
  no es secreta) y `frontend/src/lib/phone.ts`
  (`normalizeChileanPhoneToE164`). En `Login.tsx`: botón "Continuar con
  Google" (`signInWithPopup`, con fallback automático a
  `signInWithRedirect` si el popup es bloqueado — pasa en Safari iOS y en
  los navegadores integrados de Instagram/WhatsApp) y flujo de teléfono con
  `RecaptchaVerifier` invisible + `signInWithPhoneNumber`.
- **Revisión con Gemini** (`scripts/consultar-gemini.js`, ver sección de
  comandos): se le pidió revisar primero el plan y después el código ya
  escrito, dos pasadas separadas. Encontró 6 problemas en el plan (email
  nullable, colisión de cuentas por email, fuga de roles, `signInWithPopup`
  roto en Safari/webviews, `RecaptchaVerifier` + React StrictMode,
  normalización E.164) y 3 más ya en el código escrito (vinculación
  insegura por email no verificado, bypass del bloqueo de conductor vía
  login por teléfono, condición de carrera en el `create`) — todos
  corregidos antes de tocar producción.
- **Consola de Firebase** (hecho por el dueño, no por Claude Code):
  proveedores Google y Teléfono habilitados en Authentication, con Chile
  agregado a la política de región de SMS (por defecto Firebase bloquea
  SMS a países no autorizados, error `auth/operation-not-allowed`). Un
  número de teléfono de prueba quedó registrado en la consola (nunca
  manda SMS real, acepta un código fijo) para probar el flujo sin gastar
  la cuota gratis de 10 SMS/día.
- **Verificado en vivo en `cabrasgo.web.app`**: login con Google (cuenta
  real, vinculó correctamente a una cuenta pasajero ya existente por email
  verificado) y login por SMS con el número de prueba — ambos aterrizan en
  `/pasajero` con GPS real. Bug de despliegue encontrado y resuelto en el
  camino: el Service Worker de la PWA cacheaba la build anterior en el
  navegador normal (invisible en incógnito) — se resolvió desregistrando
  el service worker y limpiando caches manualmente tras el deploy.
- **Fuera de alcance de esta sesión**: **Apple Sign-In** — requiere cuenta
  Apple Developer de pago (US$99/año), decisión y trámite del dueño. Solo
  es obligatorio si se publica una app nativa en el App Store; la PWA web
  puede seguir sin él indefinidamente.

## Login con Facebook — código pusheado, implementación pausada (antes de 2026-09-23)

Se pusheó el código de login con Facebook, pero el dueño indicó en la
sesión previa a la del 2026-09-23 que **no avanza por ahora** — Facebook
no aplica como prioridad actual para CabrasGo. Solo queda un manual con los
pasos pendientes (`MANUAL_LOGIN_FACEBOOK.md`, 2 pasos manuales en Meta for
Developers + consola de Firebase) por si se retoma más adelante. No es un
pendiente activo de la sesión de trabajo, es documentación en espera.
