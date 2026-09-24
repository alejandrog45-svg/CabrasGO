# Manual — Activar login con Facebook en CabrasGo

Estado: **código listo y compilando** (botón "Continuar con Facebook" en
`frontend/src/pages/Login.tsx`, mismo flujo que Google/teléfono). **Falta
un paso manual tuyo** en Meta y Firebase — Claude Code no puede crear una
app de Meta por vos (requiere aceptar los términos de desarrollador de Meta
a tu nombre).

No toca el backend: `POST /auth/firebase` ya es genérico (verifica el
token de Firebase sin importar el proveedor), así que Facebook reutiliza
toda la lógica de seguridad que ya existe para Google (vinculación solo
por email verificado, bloqueo de cuentas `DRIVER`, etc. — ver sección
"Login con Google + Teléfono/SMS" en `CLAUDE.md`).

## Paso 1 — Crear la app en Meta for Developers (una sola vez)

1. Andá a **https://developers.facebook.com/apps** con tu cuenta de Meta
   (`alejandrog45`).
2. **Crear app** → tipo de uso **"Consumidor"** o **"Ninguno"** → nombre
   sugerido: `CabrasGo`.
3. En el dashboard de la app, agregá el producto **"Facebook Login"**
   (no "Facebook Login para empresas", el genérico).
4. En **Configuración → Básica**, copiá:
   - **ID de la app**
   - **Clave secreta de la app** (botón "Mostrar", puede pedir tu
     contraseña de Facebook)
5. En **Facebook Login → Configuración**, agregá en "URI de redireccionamiento de OAuth válidos":
   ```
   https://cabrasgo.firebaseapp.com/__/auth/handler
   ```
   (es el dominio de auth de Firebase del proyecto `cabrasgo`, no un dominio tuyo).
6. Mientras la app esté en **modo Desarrollo**, solo vos y los usuarios que
   agregues como "Tester" en **Roles → Testers de la app** van a poder
   loguearse con Facebook — para que cualquier pasajero real pueda usarlo,
   hay que pasar la app a **modo Live** (botón arriba a la derecha del
   dashboard). Meta puede pedir una revisión de la app para permisos
   avanzados, pero el permiso básico `email` + `public_profile` (los
   únicos que usa este login) generalmente no la requiere.

## Paso 2 — Activar el proveedor en Firebase (una sola vez)

1. Andá a **https://console.firebase.google.com/project/cabrasgo/authentication/providers**
2. Click en **Facebook** → activar (toggle).
3. Pegá el **ID de la app** y la **Clave secreta de la app** del Paso 1.
4. Firebase te muestra ahí mismo la misma URI de redirección del paso 1.6
   — confirmá que coincide con la que pusiste en Meta.
5. Guardar.

## Paso 3 — Probar

1. `npm run dev` (o entrar a `cabrasgo.web.app` si ya está desplegado).
2. En la pantalla de login, tocar **"Continuar con Facebook"**.
3. Si la app de Meta sigue en modo Desarrollo, solo funciona con una
   cuenta de Facebook que hayas agregado como Tester (Paso 1.6).
4. Confirmar que loguea y aterriza en `/pasajero` — mismo comportamiento
   que Google.

## Notas de seguridad ya cubiertas por el código existente

- Si el email de Facebook no viene verificado, el backend **no** lo usa
  para vincular a una cuenta existente por email (evita que alguien
  reclame la cuenta de otra persona) — crea una cuenta nueva en su lugar.
- Si la cuenta encontrada es de un conductor (`role: DRIVER`), el login
  se rechaza (403) — un conductor no puede entrar como pasajero por acá.
- Si el email de Facebook ya está vinculado a una cuenta creada con Google
  o con contraseña, Firebase devuelve
  `auth/account-exists-with-different-credential` y el login muestra el
  mensaje "Ese email ya tiene una cuenta con otro método de acceso" — no
  se crean cuentas duplicadas por accidente.

## Qué NO incluye esto

- No hay registro de **conductores** por Facebook — igual que con Google,
  el conductor sigue exclusivamente por `/auth/register-driver` con KYC
  completo (decisión de negocio ya tomada, ver `CLAUDE.md`).
- No se pidió ni se activó revisión avanzada de permisos de Meta (fotos,
  amigos, etc.) — solo `email` + `public_profile`, lo mínimo para el login.
