@echo off
setlocal
title BiliFetch Website Link Setup
echo ========================================
echo BiliFetch Website Link Setup
echo ========================================
echo.
echo Paste your public website URL below.
echo Example: https://yourname.github.io/BiliFetch/
echo.
set /p SITE_URL=Website URL: 
if "%SITE_URL%"=="" (
  echo Website URL is empty.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0set-website-url.ps1" -SiteUrl "%SITE_URL%"
echo.
pause
endlocal
