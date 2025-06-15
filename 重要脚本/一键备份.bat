@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ==========================================
echo     🗂️  重要数据一键备份工具
echo ==========================================
echo.
echo 正在启动备份脚本...
echo.

REM 检查PowerShell是否可用
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到PowerShell，请确保系统已安装PowerShell
    pause
    exit /b 1
)

REM 执行PowerShell备份脚本
powershell -ExecutionPolicy Bypass -File "%~dp0backup_script.ps1"

if %errorlevel% equ 0 (
    echo.
    echo ✅ 备份脚本执行完成
) else (
    echo.
    echo ❌ 备份脚本执行失败，错误代码：%errorlevel%
)

echo.
echo 按任意键退出...
pause >nul