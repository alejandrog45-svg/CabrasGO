@echo off
REM Corre los scripts de export de marketing (screenshots Playwright de los
REM templates HTML) usando el Python/Playwright portatil copiado a W:, sin
REM depender de disco E:. Esta variable PLAYWRIGHT_BROWSERS_PATH solo aplica
REM a esta ventana, no toca la configuracion del sistema.

set PATH=W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\python-portable;%PATH%
set PLAYWRIGHT_BROWSERS_PATH=W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\playwright-browsers
cd /d "W:\PROYECTOS CUENTA ALEJANDROG45\CabrasGO\marketing"

echo Ejecutando export.py...
python export.py

echo Ejecutando export_flyers.py...
python export_flyers.py

echo Listo. Ver PNGs en marketing\output\revision\
