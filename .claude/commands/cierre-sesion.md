---
description: Cierra una sesión de CabrasGo con el checklist de la skill inicio-sesion-cabrasgo — confirma que no queda nada sin commitear/pushear ni servidores colgados, y deja el flujo HTML/CLAUDE.md al día.
---

## Cierre de sesión — CabrasGo

Ejecuta, en este orden:

### 1. Limpieza técnica

```bash
git status --short
netstat -ano | grep -E ":5173|:8080"   # solo aplica en PC
```

- `git status` debe quedar limpio. Si no, commitear y pushear a `alejandro main`
  (nunca a `origin`) antes de cerrar.
- Si algún puerto de dev quedó escuchando (PC), matar el proceso por PID.

### 2. Documentación (solo si se desplegó algo nuevo en esta sesión)

- Actualizar **`CLAUDE.md`** (raíz del repo) si cambió arquitectura,
  algoritmo de tarifa, endpoints o comportamiento de negocio — commitear
  junto con el código.
- Si la sesión corre en el PC, actualizar también
  **`E:\CabrasGO-deploy\flujo-proyecto-cabrasgo.html`** con un nuevo paso en
  la línea de tiempo (qué se hizo, verificación, estado) — se queda local,
  no va a git.

### 3. Confirmación final al usuario (una respuesta corta)

- Qué quedó en producción y en qué commit.
- Qué falta / qué está bloqueado (recordar límites: pagos reales, signup).
- URLs vigentes: `cabrasgo.web.app` (frontend) y
  `cabrasgo-backend-production.up.railway.app` (backend).
