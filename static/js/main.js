document.addEventListener('DOMContentLoaded', async () => {
    // 初始化模态框
    ModalManager.init();
    
    // 初始化壁纸管理
    await WallpaperManager.init();
    
    // 初始化回到顶部按钮
    initBackToTop();
    
    // 初始化导航栏滚动效果
    initHeaderScroll();
    
    // 初始化移动端菜单
    initMobileMenu();
    
    // 初始化未实现功能提示
    initNotImplementedFeatures();
});

/**
 * 初始化回到顶部按钮
 */
function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
            backToTopBtn.classList.add('opacity-100');
        } else {
            backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
            backToTopBtn.classList.remove('opacity-100');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/**
 * 初始化导航栏滚动效果。
 */
function initHeaderScroll() {
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('shadow-md');
            header.classList.remove('border-b');
        } else {
            header.classList.remove('shadow-md');
            header.classList.add('border-b');
        }
    });
}

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

/**
 * 初始化未实现功能提示
 */
function initNotImplementedFeatures() {
    document.querySelectorAll('.not-implemented').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            alert('该功能尚未实现');
        });
    });
}

// 获取模态框元素
const uploadModal = document.getElementById('upload-modal');
const uploadModalContent = document.getElementById('upload-modal-content');
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const imagePreview = document.getElementById('image-preview');
const previewContainer = document.getElementById('preview-container');
const uploadForm = document.getElementById('upload-form');
const wallpaperTitleInput = document.getElementById('wallpaper-title');
const wallpaperCategorySelect = document.getElementById('wallpaper-category');
const wallpaperTagsInput = document.getElementById('wallpaper-tags');
const submitUploadBtn = document.getElementById('submit-upload');
const cancelUploadBtn = document.getElementById('cancel-upload');

// 获取其他必要的元素
const uploadBtn = document.getElementById('upload-btn'); // 导航栏的上传按钮
const wallpaperContainer = document.getElementById('wallpaper-container'); // 壁纸容器
const loadMoreBtn = document.getElementById('load-more-btn'); // 加载更多按钮
const wallpaperDetailModal = document.getElementById('wallpaper-detail-modal'); // 壁纸详情模态框
const wallpaperDetailModalContent = document.getElementById('wallpaper-detail-modal-content'); // 壁纸详情模态框内容
const closeDetailModalBtn = document.getElementById('close-detail-modal'); // 壁纸详情模态框关闭按钮
const detailImage = document.getElementById('detail-image'); // 详情图片
const detailTitle = document.getElementById('detail-title'); // 详情标题
const detailCategory = document.getElementById('detail-category'); // 详情分类
const detailTags = document.getElementById('detail-tags'); // 详情标签容器
const detailSize = document.getElementById('detail-size'); // 详情尺寸
const detailViews = document.getElementById('detail-views'); // 详情浏览次数
const detailLikes = document.getElementById('detail-likes'); // 详情点赞数
const categoryNavContainer = document.querySelector('.mb-8.overflow-x-auto .flex');
const searchInput = document.getElementById('search-input');
const mobileSearchInput = document.getElementById('mobile-search-input');

// 文件对象，用于存储待上传的文件
let uploadedFile = null;

// 当前壁纸列表页码
let currentPage = 1;
// 每页壁纸数量
const wallpapersPerPage = 20; // 与后端默认值一致
let currentCategory = '全部';
let currentSearchQuery = '';

// 打开上传模态框
function openUploadModal() {
    uploadModal.classList.remove('hidden');
    setTimeout(() => {
        uploadModalContent.classList.remove('scale-95', 'opacity-0');
        uploadModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

// 关闭上传模态框
function closeUploadModal() {
    uploadModalContent.classList.remove('scale-100', 'opacity-100');
    uploadModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        uploadModal.classList.add('hidden');
        resetUploadModal(); // 关闭时重置模态框
    }, 300);
}

// 重置上传模态框状态
function resetUploadModal() {
    uploadedFile = null;
    uploadForm.reset();
    previewContainer.classList.add('hidden');
    imagePreview.src = '';
    // 重置拖拽区域样式（如果需要）
}

// 显示文件预览
function displayFilePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// 处理文件选择
function handleFileSelect(file) {
    if (file) {
        // 简单验证文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        // 验证文件大小 (与后端一致)
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxFileSize) {
            alert('文件大小不能超过 10MB');
            return;
        }
        uploadedFile = file;
        displayFilePreview(file);
    }
}

// 处理壁纸上传
async function handleUploadSubmit(event) {
    event.preventDefault(); // 阻止表单默认提交

    if (!uploadedFile) {
        alert('请选择要上传的壁纸文件');
        return;
    }

    const title = wallpaperTitleInput.value.trim();
    const category = wallpaperCategorySelect.value;
    const tags = wallpaperTagsInput.value.trim();

    if (!title) {
        alert('壁纸标题不能为空');
        return;
    }

    // 获取用户session ID
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.sessionId) {
        alert('请先登录才能上传壁纸');
        // 可以选择打开登录模态框
        // openLoginModal(); 
        return;
    }

    // 创建 FormData 对象
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('wallpaper', uploadedFile);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('tags', tags);
    // 您可以根据需要添加description字段
    // formData.append('description', '');

    // 禁用提交按钮，显示加载状态
    submitUploadBtn.disabled = true;
    submitUploadBtn.textContent = '上传中...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/wallpaper.php`, {
            method: 'POST',
            headers: {
                 'Authorization': `Bearer ${userData.sessionId}`
                // Note: Content-Type 'multipart/form-data' is automatically set by fetch when using FormData
            },
            body: formData
        });

        const result = await response.json();

        if (result.code === 200) {
            alert('壁纸上传成功！');
            closeUploadModal();
            // TODO: 上传成功后可能需要刷新壁纸列表
            // 简单粗暴刷新整个列表
            currentPage = 1; // 重置页码
            currentSearchQuery = ''; // 清空搜索关键词
            // 重置分类选择为"全部"并更新样式
            currentCategory = '全部';
            updateCategoryButtons();
            
            if (wallpaperContainer) wallpaperContainer.innerHTML = ''; // 清空现有列表
            fetchWallpapers(currentPage); // 加载第一页壁纸
        } else {
            alert(result.message || '壁纸上传失败');
        }
    } catch (error) {
        console.error('壁纸上传错误:', error);
        alert('壁纸上传失败，请重试');
    } finally {
        // 恢复提交按钮状态
        submitUploadBtn.disabled = false;
        submitUploadBtn.textContent = '提交';
    }
}

// 创建壁纸卡片HTML
function createWallpaperCard(wallpaper) {
    // 这里根据你的index.html中壁纸卡片的结构来生成HTML
    // 示例结构 (需要根据实际调整)
    const cardHtml = `
        <div class="masonry-item rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-gray-800" data-wallpaper-id="${wallpaper.id}">
            <img class="w-full h-auto object-cover" src="${wallpaper.file_path}" alt="${escapeHTML(wallpaper.title)}" loading="lazy">
            <div class="p-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${escapeHTML(wallpaper.title)}</h3>
                <div class="flex items-center text-gray-600 dark:text-gray-400 text-sm mt-2">
                    <span class="mr-4"><i class="fa fa-eye mr-1"></i>${wallpaper.views || 0}</span>
                    <span><i class="fa fa-heart mr-1"></i>${wallpaper.likes || 0}</span>
                </div>
                <!-- 预览按钮 -->
                <button class="mt-4 px-4 py-2 preview-btn text-white rounded-full transition-colors w-full" data-wallpaper-path="${escapeHTML(wallpaper.file_path)}">多平台预览</button>
            </div>
        </div>
    `;
    return cardHtml;
}

// 将壁纸添加到页面
function addWallpapersToPage(wallpapers) {
    if (!wallpaperContainer) return;

    let masonryHtml = '';
    wallpapers.forEach(wallpaper => {
        masonryHtml += createWallpaperCard(wallpaper);
    });
    // 使用 insertAdjacentHTML 避免重复解析现有元素
    wallpaperContainer.insertAdjacentHTML('beforeend', masonryHtml);

    // 为新添加的壁纸卡片绑定点击事件
    attachWallpaperCardListeners();

    // 重新绑定预览按钮事件（如果需要的话，或者使用事件委托）
    // 考虑到性能，推荐使用事件委托
    // attachPreviewButtonListeners(); // 如果不是事件委托，需要重新绑定
}

// 为壁纸卡片绑定点击事件（事件委托）
function attachWallpaperCardListeners() {
    if (wallpaperContainer) {
        wallpaperContainer.addEventListener('click', async (e) => {
            // 判断点击的是否是壁纸卡片或其内部元素
            const card = e.target.closest('.masonry-item');
            if (card) {
                const wallpaperId = card.dataset.wallpaperId;
                if (wallpaperId) {
                    openWallpaperDetailModal(wallpaperId);
                }
            }
        });
    }
}

// 打开壁纸详情模态框并加载数据
async function openWallpaperDetailModal(wallpaperId) {
    if (!wallpaperDetailModal || !wallpaperDetailModalContent) return;

    // 显示加载状态或清空之前的内容
    // detailTitle.textContent = '加载中...';
    // detailImage.src = '';
    // ... 清空其他字段 ...

    wallpaperDetailModal.classList.remove('hidden');
    setTimeout(() => {
        wallpaperDetailModalContent.classList.remove('scale-95', 'opacity-0');
        wallpaperDetailModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);

    try {
        const response = await fetch(`${API_BASE_URL}/wallpaper.php?action=details&wallpaperId=${wallpaperId}`);
        const result = await response.json();

        if (result.code === 200 && result.data) {
            populateWallpaperDetailModal(result.data);
        } else {
            alert(result.message || '获取壁纸详情失败');
            closeWallpaperDetailModal();
        }
    } catch (error) {
        console.error('获取壁纸详情错误:', error);
        alert('获取壁纸详情失败，请重试');
        closeWallpaperDetailModal();
    }
}

// 关闭壁纸详情模态框
function closeWallpaperDetailModal() {
    if (!wallpaperDetailModal || !wallpaperDetailModalContent) return;

    wallpaperDetailModalContent.classList.remove('scale-100', 'opacity-100');
    wallpaperDetailModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        wallpaperDetailModal.classList.add('hidden');
        // 可选：清空模态框内容或重置状态
    }, 300);
}

// 填充壁纸详情模态框
function populateWallpaperDetailModal(details) {
    if (detailImage) detailImage.src = details.file_path;
    if (detailTitle) detailTitle.textContent = details.title;
    // TODO: 填充描述字段 (如果添加了)
    if (detailCategory) detailCategory.textContent = details.category || '未分类';
    
    // 填充标签
    if (detailTags) {
        detailTags.innerHTML = ''; // 清空现有标签
        if (details.tags) {
            const tagsArray = details.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
            tagsArray.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('px-3', 'py-1', 'bg-neutral', 'rounded-full', 'text-sm');
                tagSpan.textContent = tag;
                detailTags.appendChild(tagSpan);
            });
        }
    }

    if (detailSize) detailSize.textContent = `${details.width} × ${details.height} 像素`;
    if (detailViews) detailViews.textContent = details.views || 0;
    if (detailLikes) detailLikes.textContent = details.likes || 0;
    // TODO: 填充上传者信息、上传日期等
    // const uploaderElement = document.getElementById('uploader-username');
    // if(uploaderElement) uploaderElement.textContent = details.uploader_username;

    // TODO: 更新预览按钮和下载按钮的链接/数据属性
    const previewButton = wallpaperDetailModalContent?.querySelector('.preview-btn');
    if(previewButton) previewButton.dataset.wallpaperPath = details.file_path;
    // const downloadButton = wallpaperDetailModalContent?.querySelector('#download-original');
    // if(downloadButton) downloadButton.href = details.file_path;
}

// 获取壁纸列表或搜索结果
async function fetchWallpapers(page = 1, query = currentSearchQuery, category = currentCategory) {
    // 禁用加载更多按钮，显示加载状态
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = query ? '搜索中...' : '加载中...';
    }

    // 构建API请求URL
    let apiUrl = `${API_BASE_URL}/wallpaper.php?`;
    const params = new URLSearchParams();

    if (query) {
        params.append('action', 'search');
        params.append('query', query);
         // 搜索时忽略分类选择
         currentCategory = '全部';
         updateCategoryButtons();
    } else {
        params.append('action', 'list');
        if (category && category !== '全部') {
            params.append('category', category);
        }
    }

    params.append('page', page);
    params.append('limit', wallpapersPerPage);

    apiUrl += params.toString();

    try {
        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.code === 200) {
            if (result.data.length > 0) {
                addWallpapersToPage(result.data);
                currentPage = page;
                // 如果是搜索结果，可能需要显示总数信息
                if (query && loadMoreBtn) {
                     // TODO: 后端返回总数后更新这里的逻辑
                     loadMoreBtn.textContent = `加载更多搜索结果`;
                }
            } else {
                // 没有更多壁纸/搜索结果了
                if (loadMoreBtn) loadMoreBtn.textContent = query ? '没有更多搜索结果了' : '没有更多壁纸了';
            }
        } else {
            alert(result.message || (query ? '搜索失败' : '获取壁纸列表失败'));
            if (loadMoreBtn) loadMoreBtn.textContent = query ? '搜索失败' : '加载失败';
        }
    } catch (error) {
        console.error((query ? '搜索错误:' : '获取壁纸列表错误:'), error);
        alert(query ? '搜索失败，请重试' : '获取壁纸列表失败，请重试');
        if (loadMoreBtn) loadMoreBtn.textContent = query ? '搜索失败' : '加载失败';
    } finally {
        // 恢复加载更多按钮状态，如果不是因为没有更多数据而改变的文本
        if (loadMoreBtn && (loadMoreBtn.textContent === '加载中...' || loadMoreBtn.textContent.startsWith('加载更多') || loadMoreBtn.textContent === '搜索中...')) {
             loadMoreBtn.disabled = false;
             if (!loadMoreBtn.textContent.startsWith('没有')) {
                  loadMoreBtn.textContent = query ? '加载更多搜索结果' : '加载更多';
             }
        }
    }
}

// 获取壁纸分类列表
async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/wallpaper.php?action=categories`);
        const result = await response.json();

        if (result.code === 200 && result.data) {
            populateCategoryNavigation(result.data);
        } else {
            console.error('获取分类失败:', result.message || '未知错误');
        }
    } catch (error) {
        console.error('获取分类错误:', error);
    }
}

// 填充分类导航
function populateCategoryNavigation(categories) {
    if (!categoryNavContainer) return;

    // 清空现有分类按钮 (移除静态的)
    categoryNavContainer.innerHTML = '';

    categories.forEach(category => {
        const button = document.createElement('button');
        button.classList.add('px-4', 'py-2', 'rounded-full', 'transition-colors');
        button.textContent = category;
        button.dataset.category = category; // 存储分类名称

        // 设置默认选中样式
        if (category === currentCategory) {
            button.classList.add('bg-primary', 'text-white');
        } else {
            button.classList.add('bg-white', 'hover:bg-neutral-dark');
        }

        // 添加点击事件监听器
        button.addEventListener('click', handleCategoryClick);

        categoryNavContainer.appendChild(button);
    });

    // 添加"管理分类"按钮
    const manageButton = document.createElement('button');
    manageButton.id = 'manage-categories-btn';
    manageButton.classList.add('px-4', 'py-2', 'rounded-full', 'bg-white', 'border', 'border-gray-300', 'hover:bg-neutral-dark', 'transition-colors', 'not-implemented');
    manageButton.innerHTML = '<i class="fa fa-cog"></i> 管理分类';
    manageButton.title = '管理分类';
    categoryNavContainer.appendChild(manageButton);

     // 重新初始化未实现功能提示（为新添加的"管理分类"按钮）
     initNotImplementedFeatures();
}

// 更新分类按钮的选中样式
function updateCategoryButtons() {
    if (!categoryNavContainer) return;
     categoryNavContainer.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white', 'bg-white', 'hover:bg-neutral-dark');
        if (btn.dataset.category === currentCategory) {
            btn.classList.add('bg-primary', 'text-white');
        } else {
             if (btn.id !== 'manage-categories-btn'){
                btn.classList.add('bg-white', 'hover:bg-neutral-dark');
             }
        }
     });
}

// 处理分类按钮点击事件
function handleCategoryClick(event) {
    const selectedCategory = event.target.dataset.category;

    if (selectedCategory) {
        // 如果点击的分类不是当前选中的分类
        if (selectedCategory !== currentCategory) {
             currentCategory = selectedCategory;
             currentSearchQuery = ''; // 清空搜索关键词
             if(searchInput) searchInput.value = ''; // 清空搜索输入框
             if(mobileSearchInput) mobileSearchInput.value = '';

             // 更新分类按钮的选中样式
             updateCategoryButtons();

            // 重置页码并重新加载壁纸列表
            currentPage = 1;
            if (wallpaperContainer) wallpaperContainer.innerHTML = ''; // 清空现有列表
            fetchWallpapers(currentPage); // 加载第一页壁纸，包含新的分类过滤
        }
    }
}

// 处理搜索输入
let searchTimer = null;
function handleSearchInput(event) {
    const query = event.target.value.trim();

    // 设置延迟搜索，避免频繁请求
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        // 如果搜索关键词有变化或从无关键词变为有关键词
        if (query !== currentSearchQuery) {
            currentSearchQuery = query;
            currentCategory = '全部'; // 清空分类选择
            updateCategoryButtons(); // 更新分类按钮样式

            currentPage = 1; // 重置页码
            if (wallpaperContainer) wallpaperContainer.innerHTML = ''; // 清空现有列表

            if (query) {
                fetchWallpapers(currentPage, query); // 执行搜索
            } else {
                fetchWallpapers(currentPage); // 如果关键词为空，加载全部壁纸
            }
        }
    }, 500); // 500毫秒后执行搜索
}

// 简单的HTML转义函数，防止XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 导航栏上传按钮
    uploadBtn?.addEventListener('click', openUploadModal);

    // 上传模态框关闭按钮
    cancelUploadBtn?.addEventListener('click', closeUploadModal);

    // 拖拽区域事件
    if (dropArea) {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('border-primary', 'bg-gray-100');
        });

        dropArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropArea.classList.remove('border-primary', 'bg-gray-100');
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('border-primary', 'bg-gray-100');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });
    }

    // 文件输入框选择文件事件
    fileInput?.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // 浏览文件按钮事件
    browseBtn?.addEventListener('click', () => {
        fileInput.click();
    });

    // 上传表单提交事件
    uploadForm?.addEventListener('submit', handleUploadSubmit);
    submitUploadBtn?.addEventListener('click', (e) => {
         e.preventDefault();
         handleUploadSubmit(e);
    });

    // 加载更多按钮事件
    loadMoreBtn?.addEventListener('click', () => {
        // 加载下一页时，保留当前搜索关键词或分类
        fetchWallpapers(currentPage + 1, currentSearchQuery, currentCategory);
    });

    // 搜索输入框事件监听
    searchInput?.addEventListener('input', handleSearchInput);
    // 您可能还需要监听回车键提交，或者依赖input事件的延迟搜索
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 阻止默认回车行为（如表单提交）
             // 立即执行搜索，取消延迟
            clearTimeout(searchTimer);
            handleSearchInput(e);
        }
    });
    mobileSearchInput?.addEventListener('input', handleSearchInput);
    mobileSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
             clearTimeout(searchTimer);
            handleSearchInput(e);
        }
    });

    // 页面加载时首次加载壁纸和分类
    fetchCategories(); // 先加载分类
    fetchWallpapers(currentPage); // 再加载壁纸

    // 壁纸详情模态框关闭按钮事件
    closeDetailModalBtn?.addEventListener('click', closeWallpaperDetailModal);

    // TODO: 添加新分类模态框的事件监听 (如果需要)
    // TODO: 为详情模态框中的预览和下载按钮添加事件监听 (如果需要的话，或者通过事件委托)
});

// 这是一个示例，您需要根据实际情况调整API基础URL
const API_BASE_URL = '/api';

// 其他现有的main.js函数（例如加载壁纸列表等）
// ... existing code ...