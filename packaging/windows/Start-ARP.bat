@echo off
setlocal
cd /d "%~dp0"
set NODE_ENV=production

rem First run: create a .env from the template so users have somewhere to put
rem their API keys and the COMSOL path.
if not exist ".env" copy ".env.example" ".env" >nul

echo ============================================================
echo    AI Research Platform
echo ------------------------------------------------------------
echo    Starting the server (Node is bundled - nothing to install).
echo    A browser window will open at http://localhost:3000
echo.
echo    Keep the "ARP Server" window open while you work.
echo    Close it to stop the platform.
echo ============================================================
echo.

rem Launch the server in its own minimized window, give it a few seconds to
rem boot, then open the browser.
start "ARP Server" /min "%~dp0node\node.exe" "dist\server.cjs"
timeout /t 5 /nobreak >nul
start "" http://localhost:3000

echo The platform is running. This window can be closed.
echo (The server keeps running in the "ARP Server" window.)
pause >nul
