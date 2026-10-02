@echo off
setlocal
set "BASE=%~dp0"

echo [UpStatus] Encerrando servidor antigo...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-CimInstance Win32_Process -Filter 'Name=\"node.exe\"' | Where-Object { $_.CommandLine -like '*UpStatus*server.js*' }; if($p){$p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }}"

timeout /t 1 /nobreak >nul

echo [UpStatus] Iniciando servidor atualizado...
start "UpStatus Server" /min node "%BASE%server.js"
timeout /t 1 /nobreak >nul

start "" http://UpSeller21:3030
echo.
echo [UpStatus] Chat do Lucca: https://UpSeller21:3443/lucca
echo.
exit /b 0
