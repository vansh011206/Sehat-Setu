@echo off
:: SehatSetu - Allow Local WiFi (LAN) Inbound Connections
:: Right-click and select "Run as administrator"

echo ======================================================
echo   Configuring Windows Firewall for SehatSetu LAN
echo ======================================================

echo.
echo [1/3] Setting Network Profile to Private...
powershell -Command "Set-NetConnectionProfile -Name 'Vanshaj' -NetworkCategory Private -ErrorAction SilentlyContinue"

echo [2/3] Adding Firewall Rule for Frontend (Port 5173)...
netsh advfirewall firewall add rule name="SehatSetu Frontend 5173" dir=in action=allow protocol=TCP localport=5173

echo [3/3] Adding Firewall Rule for Backend (Port 8000)...
netsh advfirewall firewall add rule name="SehatSetu Backend 8000" dir=in action=allow protocol=TCP localport=8000

echo.
echo ======================================================
echo   SUCCESS! Ports 5173 and 8000 are now accessible
echo   from your mobile phone on this Wi-Fi network.
echo ======================================================
pause
