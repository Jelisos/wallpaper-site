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
        await this.loadWallpaperList();
        this.initEventListeners();
        this.handleSearch('');
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
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.handleSearch(e.target.value.trim());
        }, CONFIG.SEARCH.DEBOUNCE_DELAY));

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
            wallpaperContainer.classList.add('masonry-grid');
            gridViewBtn.classList.remove('bg-white', 'hover:bg-neutral-dark');
            gridViewBtn.classList.add('bg-primary', 'text-white');
            listViewBtn.classList.remove('bg-primary', 'text-white');
            listViewBtn.classList.add('bg-white', 'hover:bg-neutral-dark');
        });

        listViewBtn.addEventListener('click', () => {
            wallpaperContainer.classList.remove('masonry-grid');
            listViewBtn.classList.remove('bg-white', 'hover:bg-neutral-dark');
            listViewBtn.classList.add('bg-primary', 'text-white');
            gridViewBtn.classList.remove('bg-primary', 'text-white');
            gridViewBtn.classList.add('bg-white', 'hover:bg-neutral-dark');
        });

        // 壁纸详情点击事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('wallpaper-thumb')) {
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
                    
                    document.getElementById('download-original').onclick = function() {
                        const link = document.createElement('a');
                        link.href = wallpaper.path;
                        link.download = wallpaper.filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    };
                    
                    // 打开模态框
                    const detailModal = document.getElementById('wallpaper-detail-modal');
                    const detailModalContent = document.getElementById('wallpaper-detail-modal-content');
                    ModalManager.effects.open(detailModal, detailModalContent);
                }
            }
        });
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
        this.state.filteredWallpapers = this.state.allWallpapers.filter(wallpaper => {
            if (!lowerKeyword) return true;
            return wallpaper.name.toLowerCase().includes(lowerKeyword);
        });

        this.state.filteredWallpapers.sort((a, b) => a.name.localeCompare(b.name));
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
        const isMobile = window.innerWidth < 768; // 检测是否为移动设备
        
        for (const wallpaper of wallpapers) {
            try {
                const card = document.createElement('div');
                card.className = 'masonry-item';
                
                // 先创建卡片并添加到容器，显示加载状态
                card.innerHTML = `
                    <div class="bg-white rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1">
                        <div class="relative">
                            <div class="w-full h-48 flex items-center justify-center bg-neutral">
                                <i class="fa fa-spinner fa-spin text-2xl text-gray-400"></i>
                            </div>
                        </div>
                        <div class="p-4">
                            <div class="flex justify-between items-center">
                                <h3 class="font-medium">${wallpaper.name}</h3>
                                <span class="text-sm text-gray-500 size-info">加载中...</span>
                            </div>
                            <div class="flex flex-wrap gap-2 mt-2">
                                <span class="px-3 py-1 bg-neutral rounded-full text-sm">未分类</span>
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
                
                // 移动端跳过压缩步骤，直接使用原图
                if (isMobile) {
                    imageUrl = URL.createObjectURL(blob);
                } else {
                    try {
                        // 桌面端尝试压缩
                        const compressedBlob = await Utils.compressImage(blob);
                        imageUrl = URL.createObjectURL(compressedBlob);
                    } catch (compressError) {
                        console.warn('图片压缩失败，使用原图:', compressError);
                        imageUrl = URL.createObjectURL(blob);
                    }
                }
                
                // 更新卡片内容，替换加载指示器为图片
                const cardContent = card.querySelector('.relative');
                cardContent.innerHTML = `
                    <img src="${imageUrl}" alt="${wallpaper.name}" class="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity wallpaper-thumb" data-original-path="${wallpaper.path}">
                `;
                
                // 图片加载完成后更新尺寸信息
                const img = cardContent.querySelector('img');
                img.onload = function() {
                    const sizeSpan = card.querySelector('.size-info');
                    sizeSpan.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                    
                    // 移除这段代码，不再在移动端提前释放 Blob URL
                    // if (isMobile) {
                    //     setTimeout(() => {
                    //         URL.revokeObjectURL(imageUrl);
                    //     }, 1000); // 给一点时间确保图片完全加载
                    // }
                };
                
                img.onerror = function() {
                    // 图片加载失败时显示错误提示
                    cardContent.innerHTML = `
                        <div class="w-full h-48 flex items-center justify-center bg-neutral">
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
                            <div class="w-full h-48 flex items-center justify-center bg-neutral">
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