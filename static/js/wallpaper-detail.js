/**
 * 文件: static/js/wallpaper-detail.js
 * 描述: 壁纸详情显示模块
 * 依赖: image-compressor.js
 * 维护: 负责壁纸详情模态框的显示和交互
 */

/**
 * 壁纸详情模块
 * 负责壁纸详情的显示、下载和分享功能
 */
const WallpaperDetail = {
    // 当前显示的壁纸
    currentWallpaper: null,
    
    // 模态框元素
    modal: null,
    modalContent: null,
    
    /**
     * 初始化壁纸详情模块
     */
    init() {
        // 获取模态框元素
        this.modal = document.getElementById('wallpaper-detail-modal');
        this.modalContent = document.getElementById('wallpaper-detail-modal-content');
        
        if (!this.modal || !this.modalContent) {
            console.error('[WallpaperDetail] 找不到壁纸详情模态框元素');
            return;
        }
        
        // 绑定事件
        this.bindEvents();
    },
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听壁纸详情显示事件
        document.addEventListener('wallpaper-detail-show', (event) => {
            this.showDetail(event.detail);
        });
        
        // 关闭按钮
        const closeBtn = document.getElementById('close-detail-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideDetail());
        }
        
        // 点击模态框背景关闭
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hideDetail();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.hideDetail();
            }
        });
        
        // 2024-07-28 修复: 下载按钮改为下载原始图片
        // 默认下载按钮绑定事件
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                if (!this.currentWallpaper || !this.currentWallpaper.path) {
                    console.warn('[WallpaperDetail] 没有当前壁纸信息或路径，无法下载。');
                    return;
                }

                const originalButtonText = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '<span>下载中...</span>';
                downloadBtn.disabled = true;

                try {
                    // 直接使用原始图片路径进行下载
                    const imageUrlToDownload = await this._getDisplayImagePath(this.currentWallpaper.path); 
                    
                    const link = document.createElement('a');
                    link.href = imageUrlToDownload;
                    // 确保文件名包含原始扩展名
                    // 后端返回的 name 字段是文件名，path 是路径
                    const filename = this.currentWallpaper.name || 'wallpaper';
                    const originalExtMatch = imageUrlToDownload.match(/\.([0-9a-z]+)(?:[?#]|$)/i); // 匹配文件扩展名
                    const originalExt = originalExtMatch ? originalExtMatch[1] : 'jpg'; // 默认jpg
                    
                    link.download = `${filename}.${originalExt}`;
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    if (imageUrlToDownload.startsWith('blob:')) {
                        URL.revokeObjectURL(imageUrlToDownload);
                    }
                    downloadBtn.innerHTML = '<span>下载完成!</span>';
                    downloadBtn.classList.remove('bg-primary');
                    downloadBtn.classList.add('bg-green-500');
                    setTimeout(() => {
                        downloadBtn.innerHTML = originalButtonText;
                        downloadBtn.classList.remove('bg-green-500');
                        downloadBtn.classList.add('bg-primary');
                        downloadBtn.disabled = false;
                    }, 1500);

                } catch (error) {
                    console.error('[WallpaperDetail] 下载原始图片失败:', error);
                    alert('下载失败，请稍后重试');
                    downloadBtn.innerHTML = '<span>下载失败!</span>';
                    downloadBtn.classList.remove('bg-primary');
                    downloadBtn.classList.add('bg-red-500');
                    setTimeout(() => {
                        downloadBtn.innerHTML = originalButtonText;
                        downloadBtn.classList.remove('bg-red-500');
                        downloadBtn.classList.add('bg-primary');
                        downloadBtn.disabled = false;
                    }, 1500);
                }
            });
        } else {
            console.warn('[WallpaperDetail] 无法找到下载按钮元素 (ID: download-btn) 在 bindEvents 中。');
        }
        
        // 2024-07-25 修复：预览按钮链接到yulan.html并传递原图路径
        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                if (this.currentWallpaper && this.currentWallpaper.path) {
                    const originalImagePath = this.currentWallpaper.path; // 获取原始图片路径
                    // 构建跳转URL，传递原始图片路径作为参数
                    const yulanUrl = `yulan.html?image=${encodeURIComponent(originalImagePath)}`;
                    window.open(yulanUrl, '_blank'); // 在新标签页打开
                } else {
                    console.warn('[WallpaperDetail] 没有当前壁纸信息或路径，无法预览。');
                }
            });
        } else {
            console.warn('[WallpaperDetail] 无法找到预览按钮元素 (ID: preview-btn) 在 bindEvents 中。');
        }
        
        // 点赞按钮
        const likeBtn = document.getElementById('like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this._handleLikeClick());
        }
        
        // 收藏按钮
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => this._handleFavoriteClick());
        }
        
        // 设置壁纸按钮
        const setWallpaperBtn = document.getElementById('set-wallpaper-btn');
        if (setWallpaperBtn) {
            setWallpaperBtn.addEventListener('click', () => this.setAsWallpaper());
        }

        // 2024-07-26 新增：监听壁纸卡片点赞状态变化事件，以同步详情页状态
        document.addEventListener('wallpaper-like-status-changed', (event) => {
            const { wallpaperId, action } = event.detail;
            if (this.currentWallpaper && this.currentWallpaper.id === wallpaperId) {
                const likeIcon = document.getElementById('like-icon');
                const likesCountSpan = document.getElementById('detail-likes');

                if (action === 'liked') {
                    likeIcon.src = 'static/icons/fa-heart.svg';
                    likeIcon.classList.add('liked');
                } else if (action === 'unliked') {
                    likeIcon.src = 'static/icons/fa-heart-o.svg';
                    likeIcon.classList.remove('liked');
                }
            }
        });

        // 2024-07-27 新增：监听壁纸卡片收藏状态变化事件，以同步详情页状态
        document.addEventListener('wallpaper-favorite-status-changed', (event) => {
            const { wallpaperId, action } = event.detail;
            if (this.currentWallpaper && this.currentWallpaper.id === wallpaperId) {
                const favoriteIcon = document.getElementById('favorite-icon'); // 获取详情页的收藏图标
                if (favoriteIcon) {
                    if (action === 'favorited') {
                        favoriteIcon.src = 'static/icons/fa-star.svg'; // 收藏后的图标
                        favoriteIcon.classList.add('favorited');
                    } else if (action === 'unfavorited') {
                        favoriteIcon.src = 'static/icons/fa-star-o.svg'; // 取消收藏后的图标
                        favoriteIcon.classList.remove('favorited');
                    }
                }
            }
        });

        // 2024-07-28 新增: 复制提示词按钮事件
        const copyPromptBtn = document.getElementById('copy-prompt-btn');
        if (copyPromptBtn) {
            copyPromptBtn.addEventListener('click', () => this.copyPromptContent());
        }
    },
    
    /**
     * 显示壁纸详情
     * @param {Object} wallpaper - 壁纸对象，至少包含 id 字段
     */
    async showDetail(wallpaper) {
        if (!wallpaper || !wallpaper.id) {
            console.error('[WallpaperDetail] 壁纸数据或ID为空');
            return;
        }

        // 2024-07-29 修复: 确保每次打开详情页时图片状态被重置并显示加载指示器
        const detailImage = document.getElementById('detail-image');
        if (detailImage) {
            detailImage.src = ''; // 清空图片src
            detailImage.style.opacity = '0'; // 隐藏图片
            detailImage.style.transition = 'opacity 300ms'; // 重新设置过渡效果
        }
        this.showLoadingState(); // 立即显示加载指示器

        const wallpaperId = wallpaper.id;
        console.log('[WallpaperDetail] showDetail: 正在请求壁纸ID:', wallpaperId);
        // 2024-07-30 调试: 记录传入的wallpaperId类型
        console.log('[WallpaperDetail] showDetail: wallpaperId 的类型:', typeof wallpaperId, '值为:', wallpaperId);

        try {
            // 2024-07-24 修复：立即显示模态框，避免内容加载时阻塞
            this.modal.classList.remove('hidden');
            this.modal.classList.add('show');
            
            // 2024-07-25 修复：防止页面抖动，动态设置body的padding-right CSS变量并添加类
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            if (scrollbarWidth > 0) {
                document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
            }
            document.body.classList.add('modal-open');

            // 3. 在下一帧添加内容动画类，确保浏览器有时间应用初始状态
            requestAnimationFrame(() => {
                void this.modalContent.offsetWidth;
                this.modalContent.classList.add('show');
            });

            // 2024-07-28 新增：显示加载状态并清空旧内容
            // this.clearModalContent(); // 此处清空内容，但不在这里隐藏加载状态，留给updateModalContent处理

            // 从后端接口获取壁纸详情数据
            const response = await this._fetchJson(`api/wallpaper_detail.php?id=${wallpaperId}`, 'GET');

            if (response.code === 0 && response.data) {
                this.currentWallpaper = response.data; // 设置当前壁纸信息为后端返回的完整数据
                
                // 2024-07-30 修复: 记录壁纸查看次数，并在成功时更新当前壁纸对象的views字段
                const recordViewResponse = await this._recordWallpaperView(wallpaperId); 
                if (recordViewResponse && recordViewResponse.code === 0 && recordViewResponse.msg === '查看记录成功') {
                    this.currentWallpaper.views = parseInt(this.currentWallpaper.views || '0') + 1;
                }

                // 更新模态框内容 (此时this.currentWallpaper.views已经是最新值)
                await this.updateModalContent(this.currentWallpaper); 
                
                // 更新点赞和收藏UI
                await this._updateLikeAndFavoriteUI(wallpaperId);
            } else {
                console.error('[WallpaperDetail] 获取壁纸详情失败:', response.msg || '未知错误');
                this.hideDetail(); // 获取失败则关闭弹窗
                alert('获取壁纸详情失败，请稍后重试。原因: ' + (response.msg || '未知错误'));
            }

        } catch (error) {
            console.error('[WallpaperDetail] 显示详情或请求数据失败:', error);
            this.hideDetail(); // 异常则关闭弹窗
            alert('加载壁纸详情时发生错误，请稍后重试。' + error.message || error);
        } finally {
            this.hideLoadingState(); // 隐藏加载状态
        }
    },
    
    /**
     * 隐藏壁纸详情
     */
    hideDetail() {
        // 2024-07-24 修复：使用CSS类控制模态框隐藏和动画
        // 1. 移除内容和模态框的show类，触发隐藏动画
        this.modalContent.classList.remove('show');
        this.modal.classList.remove('show');
        
        // 2. 动画结束后完全隐藏模态框
        setTimeout(() => {
            this.modal.classList.add('hidden');
            // 2024-07-25 修复：移除body的modal-open类并清除CSS变量
            document.body.classList.remove('modal-open');
            document.documentElement.style.removeProperty('--scrollbar-width');
            document.body.style.overflow = ''; // 恢复默认overflow，防止其他样式干扰
            this.currentWallpaper = null;
        }, 300); // 与CSS过渡时间（300ms）保持一致
    },
    
    /**
     * 更新模态框内容
     * @param {Object} wallpaper - 壁纸对象
     */
    async updateModalContent(wallpaper) {
        if (!wallpaper) {
            console.warn('[WallpaperDetail] updateModalContent: 壁纸数据为空。');
            return;
        }

        // 2024-07-29 修复: 使用Image对象预加载，确保加载完成后隐藏加载指示器
        const detailImage = document.getElementById('detail-image');
        const imageUrl = await this._getDisplayImagePath(wallpaper.path);

        if (detailImage) {
            const tempImage = new Image();
            tempImage.src = imageUrl;

            tempImage.onload = () => {
                detailImage.src = imageUrl;
                detailImage.style.opacity = '1';
                this.hideLoadingState(); // 图片加载成功后隐藏加载指示器
                console.log('[WallpaperDetail] 图片加载成功:', imageUrl);
            };

            tempImage.onerror = () => {
                console.error('[WallpaperDetail] 图片加载失败:', imageUrl);
                detailImage.src = 'static/images/image-load-error.png'; // 显示错误图片
                detailImage.style.opacity = '1';
                this.hideLoadingState(); // 图片加载失败后也隐藏加载指示器
                alert('壁纸图片加载失败，请检查网络或图片源。');
            };

            // 如果图片已被浏览器缓存，onload可能不会触发，手动检查并触发
            if (tempImage.complete && tempImage.naturalWidth !== 0) {
                tempImage.onload(); // 立即调用 onload 逻辑
            }
        }

        document.getElementById('detail-title').textContent = wallpaper.name || '未知标题';
        document.getElementById('detail-file-size').textContent = this.formatFileSize(wallpaper.file_size);
        document.getElementById('detail-dimensions').textContent = `${wallpaper.width}x${wallpaper.height}`;
        // 2024-07-30 修复: 确保格式和上传时间正确显示
        document.getElementById('detail-format').textContent = wallpaper.format ? wallpaper.format.toUpperCase() : '未知';
        document.getElementById('detail-upload-time').textContent = wallpaper.upload_time ? this.formatDate(wallpaper.upload_time) : '未知';

        const categoryElement = document.getElementById('detail-category');
        if (categoryElement) {
            categoryElement.textContent = wallpaper.category_name || '未分类';
            // 2024-07-25 修复：动态设置分类颜色
            categoryElement.className = `ml-2 px-2 py-1 rounded-full text-sm ${this.getCategoryColorClass(wallpaper.category_name)}`;
        }

        const detailTitle = document.getElementById('detail-title');
        const detailDimensions = document.getElementById('detail-dimensions');
        const detailCategory = document.getElementById('detail-category');
        const detailTags = document.getElementById('detail-tags');
        const detailFileSize = document.getElementById('detail-file-size');
        const detailFormat = document.getElementById('detail-format');
        const detailUploadTime = document.getElementById('detail-upload-time');
        const detailLikes = document.getElementById('detail-likes');
        const detailViews = document.getElementById('detail-views');
        const promptContent = document.getElementById('prompt-content');
        
        // 2024-07-28 修复：将所有文本内容和标签更新推迟到下一帧，避免渲染阻塞
        requestAnimationFrame(() => {
            // 更新标题
            if (detailTitle) {
                detailTitle.textContent = wallpaper.name || '未知壁纸';
            }
            
            // 更新格式
            if (detailFormat) {
                detailFormat.textContent = wallpaper.format || '-';
            }

            // 更新上传时间
            if (detailUploadTime) {
                detailUploadTime.textContent = this.formatDate(wallpaper.upload_time) || '-';
            }

            // 更新分类
            if (detailCategory) {
                detailCategory.textContent = wallpaper.category || '未分类';
            }
            
            // 更新标签
            if (detailTags) {
                // 确保 tags 是一个数组，即使后端返回空字符串或null
                const tagsArray = Array.isArray(wallpaper.tags) ? wallpaper.tags : (wallpaper.tags ? wallpaper.tags.split(',') : []);
                detailTags.innerHTML = tagsArray.filter(tag => tag.trim() !== '').map(tag => 
                    `<span class="tag-item px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs mr-2">${this.escapeHtml(tag)}</span>`
                ).join('');
                if (tagsArray.length === 0) { // 如果没有标签，显示默认文本
                    detailTags.textContent = '暂无标签';
                }
            }

            // 更新文件大小
            if (detailFileSize) {
                detailFileSize.textContent = wallpaper.size || '-'; // 2024-07-28 修复: 直接使用后端提供的格式化字符串
            }

            // 更新查看和喜欢统计
            if (detailViews) {
                detailViews.textContent = wallpaper.views !== undefined ? wallpaper.views : '0';
            }
            if (detailLikes) {
                detailLikes.textContent = wallpaper.likes !== undefined ? wallpaper.likes : '0';
            }

            // 更新AI生图提示词 (此行将被移除，因为由 loadWallpaperPrompt 统一处理)
            // if (promptContent) {
            //     promptContent.textContent = wallpaper.prompt || '暂无提示词信息';
            // }
        });

        // 2024-07-28 新增: 加载提示词（需在更新UI后调用，确保DOM元素存在）
        this.loadWallpaperPrompt(wallpaper.id);
    },
    
    /**
     * 更新点赞和收藏按钮的UI状态
     * @param {number} wallpaperId - 壁纸ID
     */
    async _updateLikeAndFavoriteUI(wallpaperId) {
        console.log('[WallpaperDetail] _updateLikeAndFavoriteUI: 传入壁纸ID:', wallpaperId);
        await this._fetchLikeCount(wallpaperId);
        await this._checkUserLikeStatus(wallpaperId);
        await this._checkUserFavoriteStatus(wallpaperId);
    },

    /**
     * 从后端获取壁纸的点赞数并更新UI
     * @param {number} wallpaperId - 壁纸ID
     */
    async _fetchLikeCount(wallpaperId) {
        const detailLikesSpan = document.getElementById('detail-likes');
        const likeIcon = document.getElementById('like-icon');
        const likeText = document.getElementById('like-text');

        if (!detailLikesSpan || !likeIcon || !likeText) {
            console.warn('[WallpaperDetail] _fetchLikeCount: 无法找到点赞计数或按钮元素。');
            return;
        }

        try {
            const response = await this._fetchJson(`api/get_like_count.php?wallpaper_id=${wallpaperId}`, 'GET');
            if (response.code === 0) {
                detailLikesSpan.textContent = response.count;
            } else {
                console.warn('[WallpaperDetail] _fetchLikeCount: 获取点赞数失败:', response.msg);
                detailLikesSpan.textContent = 'N/A';
            }
        } catch (error) {
            console.error('[WallpaperDetail] _fetchLikeCount: 获取点赞数请求错误:', error);
            detailLikesSpan.textContent = 'Error';
        }
    },
    
    /**
     * 检查用户收藏状态并更新UI
     * @param {number} wallpaperId - 壁纸ID
     */
    async _checkUserFavoriteStatus(wallpaperId) {
        const favoriteBtn = document.getElementById('favorite-btn');
        const favoriteIcon = document.getElementById('favorite-icon');
        const favoriteText = document.getElementById('favorite-text');

        if (!favoriteBtn || !favoriteIcon || !favoriteText) {
            console.warn('[WallpaperDetail] _checkUserFavoriteStatus: 无法找到收藏按钮相关元素。');
            return;
        }
        console.log('[WallpaperDetail] _checkUserFavoriteStatus: 检查壁纸ID:', wallpaperId);
        try {
            const response = await this._fetchJson('api/my_favorites.php', 'GET');
            console.log('[WallpaperDetail] _checkUserFavoriteStatus: my_favorites.php 响应:', response);

            if (response.code === 0 && response.data) {
                // 2024-07-16 修复：确保favWallpaper.id与wallpaperId类型一致，都转为整数进行比较
                const isFavorited = response.data.some(favWallpaper => {
                    // 2024-07-16 调试：打印类型和值
                    console.log(`[WallpaperDetail] _checkUserFavoriteStatus: 检查 -> 当前壁纸ID: ${wallpaperId} (类型: ${typeof wallpaperId}), 收藏列表项ID: ${favWallpaper.id} (类型: ${typeof favWallpaper.id})`);
                    const parsedFavId = parseInt(favWallpaper.id);
                    console.log(`[WallpaperDetail] _checkUserFavoriteStatus: 解析后的收藏ID: ${parsedFavId} (类型: ${typeof parsedFavId})`);
                    return parsedFavId === wallpaperId;
                });
                console.log('[WallpaperDetail] _checkUserFavoriteStatus: isFavorited:', isFavorited, '壁纸ID:', wallpaperId, '收藏列表:', response.data.map(f => f.id));
                if (isFavorited) {
                    favoriteIcon.src = 'static/icons/fa-star.svg';
                    favoriteText.textContent = '收藏';
                    favoriteBtn.classList.add('favorited');
                } else {
                    favoriteIcon.src = 'static/icons/fa-star-o.svg';
                    favoriteText.textContent = '收藏';
                    favoriteBtn.classList.remove('favorited');
                }
            } else if (response.code === 401) {
                // User not logged in, reset to default '收藏' state
                favoriteIcon.src = 'static/icons/fa-star-o.svg';
                favoriteText.textContent = '收藏';
                favoriteBtn.classList.remove('favorited');
            } else {
                favoriteText.textContent = '收藏'; // 恢复默认文本
            }
        } catch (error) {
            favoriteText.textContent = '收藏'; // 恢复默认文本
        }
    },
    
    /**
     * 检查当前用户（IP）是否已点赞并更新UI
     * @param {number} wallpaperId - 壁纸ID
     */
    async _checkUserLikeStatus(wallpaperId) {
        const likeBtn = document.getElementById('like-btn');
        const likeIcon = document.getElementById('like-icon');
        const likeText = document.getElementById('like-text');

        if (!likeBtn || !likeIcon || !likeText) {
            console.warn('[WallpaperDetail] _checkUserLikeStatus: 无法找到点赞按钮相关元素。');
            return;
        }

        try {
            const response = await this._fetchJson('api/my_likes.php', 'GET');

            if (response.code === 0 && response.data) {
                // response.data 是一个包含已点赞壁纸ID的数组
                const isLiked = response.data.some(likedId => likedId === wallpaperId);
                if (isLiked) {
                    likeIcon.src = 'static/icons/fa-heart.svg';
                    likeText.textContent = '点赞';
                    likeIcon.classList.add('liked');
                } else {
                    likeIcon.src = 'static/icons/fa-heart-o.svg';
                    likeText.textContent = '点赞';
                    likeIcon.classList.remove('liked');
                }
            } else {
                // 即使获取失败，也恢复默认状态，避免误判
                likeIcon.src = 'static/icons/fa-heart-o.svg';
                likeText.textContent = '点赞';
                likeIcon.classList.remove('liked');
            }
        } catch (error) {
            // 网络请求错误，恢复默认状态
            likeIcon.src = 'static/icons/fa-heart-o.svg';
            likeText.textContent = '点赞';
            likeIcon.classList.remove('liked');
        }
    },

    /**
     * 处理点赞/取消点赞点击事件
     */
    async _handleLikeClick() {
        if (!this.currentWallpaper || !this.currentWallpaper.id) {
            console.warn('[WallpaperDetail] _handleLikeClick: 无法点赞/取消点赞：缺少壁纸ID。');
            return;
        }

        const likeBtn = document.getElementById('like-btn');
        const likeIcon = document.getElementById('like-icon');
        const likeText = document.getElementById('like-text');

        if (likeBtn) {
            likeBtn.disabled = true;
        }

        try {
            const response = await this._fetchJson('api/toggle_like.php', 'POST', {
                wallpaper_id: this.currentWallpaper.id
            });

            if (response.code === 0) {
                const likeIcon = document.getElementById('like-icon');
                const likesCountSpan = document.getElementById('detail-likes');

                if (response.action === 'liked') {
                    likeIcon.src = 'static/icons/fa-heart.svg'; // 实心
                    likeIcon.classList.add('liked');
                    likesCountSpan.textContent = parseInt(likesCountSpan.textContent || '0') + 1;
                } else if (response.action === 'unliked') {
                    likeIcon.src = 'static/icons/fa-heart-o.svg'; // 空心
                    likeIcon.classList.remove('liked');
                    likesCountSpan.textContent = Math.max(0, parseInt(likesCountSpan.textContent || '0') - 1);
                }
                // 2024-07-26 新增：点赞状态改变后，派发自定义事件通知其他模块
                document.dispatchEvent(new CustomEvent('wallpaper-like-status-changed', {
                    detail: {
                        wallpaperId: this.currentWallpaper.id,
                        action: response.action
                    }
                }));

            } else {
                console.error('[WallpaperDetail] _handleLikeClick: 点赞/取消点赞失败:', response.msg);
                alert(`操作失败: ${response.msg}`);
            }
        } catch (error) {
            console.error('[WallpaperDetail] _handleLikeClick: 点赞/取消点赞请求错误:', error);
            alert('网络请求失败，请稍后重试。');
        } finally {
            if (likeBtn) {
                likeBtn.disabled = false;
            }
        }
    },
    
    /**
     * 处理收藏/取消收藏点击事件
     */
    async _handleFavoriteClick() {
        if (!this.currentWallpaper || !this.currentWallpaper.id) {
            console.warn('[WallpaperDetail] _handleFavoriteClick: 无法收藏：缺少壁纸ID。');
            return;
        }

        const favoriteBtn = document.getElementById('favorite-btn');
        const favoriteIcon = document.getElementById('favorite-icon');
        const favoriteText = document.getElementById('favorite-text');
        
        if (favoriteBtn) {
            favoriteBtn.disabled = true;
        }

        console.log('[WallpaperDetail] _handleFavoriteClick: 尝试收藏/取消收藏壁纸ID:', this.currentWallpaper.id);
        try {
            const response = await this._fetchJson('api/toggle_favorite.php', 'POST', {
                wallpaper_id: this.currentWallpaper.id
            });

            console.log('[WallpaperDetail] _handleFavoriteClick: toggle_favorite.php 响应:', response);

            if (response.code === 0) {
                // 根据返回的 action 更新UI
                if (response.action === 'favorited') {
                    favoriteIcon.src = 'static/icons/fa-star.svg'; // 变为实心
                    favoriteText.textContent = '收藏'; // 更新文本
                    favoriteBtn.classList.add('favorited'); // 添加一个类来标记已收藏状态
                } else if (response.action === 'unfavorited') {
                    favoriteIcon.src = 'static/icons/fa-star-o.svg'; // 变为空心
                    favoriteText.textContent = '收藏'; // 更新文本
                    favoriteBtn.classList.remove('favorited'); // 移除已收藏状态类
                }
                // 2024-07-26 新增：收藏状态改变后，派发自定义事件通知其他模块
                document.dispatchEvent(new CustomEvent('wallpaper-favorite-status-changed', {
                    detail: {
                        wallpaperId: this.currentWallpaper.id,
                        action: response.action
                    }
                }));

            } else if (response.code === 401) {
                alert('收藏需要登录，请先登录！');
                favoriteText.textContent = '收藏'; // 2024-07-26 修复：未登录时恢复按钮文本
            } else {
                console.error('[WallpaperDetail] _handleFavoriteClick: 收藏/取消收藏失败:', response.msg);
                alert(`操作失败: ${response.msg}`);
            }
        } catch (error) {
            console.error('[WallpaperDetail] _handleFavoriteClick: 收藏/取消收藏请求错误:', error);
            alert('网络请求失败，请稍后重试。');
        } finally {
            if (favoriteBtn) {
                favoriteBtn.disabled = false;
            }
        }
    },
    
    /**
     * 分享壁纸
     */
    shareWallpaper() {
        if (!this.currentWallpaper) return;
        
        const shareData = {
            title: this.currentWallpaper.name,
            text: `分享一张精美壁纸：${this.currentWallpaper.name}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            // 使用原生分享API
            navigator.share(shareData).catch(error => {});
        } else {
            // 复制链接到剪贴板
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('链接已复制到剪贴板');
            }).catch(() => {
                alert('分享功能暂不可用');
            });
        }
    },
    
    /**
     * 设置为壁纸
     */
    setAsWallpaper() {
        if (!this.currentWallpaper) return;
        
        // 这是一个浏览器限制的功能，大多数现代浏览器不支持
        alert('请右键点击图片选择"设为壁纸"或手动下载后设置');
    },
    
    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * 格式化日期
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    },
    
    /**
     * HTML转义
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) {
            return map[m];
        });
    },

    /**
     * 统一的JSON Fetch请求封装
     * @param {string} url - 请求URL
     * @param {string} method - 请求方法 (GET, POST等)
     * @param {Object} [data] - POST请求的数据
     * @returns {Promise<Object>} - JSON响应数据
     * @throws {Error} - 请求失败时抛出错误
     */
    async _fetchJson(url, method, data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (data) {
            // For POST requests, convert data to FormData if needed (e.g., for file uploads)
            // For simple JSON, use JSON.stringify
            if (method === 'POST') {
                // 2024-07-30 调试: 记录即将发送的POST请求体
                console.log('[WallpaperDetail] _fetchJson: POST请求体:', JSON.stringify(data));
                options.body = JSON.stringify(data);
            }
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return response.json();
    },

    /**
     * 触发壁纸详情显示事件
     */
    handleWallpaperClick(wallpaper) {
        // 2024-07-16 调试：打印wallpaperId的类型，以便追踪数据源
        console.log(`[ImageLoader] handleWallpaperClick: 准备显示详情页，壁纸ID: ${wallpaper.id} (类型: ${typeof wallpaper.id})`);
        const event = new CustomEvent('wallpaper-detail-show', {
            detail: wallpaper
        });
        document.dispatchEvent(event);
    },

    /**
     * 清空模态框内容，重置显示状态
     * @private
     */
    clearModalContent() {
        const detailImage = document.getElementById('detail-image');
        const detailTitle = document.getElementById('detail-title');
        const detailFileSize = document.getElementById('detail-file-size');
        const detailDimensions = document.getElementById('detail-dimensions');
        const detailFormat = document.getElementById('detail-format');
        const detailUploadTime = document.getElementById('detail-upload-time');
        const detailCategory = document.getElementById('detail-category');
        const detailTags = document.getElementById('detail-tags');
        const detailViews = document.getElementById('detail-views');
        const promptContent = document.getElementById('prompt-content');

        if (detailImage) detailImage.src = '';
        if (detailTitle) detailTitle.textContent = '';
        if (detailFileSize) detailFileSize.textContent = '';
        if (detailDimensions) detailDimensions.textContent = '';
        if (detailFormat) detailFormat.textContent = '';
        if (detailUploadTime) detailUploadTime.textContent = '';
        if (detailCategory) detailCategory.textContent = '未分类';
        if (detailTags) detailTags.innerHTML = '';
        if (detailViews) detailViews.textContent = '0';
        if (detailLikes) detailLikes.textContent = '0';
        if (promptContent) promptContent.textContent = '暂无提示词信息';

        // 2024-07-29 修复: 确保图片在内容清空时隐藏，加载完成后再显示
        if (detailImage) {
            detailImage.style.opacity = '0';
            detailImage.style.transition = 'none'; // 暂时移除过渡，避免清空时闪烁
        }
    },

    /**
     * 显示图片加载指示器
     * @private
     */
    showLoadingState() {
        const loadingIndicator = document.getElementById('image-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
    },

    /**
     * 隐藏图片加载指示器
     * @private
     */
    hideLoadingState() {
        const loadingIndicator = document.getElementById('image-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    },

    /**
     * 根据原始路径获取显示用的图片路径（优先压缩图）
     * @param {string} originalPath - 原始图片路径
     * @returns {Promise<string>} - 返回压缩后的图片路径或原始路径
     * @private
     */
    async _getDisplayImagePath(originalPath) {
        if (!originalPath) {
            console.warn('[WallpaperDetail] _getDisplayImagePath: 原始路径为空');
            return '';
        }
        // 尝试获取压缩后的图片URL
        // ImageLoader 应该处理压缩逻辑并返回可用URL
        const compressedPath = await ImageLoader.getCompressedImageUrl(originalPath);
        // 如果压缩路径有效，则使用压缩路径，否则回退到原始路径
        return compressedPath || originalPath;
    },

    /**
     * 获取分类对应的颜色类名
     * @param {string} categoryName - 分类名称
     * @returns {string} - Tailwind CSS 颜色类名
     */
    getCategoryColorClass(categoryName) {
        const colors = {
            '自然风光': 'bg-green-100 text-green-800',
            '城市建筑': 'bg-blue-100 text-blue-800',
            '抽象艺术': 'bg-purple-100 text-purple-800',
            '动物萌宠': 'bg-yellow-100 text-yellow-800',
            '科技未来': 'bg-indigo-100 text-indigo-800',
            '游戏动漫': 'bg-pink-100 text-pink-800',
            '人物写真': 'bg-red-100 text-red-800',
            '汽车交通': 'bg-gray-200 text-gray-800',
            '美食饮品': 'bg-orange-100 text-orange-800',
            '体育运动': 'bg-teal-100 text-teal-800',
            '简约设计': 'bg-neutral-200 text-neutral-800',
            '卡通插画': 'bg-lime-100 text-lime-800',
            '节日庆典': 'bg-rose-100 text-rose-800',
            '军事历史': 'bg-amber-100 text-amber-800',
            '太空宇宙': 'bg-cyan-100 text-cyan-800',
            '影视娱乐': 'bg-fuchsia-100 text-fuchsia-800',
            '平面设计': 'bg-emerald-100 text-emerald-800',
            '未分类': 'bg-gray-100 text-gray-800'
        };
        return colors[categoryName] || colors['未分类'];
    },

    /**
     * 记录壁纸查看次数
     * @param {number} wallpaperId - 壁纸ID
     * @private
     */
    async _recordWallpaperView(wallpaperId) {
        if (!wallpaperId) {
            console.warn('[WallpaperDetail] _recordWallpaperView: 缺少壁纸ID，无法记录查看。');
            return null; // 返回null以便调用者判断
        }
        // 2024-07-30 调试: 记录发送的数据
        console.log('[WallpaperDetail] _recordWallpaperView: 准备发送的数据:', { wallpaper_id: wallpaperId });
        try {
            const response = await this._fetchJson('api/record_view.php', 'POST', { wallpaper_id: wallpaperId });
            if (response.code === 0) {
                console.log('[WallpaperDetail] 查看记录成功:', response.msg);
            } else {
                console.warn('[WallpaperDetail] 查看记录失败:', response.msg);
            }
            return response; // 返回响应，供调用者检查
        } catch (error) {
            console.error('[WallpaperDetail] 记录查看请求错误:', error);
            return null; // 发生错误时返回null
        }
    },

    /**
     * 加载壁纸提示词
     * @param {string} wallpaperId - 壁纸ID
     */
    async loadWallpaperPrompt(wallpaperId) {
        try {
            const response = await this._fetchJson(`api/wallpaper_prompt.php?id=${wallpaperId}`, 'GET');
            if (response.code === 200 && response.data) {
                this.updatePromptUI(response.data);
            } else if (response.code === 200 && response.msg === '暂无提示词') {
                // 暂无提示词，显示空内容并禁用编辑
                this.updatePromptUI({ content: '', is_locked: 1 });
            } else {
                console.error('[WallpaperDetail] 获取提示词失败:', response.msg);
                // 即使失败也显示空内容
                this.updatePromptUI({ content: '', is_locked: 1 });
            }
        } catch (error) {
            console.error('[WallpaperDetail] 加载提示词时发生错误:', error);
            this.updatePromptUI({ content: '', is_locked: 1 });
        }
    },

    /**
     * 更新提示词UI
     * @param {Object} promptData - 提示词数据 {content: string, is_locked: number}
     */
    updatePromptUI(promptData) {
        const promptTextElement = document.getElementById('prompt-content'); // 修正：对应 HTML 中的 prompt-content
        const promptViewDiv = document.getElementById('prompt-view');
        const promptEditBtnArea = document.getElementById('prompt-edit-btn-area');
        const editPromptBtn = document.getElementById('edit-prompt-btn');
        const toggleLockBtn = document.getElementById('toggle-prompt-lock');
        const promptLockIcon = document.getElementById('prompt-lock-icon');
        const promptLockText = document.getElementById('prompt-lock-text');
        const promptEditDiv = document.getElementById('prompt-edit');

        if (!promptTextElement || !promptViewDiv || !promptEditBtnArea || !editPromptBtn || !toggleLockBtn || !promptLockIcon || !promptLockText || !promptEditDiv) {
            console.warn('[WallpaperDetail] 提示词相关DOM元素未找到。');
            return;
        }

        promptTextElement.innerText = promptData.content || '暂无提示词信息';
        promptLockIcon.src = promptData.is_locked ? 'static/icons/fa-lock.svg' : 'static/icons/fa-unlock.svg';
        promptLockText.innerText = promptData.is_locked ? '已锁定' : '已解锁';

        // 只有管理员才能看到编辑和锁定按钮
        const isAdmin = window.currentUser && window.currentUser.is_admin === 1; // 假设 isAdmin 为 1 表示管理员
        if (isAdmin) {
            promptEditBtnArea.classList.remove('hidden'); // 显示编辑按钮区域
            toggleLockBtn.classList.remove('hidden'); // 显示切换锁定按钮
            
            // 如果提示词被锁定，编辑按钮不可用
            editPromptBtn.disabled = promptData.is_locked;
            editPromptBtn.classList.toggle('opacity-50', promptData.is_locked);
            editPromptBtn.classList.toggle('cursor-not-allowed', promptData.is_locked);
        } else {
            promptEditBtnArea.classList.add('hidden'); // 隐藏编辑按钮区域
            toggleLockBtn.classList.add('hidden'); // 隐藏切换锁定按钮
        }

        // 确保编辑模式是隐藏的，显示查看模式
        promptViewDiv.classList.remove('hidden');
        promptEditDiv.classList.add('hidden');

        // 绑定事件监听器 (确保只绑定一次)
        if (!editPromptBtn.dataset.listenerAdded) {
            editPromptBtn.addEventListener('click', () => this.editPrompt());
            editPromptBtn.dataset.listenerAdded = true;
        }
        if (!toggleLockBtn.dataset.listenerAdded) {
            toggleLockBtn.addEventListener('click', () => this.togglePromptLock());
            toggleLockBtn.dataset.listenerAdded = true;
        }
    },

    /**
     * 编辑提示词
     */
    async editPrompt() {
        const promptViewDiv = document.getElementById('prompt-view');
        const promptEditDiv = document.getElementById('prompt-edit');
        const promptTextarea = document.getElementById('prompt-textarea');
        const saveBtn = document.getElementById('save-prompt');
        const cancelBtn = document.getElementById('cancel-prompt-edit');
        const currentContent = document.getElementById('prompt-content').innerText === '暂无提示词信息' ? '' : document.getElementById('prompt-content').innerText;

        // 切换到编辑模式
        promptViewDiv.classList.add('hidden');
        promptEditDiv.classList.remove('hidden');
        promptTextarea.value = currentContent;

        // 清除旧的事件监听器以防止重复绑定
        const newSaveBtn = saveBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newSaveBtn.addEventListener('click', async () => {
            const newContent = promptTextarea.value;
            const wallpaperId = this.currentWallpaper.id;
            // 获取当前的锁定状态 (从已更新的UI中获取)
            const isLocked = document.getElementById('prompt-lock-text').innerText === '已锁定' ? 1 : 0;
            
            try {
                const response = await this._fetchJson('api/wallpaper_prompt.php', 'POST', {
                    wallpaper_id: wallpaperId,
                    content: newContent,
                    is_locked: isLocked
                });
                if (response.code === 200) {
                    alert('提示词保存成功！');
                    this.loadWallpaperPrompt(wallpaperId); // 重新加载以更新UI
                } else {
                    alert('提示词保存失败: ' + response.msg);
                }
            } catch (error) {
                console.error('保存提示词时出错:', error);
                alert('保存提示词时发生网络错误或服务器错误。');
            }
        });

        newCancelBtn.addEventListener('click', () => {
            this.loadWallpaperPrompt(this.currentWallpaper.id); // 取消编辑，重新加载原始数据
        });
    },

    /**
     * 切换提示词锁定状态
     */
    async togglePromptLock() {
        const wallpaperId = this.currentWallpaper.id;
        const promptLockText = document.getElementById('prompt-lock-text');
        const currentContent = document.getElementById('prompt-content').innerText === '暂无提示词信息' ? '' : document.getElementById('prompt-content').innerText;
        const newIsLocked = (promptLockText.innerText === '已锁定') ? 0 : 1; // 切换状态

        try {
            const response = await this._fetchJson('api/wallpaper_prompt.php', 'POST', {
                wallpaper_id: wallpaperId,
                content: currentContent, // 发送当前内容以避免内容丢失
                is_locked: newIsLocked
            });

            if (response.code === 200) {
                alert(`提示词已${newIsLocked === 1 ? '锁定' : '解锁'}！`);
                this.loadWallpaperPrompt(wallpaperId); // 重新加载以更新UI
            } else {
                alert('操作失败: ' + response.msg);
            }
        } catch (error) {
            console.error('切换锁定状态时出错:', error);
            alert('切换锁定状态时发生网络错误或服务器错误。');
        }
    },

    /**
     * 复制提示词内容到剪贴板
     */
    async copyPromptContent() {
        const promptTextElement = document.getElementById('prompt-content');
        const copySuccessMessage = document.getElementById('copy-success-message'); // 获取新添加的提示元素

        if (!promptTextElement || !copySuccessMessage) {
            console.warn('[WallpaperDetail] 复制失败: 未找到提示词内容或提示元素。');
            return;
        }

        const contentToCopy = promptTextElement.innerText.trim();
        if (!contentToCopy || contentToCopy === '暂无提示词信息') {
            this._displayCopyMessage('没有提示词内容可供复制。', 'error'); // 使用新辅助函数显示错误
            return;
        }

        try {
            await navigator.clipboard.writeText(contentToCopy);
            this._displayCopyMessage('复制成功!', 'success'); // 使用新辅助函数显示成功
        } catch (err) {
            console.error('[WallpaperDetail] 复制提示词失败:', err);
            this._displayCopyMessage('复制失败！', 'error'); // 使用新辅助函数显示错误
        }
    },

    /**
     * 在复制图标旁边显示临时的复制消息
     * @param {string} message - 要显示的消息内容
     * @param {string} type - 消息类型，可选 'success' 或 'error'，用于设置样式
     * @param {number} duration - 消息显示时长（毫秒），默认为 1500ms
     */
    _displayCopyMessage(message, type = 'success', duration = 1500) {
        const copySuccessMessage = document.getElementById('copy-success-message');
        if (!copySuccessMessage) {
            console.warn('[WallpaperDetail] 未找到复制成功提示元素。');
            return;
        }

        copySuccessMessage.textContent = message;

        // 根据类型设置文本颜色
        copySuccessMessage.classList.remove('text-green-500', 'text-red-500', 'text-orange-500'); // 清除旧颜色
        if (type === 'success') {
            copySuccessMessage.classList.add('text-green-500');
        } else if (type === 'error') {
            copySuccessMessage.classList.add('text-red-500');
        } else {
            copySuccessMessage.classList.add('text-orange-500'); // 默认颜色，例如用于"没有内容"
        }

        copySuccessMessage.style.opacity = '1';

        // 如果已经有定时器在运行，清除它，以防快速点击导致消息被覆盖或提前消失
        if (this._copyMessageTimer) {
            clearTimeout(this._copyMessageTimer);
        }

        this._copyMessageTimer = setTimeout(() => {
            copySuccessMessage.style.opacity = '0';
            // 动画结束后清空文本，以便下次显示新内容
            copySuccessMessage.addEventListener('transitionend', () => {
                copySuccessMessage.textContent = '';
                copySuccessMessage.classList.remove('text-green-500', 'text-red-500', 'text-orange-500'); // 清除颜色
            }, { once: true });
        }, duration);
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WallpaperDetail;
}

// 全局暴露
window.WallpaperDetail = WallpaperDetail;

console.log('[WallpaperDetail] 模块已加载');