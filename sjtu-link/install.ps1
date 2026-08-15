# 交我导 · 上海交通大学导航（桌面版）—— 安装脚本
# 作用：在桌面创建「交我导」快捷方式（双击即可启动应用）
# 用法：powershell -ExecutionPolicy Bypass -File .\install.ps1
# 说明：优先使用免依赖的单文件 exe（Jiaowodao.exe，无需安装 Python）；
#       没有 exe 时回退为 pythonw + launcher.py（需本机装有 Python）。
#       完全无 Python 的机器请改用 install-edge.ps1（Edge 应用模式）。
# 注意：本文件需以 UTF-8 带 BOM 保存，以便 Windows PowerShell 5.1 正确读取中文。

$ErrorActionPreference = 'Stop'

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Exe = Join-Path $AppDir 'Jiaowodao.exe'
$Launcher = Join-Path $AppDir 'launcher.py'
$Icon = Join-Path $AppDir 'icon.ico'
$Desktop = [Environment]::GetFolderPath('Desktop')
$LnkPath = Join-Path $Desktop '交我导.lnk'

if (Test-Path $Exe) {
    # 方案一：单文件 exe（无需 Python）
    $Target = $Exe
    $Args = ''
} elseif (Test-Path $Launcher) {
    # 方案二：pythonw + launcher.py（需要 Python）
    $RealPython = & python -c "import sys; print(sys.executable)" 2>$null
    if ($RealPython -and (Test-Path $RealPython)) {
        $PythonW = Join-Path (Split-Path -Parent $RealPython) 'pythonw.exe'
    } else {
        $PythonW = ''
    }
    if (-not $PythonW -or -not (Test-Path $PythonW)) { $PythonW = $RealPython }
    if (-not $PythonW -or -not (Test-Path $PythonW)) { throw '未找到 Python，请改用 install-edge.ps1（Edge 应用模式，无需 Python）。' }
    $Target = $PythonW
    $Args = '"' + $Launcher + '"'
} else {
    throw '找不到启动文件，请改用 install-edge.ps1（Edge 应用模式，无需 Python）。'
}

$Ws = New-Object -ComObject WScript.Shell
$Sc = $Ws.CreateShortcut($LnkPath)
$Sc.TargetPath = $Target
$Sc.Arguments = $Args
$Sc.WorkingDirectory = $AppDir
if (Test-Path $Icon) { $Sc.IconLocation = $Icon }
$Sc.Description = '交我导 · 上海交通大学导航（桌面版）'
$Sc.Save()

Write-Host "已创建桌面快捷方式: $LnkPath" -ForegroundColor Green
