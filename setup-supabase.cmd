@echo off
echo =============================================
echo Configuracao do Supabase para Black-in-Bot
echo =============================================
echo.

cd web
node src\scripts\setup-supabase.js

echo.
echo Configuracao concluida!
echo.

pause 