@echo off
setlocal enabledelayedexpansion
REM Abre una consola para hacerle una pregunta puntual a Gemini (segunda
REM opinion durante una tarea de CabrasGo) sin tener que armar el comando
REM node a mano cada vez. Usa la GEMINI_API_KEY guardada en
REM W:\PROYECTOS CUENTA ALEJANDROG45\CabrasGO\.env (no la pide de nuevo).

set PATH=W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\nodejs-portable;W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\npm-global;%PATH%
cd /d "W:\PROYECTOS CUENTA ALEJANDROG45\CabrasGO"

set INTENTOS_VACIOS=0

:preguntar
set "PREGUNTA="
set /p PREGUNTA="Pregunta para Gemini (o 'salir' para cerrar): " || goto fin
if /i "%PREGUNTA%"=="salir" goto fin
if "%PREGUNTA%"=="" (
  set /a INTENTOS_VACIOS+=1
  if !INTENTOS_VACIOS! GEQ 5 goto fin
  goto preguntar
)
set INTENTOS_VACIOS=0

node scripts\consultar-gemini.js "%PREGUNTA%"
echo.
goto preguntar

:fin
