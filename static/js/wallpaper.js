/**
 * 壁纸管理模块
 */
const WallpaperManager = {
    // 状态变量
    state: {
        allWallpapers: [], // 所有壁纸
        filteredWallpapers: [], // 过滤后的壁纸
        displayedWallpapers: new Set(), // 已显示的壁纸
        currentPage: 0,
        isLoading: false,
        currentViewMode: 'grid', // 当前视图模式：'grid' 或 'list'
        searchKeyword: '' // 当前搜索关键词
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
        
        // 设置初始视图模式
        this.state.currentViewMode = viewMode === 'list' ? 'list' : 'grid';
        
        // 初始化视图
        this.initView();
        
        // 加载壁纸列表
        await this.loadWallpaperList();
        
        // 初始化事件监听
        this.initEventListeners();
        
        // 加载初始壁纸
        this.handleSearch('');
    },

    /**
     * 初始化视图
     */
    initView() {
        const wallpaperContainer = document.getElementById('wallpaper-container');
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');

        // 设置容器类
        wallpaperContainer.className = this.state.currentViewMode === 'list' ? 'list-view-grid' : 'masonry-grid';
        
        // 设置按钮状态
        if (this.state.currentViewMode === 'list') {
            gridViewBtn.classList.remove('bg-primary', 'text-white');
            gridViewBtn.classList.add('bg-white', 'hover:bg-neutral-dark');
            listViewBtn.classList.remove('bg-white', 'hover:bg-neutral-dark');
            listViewBtn.classList.add('bg-primary', 'text-white');
        } else {
            listViewBtn.classList.remove('bg-primary', 'text-white');
            listViewBtn.classList.add('bg-white', 'hover:bg-neutral-dark');
            gridViewBtn.classList.remove('bg-white', 'hover:bg-neutral-dark');
            gridViewBtn.classList.add('bg-primary', 'text-white');
        }
    },

    /**
     * 切换到列表视图
     */
    async switchToListView() {
        if (this.state.currentViewMode === 'list') return;
        
        // 更新状态
        this.state.currentViewMode = 'list';
        
        // 更新视图
        this.initView();
        
        // 更新URL参数
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'list');
        window.history.pushState({}, '', url);
        
        // 等待当前视图加载完成
        await this.handleSearch(this.state.searchKeyword);
    },

    /**
     * 切换到网格视图
     */
    async switchToGridView() {
        if (this.state.currentViewMode === 'grid') return;
        
        // 更新状态
        this.state.currentViewMode = 'grid';
        
        // 更新视图
        this.initView();
        
        // 更新URL参数
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        window.history.pushState({}, '', url);
        
        // 等待当前视图加载完成
        await this.handleSearch(this.state.searchKeyword);
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
        const mobileSearchInput = document.getElementById('mobile-search-input');

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
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', async () => {
                const nextPage = this.getNextPageWallpapers();
                if (!nextPage) {
                    loadMoreBtn.innerHTML = '<span>已加载全部内容</span>';
                    loadMoreBtn.disabled = true;
                    return;
                }

                const originalText = loadMoreBtn.innerHTML;
                loadMoreBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 加载中';
                loadMoreBtn.disabled = true;

                await this.renderWallpaperCards(nextPage);

                loadMoreBtn.innerHTML = originalText;
                loadMoreBtn.disabled = false;
            });
        }

        // 视图切换按钮事件
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', async () => {
                // 禁用按钮，防止重复点击
                gridViewBtn.disabled = true;
                listViewBtn.disabled = true;
                
                try {
                    await this.switchToGridView();
                } finally {
                    // 恢复按钮状态
                    gridViewBtn.disabled = false;
                    listViewBtn.disabled = false;
                }
            });
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', async () => {
                // 禁用按钮，防止重复点击
                gridViewBtn.disabled = true;
                listViewBtn.disabled = true;
                
                try {
                    await this.switchToListView();
                } finally {
                    // 恢复按钮状态
                    gridViewBtn.disabled = false;
                    listViewBtn.disabled = false;
                }
            });
        }

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
        // 保存搜索关键词
        this.state.searchKeyword = keyword;
        
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

        // 严格过滤壁纸
        this.state.filteredWallpapers = this.state.allWallpapers.filter(wallpaper => {
            const matchesKeyword = !lowerKeyword || wallpaper.name.toLowerCase().includes(lowerKeyword);
            
            // 确保壁纸有明确的状态
            if (typeof wallpaper.isBanned !== 'boolean') {
                wallpaper.isBanned = false;
            }
            
            if (this.state.currentViewMode === 'list') {
                // 列表视图：严格只显示被流放的壁纸
                return wallpaper.isBanned === true && matchesKeyword;
            } else {
                // 网格视图：严格只显示未被流放的壁纸
                return wallpaper.isBanned === false && matchesKeyword;
            }
        });

        // 根据视图模式排序
        if (this.state.currentViewMode === 'list') {
            // 列表视图：按最后修改时间降序排序
            this.state.filteredWallpapers.sort((a, b) => {
                const timeA = a.lastModified || 0;
                const timeB = b.lastModified || 0;
                return timeB - timeA;
            });
        } else {
            // 网格视图：按名称排序
            this.state.filteredWallpapers.sort((a, b) => a.name.localeCompare(b.name));
        }

        // 重置分页
        this.resetPagination();
        wallpaperContainer.innerHTML = '';

        // 加载第一页
        const firstPage = this.getNextPageWallpapers();
        if (!firstPage || firstPage.length === 0) {
            wallpaperContainer.innerHTML = '<div class="text-center text-gray-400 py-12">未找到相关壁纸</div>';
            document.getElementById('load-more-btn').style.display = 'none';
        } else {
            document.getElementById('load-more-btn').style.display = 'flex';
            await this.renderWallpaperCards(firstPage);
        }
        
        // 更新加载更多按钮状态
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