@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "PORT=8080"
set "HOST=127.0.0.1"

set "PYTHON="
where py >nul 2>&1
if !ERRORLEVEL! EQU 0 set "PYTHON=py -3"

if not defined PYTHON (
    where python >nul 2>&1
    if !ERRORLEVEL! EQU 0 set "PYTHON=python"
)

if not defined PYTHON (
    where python3 >nul 2>&1
    if !ERRORLEVEL! EQU 0 set "PYTHON=python3"
)

if not defined PYTHON goto offer_install
goto run_server

:offer_install
cls
echo ================================
echo   Dutch Learning
echo ================================
echo.
echo   Python 3 не найден на этом компьютере.
echo   Он нужен, чтобы поднять локальный сервер для сайта.
echo.
set "REPLY="
set /p "REPLY=  Установить Python сейчас через winget? [y/N]: "
echo.

if /I not "!REPLY!"=="y" (
    echo Отмена. Без Python 3 сайт не запустится.
    pause
    exit /b 0
)

where winget >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo winget не найден на этой системе.
    echo Открою Microsoft Store, установите Python 3 оттуда, затем перезапустите этот файл.
    start "" "ms-windows-store://search/?query=Python 3"
    pause
    exit /b 1
)

echo Устанавливаем Python 3 через winget...
echo.
winget install --id Python.Python.3.12 -e --source winget --accept-source-agreements --accept-package-agreements
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo Установка Python не удалась. Попробуйте вручную:
    echo     winget install Python.Python.3.12
    pause
    exit /b 1
)

echo.
echo Python 3 установлен. Закройте это окно и запустите Dutch-Windows.bat снова.
pause
exit /b 0

:run_server
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe' OR Name='py.exe'\" | Where-Object { $_.CommandLine -match 'server\.py' -or $_.CommandLine -match 'http\.server' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1

:check_port
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set /a PORT=PORT+1
    goto check_port
)

set "URL=http://localhost:%PORT%/site/"

cls
echo ================================
echo   Dutch Learning — локальный сервер
echo ================================
echo.
echo   Адрес: %URL%
echo.
echo   Чтобы остановить сервер — закройте это окно.
echo.
echo ================================
echo.

start "" /B powershell -NoProfile -WindowStyle Hidden -Command "$deadline = (Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('%HOST%', %PORT%); $c.Close(); Start-Process '%URL%'; break } catch { Start-Sleep -Milliseconds 200 } }"

!PYTHON! "%~dp0scripts\server.py" --port %PORT% --bind %HOST% --directory "%~dp0."

pause
