/**
 * 壁纸管理模块
 */
const WallpaperManager = {
    // 状态变量
    state: {
        allWallpapers: [],
        filteredWallpapers: [],
        displayedWallpapers: new Set(),
        currentPage: 0
    },

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
            return 'https://jelisos.github.io/wallpaper-site/static/wallpapers/list.json';
        } else {
            // 本地开发环境，使用相对路径
            return '/static/wallpapers/list.json';
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
        const wallpaperContainer = document.getElementById('wallpaper-container');
        
        for (const wallpaper of wallpapers) {
            try {
                const response = await fetch(wallpaper.path);
                const blob = await response.blob();
                const compressedBlob = await Utils.compressImage(blob);
                const compressedUrl = URL.createObjectURL(compressedBlob);
                
                const card = document.createElement('div');
                card.className = 'masonry-item';
                card.innerHTML = `
                    <div class="bg-white rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1">
                        <div class="relative">
                            <img src="${compressedUrl}" alt="${wallpaper.name}" class="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity wallpaper-thumb" data-original-path="${wallpaper.path}">
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
                
                const img = card.querySelector('img');
                img.onload = function() {
                    const sizeSpan = card.querySelector('.size-info');
                    sizeSpan.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                };
            } catch (error) {
                console.error('图片处理失败:', error);
            }
        }
    }
}; 