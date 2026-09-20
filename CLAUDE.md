# CLAUDE.md — CabrasGo business/domain knowledge

This file is the "conocimiento del negocio" reference for CabrasGo. Keep it
up to date when the fare algorithm, region, geofences or payment methods
change.

## Purpose

CabrasGo is a ride-sharing / mobility platform serving **Las Cabras, Peumo,
San Vicente de Tagua Tagua and the Lago Rapel basin** (VI Región de
O'Higgins, Chile). It matches passengers with a small local fleet of
drivers, quoting fares with a rural-aware algorithm (paved vs dirt road,
seasonal geofence multipliers, fuel-price indexation) and handling the full
trip lifecycle, driver payouts (commission-based split, admin-configurable
70%-85% driver net), and an admin control panel for KPIs, geofences, KYC
and the commission/revenue model described below.

## Tech stack

- **Backend**: Node.js + TypeScript + Express + Prisma ORM + SQLite (dev
  datasource; production alternative is Postgres+PostGIS, documented in
  `backend/prisma/schema.prisma`). Socket.io for realtime channels.
  Auth: JWT (`JWT_SECRET` env var), bcrypt password hashes.
- **Frontend**: Vite + React + TypeScript + Tailwind CSS. `react-router-dom`
  for the three role areas. `socket.io-client` for realtime updates.
  `react-leaflet` + OpenStreetMap tiles for maps (no API key needed).
- **No external services required to run**: SQLite is a local file,
  payment/fuel integrations are mocked behind the spec's own API shapes.

## Directory layout

```
backend/prisma/schema.prisma   Data model (see header comment for Postgres+PostGIS swap)
backend/prisma/seed.ts         Seeds geofences, fuel benchmarks, demo users
backend/src/lib/fare.ts        Fare algorithm constants + computeFare/splitFare
backend/src/lib/geofence.ts    Point-in-polygon containment (PostGIS ST_Contains replacement)
backend/src/lib/chile.ts       RUT/patente/CLP/phone formatting + RUT check-digit validation
backend/src/lib/quote.ts       Shared quote-building logic (used by /quote and /trips/request)
backend/src/lib/landmarks.ts   The 10 validated VI Región GPS landmarks
backend/src/lib/platformConfig.ts  Commission/cancellation/VIP/bonus config (single-row PlatformConfig)
backend/src/lib/weeklyBonus.ts     Rolling-week driver goal bonus grant logic
backend/src/routes/            passenger.ts, driver.ts, admin.ts, auth.ts (REST API)
                                driver.ts also exposes POST /driver/location/ping (continuous GPS while online)
backend/src/ws/socket.ts       Socket.io: 15s dispatch cascade, telemetry, movement sim
frontend/src/pages/pasajero/   Passenger app (light mode)
frontend/src/pages/conductor/  Driver app (dark OLED mode)
frontend/src/pages/admin/      Admin control panel (desktop dashboard)
frontend/src/components/LiveMap.tsx   Leaflet/OSM map component shared by all three apps
```

## How to run / seed / test

```bash
npm run setup   # root: installs both workspaces, provisions SQLite, seeds demo data
npm run dev     # root: runs backend (:8080) + frontend (:5173) concurrently
npm run seed    # root: re-run the seed script only (wipes and reseeds all tables)
```

Backend alone: `cd backend && npm install && npm run prisma:generate && npm run prisma:push && npm run seed && npm run dev`.
Frontend alone: `cd frontend && npm install && npm run dev`.
Production build: `npm run build` (root) or per-workspace `npm run build`.

There is no dedicated automated test suite yet; verification is done by
curling the REST endpoints (`/api/v1/health`, `/api/v1/passenger/quote`,
`/api/v1/passenger/trips/request`, `/api/v1/admin/kpis/realtime`, ...) and by
building the frontend + loading each of `/`, `/pasajero`, `/conductor`,
`/admin` in a browser.

## Fare algorithm summary

```
Tarifa = [ B + (D_pav·C_pav) + (D_ripio·C_ripio) + (T_est·C_min) ] × M_estival × F_combustible
```

- `B` (bajada de bandera) = $1.200 CLP
- `C_pav` = $350 CLP/km asfalto
- `C_ripio` = $550 CLP/km ripio
- `C_min` = $120 CLP/minuto estimado (distance / ~38 km/h average rural speed)
- `M_estival` = geofence's `dynamicMultiplier` (1.0 default, 1.35 for
  Llallauquén/Marina Golf in high season, 1.15 for El Manzano)
- `F_combustible = 1 + ((avgFuelPrice − 1250) / 1250 × 0.25)`, rounded to
  `1.00` whenever `|F − 1.00| < 0.02` (damping band)
- Fuel benchmark only re-indexes when it moves > $25 CLP/L from the last
  reading (`FUEL_PRICE_SYNC_TRIGGER_CLP`)
- Category premium: `RURAL_4X4_XL` = ×1.22 over `STANDARD_SEDAN`
- Driver/platform split: `driverNetClp` / `platformFeeClp`, admin-configurable
  via `PlatformConfig.commissionPct` and clamped to 15%-30% commission
  (70%-85% driver net) — see "Business / commission model" below. Starting
  seed default is 15% commission / 85% driver net.

All constants live in `backend/src/lib/fare.ts`.

## Key domain facts

- **Región / comunas**: VI Región de O'Higgins — Las Cabras (primary),
  Peumo, San Vicente de Tagua Tagua, around the Lago Rapel basin.
- **Geofence zones** (exact codes, do not rename): `LAS_CABRAS_CENTRO`,
  `MARINA_GOLF_RAPEL`, `LLALLAUQUEN`, `EL_MANZANO`.
- **Fuel stations** (real): Copec Las Cabras Centro (Av. Carlos Valdovinos
  450) — gasolina 93 $1.294/L, diésel $1.042/L; Shell Cruce Las Cabras
  (Ruta H-66 km 28) — $1.298 / $1.046; **Copec El Manzano** (Ruta H-66
  lote A y sitio 3, El Manzano, Rapel) — corregido 2026-09-20, la estación
  seedeada como "Petrobras El Manzano" era incorrecta (verificado contra
  bencinaenlinea.cl/CNE): gasolina 93 $1.490/L, **gasolina 95 $1.523/L**,
  diésel $1.340/L. `FuelBenchmark.gasoline95Clp` es nullable — solo esta
  estación tiene el dato real; las otras dos no tienen 95 cargado todavía
  (no inventar, dejar `null` hasta confirmar precio real).
- **10 GPS landmarks** (validated, real coordinates — see
  `backend/src/lib/landmarks.ts`): Plaza de Armas de Las Cabras (default
  passenger origin), Marina Golf Rapel, El Manzano, Balneario Llallauquén,
  Hospital de Las Cabras, Cruce Las Cabras, Punta Verde, Cocalán, Cruce
  Peumo–San Vicente, Cerro Llallauquén (repetidora). **Balneario
  Llallauquén corregido 2026-09-20**: tenía ~4.5km de desvío (lat
  -34.2711/-71.4589, apuntaba al centro del pueblo en vez de al balneario);
  corregido a -34.2382735/-71.4311504 ("Playas de Llallauquén", ribera del
  lago), confirmado por Nominatim/OpenStreetMap y contrastado con Gemini —
  el dueño aprobó la coordenada explícitamente antes de aplicarla.
- **Payment methods**: `WEBPAY_ONECLICK` (Transbank),
  `CUENTARUT_BANCOESTADO` (BancoEstado), `CASH`.
- **RUT format**: `12.345.678-9`, módulo-11 check digit
  (`isValidRut`/`makeRut`/`formatRut` in `backend/src/lib/chile.ts`).
- **Patente format**: `LK · PX · 84`.
- **Phone format**: `+56 9 8765 4321`.
- **Vehicle categories**: `STANDARD_SEDAN`, `RURAL_4X4_XL` (requires
  `has4x4 = true` on the driver; geofences can set `require4x4 = true`).
- **Trip lifecycle**: `REQUESTED → DISPATCHING → ACCEPTED → DRIVER_ARRIVED →
  IN_PROGRESS → COMPLETED` (or `CANCELLED`). PIN verification (4 digits)
  gates `DRIVER_ARRIVED/ACCEPTED → IN_PROGRESS`.
- **Driver operational status**: `OFFLINE, AVAILABLE, EN_ROUTE_PICKUP,
  ON_TRIP, SUSPENDED`.
- **Demo accounts are not real people** — see README "Domain facts" for the
  disclaimer that applies to every seeded user (valid-format RUTs, fictional
  identities). Real-world data (geofences, GPS landmarks, fuel prices) is
  not fabricated.

## Known spec deviations (and why)

- **SQLite instead of Postgres+PostGIS**: zero-setup requirement. Postgres
  block preserved in a schema header comment; enums became `String` columns
  (SQLite's Prisma connector has no enum support) with allowed values
  documented per-field; PostGIS polygon geometry became a JSON vertex array
  + a TypeScript point-in-polygon function.
- **Google Maps → Leaflet/OpenStreetMap**: no API key should be required to
  run the demo; OSM tiles are free and keyless.
- **Redis omitted**: the reference architecture uses Redis for geo/pub-sub;
  this demo runs Socket.io directly against Express with an in-process
  dispatch/telemetry loop, sufficient for the ~5-driver demo fleet.
- **Fuel-sync trigger vs. base indexation**: kept both figures from the
  spec's two source documents — `0.02` factor-rounding damping band, and a
  `$25 CLP/L` price-change threshold that gates when a station's benchmark
  is even re-indexed.

## Business / commission model

CabrasGo formalizes three roles' worth of business logic on top of the
trip lifecycle above:

- **Cliente**: requests trips, quotes, pays (Webpay/CuentaRUT/cash), rates —
  unchanged.
- **Conductor**: earns from four attributed streams, all visible as
  separate line items in `GET /driver/wallet`'s `earningsBreakdown`:
  1. **Fare base** — the commission-split net of each completed trip.
  2. **Dynamic/surge pricing** — the portion of the fare-split net
     attributable to a geofence's `dynamicMultiplier` > 1 (e.g. Llallauquén
     high season), broken out as "additional income" rather than folded
     into the base.
  3. **Weekly goal bonus** — `DriverWeeklyBonus`, granted automatically
     (`src/lib/weeklyBonus.ts`) the first time a driver crosses the
     admin-configured trip threshold within a rolling Monday-start week.
  4. **Tips** — `Rating.tipClp`, credited to the wallet at rating time and
     surfaced distinctly from the fare split.
  VIP drivers (`Driver.isVip`) also get proximity-tier dispatch priority
  (see below).
- **Administrador**: owns `PlatformConfig` (single-row settings, admin
  UI under "Modelo de Negocio"), which drives:
  - **Commission**: `commissionPct`, constrained to **15%-30%**
    (driver net 70%-85%) via `fare.ts`'s `DRIVER_NET_PCT_MIN/MAX` and
    `platformConfig.ts`'s `clampCommissionPct`. Replaces the old hardcoded
    85/15 split; every new trip request reads the live value.
  - **Cancellation penalties**: `cancellationFeePassengerClp` /
    `cancellationFeeDriverClp`, charged once a driver has accepted
    (`POST /passenger/trips/:id/cancel`, `POST /driver/trips/:id/cancel`),
    persisted on the `Trip` row (`cancelledBy`, `cancellationFeeClp`) and
    rolled up in `GET /admin/business/overview`. A passenger-caused
    cancellation compensates the driver (same commission split); a
    driver-caused cancellation is a straight penalty.
  - **In-app advertising**: `AdCampaign` (title/body/audience/active),
    admin CRUD under `/admin/ads`, rendered as a banner by both the
    pasajero and conductor apps via `GET /passenger/ads` /
    `GET /driver/ads`.
  - **VIP/priority driver subscriptions**: `Driver.isVip` +
    `PlatformConfig.vipMonthlyFeeClp`, toggled by the admin
    (`PUT /admin/drivers/:id/vip`). In `dispatchTrip`
    (`src/routes/passenger.ts`), candidates are grouped into 3km proximity
    tiers by pickup distance; within the same tier a VIP driver is offered
    the trip before a non-VIP one (VIP never lets a far-away driver jump a
    much closer one — it only breaks ties within a tier).
  - **Admin dashboard** ("Modelo de Negocio" tab): current commission %,
    cancellation-fee revenue, ad campaign manager, VIP driver list and
    projected monthly revenue, and weekly bonus payouts — all computed
    from real rows via `GET /admin/business/overview`.

### Why this stack has near-zero operating cost (vs. Uber's)

This is informational, not a subsystem to build further — it explains a
deliberate set of "known spec deviations" already listed above, from a
cost angle:

- **SQLite instead of managed Postgres + Redis**: no database or cache
  cluster to provision or pay for at this fleet size (~5 drivers); a
  single file on disk. Uber's stack runs sharded Postgres/Schemaless plus
  Redis for geo/dispatch state — real infra spend even at low volume.
- **Leaflet + OpenStreetMap instead of the Google Maps Platform**: no
  per-load/per-request API billing and no API key to provision; OSM tiles
  are free. Google Maps' Directions/Places/Maps SDK billing is one of a
  rideshare app's largest fixed costs at scale.
- **Self-hosted/sandboxed payment integrations** (`Trip.paymentGatewayRef`
  mocks Webpay/BancoEstado TEF): no live merchant account or per-transaction
  gateway markup while in development — the request/response shape matches
  the real Transbank/BancoEstado sandbox contracts so swapping in real
  credentials later is a config change, not a rewrite.
- **No third-party SMS/push vendor**: rider/driver notifications ride the
  existing Socket.io channel instead of a metered SMS (Twilio-style) or
  push (FCM/APNs-gateway) service.
- **Socket.io directly over Express instead of a managed pub/sub (Redis,
  Kafka)**: sufficient for the demo fleet's dispatch cascade and telemetry
  stream; the code is structured (see `src/ws/socket.ts`) so a real pub/sub
  backend could replace the in-process loop without changing the REST or
  socket event contracts.

None of this is a permanent architecture decision — the schema header
comment and "Known spec deviations" section above document the exact swap
path to Postgres+PostGIS/Redis/Google Maps for a production deployment at
scale. The point is that CabrasGo can run its full commission/business
model end-to-end today with **zero external paid services**.

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
  producción.
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
