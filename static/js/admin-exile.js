/**
 * 文件: static/js/admin-exile.js
 * 描述: 管理员流放管理页面的核心逻辑，包括加载操作日志、批量召回功能。
 * 依赖: utils.js
 * 作者: AI助手
 * 日期: 2024-07-29
 */

const AdminExile = {
    state: {
        currentPage: 1,
        itemsPerPage: 20,
        selectedWallpaperIds: new Set(), // 用于存储选中的壁纸ID
        isLoadingLogs: false
    },

    init: function() {
        console.log('[AdminExile] 初始化...');
        this.bindEvents();
        // 不在初始化时直接加载日志，而是在用户点击菜单时加载
        this.loadOperationLogs();
    },

    bindEvents: function() {
        const batchRecallBtn = document.getElementById('batch-recall-btn');
        if (batchRecallBtn) {
            batchRecallBtn.addEventListener('click', () => this.handleBatchRecall());
        }

        // 绑定表格行的点击事件，用于选中/取消选中
        const logsTableBody = document.getElementById('operation-logs-table-body');
        if (logsTableBody) {
            logsTableBody.addEventListener('click', (event) => {
                let targetRow = event.target.closest('tr');
                // 确保点击的是有效行，并且不是表头
                if (targetRow && targetRow.parentElement === logsTableBody) {
                    const checkbox = targetRow.querySelector('input[type="checkbox"]');
                    if (checkbox && event.target !== checkbox) { // 如果点击的不是复选框本身，则切换复选框状态
                        checkbox.checked = !checkbox.checked;
                    }
                    this.handleRowSelection(targetRow);
                }
            });
        }
    },

    loadOperationLogs: async function(page = 1) {
        console.log(`[AdminExile] 加载第 ${page} 页操作日志...`);
        this.state.currentPage = page;
        const logsTableBody = document.getElementById('operation-logs-table-body');
        const logPagination = document.getElementById('log-pagination');
        if (!logsTableBody || !logPagination) return;

        logsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">加载中...</td></tr>';
        logPagination.innerHTML = ''; // 清空分页
        this.state.selectedWallpaperIds.clear(); // 清空已选中的ID
        this.updateBatchRecallButtonState();

        try {
            const response = await fetch(`/api/wallpaper.php?action=admin_get_operation_logs&page=${page}&limit=${this.state.itemsPerPage}`);
            const json = await response.json();

            if (json.code === 200 && json.data) {
                const { total, logs } = json.data;
                logsTableBody.innerHTML = ''; // 清空现有内容

                if (logs.length === 0) {
                    logsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">暂无操作日志</td></tr>';
                } else {
                    logs.forEach(log => {
                        const row = document.createElement('tr');
                        row.className = 'hover:bg-gray-50';
                        row.dataset.wallpaperId = log.wallpaper_id; // 添加壁纸ID作为数据属性
                        row.innerHTML = `
                            <td class="py-2 px-4 border-b border-gray-200 text-sm">
                                <input type="checkbox" class="mr-2" data-id="${log.wallpaper_id}" ${log.new_status === 0 ? 'disabled title="已召回壁纸无法再次召回"' : ''}>
                                ${log.wallpaper_id}
                            </td>
                            <td class="py-2 px-4 border-b border-gray-200 text-sm">${log.action_type === 'exile' ? '流放' : (log.action_type === 'recall' ? '召回' : '管理员召回')}</td>
                            <td class="py-2 px-4 border-b border-gray-200 text-sm">${log.operated_by_user_id}</td>
                            <td class="py-2 px-4 border-b border-gray-200 text-sm">${log.operation_time}</td>
                            <td class="py-2 px-4 border-b border-gray-200 text-sm">${log.old_status === 1 ? '流放' : '正常'}</td>
                            <td class="py-2 px-4 border-b border-gray-200 text-sm">${log.new_status === 1 ? '流放' : '正常'}</td>
                            <td class="py-2 px-4 border-b border-gray-200 text-sm">${log.notes || '-'}</td>
                        `;
                        logsTableBody.appendChild(row);
                    });
                }
                this.renderPagination(total);
            } else if (json.code === 401 || json.code === 403) {
                logsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${json.message || '权限不足或未登录'}</td></tr>`;
                Utils.showToastMessage(json.message || '权限不足或未登录', 'error');
                // 如果是权限不足，可以考虑隐藏流放管理菜单项
                const adminExileMenuItem = document.getElementById('admin-exile-menu-item');
                if (adminExileMenuItem) adminExileMenuItem.classList.add('hidden');
            } else {
                logsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">加载操作日志失败: ${json.message || '未知错误'}</td></tr>`;
                Utils.showToastMessage(json.message || '加载操作日志失败', 'error');
            }
        } catch (error) {
            console.error("加载操作日志请求失败: ", error);
            logsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">网络错误，无法加载日志</td></tr>';
            Utils.showToastMessage('网络错误，无法加载日志', 'error');
        } finally {
            this.state.isLoadingLogs = false;
            this.renderPagination();
        }
    },

    renderPagination: function(totalItems) {
        const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
        const logPagination = document.getElementById('log-pagination');
        logPagination.innerHTML = '';

        if (totalPages <= 1) return;

        const createPaginationButton = (page, text, isDisabled = false, isActive = false) => {
            const button = document.createElement('button');
            button.className = `px-3 py-1 rounded-lg ${isActive ? 'bg-primary text-white' : (isDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-primary border border-primary hover:bg-primary hover:text-white transition-colors')}`;
            button.textContent = text;
            button.disabled = isDisabled;
            if (!isDisabled) {
                button.addEventListener('click', () => this.loadOperationLogs(page));
            }
            return button;
        };

        // Previous button
        logPagination.appendChild(createPaginationButton(this.state.currentPage - 1, '上一页', this.state.currentPage === 1));

        // Page numbers
        let startPage = Math.max(1, this.state.currentPage - 2);
        let endPage = Math.min(totalPages, this.state.currentPage + 2);

        if (startPage > 1) {
            logPagination.appendChild(createPaginationButton(1, '1'));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'px-3 py-1';
                logPagination.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            logPagination.appendChild(createPaginationButton(i, i.toString(), false, i === this.state.currentPage));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'px-3 py-1';
                logPagination.appendChild(ellipsis);
            }
            logPagination.appendChild(createPaginationButton(totalPages, totalPages.toString()));
        }

        // Next button
        logPagination.appendChild(createPaginationButton(this.state.currentPage + 1, '下一页', this.state.currentPage === totalPages));
    },

    handleRowSelection: function(row) {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (!checkbox || checkbox.disabled) return;

        const wallpaperId = parseInt(row.dataset.wallpaperId);
        if (checkbox.checked) {
            this.state.selectedWallpaperIds.add(wallpaperId);
        } else {
            this.state.selectedWallpaperIds.delete(wallpaperId);
        }
        this.updateBatchRecallButtonState();
    },

    updateBatchRecallButtonState: function() {
        const batchRecallBtn = document.getElementById('batch-recall-btn');
        if (batchRecallBtn) {
            if (this.state.selectedWallpaperIds.size > 0) {
                batchRecallBtn.classList.remove('hidden');
                batchRecallBtn.disabled = false;
                batchRecallBtn.textContent = `批量召回 (${this.state.selectedWallpaperIds.size})`;
                batchRecallBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                batchRecallBtn.classList.add('hidden');
                batchRecallBtn.disabled = true;
                batchRecallBtn.textContent = '批量召回';
                batchRecallBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    },

    handleBatchRecall: async function() {
        if (this.state.selectedWallpaperIds.size === 0) {
            Utils.showToastMessage('请选择至少一张壁纸进行召回', 'warning');
            return;
        }

        if (!confirm(`确定要召回选中的 ${this.state.selectedWallpaperIds.size} 张壁纸吗？`)) {
            return;
        }

        const wallpaperIdsArray = Array.from(this.state.selectedWallpaperIds);
        const batchRecallBtn = document.getElementById('batch-recall-btn');
        batchRecallBtn.disabled = true;
        batchRecallBtn.textContent = '召回中...';
        batchRecallBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            const formData = new FormData();
            formData.append('action', 'admin_batch_recall');
            // 将 Set 转换为逗号分隔的字符串，或直接传递数组（取决于后端如何接收）
            // 假设后端能处理JSON数组，这里转换为JSON字符串
            formData.append('wallpaper_ids', JSON.stringify(wallpaperIdsArray)); 

            const response = await fetch('/api/wallpaper.php', {
                method: 'POST',
                body: formData
            });
            const json = await response.json();

            if (json.code === 200) {
                Utils.showToastMessage(json.message || '批量召回成功', 'success');
                this.state.selectedWallpaperIds.clear();
                this.loadOperationLogs(this.state.currentPage, true); // 强制重新加载以更新状态
            } else if (json.code === 401 || json.code === 403) {
                Utils.showToastMessage(json.message || '权限不足或未登录，无法执行召回', 'error');
            } else {
                Utils.showToastMessage(json.message || '批量召回失败', 'error');
            }
        } catch (error) {
            console.error("批量召回请求失败: ", error);
            Utils.showToastMessage('网络错误，批量召回失败', 'error');
        } finally {
            batchRecallBtn.disabled = false;
            batchRecallBtn.textContent = `批量召回 (${this.state.selectedWallpaperIds.size})`;
            batchRecallBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            this.updateBatchRecallButtonState(); // 再次更新按钮状态，以防万一
        }
    },

    setLoading: function(isLoading) {
        this.state.isLoadingLogs = isLoading;
        const batchRecallBtn = document.getElementById('batch-recall-btn');
        if (batchRecallBtn) {
            if (isLoading) {
                batchRecallBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                batchRecallBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }
}; 