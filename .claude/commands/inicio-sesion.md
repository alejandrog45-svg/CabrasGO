---
description: Arranca una sesión de CabrasGo aplicando el protocolo completo de cuentas + ahorro de tokens (skill inicio-sesion-cabrasgo) y reporta estado del proyecto sin releer archivos de más.
---

## Inicio de sesión — CabrasGo

Ejecuta, en este orden, sin releer nada que ya esté en contexto:

### 1. Verificación de cuentas (REGLA 0 de la skill `inicio-sesion-cabrasgo`)

```bash
git remote -v
gh auth status 2>&1 | head -5
firebase projects:list 2>&1 | head -5
```

Confirmar:
- `alejandro` → `alejandrog45-svg/CabrasGO` (único remoto para push)
- `origin` → `oviedoem/CabrasGO` (solo lectura, nunca push)
- La cuenta activa de `gh`/`firebase` es `alejandrog45@gmail.com`

Si algo no coincide, **detenerse y avisar** antes de tocar git o deploy —
no asumir ni cambiar de cuenta por cuenta propia.

### 2. Estado del proyecto

- Si existe `E:\CabrasGO-deploy\flujo-proyecto-cabrasgo.html` (solo en PC),
  leerlo — fuente de verdad de sesión a sesión: cuentas, URLs, línea de
  tiempo, pendientes/bloqueados. Si no existe (celular/cloud), usar
  `CLAUDE.md` de la raíz del repo como fuente de verdad.
- `git log --oneline -5` y `git status --short`.
- Si `git status` no está limpio, reportarlo — puede ser trabajo de una
  sesión anterior sin cerrar.

### 3. Reportar en una respuesta corta, sin abrir más archivos

- Qué quedó en producción la última vez (según el flujo HTML o `CLAUDE.md`).
- Qué pendientes/bloqueados hay (pagos reales, signup — no tocar sin permiso
  explícito).
- Confirmación de que las 3 URLs siguen activas (no probar en vivo salvo que
  el usuario lo pida — evitar gasto de tokens innecesario al solo iniciar).

### 4. Recordatorios activos para el resto de la sesión

- Builds/deploys en background, un solo build por lote de cambios, un solo
  chequeo visual al final.
- `npm run build` con `VITE_API_URL` de producción antes de cualquier
  `firebase deploy`.
- El deploy a Firebase pide aprobación (clasificador de permisos) — esperado,
  no reintentar a ciegas si el usuario está lejos del PC.
- Nunca push a `origin` (oviedoem/CabrasGO), siempre a `alejandro main`.
