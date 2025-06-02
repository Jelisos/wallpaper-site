/**
 * 壁纸管理模块
 */
const WallpaperManager = {
    // 状态变量
    state: {
        allWallpapers: [],
        filteredWallpapers: [],
        displayedWallpapers: new Set(),
        currentPage: 0,
        isLoading: false
    },

    /**
     * 获取壁纸列表URL
     * @returns {string} 壁纸列表URL
     */
    /**
     * 获取壁纸列表URL
     * @returns {string} 壁纸列表URL
     */
    getWallpaperListUrl() {
        // 获取当前页面的完整URL
        const currentUrl = window.location.href;
        
        // 判断是否是GitHub Pages环境
        if (currentUrl.includes('github.io')) {
            // 如果是GitHub Pages，使用完整的URL
            return 'https://jelisos.github.io/wallpaper-site/static/data/list.json';
        } else {
            // 本地开发环境，使用相对路径（不使用绝对路径，避免移动端问题）
            return './static/data/list.json';
        }
    },

    /**
     * 初始化壁纸管理
     */
    async init() {
        // 检查URL参数决定初始视图模式
        const urlParams = new URLSearchParams(window.location.search);
        const viewMode = urlParams.get('view');
        const wallpaperContainer = document.getElementById('wallpaper-container');
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');

        if (viewMode === 'list') {
            // 如果URL参数是list，初始化为列表视图
            wallpaperContainer.classList.remove('masonry-grid');
            wallpaperContainer.classList.add('list-view-grid');
            listViewBtn.classList.remove('bg-white', 'hover:bg-neutral-dark');
            listViewBtn.classList.add('bg-primary', 'text-white');
            gridViewBtn.classList.remove('bg-primary', 'text-white');
            gridViewBtn.classList.add('bg-white', 'hover:bg-neutral-dark');
        } else {
            // 默认视图
            wallpaperContainer.classList.remove('list-view-grid');
            wallpaperContainer.classList.add('masonry-grid');
            gridViewBtn.classList.remove('bg-white', 'hover:bg-neutral-dark');
            gridViewBtn.classList.add('bg-primary', 'text-white');
            listViewBtn.classList.remove('bg-primary', 'text-white');
            listViewBtn.classList.add('bg-white', 'hover:bg-neutral-dark');
        }

        await this.loadWallpaperList();
        this.initEventListeners();
        this.handleSearch(''); // 加载初始壁纸，会根据上面设置的视图模式进行过滤
    },

    /**
     * 加载壁纸列表
     */
    async loadWallpaperList() {
        try {
            const url = this.getWallpaperListUrl();
            console.log('正在加载壁纸列表:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('无法加载壁纸列表');
            }
            this.state.allWallpapers = await response.json();
            
            if (this.state.allWallpapers.length === 0) {
                console.error('未找到任何壁纸文件');
                return;
            }
            
            console.log('加载到的壁纸列表:', this.state.allWallpapers);

            // 从 localStorage 加载壁纸状态
            const savedStates = JSON.parse(localStorage.getItem('wallpaperStates') || '{}');
            this.state.allWallpapers = this.state.allWallpapers.map(wallpaper => {
                const savedState = savedStates[wallpaper.path];
                if (savedState) {
                    // 如果 localStorage 中有保存的状态，使用它
                    return { ...wallpaper, ...savedState };
                } else {
                    // 否则，初始化状态为正常（未流放）
                    return { ...wallpaper, isBanned: false, lastModified: 0 };
                }
            });

            console.log('应用 localStorage 状态后的壁纸列表:', this.state.allWallpapers);

        } catch (error) {
            console.error('加载壁纸列表失败:', error);
            this.state.allWallpapers = [];
        }
    },

    /**
     * 初始化事件监听
     */
    initEventListeners() {
        // 搜索框事件
        const searchInput = document.getElementById('search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input'); // 获取移动端搜索框

        const handleSearchDebounced = Utils.debounce((e) => {
            this.handleSearch(e.target.value.trim());
        }, CONFIG.SEARCH.DEBOUNCE_DELAY);

        if (searchInput) {
            searchInput.addEventListener('input', handleSearchDebounced);
        }

        if (mobileSearchInput) {
            mobileSearchInput.addEventListener('input', handleSearchDebounced);
        }

        // 加载更多按钮事件
        const loadMoreBtn = document.getElementById('load-more-btn');
        loadMoreBtn.addEventListener('click', async () => {
            const nextPage = this.getNextPageWallpapers();
            if (!nextPage) {
                loadMoreBtn.innerHTML = '<span>已加载全部内容</span>';
                loadMoreBtn.disabled = true;
                return;
            }

            const originalText = loadMoreBtn.innerHTML;
            loadMoreBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 加载中...';
            loadMoreBtn.disabled = true;

            await this.renderWallpaperCards(nextPage);

            loadMoreBtn.innerHTML = originalText;
            loadMoreBtn.disabled = false;
        });

        // 视图切换事件
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        const wallpaperContainer = document.getElementById('wallpaper-container');

        gridViewBtn.addEventListener('click', () => {
            wallpaperContainer.classList.remove('list-view-grid');
            wallpaperContainer.classList.add('masonry-grid');
            gridViewBtn.classList.remove('bg-white', 'hover:bg-neutral-dark');
            gridViewBtn.classList.add('bg-primary', 'text-white');
            listViewBtn.classList.remove('bg-primary', 'text-white');
            listViewBtn.classList.add('bg-white', 'hover:bg-neutral-dark');
            
            // 切换回默认视图时重新加载并渲染壁纸
            this.handleSearch(''); // 重新加载当前搜索关键字（如果存在）的壁纸，按默认视图过滤

            // 移除URL中的view参数
            const url = new URL(window.location.href);
            url.searchParams.delete('view');
            window.history.replaceState({}, '', url.toString());
        });

        listViewBtn.addEventListener('click', () => {
            // 切换到列表视图时，添加URL参数并刷新页面
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'list');
            window.location.href = url.toString();
        });

        // 壁纸详情点击事件 (保留原有的，但需要调整以避免与图标点击冲突)
        document.addEventListener('click', (e) => {
            // 检查点击的是否是壁纸缩略图本身，并且不是图标
            if (e.target.classList.contains('wallpaper-thumb') && !e.target.closest('.wallpaper-actions')) {
                const img = e.target;
                const card = img.closest('.masonry-item');
                const wallpaper = this.state.allWallpapers.find(w => w.path === img.dataset.originalPath);
                
                if (!wallpaper) {
                    console.error('未找到对应的壁纸信息');
                    return;
                }
                
                // 检测是否为移动设备
                const isMobile = window.innerWidth < 768;
                
                if (isMobile) {
                    // 移动端：跳转到详情页面
                    window.location.href = `detail-mobile.html?path=${encodeURIComponent(wallpaper.path)}&name=${encodeURIComponent(wallpaper.name)}`;
                } else {
                    // 桌面端：使用模态框
                    // 更新详情模态框内容
                    document.getElementById('detail-image').src = wallpaper.path;
                    document.getElementById('detail-title').textContent = wallpaper.name;
                    document.getElementById('detail-category').textContent = '未分类';
                    
                    // 更新标签
                    const tagContainer = document.getElementById('detail-tags');
                    tagContainer.innerHTML = '';
                    
                    // 预览和下载按钮
                    document.getElementById('preview-wallpaper').onclick = function() {
                        window.open(`yulan.html?image=${encodeURIComponent(wallpaper.path)}#previewControls`, '_blank');
                    };
                    
                    document.getElementById('download-original').onclick = async function() {
                        try {
                            // 获取原始图片
                            const response = await fetch(wallpaper.path);
                            const blob = await response.blob();
                            const file = new File([blob], wallpaper.filename, { type: blob.type });
                            
                            // 压缩图片
                            const compressedBlob = await Utils.compressImage(file, {
                                maxWidth: 1920,  // 最大宽度
                                maxHeight: 1080, // 最大高度
                                quality: 0.8,    // 压缩质量
                                type: 'image/jpeg' // 输出格式
                            });
                            
                            // 创建下载链接
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(compressedBlob);
                            link.download = wallpaper.filename.replace(/\.[^/.]+$/, '') + '_compressed.jpg';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(link.href);
                        } catch (error) {
                            console.error('下载失败:', error);
                            alert('下载失败，请重试');
                        }
                    };
                    
                    // 打开模态框
                    const detailModal = document.getElementById('wallpaper-detail-modal');
                    const detailModalContent = document.getElementById('wallpaper-detail-modal-content');
                    ModalManager.effects.open(detailModal, detailModalContent);
                }
            // 新增：处理图标点击事件
            } else if (e.target.classList.contains('wallpaper-action-icon')) {
                const icon = e.target;
                const wallpaperPath = icon.dataset.wallpaperPath;
                const action = icon.dataset.action;
                
                if (!wallpaperPath || !action) {
                    console.error('图标缺少必要的 data 属性');
                    return;
                }
                
                const wallpaper = this.state.allWallpapers.find(w => w.path === wallpaperPath);
                
                if (!wallpaper) {
                    console.error('未找到对应的壁纸信息');
                    return;
                }
                
                if (action === 'ban') {
                    // 流放操作
                    if (confirm('是否确定流放？')) {
                        wallpaper.isBanned = true;
                        wallpaper.lastModified = Date.now();
                        this.saveWallpaperState(wallpaper);
                        // 从 DOM 中移除卡片 (这里可以添加动画效果)
                        const card = icon.closest('.masonry-item');
                        if (card) {
                            // 简单的移除，无动画
                            card.remove(); 
                            // TODO: 添加动画过渡到列表视图（复杂实现）
                        }
                    }
                } else if (action === 'recall') {
                    // 召回操作
                    // 暂时不添加确认提示，如果需要再加
                    wallpaper.isBanned = false;
                    wallpaper.lastModified = Date.now();
                    this.saveWallpaperState(wallpaper);
                    // 从 DOM 中移除卡片
                    const card = icon.closest('.masonry-item');
                    if (card) {
                         // 简单的移除，无动画
                        card.remove();
                    }
                }
            }
        });
    },

    /**
     * 保存单个壁纸状态到 localStorage
     */
    saveWallpaperState(wallpaper) {
        const savedStates = JSON.parse(localStorage.getItem('wallpaperStates') || '{}');
        savedStates[wallpaper.path] = { isBanned: wallpaper.isBanned, lastModified: wallpaper.lastModified };
        localStorage.setItem('wallpaperStates', JSON.stringify(savedStates));
    },

    /**
     * 获取下一页壁纸
     */
    getNextPageWallpapers() {
        const start = this.state.currentPage * CONFIG.PAGINATION.ITEMS_PER_PAGE;
        const end = start + CONFIG.PAGINATION.ITEMS_PER_PAGE;
        const availableWallpapers = this.state.filteredWallpapers.filter(w => !this.state.displayedWallpapers.has(w.path));
        
        if (availableWallpapers.length === 0) {
            return null;
        }

        // 随机打乱顺序，但确保不重复
        const pageWallpapers = Utils.shuffleArray(availableWallpapers).slice(0, CONFIG.PAGINATION.ITEMS_PER_PAGE);
        pageWallpapers.forEach(w => this.state.displayedWallpapers.add(w.path));
        this.state.currentPage++;
        
        return pageWallpapers;
    },

    /**
     * 重置分页状态
     */
    resetPagination() {
        this.state.currentPage = 0;
        this.state.displayedWallpapers.clear();
    },

    /**
     * 处理搜索
     */
    async handleSearch(keyword) {
        const wallpaperContainer = document.getElementById('wallpaper-container');
        wallpaperContainer.innerHTML = '<div class="text-center text-gray-400 py-12"><i class="fa fa-spinner fa-spin mr-2"></i>搜索中...</div>';
        
        if (this.state.allWallpapers.length === 0) {
            await this.loadWallpaperList();
            if (this.state.allWallpapers.length === 0) {
                wallpaperContainer.innerHTML = '<div class="text-center text-gray-400 py-12">未找到任何壁纸文件，请确保static/wallpapers目录存在且包含图片文件。</div>';
                document.getElementById('load-more-btn').style.display = 'none';
                return;
            }
        }

        const lowerKeyword = keyword.toLowerCase();

        // Determine current view mode
        const isListView = wallpaperContainer.classList.contains('list-view-grid');

        // Filter wallpapers based on view mode and keyword
        this.state.filteredWallpapers = this.state.allWallpapers.filter(wallpaper => {
            const matchesKeyword = !lowerKeyword || wallpaper.name.toLowerCase().includes(lowerKeyword);
            if (isListView) {
                // In list view, show only banned wallpapers that match the keyword
                return wallpaper.isBanned && matchesKeyword;
            } else {
                // In default view, show only non-banned wallpapers that match the keyword
                return !wallpaper.isBanned && matchesKeyword;
            }
        });

        // Sort wallpapers (only in list view, by lastModified descending)
        if (isListView) {
            this.state.filteredWallpapers.sort((a, b) => b.lastModified - a.lastModified);
        } else {
            // In default view, sort by name (or another default criteria if preferred)
            this.state.filteredWallpapers.sort((a, b) => a.name.localeCompare(b.name));
        }

        this.resetPagination();
        wallpaperContainer.innerHTML = '';

        const firstPage = this.getNextPageWallpapers();
        if (!firstPage || firstPage.length === 0) {
            wallpaperContainer.innerHTML = '<div class="text-center text-gray-400 py-12">未找到相关壁纸</div>';
            document.getElementById('load-more-btn').style.display = 'none';
        } else {
            document.getElementById('load-more-btn').style.display = 'flex';
            await this.renderWallpaperCards(firstPage);
        }
        
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (this.state.filteredWallpapers.length <= CONFIG.PAGINATION.ITEMS_PER_PAGE) {
            loadMoreBtn.innerHTML = '<span>已加载全部内容</span>';
            loadMoreBtn.disabled = true;
        } else {
            loadMoreBtn.innerHTML = '<span>加载更多</span><i class="fa fa-refresh"></i>';
            loadMoreBtn.disabled = false;
        }
    },

    /**
     * 渲染壁纸卡片
     */
    async renderWallpaperCards(wallpapers) {
        if (this.state.isLoading) return;
        this.state.isLoading = true;

        const wallpaperContainer = document.getElementById('wallpaper-container');
        
        for (const wallpaper of wallpapers) {
            try {
                const card = document.createElement('div');
                card.className = 'masonry-item';
                
                // 先创建卡片并添加到容器，显示加载状态
                card.innerHTML = `
                    <div class="bg-white rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1">
                        <div class="relative">
                            <div class="w-full flex items-center justify-center bg-neutral">
                                <i class="fa fa-spinner fa-spin text-2xl text-gray-400"></i>
                            </div>
                        </div>
                        <div class="p-4">
                            <div class="flex justify-between items-center">
                                <h3 class="font-medium">${wallpaper.name}</h3>
                                <!-- 尺寸信息留在标题旁边 -->
                                <span class="text-sm text-gray-500 size-info">加载中...</span>
                            </div>
                            <div class="flex flex-wrap gap-2 mt-2 items-center justify-between w-full"> <!-- 添加items-center使其垂直居中 -->
                                <span class="px-3 py-1 bg-neutral rounded-full text-sm">未分类</span>
                                <div class="flex items-center space-x-2 wallpaper-actions"> <!-- 新增一个flex容器来包裹图标 -->
                                    ${(() => {
                                        const wallpaperContainer = document.getElementById('wallpaper-container');
                                        const isListView = wallpaperContainer.classList.contains('list-view-grid');
                                        
                                        if (wallpaper.isBanned && isListView) {
                                            // 流放状态在列表视图显示召回图标
                                            return `<img src="static/icons/zh.png" alt="召回" class="w-5 h-5 cursor-pointer wallpaper-action-icon" data-wallpaper-path="${wallpaper.path}" data-action="recall">`;
                                        } else if (!wallpaper.isBanned && !isListView) {
                                            // 正常状态在默认视图显示流放图标
                                            return `<img src="static/icons/lf.png" alt="流放" class="w-5 h-5 cursor-pointer wallpaper-action-icon" data-wallpaper-path="${wallpaper.path}" data-action="ban">`;
                                        } else {
                                            // 其他情况不显示图标
                                            return '';
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                wallpaperContainer.appendChild(card);
                
                // 加载图片
                const response = await fetch(wallpaper.path);
                if (!response.ok) throw new Error('图片加载失败');
                
                const blob = await response.blob();
                let imageUrl;
                
                try {
                    // 统一使用压缩方法
                    const compressedBlob = await Utils.compressImage(blob);
                    imageUrl = URL.createObjectURL(compressedBlob);
                } catch (compressError) {
                    console.warn('图片压缩失败，使用原图:', compressError);
                    imageUrl = URL.createObjectURL(blob);
                }
                
                // 更新卡片内容，替换加载指示器为图片，并重新添加 object-cover 类
                const cardContent = card.querySelector('.relative');
                cardContent.innerHTML = `
                    <img src="${imageUrl}" alt="${wallpaper.name}" class="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity wallpaper-thumb" data-original-path="${wallpaper.path}">
                `;
                
                // 图片加载完成后更新尺寸信息
                const img = cardContent.querySelector('img');
                img.onload = function() {
                    const sizeSpan = card.querySelector('.size-info');
                    sizeSpan.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                };
                
                img.onerror = function() {
                    // 图片加载失败时显示错误提示
                    cardContent.innerHTML = `
                        <div class="w-full flex items-center justify-center bg-neutral">
                            <i class="fa fa-exclamation-circle text-2xl text-red-500"></i>
                        </div>
                    `;
                    const sizeSpan = card.querySelector('.size-info');
                    sizeSpan.textContent = '加载失败';
                };
            } catch (error) {
                console.error('图片处理失败:', error);
                // 错误处理：在容器中添加错误提示卡片
                const errorCard = document.createElement('div');
                errorCard.className = 'masonry-item';
                errorCard.innerHTML = `
                    <div class="bg-white rounded-lg overflow-hidden shadow-card">
                        <div class="relative">
                            <div class="w-full flex items-center justify-center bg-neutral">
                                <i class="fa fa-exclamation-circle text-2xl text-red-500"></i>
                            </div>
                        </div>
                        <div class="p-4">
                            <div class="flex justify-between items-center">
                                <h3 class="font-medium">${wallpaper.name}</h3>
                                <span class="text-sm text-gray-500">加载失败</span>
                            </div>
                        </div>
                    </div>
                `;
                wallpaperContainer.appendChild(errorCard);
            }
        }

        this.state.isLoading = false;
    }
};