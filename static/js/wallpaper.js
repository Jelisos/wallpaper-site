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
     * 初始化壁纸管理
     */
    async init() {
        await this.scanWallpapersDirectory();
        this.initEventListeners();
        this.handleSearch('');
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
                const name = card.querySelector('h3').textContent;
                const size = card.querySelector('.size-info').textContent;
                const category = card.querySelectorAll('.bg-neutral')[0].textContent;
                const tags = Array.from(card.querySelectorAll('.bg-neutral')).slice(1).map(e => e.textContent);
                const originalPath = decodeURIComponent(img.dataset.originalPath);
                
                // 更新详情模态框内容
                document.getElementById('detail-image').src = img.src;
                document.getElementById('detail-title').textContent = name;
                document.getElementById('detail-category').textContent = category;
                
                // 更新标签
                const tagContainer = document.getElementById('detail-tags');
                tagContainer.innerHTML = '';
                tags.forEach(t => {
                    const span = document.createElement('span');
                    span.className = 'px-3 py-1 bg-neutral rounded-full text-sm';
                    span.textContent = t;
                    tagContainer.appendChild(span);
                });
                
                document.getElementById('detail-size').textContent = size + ' 像素';
                
                // 预览和下载按钮
                document.getElementById('preview-wallpaper').onclick = function() {
                    if (originalPath) {
                        window.open(`yulan.html?image=${encodeURIComponent(originalPath)}#previewControls`, '_blank');
                    } else {
                        alert('无法获取原图路径，无法进行多平台预览。');
                        console.error('无法获取原始路径，请检查data-original-path属性。');
                    }
                };
                
                document.getElementById('download-original').onclick = function() {
                    if (originalPath) {
                        const link = document.createElement('a');
                        link.href = originalPath;
                        link.download = originalPath.split('/').pop();
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } else {
                        alert('无法获取原图路径，无法下载！');
                        console.error('无法获取原始路径，请检查data-original-path属性。');
                    }
                };
                
                // 打开模态框
                const detailModal = document.getElementById('wallpaper-detail-modal');
                const detailModalContent = document.getElementById('wallpaper-detail-modal-content');
                ModalManager.effects.open(detailModal, detailModalContent);
            }
        });
    },

    /**
     * 扫描壁纸目录
     */
    async scanWallpapersDirectory() {
        try {
            const response = await fetch('static/wallpapers/');
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            this.state.allWallpapers = Array.from(doc.querySelectorAll('a'))
                .map(a => a.href)
                .filter(href => href.match(/\.(jpg|jpeg|png|webp)$/i))
                .map(href => {
                    const filename = href.split('/').pop();
                    return {
                        filename: decodeURIComponent(filename),
                        path: 'static/wallpapers/' + filename
                    };
                });
        } catch (error) {
            console.error('扫描壁纸目录失败:', error);
            this.state.allWallpapers = [];
        }
    },

    /**
     * 获取下一页壁纸
     */
    getNextPageWallpapers() {
        const start = this.state.currentPage * CONFIG.PAGINATION.ITEMS_PER_PAGE;
        const end = start + CONFIG.PAGINATION.ITEMS_PER_PAGE;
        const availableWallpapers = this.state.filteredWallpapers.filter(w => !this.state.displayedWallpapers.has(w.filename));
        
        if (availableWallpapers.length === 0) {
            return null;
        }

        const pageWallpapers = Utils.shuffleArray(availableWallpapers).slice(0, CONFIG.PAGINATION.ITEMS_PER_PAGE);
        pageWallpapers.forEach(w => this.state.displayedWallpapers.add(w.filename));
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
            await this.scanWallpapersDirectory();
            if (this.state.allWallpapers.length === 0) {
                wallpaperContainer.innerHTML = '<div class="text-center text-gray-400 py-12">未找到任何壁纸文件，请确保static/wallpapers目录存在且包含图片文件。</div>';
                document.getElementById('load-more-btn').style.display = 'none';
                return;
            }
        }

        const lowerKeyword = keyword.toLowerCase();
        this.state.filteredWallpapers = this.state.allWallpapers.filter(wallpaper => {
            if (!lowerKeyword) return true;
            
            const { category, tags } = Utils.parseWallpaperFilename(wallpaper.filename);
            const name = wallpaper.filename.toLowerCase();
            
            const searchTerms = lowerKeyword.split(/\s+/).filter(Boolean);
            return searchTerms.some(term => 
                name.includes(term) || 
                category.toLowerCase().includes(term) || 
                tags.some(tag => tag.toLowerCase().includes(term))
            );
        });

        this.state.filteredWallpapers.sort((a, b) => a.filename.localeCompare(b.filename));
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
     * 渲染壁纸卡片。
     */
    async renderWallpaperCards(wallpapers) {
        const wallpaperContainer = document.getElementById('wallpaper-container');
        
        for (const wallpaper of wallpapers) {
            try {
                const response = await fetch(wallpaper.path);
                const blob = await response.blob();
                const compressedBlob = await Utils.compressImage(blob);
                const compressedUrl = URL.createObjectURL(compressedBlob);
                
                const { category, tags } = Utils.parseWallpaperFilename(wallpaper.filename);
                const name = wallpaper.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');
                
                const card = document.createElement('div');
                card.className = 'masonry-item';
                card.innerHTML = `
                    <div class="bg-white rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1">
                        <div class="relative">
                            <img src="${compressedUrl}" alt="${name}" class="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity wallpaper-thumb" data-original-path="${encodeURIComponent(wallpaper.path)}">
                        </div>
                        <div class="p-4">
                            <div class="flex justify-between items-center">
                                <h3 class="font-medium">${name}</h3>
                                <span class="text-sm text-gray-500 size-info">加载中...</span>
                            </div>
                            <div class="flex flex-wrap gap-2 mt-2">
                                <span class="px-3 py-1 bg-neutral rounded-full text-sm">${category}</span>
                                ${tags.map(t => `<span class='px-3 py-1 bg-neutral rounded-full text-sm'>${t}</span>`).join('')}
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