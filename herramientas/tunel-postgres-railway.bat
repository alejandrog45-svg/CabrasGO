@echo off
REM Abre un tunel SSH cifrado hacia el Postgres de produccion de CabrasGo en
REM Railway, sin exponer la base a internet. Requiere haber corrido antes
REM "railway login" una vez (la sesion queda guardada).
REM
REM Al ejecutarse imprime Host/Port/User/Password/Database/URL para esa
REM sesion del tunel -- son temporales, cambian cada vez que se abre.
REM Dejar la ventana abierta mientras se usa (ej. npx prisma db push,
REM TablePlus, DBeaver, pgAdmin apuntando a 127.0.0.1:<puerto que muestre>).
REM Cerrar con Ctrl+C cuando se termina.

set PATH=W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\nodejs-portable;W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\npm-global;%PATH%
cd /d "W:\PROYECTOS CUENTA ALEJANDROG45\CabrasGO\backend"
railway connect Postgres --tunnel-only
