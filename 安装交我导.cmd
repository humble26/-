@echo off
rem ============================================================
rem  Jiaowodao (JiaoWoDao) desktop app installer
rem  Double-click to install. Requires Windows PowerShell 3.0+.
rem  Script: install-jiaowodao.ps1 (must stay in this folder)
rem ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-jiaowodao.ps1" %*
echo.
pause
