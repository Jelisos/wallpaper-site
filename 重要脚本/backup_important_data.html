<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>重要数据一键备份工具</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .backup-list {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .backup-item {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .backup-item:last-child {
            border-bottom: none;
        }
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #0056b3;
        }
        .btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        .progress {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            margin: 20px 0;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background: #28a745;
            width: 0%;
            transition: width 0.3s;
        }
        .log {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        .status {
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗂️ 重要数据一键备份工具</h1>
        
        <div class="backup-list">
            <h3>📋 备份清单：</h3>
            <div class="backup-item">📄 <strong>list.json</strong> - 壁纸列表数据</div>
            <div class="backup-item">🖼️ <strong>wallpapers文件夹</strong> - 壁纸图片资源</div>
            <div class="backup-item">👤 <strong>avatar文件夹</strong> - 用户头像资源</div>
            <div class="backup-item">🗃️ <strong>wallpapers_import.sql</strong> - 数据库导入文件</div>
        </div>

        <div style="text-align: center;">
            <button class="btn" onclick="startBackup()" id="backupBtn">🚀 开始备份</button>
            <button class="btn" onclick="clearLog()" id="clearBtn">🧹 清空日志</button>
        </div>

        <div class="progress" id="progressContainer" style="display: none;">
            <div class="progress-bar" id="progressBar"></div>
        </div>

        <div id="status"></div>
        <div class="log" id="logContainer"></div>
    </div>

    <!-- 引入JSZip库 -->
    <script src="../static/wallpapers/compressed/js/jszip.min.js"></script>
    
    <script>
        /**
         * 重要数据备份脚本
         * 文件: 重要脚本/backup_important_data.html
         * 描述: 一键备份指定的重要数据文件和文件夹
         * 依赖: jszip.min.js
         * 维护: 添加新的备份项目请修改backupPaths数组
         */
        
        // 备份路径配置
        const backupPaths = [
            {
                name: 'list.json',
                path: '../static/data/list.json',
                type: 'file'
            },
            {
                name: 'wallpapers_import.sql',
                path: '../wallpapers_import.sql',
                type: 'file'
            }
            // 注意：由于浏览器安全限制，无法直接访问文件夹
            // wallpapers和avatar文件夹需要用户手动选择
        ];

        let logContainer, statusContainer, progressBar, progressContainer;
        let backupBtn, clearBtn;

        // 初始化页面元素
        document.addEventListener('DOMContentLoaded', function() {
            logContainer = document.getElementById('logContainer');
            statusContainer = document.getElementById('status');
            progressBar = document.getElementById('progressBar');
            progressContainer = document.getElementById('progressContainer');
            backupBtn = document.getElementById('backupBtn');
            clearBtn = document.getElementById('clearBtn');
            
            addLog('✅ 备份工具初始化完成');
            addLog('ℹ️ 点击"开始备份"按钮开始备份重要数据');
        });

        /**
         * 添加日志信息
         * @param {string} message - 日志消息
         * @param {string} type - 日志类型 (info, success, error)
         */
        function addLog(message, type = 'info') {
            const timestamp = new Date().toLocaleString();
            const logEntry = `[${timestamp}] ${message}`;
            
            if (logContainer) {
                logContainer.innerHTML += logEntry + '\n';
                logContainer.scrollTop = logContainer.scrollHeight;
            }
            
            console.log(logEntry);
        }

        /**
         * 显示状态信息
         * @param {string} message - 状态消息
         * @param {string} type - 状态类型 (success, error, info)
         */
        function showStatus(message, type = 'info') {
            if (statusContainer) {
                statusContainer.innerHTML = `<div class="status ${type}">${message}</div>`;
            }
        }

        /**
         * 更新进度条
         * @param {number} percent - 进度百分比 (0-100)
         */
        function updateProgress(percent) {
            if (progressBar) {
                progressBar.style.width = percent + '%';
            }
        }

        /**
         * 显示/隐藏进度条
         * @param {boolean} show - 是否显示
         */
        function toggleProgress(show) {
            if (progressContainer) {
                progressContainer.style.display = show ? 'block' : 'none';
            }
        }

        /**
         * 读取文件内容
         * @param {string} url - 文件URL
         * @returns {Promise<string>} 文件内容
         */
        async function fetchFileContent(url) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.text();
            } catch (error) {
                throw new Error(`读取文件失败: ${error.message}`);
            }
        }

        /**
         * 创建文件选择器
         * @param {boolean} multiple - 是否允许多选
         * @param {string} accept - 接受的文件类型
         * @returns {Promise<FileList>} 选择的文件列表
         */
        function createFileSelector(multiple = false, accept = '*') {
            return new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = multiple;
                input.accept = accept;
                input.webkitdirectory = multiple; // 允许选择文件夹
                
                input.onchange = function(event) {
                    const files = event.target.files;
                    if (files.length > 0) {
                        resolve(files);
                    } else {
                        reject(new Error('未选择文件'));
                    }
                };
                
                input.click();
            });
        }

        /**
         * 开始备份流程
         */
        async function startBackup() {
            try {
                // 禁用按钮
                backupBtn.disabled = true;
                backupBtn.textContent = '🔄 备份中...';
                
                // 显示进度条
                toggleProgress(true);
                updateProgress(0);
                
                addLog('🚀 开始备份重要数据...');
                showStatus('正在准备备份...', 'info');
                
                // 创建ZIP对象
                const zip = new JSZip();
                let completedTasks = 0;
                const totalTasks = backupPaths.length + 2; // +2 for wallpapers and avatar folders
                
                // 备份配置文件
                for (const item of backupPaths) {
                    try {
                        addLog(`📄 正在备份: ${item.name}`);
                        const content = await fetchFileContent(item.path);
                        zip.file(item.name, content);
                        addLog(`✅ 成功备份: ${item.name}`);
                    } catch (error) {
                        addLog(`❌ 备份失败: ${item.name} - ${error.message}`, 'error');
                    }
                    
                    completedTasks++;
                    updateProgress((completedTasks / totalTasks) * 100);
                }
                
                // 备份wallpapers文件夹
                try {
                    addLog('📁 请选择wallpapers文件夹...');
                    showStatus('请在弹出的对话框中选择wallpapers文件夹', 'info');
                    
                    const wallpaperFiles = await createFileSelector(true);
                    const wallpapersFolder = zip.folder('wallpapers');
                    
                    for (const file of wallpaperFiles) {
                        wallpapersFolder.file(file.name, file);
                    }
                    
                    addLog(`✅ 成功备份wallpapers文件夹 (${wallpaperFiles.length}个文件)`);
                } catch (error) {
                    addLog(`❌ wallpapers文件夹备份失败: ${error.message}`, 'error');
                }
                
                completedTasks++;
                updateProgress((completedTasks / totalTasks) * 100);
                
                // 备份avatar文件夹
                try {
                    addLog('📁 请选择avatar文件夹...');
                    showStatus('请在弹出的对话框中选择avatar文件夹', 'info');
                    
                    const avatarFiles = await createFileSelector(true);
                    const avatarFolder = zip.folder('avatar');
                    
                    for (const file of avatarFiles) {
                        avatarFolder.file(file.name, file);
                    }
                    
                    addLog(`✅ 成功备份avatar文件夹 (${avatarFiles.length}个文件)`);
                } catch (error) {
                    addLog(`❌ avatar文件夹备份失败: ${error.message}`, 'error');
                }
                
                completedTasks++;
                updateProgress((completedTasks / totalTasks) * 100);
                
                // 生成ZIP文件
                addLog('📦 正在生成压缩包...');
                showStatus('正在生成压缩包，请稍候...', 'info');
                
                const zipBlob = await zip.generateAsync({
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 6
                    }
                });
                
                // 下载ZIP文件
                const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
                const filename = `重要数据备份_${timestamp}.zip`;
                
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(zipBlob);
                downloadLink.download = filename;
                downloadLink.click();
                
                // 清理URL对象
                URL.revokeObjectURL(downloadLink.href);
                
                addLog(`🎉 备份完成！文件已保存为: ${filename}`);
                showStatus(`备份成功完成！文件大小: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`, 'success');
                
            } catch (error) {
                addLog(`❌ 备份过程中发生错误: ${error.message}`, 'error');
                showStatus(`备份失败: ${error.message}`, 'error');
            } finally {
                // 恢复按钮状态
                backupBtn.disabled = false;
                backupBtn.textContent = '🚀 开始备份';
                
                // 隐藏进度条
                setTimeout(() => {
                    toggleProgress(false);
                    updateProgress(0);
                }, 2000);
            }
        }

        /**
         * 清空日志
         */
        function clearLog() {
            if (logContainer) {
                logContainer.innerHTML = '';
            }
            if (statusContainer) {
                statusContainer.innerHTML = '';
            }
            addLog('🧹 日志已清空');
        }
    </script>
</body>
</html>