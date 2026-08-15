# 交我导 · 免 Python 版安装脚本（Edge 应用模式）
# 作用：创建「交我导（免安装）」桌面快捷方式。无需安装 Python，
#       任何 Windows 10/11（自带 Microsoft Edge）双击即可启动。
# 用法：powershell -ExecutionPolicy Bypass -File .\install-edge.ps1
# 注意：本文件需以 UTF-8 带 BOM 保存。

$ErrorActionPreference = 'Stop'

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Vbs = Join-Path $AppDir 'launcher-edge.vbs'
$Icon = Join-Path $AppDir 'icon.ico'
$Desktop = [Environment]::GetFolderPath('Desktop')
$LnkPath = Join-Path $Desktop '交我导（免安装）.lnk'
$WScript = "$env:WINDIR\System32\wscript.exe"

if (-not (Test-Path $Vbs)) { throw "找不到启动器: $Vbs" }
if (-not (Test-Path $WScript)) { throw '系统缺少 wscript.exe' }

$Ws = New-Object -ComObject WScript.Shell
$Sc = $Ws.CreateShortcut($LnkPath)
$Sc.TargetPath = $WScript
$Sc.Arguments = '"' + $Vbs + '"'
$Sc.WorkingDirectory = $AppDir
if (Test-Path $Icon) { $Sc.IconLocation = $Icon }
$Sc.Description = '交我导 · 上海交通大学导航（免 Python，Edge 应用模式）'
$Sc.Save()

Write-Host "已创建桌面快捷方式: $LnkPath" -ForegroundColor Green
