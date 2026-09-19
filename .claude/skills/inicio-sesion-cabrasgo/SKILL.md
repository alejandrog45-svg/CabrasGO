---
name: inicio-sesion-cabrasgo
description: Protocolo de inicio y cierre de sesión para el proyecto CabrasGo (movilidad Las Cabras/Peumo/Lago Rapel) — separa sus cuentas (GitHub alejandrog45-svg, Firebase/Railway alejandrog45@gmail.com) de las del ecosistema Ferretería Oviedo para no mezclar proyectos, y aplica ahorro de tokens de principio a fin. Activar SIEMPRE al abrir o cerrar cualquier sesión de Claude Code en este repo, sea en PC, celular o cloud.
---

# Inicio de sesión — CabrasGo

Este proyecto (repo `CabrasGO`, deploy local en `E:\CabrasGO-deploy\CabrasGO`
cuando corre en el PC) es un ecosistema de cuentas
**completamente separado** de Ferretería Oviedo El Manzano. Esta skill existe
para que ninguna sesión — desde el PC o desde el celular/cloud — mezcle
credenciales, repos o despliegues entre ambos.

## REGLA 0 — Mapa de cuentas (leer antes de tocar git/deploy)

| Recurso | Cuenta / identidad | Detalle |
|---|---|---|
| GitHub — deploy (fuente de verdad) | `alejandrog45@gmail.com` | Fork `alejandrog45-svg/CabrasGO`, rama `main`. Remote local: `alejandro`. **Único remoto al que se hace push.** |
| GitHub — original (solo lectura) | `ferreteriaoviedo.elmanzano@gmail.com` | `oviedoem/CabrasGO`, remote local: `origin`. **NUNCA hacer push acá** — es upstream de referencia, no el deploy. |
| Firebase Hosting | `alejandrog45@gmail.com` | Proyecto `cabrasgo` → sirve `cabrasgo.web.app` desde `frontend/dist`. |
| Railway | `alejandrog45@gmail.com` | Proyecto `cabrasgo-backend`, conectado por GitHub al fork `alejandrog45-svg/CabrasGO` — todo push a `main` ahí redeploya el backend solo. |

**Esto es 100% distinto** de las cuentas de Ferretería Oviedo (`E:\ferreteria-oviedo`,
`E:\git-sync`, `GIT_CONFIG_GLOBAL=E:\config\gitconfig`). Nunca copiar rutas,
tokens o config de un proyecto al otro.

### Verificación obligatoria antes de cualquier `git push` o deploy

Correr esto (barato, una sola vez por sesión) y confirmar que coincide con la
tabla de arriba antes de pushear o deployar — especialmente importante en
sesión de **celular/cloud**, donde el entorno puede tener otra cuenta logueada
por defecto:

```bash
git remote -v                          # correr desde la raíz del repo, sea cual sea el sistema/dispositivo
gh auth status 2>&1 | head -5          # si gh está disponible
firebase projects:list 2>&1 | head -5  # si firebase CLI está disponible
```

Si `gh auth status` o `firebase` muestran una cuenta que no es
`alejandrog45@gmail.com`, **PARAR y avisar al usuario** — no intentar
cambiar de cuenta ni pushear igual. Nunca usar `origin` para push.

## REGLA 1 — Al iniciar sesión (en este orden, sin releer de más)

1. **Si la sesión corre en el PC** (existe `E:\CabrasGO-deploy\`), leer
   **`E:\CabrasGO-deploy\flujo-proyecto-cabrasgo.html`** — estado completo:
   cuentas, URLs, línea de tiempo, pendientes/bloqueados. Es la fuente de
   verdad de sesión a sesión, vive solo local, no va a git, así que **no
   existe en sesiones de celular/cloud** — en esas, `CLAUDE.md` (punto 2) es
   la única fuente de verdad disponible, tratarlo como tal.
2. Leer **`CLAUDE.md`** (raíz del repo) solo si no está ya en contexto —
   conocimiento de negocio (algoritmo de tarifa, geocercas, modelo de
   comisión, stack, y la sección "Frontend visual redesign + GPS" con el
   historial reciente).
3. `git log --oneline -5` + `git status --short` — confirmar que no hay
   cambios sin commitear de una sesión anterior antes de sumar más.
4. No releer archivos de código que no se van a tocar en esta sesión — el
   `CLAUDE.md` (y el flujo HTML si está disponible) ya resumen lo necesario
   para decidir qué hacer.

## REGLA 2 — Límites de negocio (recordar siempre, no requieren re-preguntar)

- **Pagos reales (Webpay/BancoEstado)**: bloqueado, requiere trámite del
  dueño con Transbank/banco. No tocar el flujo de pago real sin permiso
  explícito nuevo.
- **Registro/alta de usuarios reales**: no existe endpoint de signup — es
  decisión de negocio pendiente. No crearlo sin que el dueño lo pida
  explícitamente.

## REGLA 3 — Ahorro de tokens durante la sesión

- **Builds/deploys van en background** (`run_in_background: true` en Bash) +
  `TaskOutput` con `block: true` — nunca sondear con Read repetido al archivo
  de output.
- **Un solo build de verificación por lote de cambios**, no uno por archivo
  editado — agrupar los cambios de una misma pantalla/feature antes de
  compilar.
- **Verificación visual en vivo: una vez al final del lote**, no screenshot
  por cada className tocado — usar el navegador solo para confirmar que nada
  se rompió, no para iterar diseño pixel a pixel.
- **`npm run build` con `VITE_API_URL` de producción** antes de cualquier
  `firebase deploy --only hosting --project cabrasgo` — si se despliega sin
  esa env var, el frontend queda apuntando a una URL de API relativa rota.
- **El deploy a Firebase pide aprobación** (clasificador de permisos,
  categoría "Production Deploy") — es esperado, no es un error; si el
  usuario está lejos del PC, avisar que puede aprobar desde el celular en
  vez de reintentar el comando a ciegas.
- No usar subagentes para tareas de este proyecto salvo que el usuario lo
  pida explícitamente — es un proyecto chico, la exploración directa
  (Grep/Read puntual) alcanza y es más barata.

## REGLA 4 — Al cerrar sesión (checklist, en orden)

1. `git status --short` → debe quedar limpio (todo commiteado y pusheado a
   `alejandro main`, nunca a `origin`).
2. Confirmar que no quedan servidores de prueba colgados (`netstat -ano |
   grep -E ":5173|:8080"` en PC) — matar por PID si algo quedó vivo.
3. Si se envió algo a producción en la sesión: actualizar **`CLAUDE.md`**
   (raíz del repo) si cambió arquitectura/comportamiento de negocio —
   commitear junto con el código. Si la sesión corre en el PC, actualizar
   también **`E:\CabrasGO-deploy\flujo-proyecto-cabrasgo.html`** (nuevo paso
   en la línea de tiempo) — se queda local, no va a git.
4. Confirmar al usuario en una línea: qué quedó en producción, qué falta, y
   las URLs vigentes (`cabrasgo.web.app`, backend de Railway).

## Nota sobre sesiones de celular/cloud

Una sesión iniciada fuera de este PC (celular, cloud) no tiene por qué tener
el mismo `git remote`, la misma sesión de `gh`/`firebase`, ni el mismo
`.claude/settings.local.json` con los permisos ya aprobados — repetir REGLA 0
al principio de esa sesión es obligatorio, no opcional, incluso si "ya se
verificó" en una sesión anterior desde el PC.
