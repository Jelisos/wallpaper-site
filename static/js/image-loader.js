/**
 * 文件: static/js/image-loader.js
 * 描述: 首页图片加载和压缩模块
 * 依赖: utils.js, config.js, image-compressor.js
 * 维护: 负责首页壁纸的加载、显示、压缩和缓存管理
 */

/**
 * 图片加载器模块
 * 负责首页壁纸的加载、显示、压缩和性能优化
 */
const ImageLoader = {
    // 滚动加载的阈值（距离底部多少像素开始加载）
    SCROLL_THRESHOLD: 800, // 2024-07-26 修复：增加滚动加载阈值，确保用户拉到底部才加载

    // 状态管理
    state: {
        allWallpapers: [],
        filteredWallpapers: [],
        displayedWallpapers: new Set(),
        currentPage: 0,
        itemsPerPage: 16,  // 从20减少到16，减少单次加载量
        isLoading: false,
        isPreloading: false,  // 2025-01-27 添加预加载状态跟踪
        currentViewMode: 'grid',
        currentDisplayMode: 'normal', // 2024-07-28 新增：当前显示模式 ('normal' 或 'exiled_list')
        searchKeyword: '',
        currentCategory: 'all',
        categories: new Set(['all']),
        preloadedImages: new Set(),  // 预加载的图片集合
        intersectionObserver: null,   // 懒加载观察器
        userFavorites: new Set(), // 2024-07-16 新增：存储用户收藏的壁纸ID
        userLikes: new Set(), // 2024-12-19 新增：存储用户点赞的壁纸ID
        isUserAdmin: false, // 2024-07-28 新增：用户是否为管理员
        exiledWallpaperIds: new Set(), // 2024-07-28 新增：存储被流放壁纸的ID
        exiledWallpapersData: [], // 2024-12-19 新增：存储流放壁纸的完整数据（包含时间）
        isPageReady: false, // 2024-12-19 新增：页面是否加载完成，防止快速点击
        viewSwitchDebounce: null // 2024-12-19 新增：视图切换防抖定时器
    },
    
    /**
     * 初始化图片加载器
     */
    async init() {
        try {
            // 2024-07-28 新增：加载初始数据和用户权限
            await this._loadInitialDataAndPermissions();

            // 初始化懒加载观察器
            this.initIntersectionObserver();
            
            // 加载壁纸数据
            await this.loadWallpaperData();
            
            // 2024-07-16 新增：加载用户收藏数据
            await this._loadUserFavorites();
            
            // 2024-12-19 新增：加载用户点赞数据
            await this._loadUserLikes();
            
            // 2024-12-19 修复：在所有数据加载完成后，重新过滤壁纸以确保被流放图片不会显示
            this.filterWallpapers();
            
            // 初始化UI
            this.initUI();
            
            // 绑定事件
            this.bindEvents();
            
            // 渲染初始内容
            await this.renderWallpapers();
            
            // 预加载下一页图片
            this.preloadNextPage();
            
            // 2024-12-19 新增：设置页面就绪状态，允许视图切换
            setTimeout(() => {
                this.state.isPageReady = true;
                console.log('[调试-页面状态] 页面加载完成，允许视图切换');
            }, 500); // 延迟500ms确保所有内容都已渲染
            
        } catch (error) {
            // 2024-07-15 修复：当图片加载器初始化失败时，打印详细错误信息
            console.error('详细错误:', error);
            this.showError('图片加载器初始化失败');
        }
    },

    /**
     * 加载壁纸数据
     */
    async loadWallpaperData() {
        try {
            const response = await fetch('static/data/list.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            let wallpapers = Array.isArray(data) ? data : [];

            // 2024-12-19 优化：移除localStorage固定顺序逻辑，实现真正的随机按需加载
            // 不再保存和加载固定顺序，每次都保持原始数据顺序，由_getPaginatedRandomWallpapers负责随机选择
            this.state.allWallpapers = wallpapers;
            
            // 清理旧的localStorage数据
            localStorage.removeItem('wallpaperOrder');

            // 2024-12-19 修复：不直接复制数组，而是调用filterWallpapers确保正确过滤
            // this.state.filteredWallpapers = [...this.state.allWallpapers];
            // 注意：此时还未加载exiledWallpaperIds，所以暂时设置为空数组
            this.state.filteredWallpapers = [];
            
            // 提取分类
            this.extractCategories();
            
        } catch (error) {
            throw error;
        }
    },

    /**
     * 提取分类信息
     */
    extractCategories() {
        this.state.categories.clear();
        this.state.categories.add('all');
        
        this.state.allWallpapers.forEach(wallpaper => {
            if (wallpaper.category) {
                this.state.categories.add(wallpaper.category);
            }
        });
        
        this.renderCategoryNav();
    },

    /**
     * 渲染分类导航
     */
    renderCategoryNav() {
        const container = document.getElementById('category-nav-container');
        if (!container) return;
        
        const categories = Array.from(this.state.categories);
        container.innerHTML = categories.map(category => {
            const isActive = category === this.state.currentCategory;
            const displayName = category === 'all' ? '全部' : category;
            
            return `
                <button class="category-btn px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    isActive 
                        ? 'bg-primary text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                }" data-category="${category}">
                    ${displayName}
                </button>
            `;
        }).join('');
    },

    /**
     * 初始化UI组件
     */
    initUI() {
        // 确保容器存在
        const container = document.getElementById('wallpaper-container');
        if (!container) {
            return;
        }
        
        // 设置初始视图模式
        this.updateViewMode(this.state.currentViewMode);

        // 2024-07-28 新增：根据管理员权限显示流放图片按钮
        const exiledListViewBtn = document.getElementById('exiled-list-view-btn');
        if (exiledListViewBtn && this.state.isUserAdmin) {
            exiledListViewBtn.classList.remove('hidden');
        }
    },

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 搜索功能
        const searchInput = document.getElementById('search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }
        
        if (mobileSearchInput) {
            mobileSearchInput.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }
        
        // 视图切换 - 2024-12-19 修复：添加防抖和页面就绪检查
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this._handleViewSwitch('grid'));
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => this._handleViewSwitch('list'));
        }
        
        // 2024-07-28 新增：流放图片视图切换
        const exiledListViewBtn = document.getElementById('exiled-list-view-btn');
        if (exiledListViewBtn) {
            exiledListViewBtn.addEventListener('click', () => this._handleViewSwitch('exiled_list'));
        }
        
        // 加载更多
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMore());
        }
        
        // 分类点击事件（事件委托）
        const categoryContainer = document.getElementById('category-nav-container');
        if (categoryContainer) {
            categoryContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('category-btn')) {
                    const category = e.target.dataset.category;
                    this.handleCategoryChange(category);
                }
            });
        }

        // 页面滚动监听，用于加载更多和预加载
        window.addEventListener('scroll', this.debounce(() => this._handleScrollForLoadMore(), 200)); // 2024-07-26 修复：将 loadMore 直接绑定改为通过 _handleScrollForLoadMore 触发
        window.addEventListener('scroll', this.debounce(() => this.preloadNextPage(), 300));

        // 2024-07-26 新增：监听详情页点赞状态变化事件
        document.addEventListener('wallpaper-like-status-changed', (event) => {
            const { wallpaperId, action } = event.detail;
            this._updateCardLikeStatus(wallpaperId, action);
        });

        // 2024-07-26 新增：监听详情页收藏状态变化事件
        document.addEventListener('wallpaper-favorite-status-changed', (event) => {
            const { wallpaperId, action } = event.detail;
            this._updateCardFavoriteStatus(wallpaperId, action);
        });
    },

    /**
     * 处理滚动事件以触发加载更多
     */
    _handleScrollForLoadMore() {
        // 文档的总高度
        const documentHeight = document.documentElement.scrollHeight;
        // 视口高度
        const viewportHeight = window.innerHeight;
        // 当前滚动位置
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;

        // 如果已经滚动到接近底部，则加载更多
        if (scrollPosition + viewportHeight >= documentHeight - this.SCROLL_THRESHOLD) {
            this.loadMore();
        }
    },

    /**
     * 处理搜索
     */
    async handleSearch(keyword) {
        this.state.searchKeyword = keyword.trim().toLowerCase();
        this.state.currentPage = 0;
        this.state.displayedWallpapers.clear();
        
        this.filterWallpapers();
        await this.renderWallpapers();
    },

    /**
     * 处理分类变更
     */
    async handleCategoryChange(category) {
        if (this.state.currentCategory === category) return;
        
        this.state.currentCategory = category;
        this.state.currentPage = 0;
        this.state.displayedWallpapers.clear();
        
        this.filterWallpapers();
        this.renderCategoryNav();
        await this.renderWallpapers();
    },

    /**
     * 过滤壁纸
     */
    filterWallpapers() {
        let filtered = [...this.state.allWallpapers];
        
        // 2024-07-28 新增：根据显示模式过滤流放壁纸
        if (this.state.currentDisplayMode === 'normal') {
            // 首页只显示未流放的壁纸
            filtered = filtered.filter(w => !this.state.exiledWallpaperIds.has(w.id));
        } else if (this.state.currentDisplayMode === 'exiled_list') {
            // 2024-12-19 修改：流放列表只显示已流放的壁纸，并按流放时间排序（最新的在前面）
            filtered = filtered.filter(w => this.state.exiledWallpaperIds.has(w.id));
            
            // 按流放时间排序，最新流放的在前面
            if (this.state.exiledWallpapersData && this.state.exiledWallpapersData.length > 0) {
                const exileTimeMap = new Map();
                this.state.exiledWallpapersData.forEach(item => {
                    exileTimeMap.set(item.id, new Date(item.exile_time));
                });
                
                filtered.sort((a, b) => {
                    const timeA = exileTimeMap.get(a.id) || new Date(0);
                    const timeB = exileTimeMap.get(b.id) || new Date(0);
                    return timeB - timeA; // 降序排列，最新的在前面
                });
            }
        } else if (this.state.currentDisplayMode === 'favorites_and_likes') {
            // 2024-12-19 修改：列表视图显示点赞和收藏的内容，不受流放限制
            // 获取用户点赞和收藏的壁纸
            const likedWallpapers = this.state.userLikes || new Set();
            const favoritedWallpapers = this.state.userFavorites || new Set();
            
            // 如果用户已登录且有收藏或点赞，显示收藏和点赞的壁纸（不管是否被流放）
            if (likedWallpapers.size > 0 || favoritedWallpapers.size > 0) {
                filtered = filtered.filter(w => 
                    likedWallpapers.has(w.id) || favoritedWallpapers.has(w.id)
                );
            } else {
                // 如果没有点赞也没有收藏，显示所有未被流放的壁纸
                filtered = filtered.filter(w => !this.state.exiledWallpaperIds.has(w.id));
            }
        }
        
        // 分类过滤
        if (this.state.currentCategory !== 'all') {
            filtered = filtered.filter(w => w.category === this.state.currentCategory);
        }
        
        // 搜索过滤
        if (this.state.searchKeyword) {
            filtered = filtered.filter(w => 
                w.name.toLowerCase().includes(this.state.searchKeyword) ||
                w.filename.toLowerCase().includes(this.state.searchKeyword) ||
                (w.tags && w.tags.some(tag => tag.toLowerCase().includes(this.state.searchKeyword)))
            );
        }
        
        this.state.filteredWallpapers = filtered;
    },

    /**
     * 2024-12-19 新增：统一的视图切换处理函数，包含防抖和状态检查
     */
    _handleViewSwitch(mode) {
        // 检查页面是否就绪
        if (!this.state.isPageReady) {
            console.log('[调试-视图切换] 页面尚未就绪，忽略点击');
            return;
        }
        
        // 防抖处理
        if (this.state.viewSwitchDebounce) {
            clearTimeout(this.state.viewSwitchDebounce);
        }
        
        this.state.viewSwitchDebounce = setTimeout(() => {
            if (mode === 'exiled_list') {
                this._handleExiledListView();
            } else {
                this.switchViewMode(mode);
            }
        }, 100); // 100ms防抖
    },

    /**
     * 切换视图模式
     */
    switchViewMode(mode) {
        if (this.state.currentViewMode === mode && this.state.currentDisplayMode === 'normal') return;
        
        this.state.currentViewMode = mode;
        // 2024-07-28 修复：视图切换时，如果不是在流放列表，则强制切换回normal display mode
        if (this.state.currentDisplayMode === 'exiled_list') {
             // 如果从流放列表切换到网格/列表视图，需要重置displayMode
            this.state.currentDisplayMode = 'normal';
            this.state.currentPage = 0;
            this.state.displayedWallpapers.clear();
        }
        
        // 2024-12-19 新增：列表视图显示点赞和收藏内容
        if (mode === 'list') {
            this.state.currentDisplayMode = 'favorites_and_likes';
            this.state.currentPage = 0;
            this.state.displayedWallpapers.clear();
        } else if (mode === 'grid') {
            this.state.currentDisplayMode = 'normal';
            this.state.currentPage = 0;
            this.state.displayedWallpapers.clear();
        }

        this.updateViewMode(mode);
        this.filterWallpapers(); // 重新过滤以应用新的displayMode
        this.renderWallpapers();
        this.updateLoadMoreButton(); // 更新加载更多按钮状态
    },

    /**
     * 更新视图模式UI
     */
    updateViewMode(mode) {
        const container = document.getElementById('wallpaper-container');
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        const exiledBtn = document.getElementById('exiled-list-view-btn'); // 2024-07-28 新增
        
        if (!container) return;
        
        // 2024-12-19 修复：根据显示模式和视图模式设置正确的CSS类
        let containerClass = 'min-h-[400px]';
        if (this.state.currentDisplayMode === 'exiled_list') {
            containerClass = 'exiled-view-grid min-h-[400px]';
        } else if (mode === 'grid') {
            containerClass = 'masonry-grid min-h-[400px]';
        } else {
            containerClass = 'list-view-grid min-h-[400px]';
        }
        container.className = containerClass;
        
        // 更新按钮状态
        if (gridBtn && listBtn && exiledBtn) {
            // 重置所有按钮状态
            gridBtn.className = 'p-2 rounded bg-white hover:bg-neutral-dark transition-colors';
            listBtn.className = 'p-2 rounded bg-white hover:bg-neutral-dark transition-colors';
            exiledBtn.className = 'p-2 rounded bg-white hover:bg-neutral-dark transition-colors';

            // 设置当前活动按钮状态
            if (mode === 'grid' && this.state.currentDisplayMode === 'normal') {
                gridBtn.className = 'p-2 rounded bg-primary text-white';
            } else if (mode === 'list' && this.state.currentDisplayMode === 'normal') {
                listBtn.className = 'p-2 rounded bg-primary text-white';
            }
            // 流放列表按钮的高亮状态在_handleExiledListView中单独处理
        }
    },

    /**
     * 渲染壁纸
     */
    async renderWallpapers(append = false) {
        const container = document.getElementById('wallpaper-container');
        if (!container) return;
        
        if (!append) {
            container.innerHTML = '';
            this.state.displayedWallpapers.clear();
            this.state.currentPage = 0; // 2024-07-30 修复：重置页码以从头开始随机加载
        }
        
        // 2024-07-30 修复：从随机分页函数获取壁纸
        const wallpapersToShow = this._getPaginatedRandomWallpapers();
        
        if (wallpapersToShow.length === 0 && !append) {
            container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">暂无壁纸</div>';
            return;
        }
        
        // 创建壁纸卡片
        const fragment = document.createDocumentFragment();
        
        for (const wallpaper of wallpapersToShow) {
            // 2024-07-30 修复：_getPaginatedRandomWallpapers已确保去重，此处无需再次检查
            // if (this.state.displayedWallpapers.has(wallpaper.id)) continue;
            
            const card = await this.createWallpaperCard(wallpaper);
            fragment.appendChild(card);
            this.state.displayedWallpapers.add(wallpaper.id);

            // 2024-07-26 修复：直接在此处检查收藏和点赞状态，确保与当前wallpaper关联
            const favoriteButton = card.querySelector('.card-favorite-btn');
            if (favoriteButton) {
                const wallpaperId = parseInt(favoriteButton.dataset.wallpaperId);
                if (!isNaN(wallpaperId)) {
                    await this._checkCardFavoriteStatus(wallpaperId, favoriteButton);
                }
            }
            const likeButton = card.querySelector('.card-like-btn');
            if (likeButton) {
                const wallpaperId = parseInt(likeButton.dataset.wallpaperId);
                if (!isNaN(wallpaperId)) {
                    await this._checkCardLikeStatus(wallpaperId, likeButton);
                    // 点赞数在后端每次请求时会更新，这里只需初始显示即可，无需额外请求
                    // 如果需要实时更新，可以考虑WebSocket或在toggle_like接口返回最新点赞数
                }
            }
        }
        
        container.appendChild(fragment);
        
        // 更新加载更多按钮状态
        this.updateLoadMoreButton();
    },

    /**
     * 创建壁纸卡片
     */
    async createWallpaperCard(wallpaper) {
        const card = document.createElement('div');
        // 2024-12-19 修复：所有视图模式都使用瀑布流布局，添加masonry-item类
        card.className = 'masonry-item wallpaper-card-item bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer';
        card.dataset.wallpaperId = wallpaper.id;
        
        // 2024-07-16 新增：检查当前壁纸是否被用户收藏，并设置初始收藏状态
        const isFavorited = this.state.userFavorites.has(wallpaper.id);
        const favoriteIconSrc = isFavorited ? 'static/icons/fa-star.svg' : 'static/icons/fa-star-o.svg';
        const favoriteIconClass = isFavorited ? 'favorited' : '';
        
        // 创建占位符，先显示加载状态
        card.innerHTML = `
            <div class="relative overflow-hidden rounded-lg">
                <div class="w-full bg-gray-200 animate-pulse flex items-center justify-center" style="min-height: 200px; height: auto;">
                    <div class="text-gray-400 text-sm">加载中...</div>
                </div>
                <div class="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <button class="preview-btn text-white px-4 py-2 rounded-lg font-medium">
                        预览
                    </button>
                </div>
                <!-- 2024-07-26 添加：首页收藏按钮 -->
                <button class="card-favorite-btn absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md text-gray-500 hover:text-red-500 transition-colors z-10" data-wallpaper-id="${wallpaper.id}">
                    <img src="${favoriteIconSrc}" alt="收藏" class="w-5 h-5 card-favorite-icon ${favoriteIconClass}">
                </button>
                <!-- 2024-07-26 添加：首页点赞按钮 -->
                <button class="card-like-btn absolute top-2 right-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md text-gray-500 hover:text-primary transition-colors z-10" data-wallpaper-id="${wallpaper.id}">
                    <img src="static/icons/fa-heart-o.svg" alt="点赞" class="w-5 h-5 card-like-icon text-gray-500">
                    <span class="card-likes-count text-xs ml-1" style="display: none;">0</span>
                </button>
            </div>
            <div class="p-4">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-medium text-gray-900 flex-1 min-w-0 mr-2 overflow-hidden whitespace-nowrap text-ellipsis" title="${this.escapeHtml(wallpaper.name || '未命名壁纸')}">
                        ${this.escapeHtml(wallpaper.name || '未命名壁纸')}
                    </h3>
                    <!-- 2024-07-31 移动：首页流放/召回按钮到标题旁边 -->
                    <button class="card-exile-recall-btn flex-shrink-0 p-1 rounded-full text-gray-500 hover:text-red-500 transition-colors" style="position: static !important; background: transparent !important; box-shadow: none !important; backdrop-filter: none !important;" data-wallpaper-id="${wallpaper.id}" data-action="${this.state.exiledWallpaperIds.has(wallpaper.id) ? 'recall' : 'exile'}">
                        <img src="static/icons/${this.state.exiledWallpaperIds.has(wallpaper.id) ? 'zh.png' : 'lf.png'}" alt="${this.state.exiledWallpaperIds.has(wallpaper.id) ? '召回' : '流放'}" class="w-5 h-5">
                    </button>
                </div>
                <div class="flex items-center justify-between mt-2 text-sm text-gray-500">
                    <span>${wallpaper.width} × ${wallpaper.height}</span>
                    <span class="px-2 py-1 bg-gray-100 rounded text-xs">${wallpaper.category || '其他'}</span>
                </div>
            </div>
        `;
        
        // 异步加载图片
        this.loadCardImage(card, wallpaper);
        
        // 绑定点击事件（整个卡片点击显示详情）
        card.addEventListener('click', async (e) => {
            // 2024-07-26 修复：如果点击的是收藏按钮，则不触发卡片详情
            const favoriteButton = e.target.closest('.card-favorite-btn'); // 2024-07-26 修复：在 card 层面处理收藏/点赞点击
            const likeButton = e.target.closest('.card-like-btn');
            // 2024-07-28 新增：流放/召回按钮
            const exileRecallButton = e.target.closest('.card-exile-recall-btn');

            if (favoriteButton) {
                e.stopPropagation(); // 2024-07-26 修复：立即阻止事件冒泡
                e.preventDefault();  // 2024-07-26 修复：立即阻止默认行为
                await this._handleCardFavoriteClick(favoriteButton); // 2024-07-26 修复：直接传递点击的按钮元素
                return;
            }

            if (likeButton) {
                e.stopPropagation(); // 2024-07-26 修复：立即阻止事件冒泡
                e.preventDefault();  // 2024-07-26 修复：立即阻止默认行为
                await this._handleCardLikeClick(likeButton); // 2024-07-26 修复：直接传递点击的按钮元素
                return;
            }

            if (exileRecallButton) {
                e.stopPropagation();
                e.preventDefault();
                await this._handleExileRecallClick(exileRecallButton);
                return;
            }

            // 如果点击的不是收藏、点赞或流放/召回按钮，才触发卡片详情
            this.handleWallpaperClick(wallpaper);
        });
        
        return card;
    },

    /**
     * 初始化懒加载观察器
     */
    initIntersectionObserver() {
        // 2025-01-27 修复滚动卡顿：清理旧的观察器，避免重复绑定
        if (this.state.intersectionObserver) {
            this.state.intersectionObserver.disconnect();
        }
        
        if (!('IntersectionObserver' in window)) {
            return;
        }
        
        this.state.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src && !img.src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            this.state.intersectionObserver.unobserve(img);
                        }
                    }
                });
            },
            {
                rootMargin: '50px 0px',  // 提前50px开始加载
                threshold: 0.1
            }
        );
    },

    /**
     * 异步加载卡片图片
     */
    async loadCardImage(card, wallpaper) {
        try {
            const placeholder = card.querySelector('.animate-pulse');
            if (!placeholder) {
                return;
            }
            
            if (!wallpaper.path || typeof wallpaper.path !== 'string') {
                throw new Error(`无效的图片路径: ${wallpaper.name}`);
            }
            
            const img = document.createElement('img');
            img.alt = this.escapeHtml(wallpaper.name);
            // 2024-12-19 修复：确保图片自适应高度，避免留白
            img.className = 'w-full h-auto object-cover transition-transform hover:scale-105 block';
            
            // 图片加载完成后替换占位符 - 2024-07-16 修复：先设置onload/onerror，再设置src
            img.onload = () => {
                // 2024-07-16 修复：使用 requestAnimationFrame 确保 DOM 更新与渲染同步
                if (placeholder && placeholder.parentNode) {
                    placeholder.replaceWith(img);
                }
            };
            
            // 错误处理
            img.onerror = (e) => {
                // 2024-07-16 修复：尝试使用原始路径
                if (img.src !== wallpaper.path && wallpaper.path.startsWith('static/')) { // 避免无限循环尝试和非项目内路径
                    img.src = wallpaper.path;
                    return; // 给原始路径一次机会加载
                }
                
                // 如果原始路径也失败，显示占位图标
                // 2024-07-16 修复：使用 requestAnimationFrame 确保 DOM 更新与渲染同步
                img.src = 'static/icons/fa-picture-o.svg';
                img.className = 'w-full h-48 object-contain bg-gray-100';
                if (placeholder && placeholder.parentNode) {
                    placeholder.replaceWith(img);
                }
                const errorText = placeholder.querySelector('.text-gray-400');
                if (errorText) errorText.textContent = '加载失败';
            };

            // 获取压缩图片URL（使用ImageCompressor）
            const imageUrl = await this.getCompressedImageUrl(wallpaper.path);
            
            // 直接设置src，利用浏览器原生懒加载
            img.src = imageUrl;
            
            // 2024-07-16 修复：针对blob URL或缓存图片，确保onload事件能正确触发UI更新
            // 检查图片是否已经完成加载（针对立即加载的blob URL或缓存图片）
            if (img.complete) {
                // 2024-07-16 修复：使用 requestAnimationFrame 确保 DOM 更新与渲染同步
                if (placeholder && placeholder.parentNode) {
                    placeholder.replaceWith(img);
                }
            }
            
        } catch (error) {
            // 显示错误状态
            const placeholder = card.querySelector('.animate-pulse');
            if (placeholder) {
                placeholder.innerHTML = '<div class="text-red-400 text-sm">加载失败</div>';
                placeholder.classList.remove('animate-pulse');
            }
        }
    },

    /**
     * 预加载下一页图片
     */
    async preloadNextPage() {
        // 只有在正常模式下才预加载下一页
        if (this.state.currentDisplayMode !== 'normal') return;
        
        // 2025-01-27 修复卡顿：限制预加载，避免过多并发请求
        if (this.state.isPreloading) {
            return;
        }
        this.state.isPreloading = true;
        
        try {
            const nextStartIndex = (this.state.currentPage + 1) * this.state.itemsPerPage;
            const nextPageWallpapers = this.state.filteredWallpapers.slice(nextStartIndex, nextStartIndex + this.state.itemsPerPage);
            
            if (nextPageWallpapers.length === 0) {
                return;
            }
            
            // 使用Promise.allSettled来处理并发预加载，即便某些失败也不中断
            const batchSize = 5; // 控制并发数
            for (let i = 0; i < nextPageWallpapers.length; i += batchSize) {
                const batch = nextPageWallpapers.slice(i, i + batchSize);
                const batchPromises = batch.map(async (wallpaper) => {
                    if (!this.state.preloadedImages.has(wallpaper.id)) {
                        try {
                            const img = new Image();
                            const imageUrl = await this.getCompressedImageUrl(wallpaper.path);
                            img.src = imageUrl;
                            this.state.preloadedImages.add(wallpaper.id);
                            await new Promise((resolve, reject) => {
                                img.onload = resolve;
                                img.onerror = () => {
                                    // 预加载失败不抛出错误，记录日志即可
                                };
                            });
                        } catch (e) {
                            // 预加载失败，不影响主流程
                        }
                    }
                });
                await Promise.all(batchPromises);
                // 批次间添加小延迟，避免阻塞主线程
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
        } finally {
            this.state.isPreloading = false;
        }
    },

    /**
     * 获取压缩后的图片URL
     * 使用ImageCompressor进行图片压缩和优化
     */
    async getCompressedImageUrl(originalPath) {
        try {
            if (!originalPath || typeof originalPath !== 'string') {
                throw new Error('无效的图片路径');
            }
            
            // 规范化路径，确保以static开头 (如果原始路径没有斜杠开头)
            const normalizedPath = originalPath.startsWith('/') ? originalPath : `/${originalPath}`;
            
            // 使用ImageCompressor获取压缩后的图片
            // 2024-07-24 修改: 将类型从'thumbnail'改为'preview'，以便ImageCompressor获取预览图
            const compressedUrl = await ImageCompressor.getCompressedImageUrl(normalizedPath, 'preview');
            
            return compressedUrl;
        } catch (error) {
            return originalPath;
        }
    },

    /**
     * 处理壁纸点击
     */
    handleWallpaperClick(wallpaper) {
        // 触发壁纸详情显示事件
        const event = new CustomEvent('wallpaper-detail-show', {
            detail: wallpaper
        });
        document.dispatchEvent(event);
    },

    /**
     * 加载更多壁纸
     */
    async loadMore() {
        if (this.state.isLoading) return;
        
        // 2024-12-19 修改：支持流放视图的加载更多功能
        // 检查是否有更多数据可以显示
        const hasMore = this.state.filteredWallpapers.length > this.state.displayedWallpapers.size;
        if (!hasMore) {
            this.updateLoadMoreButton();
            return;
        }

        this.state.isLoading = true;
        this.updateLoadMoreButton(); // 更新加载更多按钮状态
        
        try {
            await this.renderWallpapers(true); // 总是追加
            // this.preloadNextPage(); // 预加载已在loadWallpaperData或renderWallpapers中处理
        } catch (error) {
            console.error("加载更多壁纸失败:", error);
        } finally {
            this.state.isLoading = false;
            this.updateLoadMoreButton();
        }
    },

    /**
     * 更新加载更多按钮状态
     */
    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (!loadMoreBtn) return;

        // 2024-12-19 修改：正常模式和流放视图都显示加载更多按钮
        if (this.state.currentDisplayMode === 'normal' || this.state.currentDisplayMode === 'exiled_list') {
            loadMoreBtn.style.display = 'flex';
        } else {
            loadMoreBtn.style.display = 'none';
            return;
        }
        
        // 2024-07-30 修复：判断是否有更多未显示的壁纸
        const hasMoreWallpapersToDisplay = this.state.filteredWallpapers.length > this.state.displayedWallpapers.size;
        
        loadMoreBtn.disabled = this.state.isLoading || !hasMoreWallpapersToDisplay; // 如果正在加载或没有更多壁纸，则禁用按钮
        
        if (this.state.isLoading) {
            loadMoreBtn.innerHTML = '<span>加载中...</span>';
        } else if (!hasMoreWallpapersToDisplay) {
            loadMoreBtn.innerHTML = '<span>没有更多了</span>';
        } else {
            loadMoreBtn.innerHTML = '<span>加载更多</span><img src="static/icons/fa-refresh.svg" alt="刷新" class="w-4 h-4" />';
        }
    },

    /**
     * 显示错误信息
     */
    showError(message) {
        const errorContainer = document.getElementById('error-message-container');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    },

    /**
     * HTML转义
     */
    escapeHtml(text) {
        // 2024-12-19 修复：处理undefined或null的情况
        if (text === undefined || text === null) {
            return '';
        }
        // 确保text是字符串类型
        text = String(text);
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    },

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 检查用户收藏状态并更新首页卡片UI
     * @param {number} wallpaperId - 壁纸ID
     * @param {HTMLElement} favoriteBtn - 收藏按钮元素
     */
    async _checkCardFavoriteStatus(wallpaperId, favoriteBtn) {
        const favoriteIcon = favoriteBtn.querySelector('.card-favorite-icon');
        if (!favoriteIcon) return;

        try {
            const response = await this._fetchJson('api/my_favorites.php', 'GET');
            if (response.code === 0 && response.data) {
                const isFavorited = response.data.some(favWallpaper => favWallpaper.id === wallpaperId);
                if (isFavorited) {
                    favoriteIcon.src = 'static/icons/fa-star.svg';
                    favoriteBtn.classList.add('favorited');
                } else {
                    favoriteIcon.src = 'static/icons/fa-star-o.svg';
                    favoriteBtn.classList.remove('favorited');
                }
            } else if (response.code === 401) {
                // 用户未登录，恢复默认状态
                favoriteIcon.src = 'static/icons/fa-star-o.svg';
                favoriteBtn.classList.remove('favorited');
            }
        } catch (error) {
            // 忽略错误，不显示
        }
    },

    /**
     * 处理首页卡片收藏/取消收藏点击事件
     * @param {HTMLElement} button - 收藏按钮元素
     */
    async _handleCardFavoriteClick(button) {
        const wallpaperId = parseInt(button.dataset.wallpaperId);
        
        if (isNaN(wallpaperId)) {
            return;
        }

        const favoriteIcon = button.querySelector('.card-favorite-icon');
        if (!favoriteIcon) {
            return;
        }

        const originalIconSrc = favoriteIcon.src;
        const isCurrentlyFavorited = originalIconSrc.includes('fa-star.svg');

        // 临时禁用按钮并显示处理中状态
        button.disabled = true;
        favoriteIcon.src = 'static/icons/loading.svg'; // 可以用一个旋转的loading图标

        try {
            const response = await this._fetchJson('api/toggle_favorite.php', 'POST', {
                wallpaper_id: wallpaperId
            });

            if (response.code === 0) {
                if (response.action === 'favorited') {
                    favoriteIcon.src = 'static/icons/fa-star.svg';
                    button.classList.add('favorited');
                } else if (response.action === 'unfavorited') {
                    favoriteIcon.src = 'static/icons/fa-star-o.svg';
                    button.classList.remove('favorited');
                }

                // 2024-07-26 新增：收藏状态改变后，派发自定义事件通知其他模块
                document.dispatchEvent(new CustomEvent('wallpaper-favorite-status-changed', {
                    detail: {
                        wallpaperId: wallpaperId,
                        action: response.action
                    }
                }));

            } else if (response.code === 401) {
                alert('收藏需要登录，请先登录！');
                favoriteIcon.src = originalIconSrc; // 恢复图标
            } else {
                alert(`操作失败: ${response.msg}`);
                favoriteIcon.src = originalIconSrc; // 恢复图标
            }
        } catch (error) {
            alert('网络请求失败，请稍后重试。');
            favoriteIcon.src = originalIconSrc; // 恢复图标
        } finally {
            button.disabled = false;
        }
    },

    /**
     * 检查并更新图片卡片的点赞状态
     * @param {string} wallpaperId - 壁纸的唯一ID
     * @param {HTMLElement} likeBtn - 点赞按钮的DOM元素
     */
    async _checkCardLikeStatus(wallpaperId, likeBtn) {
        /**
         * 检查并更新图片卡片的点赞状态。
         * @param {string} wallpaperId - 壁纸的唯一ID。
         * @param {HTMLElement} likeBtn - 点赞按钮的DOM元素。
         */
        const likeIcon = likeBtn.querySelector('.card-like-icon');
        if (!likeIcon) {
            return;
        }

        try {
            const response = await this._fetchJson('api/my_likes.php', 'GET');

            if (response.code === 0 && response.data) {
                // 确保 wallpaperId 是数字类型，以便与数组中的数字ID进行比较
                const isLiked = response.data.some(likedId => parseInt(likedId) === parseInt(wallpaperId)); // 2024-07-26 修复：确保ID类型一致性
                if (isLiked) {
                    likeIcon.src = 'static/icons/fa-heart.svg'; // 实心
                    likeIcon.classList.add('liked');
                } else {
                    likeIcon.src = 'static/icons/fa-heart-o.svg'; // 空心
                    likeIcon.classList.remove('liked');
                }
            } else {
                // 即使获取失败，也恢复默认状态，避免误判
                likeIcon.src = 'static/icons/fa-heart-o.svg';
                likeIcon.classList.remove('liked');
            }
        } catch (error) {
            // 网络请求错误，恢复默认状态
            likeIcon.src = 'static/icons/fa-heart-o.svg';
            likeIcon.classList.remove('liked');
        }
    },

    /**
     * 根据点赞状态变化事件更新卡片UI
     * @param {number} wallpaperId - 壁纸ID
     * @param {string} action - 'liked' 或 'unliked'
     */
    _updateCardLikeStatus(wallpaperId, action) {
        console.log(`[ImageLoader] _updateCardLikeStatus: 更新壁纸ID ${wallpaperId} 的点赞状态为 ${action}`);
        const card = document.querySelector(`.wallpaper-card-item[data-wallpaper-id="${wallpaperId}"]`);
        if (!card) {
            console.warn(`[ImageLoader] _updateCardLikeStatus: 未找到ID为 ${wallpaperId} 的壁纸卡片。`);
            return;
        }

        const likeBtn = card.querySelector('.card-like-btn');
        const likeIcon = card.querySelector('.card-like-icon');

        if (likeIcon && likeBtn) {
            if (action === 'liked') {
                likeIcon.src = 'static/icons/fa-heart.svg';
                likeIcon.classList.add('liked');
            } else if (action === 'unliked') {
                likeIcon.src = 'static/icons/fa-heart-o.svg';
                likeIcon.classList.remove('liked');
            }
        }
    },

    /**
     * 处理首页卡片点赞/取消点赞点击事件
     * @param {HTMLElement} button - 点赞按钮元素
     */
    async _handleCardLikeClick(button) {
        const wallpaperId = parseInt(button.dataset.wallpaperId);
        
        if (isNaN(wallpaperId)) {
            return;
        }

        const likeIcon = button.querySelector('.card-like-icon');
        if (!likeIcon) {
            return;
        }
        const likesCountSpan = button.querySelector('.card-likes-count'); // 2024-07-26 移除：首页不再显示点赞数量
        
        const originalIconSrc = likeIcon.src;

        // 临时禁用按钮
        button.disabled = true;
        likeIcon.src = 'static/icons/loading.svg'; // 可以用一个旋转的loading图标

        try {
            const response = await this._fetchJson('api/toggle_like.php', 'POST', {
                wallpaper_id: wallpaperId
            });

            if (response.code === 0) {
                // 2024-07-26 修复：增加likesCountSpan的非空检查
                if (likesCountSpan) {
                    let currentLikes = parseInt(likesCountSpan.textContent || '0');
                    if (response.action === 'liked') {
                        likeIcon.src = 'static/icons/fa-heart.svg';
                        likeIcon.classList.add('liked');
                        if (likesCountSpan) likesCountSpan.textContent = currentLikes + 1;
                    } else if (response.action === 'unliked') {
                        likeIcon.src = 'static/icons/fa-heart-o.svg';
                        likeIcon.classList.remove('liked');
                        if (likesCountSpan) likesCountSpan.textContent = Math.max(0, currentLikes - 1);
                    }
                } else {
                    // 2024-07-26 调试：如果likesCountSpan不存在，仅更新图标状态
                    console.warn('[ImageLoader] _handleCardLikeClick: likesCountSpan 元素未找到，点赞数量无法更新。');
                    if (response.action === 'liked') {
                        likeIcon.src = 'static/icons/fa-heart.svg';
                        likeIcon.classList.add('liked');
                    } else if (response.action === 'unliked') {
                        likeIcon.src = 'static/icons/fa-heart-o.svg';
                        likeIcon.classList.remove('liked');
                    }
                }

                // 2024-07-26 新增：点赞状态改变后，派发自定义事件通知其他模块
                document.dispatchEvent(new CustomEvent('wallpaper-like-status-changed', {
                    detail: {
                        wallpaperId: wallpaperId,
                        action: response.action
                    }
                }));
            } else {
                console.error('[ImageLoader] _handleCardLikeClick: 点赞/取消点赞失败:', response.msg);
                alert(`操作失败: ${response.msg}`);
                likeIcon.src = originalIconSrc; // 2024-07-26 修复：操作失败时恢复图标
            }
        } catch (error) {
            console.error('[ImageLoader] _handleCardLikeClick: 网络请求或JS错误:', error);
            alert(`网络请求失败，请稍后重试。详细错误: ${error.message || error}`); // 2024-07-26 改进：显示具体错误信息
            likeIcon.src = originalIconSrc; // 恢复图标
        } finally {
            button.disabled = false;
        }
    },

    /**
     * 获取JSON数据
     * @param {string} url - 请求URL
     * @param {string} method - 请求方法
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} - 返回解析后的JSON对象
     */
    async _fetchJson(url, method, data = null) {
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * 随机打乱数组（Fisher-Yates (Knuth) shuffle算法）
     * @param {Array} array - 要打乱的数组
     * @returns {Array} - 打乱后的新数组
     */
    _shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    },

    /**
     * 2024-07-30 新增：从filteredWallpapers中随机获取一页壁纸，并确保不重复
     * @returns {Array} - 当前页的随机壁纸列表
     */
    _getPaginatedRandomWallpapers() {
        // 2024-12-19 修改：流放列表模式也需要去重处理，避免自动加载更多时重复显示
        if (this.state.currentDisplayMode === 'exiled_list') {
            // 从已过滤的壁纸中筛选出未显示的壁纸
            const wallpapersToPickFrom = this.state.filteredWallpapers.filter(
                w => !this.state.displayedWallpapers.has(w.id)
            );
            
            // 按顺序取出一页的数量（已经按流放时间排序）
            const numToTake = Math.min(this.state.itemsPerPage, wallpapersToPickFrom.length);
            return wallpapersToPickFrom.slice(0, numToTake);
        }

        // 正常模式下，真正的随机按需加载：从filteredWallpapers中随机挑选未显示的壁纸
        const wallpapersToPickFrom = this.state.filteredWallpapers.filter(
            w => !this.state.displayedWallpapers.has(w.id)
        );

        // 如果剩余的壁纸数量不足一页，则全部取出
        const numToTake = Math.min(this.state.itemsPerPage, wallpapersToPickFrom.length);

        if (numToTake === 0) {
            return [];
        }

        // 2024-12-19 优化：真正的随机按需加载，每次都重新随机选择
        const selectedWallpapers = [];
        const availableWallpapers = [...wallpapersToPickFrom]; // 创建副本避免修改原数组
        
        for (let i = 0; i < numToTake; i++) {
            const randomIndex = Math.floor(Math.random() * availableWallpapers.length);
            selectedWallpapers.push(availableWallpapers[randomIndex]);
            // 从备选列表中移除已选取的壁纸，避免重复选择
            availableWallpapers.splice(randomIndex, 1);
        }
        return selectedWallpapers;
    },

    /**
     * 处理详情页收藏状态变化事件
     * @param {number} wallpaperId - 壁纸ID
     * @param {string} action - 操作类型 ('favorited' 或 'unfavorited')
     */
    _updateCardFavoriteStatus(wallpaperId, action) {
        // 查找对应的壁纸卡片
        const card = document.querySelector(`.wallpaper-card-item[data-wallpaper-id="${wallpaperId}"]`);
        if (!card) {
            console.warn(`[ImageLoader] _updateCardFavoriteStatus: 未找到壁纸ID为 ${wallpaperId} 的卡片。`);
            return;
        }

        const favoriteIcon = card.querySelector('.card-favorite-icon');
        const favoriteBtn = card.querySelector('.card-favorite-btn');

        if (!favoriteIcon || !favoriteBtn) {
            console.warn(`[ImageLoader] _updateCardFavoriteStatus: 壁纸ID ${wallpaperId} 的卡片缺少收藏相关元素。`);
            return;
        }

        if (action === 'favorited') {
            favoriteIcon.src = 'static/icons/fa-star.svg'; // 变为实心
            favoriteIcon.classList.add('favorited');
            favoriteBtn.classList.add('favorited');
        } else if (action === 'unfavorited') {
            favoriteIcon.src = 'static/icons/fa-star-o.svg'; // 变为空心
            favoriteIcon.classList.remove('favorited');
            favoriteBtn.classList.remove('favorited');
        }
    },

    /**
     * 2024-07-16 新增：加载用户收藏数据
     */
    async _loadUserFavorites() {
        try {
            // 2024-07-16 调试：确保请求的URL和方法正确
            const response = await this._fetchJson('api/my_favorites.php', 'GET');
            
            // 2024-07-16 调试：检查响应结构，确保data是数组且包含id
            if (response.code === 0 && Array.isArray(response.data)) {
                // 将收藏的wallpaper_id转换为Set，方便快速查找
                this.state.userFavorites = new Set(response.data.map(item => item.id));
                console.log('[ImageLoader] 用户收藏加载成功:', this.state.userFavorites);
            } else {
                console.error('[ImageLoader] 加载用户收藏失败或数据格式不正确:', response.msg || response);
                this.state.userFavorites = new Set(); // 失败时清空，避免影响后续判断
            }
        } catch (error) {
            console.error('[ImageLoader] 加载用户收藏请求错误:', error);
            this.state.userFavorites = new Set(); // 错误时清空
        }
    },

    /**
     * 2024-12-19 新增：加载用户点赞数据
     */
    async _loadUserLikes() {
        try {
            const response = await this._fetchJson('api/my_likes.php', 'GET');
            
            if (response.code === 0 && Array.isArray(response.data)) {
                // 将点赞的wallpaper_id转换为Set，方便快速查找
                this.state.userLikes = new Set(response.data);
                console.log('[ImageLoader] 用户点赞加载成功:', this.state.userLikes);
            } else {
                console.error('[ImageLoader] 加载用户点赞失败或数据格式不正确:', response.msg || response);
                this.state.userLikes = new Set(); // 失败时清空，避免影响后续判断
            }
        } catch (error) {
            console.error('[ImageLoader] 加载用户点赞请求错误:', error);
            this.state.userLikes = new Set(); // 错误时清空
        }
    },

    /**
     * 2024-07-28 新增：加载初始数据和用户权限
     */
    async _loadInitialDataAndPermissions() {
        try {
            // 1. 获取用户权限信息
            const userResponse = await this._fetchJson('api/userinfo.php?action=getUserInfo', 'GET');
            console.log('[ImageLoader] userResponse:', userResponse);
            if (userResponse.code === 0 && userResponse.data) {
                this.state.isUserAdmin = userResponse.data.is_admin;
                console.log('[ImageLoader] 用户管理员状态 (isUserAdmin):', this.state.isUserAdmin);
            } else if (userResponse.code === 1) {
                 // 未登录，isUserAdmin 默认为 false，无需处理
                console.log('[ImageLoader] 用户未登录或会话过期，无法获取管理员权限。');
            } else {
                console.warn('[ImageLoader] 获取用户权限失败:', userResponse.msg || userResponse.message || '未知错误');
            }

            // 2. 获取被流放的壁纸ID列表
            // 2024-12-19 修复：所有用户都需要获取流放壁纸ID列表，以正确显示图标状态
            const exiledResponse = await this._fetchJson('api/get_exiled_wallpaper_ids.php', 'GET');
            console.log('[ImageLoader] exiledResponse:', exiledResponse);
            if (exiledResponse.code === 200 && Array.isArray(exiledResponse.data)) {
                // 2024-12-19 修改：处理新的数据结构，包含ID和流放时间
                this.state.exiledWallpaperIds = new Set(exiledResponse.data.map(item => item.id));
                this.state.exiledWallpapersData = exiledResponse.data; // 保存完整数据用于排序
                console.log('[ImageLoader] 已加载流放壁纸ID:', this.state.exiledWallpaperIds);
                console.log('[ImageLoader] 流放壁纸数据:', this.state.exiledWallpapersData);
            } else {
                console.warn('[ImageLoader] 获取流放壁纸ID列表失败:', exiledResponse.message);
                this.state.exiledWallpaperIds = new Set(); // 失败时清空，避免残留旧数据
                this.state.exiledWallpapersData = []; // 清空流放数据
            }

        } catch (error) {
            console.error('[ImageLoader] 加载初始数据和权限失败:', error);
            this.state.isUserAdmin = false;
            this.state.exiledWallpaperIds = new Set();
        }
    },

    /**
     * 2024-07-28 新增：处理流放/召回按钮点击
     * @param {HTMLElement} button - 被点击的按钮元素
     */
    async _handleExileRecallClick(button) {
        const wallpaperId = parseInt(button.dataset.wallpaperId);
        const action = button.dataset.action; // 'exile' or 'recall'

        if (isNaN(wallpaperId)) {
            console.error("无效的壁纸ID");
            return;
        }

        // 检查用户权限并提供明确的提示
        if (!this.state.isUserAdmin) {
            // 检查用户是否已登录
            try {
                const userResponse = await this._fetchJson('api/userinfo.php?action=getUserInfo', 'GET');
                if (userResponse.code === 1) {
                    // 未登录用户
                    Utils.showToastMessage('请先登录后再进行操作', 'warning');
                } else if (userResponse.code === 0 && userResponse.data && !userResponse.data.is_admin) {
                    // 已登录但非管理员的普通用户
                    Utils.showToastMessage('权限不足，仅管理员可进行此操作', 'error');
                } else {
                    // 其他情况
                    Utils.showToastMessage('权限验证失败，请重新登录', 'error');
                }
            } catch (error) {
                console.error('权限检查失败:', error);
                Utils.showToastMessage('网络错误，请稍后重试', 'error');
            }
            return;
        }

        let confirmMessage = '';
        if (action === 'exile') {
            confirmMessage = '是否确定流放此图？流放后将不在首页显示。';
        } else if (action === 'recall') {
            confirmMessage = '是否确定召回此图？召回后将有机会在首页重新显示。';
        }

        // 对于流放操作，需要确认
        if (action === 'exile' && !await modals.confirm(confirmMessage)) {
            return; // 用户取消操作
        }

        button.disabled = true;
        const originalButtonHtml = button.innerHTML;
        button.innerHTML = `<i class="fa fa-spinner fa-spin"></i>`; // 显示加载动画

        let response = null; // 在try块外部声明response并初始化为null
        try {
            const requestBody = { action: `${action}_wallpaper`, wallpaper_id: wallpaperId };
            response = await this._fetchJson(
                'api/wallpaper.php',
                'POST',
                requestBody
            );

            if (response.code === 200) {
                Utils.showToastMessage(response.message, 'success');
                // 2024-12-19 修改：操作成功后重新获取最新的流放数据
                await this._refreshExiledData();
                
                // 更新前端状态并移除卡片 (或更新按钮状态)
                if (action === 'exile') {
                    // 移除当前视图中的卡片 (仅在正常模式下)
                    const cardElement = document.querySelector(`.wallpaper-card-item[data-wallpaper-id="${wallpaperId}"]`);
                    if (cardElement && this.state.currentDisplayMode !== 'exiled_list') {
                         cardElement.remove();
                         this.state.displayedWallpapers.delete(wallpaperId);
                    }
                    // 重新过滤壁纸，确保被流放的壁纸不会在后续加载中重新出现
                    this.filterWallpapers();
                    // 更新按钮为"召回"状态，如果仍然存在于DOM中
                    button.dataset.action = 'recall';
                    button.innerHTML = `<img src="static/icons/zh.png" alt="召回" class="w-5 h-5">`;

                } else if (action === 'recall') {
                    // 从流放列表视图中移除卡片
                    const cardElement = document.querySelector(`.wallpaper-card-item[data-wallpaper-id="${wallpaperId}"]`);
                    if (cardElement && this.state.currentDisplayMode === 'exiled_list') {
                        cardElement.remove();
                        this.state.displayedWallpapers.delete(wallpaperId);
                    }
                    // 重新过滤壁纸，确保被召回的壁纸可以在后续加载中重新出现
                    this.filterWallpapers();
                    // 更新按钮为"流放"状态，如果仍然存在于DOM中
                    button.dataset.action = 'exile';
                    button.innerHTML = `<img src="static/icons/lf.png" alt="流放" class="w-5 h-5">`;
                }

            } else {
                Utils.showToastMessage(response.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error("操作壁纸失败: ", error);
            Utils.showToastMessage('网络或服务器错误，操作失败', 'error');
        } finally {
            button.disabled = false;
            // 如果操作失败，恢复按钮图标
            if (!response || response.code !== 200) {
                 button.innerHTML = originalButtonHtml;
            }
        }
    },

    /**
     * 2024-12-19 新增：刷新流放数据
     */
    async _refreshExiledData() {
        try {
            const exiledResponse = await this._fetchJson('api/get_exiled_wallpaper_ids.php', 'GET');
            if (exiledResponse.code === 200 && Array.isArray(exiledResponse.data)) {
                // 更新流放壁纸数据
                this.state.exiledWallpaperIds = new Set(exiledResponse.data.map(item => item.id));
                this.state.exiledWallpapersData = exiledResponse.data;
                console.log('[ImageLoader] 已刷新流放壁纸数据:', this.state.exiledWallpaperIds);
            } else {
                console.warn('[ImageLoader] 刷新流放壁纸数据失败:', exiledResponse.message);
            }
        } catch (error) {
            console.error('[ImageLoader] 刷新流放数据失败:', error);
        }
    },

    /**
     * 2024-07-28 新增：处理流放图片视图
     */
    async _handleExiledListView() {
        if (this.state.currentDisplayMode === 'exiled_list') return; // 如果已经在流放列表视图，则不重复加载

        this.state.currentDisplayMode = 'exiled_list';
        this.state.currentPage = 0;
        this.state.displayedWallpapers.clear();

        // 2024-12-19 修复：更新容器CSS类为流放视图专用样式
        const container = document.getElementById('wallpaper-container');
        if (container) {
            container.className = 'exiled-view-grid min-h-[400px]';
        }

        // 禁用网格和列表视图按钮，高亮流放视图按钮
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        const exiledBtn = document.getElementById('exiled-list-view-btn');

        if (gridBtn) gridBtn.className = 'p-2 rounded bg-white hover:bg-neutral-dark transition-colors';
        if (listBtn) listBtn.className = 'p-2 rounded bg-white hover:bg-neutral-dark transition-colors';
        if (exiledBtn) exiledBtn.className = 'p-2 rounded bg-red-100 border-2 border-red-300 text-red-600 shadow-lg hover:bg-red-200 transition-all';

        // 过滤出已流放的壁纸
        this.filterWallpapers();
        
        // 直接渲染已过滤的流放壁纸
        await this.renderWallpapers(false); // 不追加，清空并重新渲染
        this.updateLoadMoreButton(); // 更新加载更多按钮状态
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageLoader;
}

// 全局暴露
window.ImageLoader = ImageLoader;