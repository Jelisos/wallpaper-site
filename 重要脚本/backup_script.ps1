<#
.SYNOPSIS
    重要数据一键备份脚本 (PowerShell版本)
    
.DESCRIPTION
    文件: 重要脚本/backup_script.ps1
    描述: 使用PowerShell自动备份指定的重要数据文件和文件夹
    依赖: PowerShell 5.0+, .NET Framework
    维护: 修改备份路径请编辑$BackupPaths变量
    
.EXAMPLE
    .\backup_script.ps1
    直接运行脚本进行备份
    
.EXAMPLE
    .\backup_script.ps1 -OutputPath "D:\Backups"
    指定备份输出路径
#>

param(
    [string]$OutputPath = ".",
    [switch]$Verbose
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 备份配置
$BackupPaths = @(
    @{
        Name = "list.json"
        Path = "..\static\data\list.json"
        Type = "File"
    },
    @{
        Name = "wallpapers"
        Path = "..\static\wallpapers"
        Type = "Folder"
    },
    @{
        Name = "avatar"
        Path = "..\static\avatar"
        Type = "Folder"
    },
    @{
        Name = "wallpapers_import.sql"
        Path = "..\wallpapers_import.sql"
        Type = "File"
    }
)

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage -ForegroundColor White }
    }
}

# 检查路径是否存在
function Test-BackupPath {
    param(
        [string]$Path,
        [string]$Type
    )
    
    $fullPath = Resolve-Path $Path -ErrorAction SilentlyContinue
    
    if (-not $fullPath) {
        return $false
    }
    
    if ($Type -eq "File") {
        return Test-Path $fullPath -PathType Leaf
    } else {
        return Test-Path $fullPath -PathType Container
    }
}

# 创建备份
function Start-Backup {
    try {
        Write-Log "🚀 开始重要数据备份..." "INFO"
        
        # 创建临时备份目录
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $tempBackupDir = Join-Path $env:TEMP "backup_temp_$timestamp"
        $backupFileName = "重要数据备份_$timestamp.zip"
        $outputFile = Join-Path $OutputPath $backupFileName
        
        Write-Log "📁 创建临时备份目录: $tempBackupDir" "INFO"
        New-Item -ItemType Directory -Path $tempBackupDir -Force | Out-Null
        
        $successCount = 0
        $failCount = 0
        
        # 备份每个项目
        foreach ($item in $BackupPaths) {
            try {
                Write-Log "📄 正在备份: $($item.Name)" "INFO"
                
                if (-not (Test-BackupPath -Path $item.Path -Type $item.Type)) {
                    Write-Log "❌ 路径不存在: $($item.Path)" "WARNING"
                    $failCount++
                    continue
                }
                
                $sourcePath = Resolve-Path $item.Path
                $destPath = Join-Path $tempBackupDir $item.Name
                
                if ($item.Type -eq "File") {
                    Copy-Item -Path $sourcePath -Destination $destPath -Force
                    $fileSize = (Get-Item $destPath).Length
                    Write-Log "✅ 文件备份成功: $($item.Name) ($(Format-FileSize $fileSize))" "SUCCESS"
                } else {
                    Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
                    $fileCount = (Get-ChildItem -Path $destPath -Recurse -File).Count
                    Write-Log "✅ 文件夹备份成功: $($item.Name) ($fileCount 个文件)" "SUCCESS"
                }
                
                $successCount++
                
            } catch {
                Write-Log "❌ 备份失败: $($item.Name) - $($_.Exception.Message)" "ERROR"
                $failCount++
            }
        }
        
        # 创建压缩包
        Write-Log "📦 正在创建压缩包..." "INFO"
        
        # 检查是否有.NET Framework 4.5+支持
        if ([System.IO.Compression.ZipFile]) {
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::CreateFromDirectory($tempBackupDir, $outputFile)
        } else {
            # 使用PowerShell 5.0+ 的Compress-Archive
            Compress-Archive -Path "$tempBackupDir\*" -DestinationPath $outputFile -Force
        }
        
        # 获取压缩包信息
        $zipInfo = Get-Item $outputFile
        $zipSize = Format-FileSize $zipInfo.Length
        
        Write-Log "🎉 备份完成！" "SUCCESS"
        Write-Log "📦 压缩包: $($zipInfo.FullName)" "INFO"
        Write-Log "📊 文件大小: $zipSize" "INFO"
        Write-Log "📈 备份统计: 成功 $successCount 项，失败 $failCount 项" "INFO"
        
        # 清理临时目录
        Write-Log "🧹 清理临时文件..." "INFO"
        Remove-Item -Path $tempBackupDir -Recurse -Force
        
        # 打开备份文件所在目录
        if (Test-Path $outputFile) {
            Write-Log "📂 正在打开备份文件所在目录..." "INFO"
            Start-Process -FilePath "explorer.exe" -ArgumentList "/select,`"$outputFile`""
        }
        
    } catch {
        Write-Log "❌ 备份过程中发生严重错误: $($_.Exception.Message)" "ERROR"
        
        # 清理临时目录（如果存在）
        if (Test-Path $tempBackupDir) {
            Remove-Item -Path $tempBackupDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        throw
    }
}

# 格式化文件大小
function Format-FileSize {
    param([long]$Size)
    
    if ($Size -gt 1GB) {
        return "{0:N2} GB" -f ($Size / 1GB)
    } elseif ($Size -gt 1MB) {
        return "{0:N2} MB" -f ($Size / 1MB)
    } elseif ($Size -gt 1KB) {
        return "{0:N2} KB" -f ($Size / 1KB)
    } else {
        return "$Size Bytes"
    }
}

# 显示欢迎信息
function Show-Welcome {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "    🗂️  重要数据一键备份工具 (PowerShell版)" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 备份清单:" -ForegroundColor Yellow
    
    foreach ($item in $BackupPaths) {
        $status = if (Test-BackupPath -Path $item.Path -Type $item.Type) { "✅" } else { "❌" }
        Write-Host "   $status $($item.Name) ($($item.Type))" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "📁 输出路径: $((Resolve-Path $OutputPath).Path)" -ForegroundColor Yellow
    Write-Host ""
}

# 主程序
try {
    # 显示欢迎信息
    Show-Welcome
    
    # 确认开始备份
    $confirmation = Read-Host "是否开始备份？(Y/N)"
    
    if ($confirmation -match '^[Yy]') {
        Start-Backup
        Write-Log "✨ 备份任务完成！" "SUCCESS"
    } else {
        Write-Log "❌ 用户取消备份操作" "WARNING"
    }
    
} catch {
    Write-Log "💥 程序执行失败: $($_.Exception.Message)" "ERROR"
    exit 1
}

# 等待用户按键
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")