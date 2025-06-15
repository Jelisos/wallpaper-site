// 工具函数：HTML转义，防止XSS攻击
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化模态框
    ModalManager.init();
    
    // 2025-01-27 修复重复初始化：ImageLoader.init()已在index.html中调用，此处不再重复调用
    
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

// 图片加载相关的DOM元素引用和变量已迁移至image-loader.js
// main.js现在专注于通用功能：分类管理、返回顶部、页头滚动、移动菜单等



// ==================== 壁纸相关功能已移至image-loader.js ====================
// 壁纸卡片创建、添加、渲染等功能已全部整合到image-loader.js模块中
// main.js现在专注于通用功能和分类管理

// ==================== 壁纸获取和显示功能已移至image-loader.js ====================
// fetchAndDisplayWallpapers, loadMoreWallpapers 等功能已整合到image-loader.js模块中

// ==================== 分类管理功能已移至image-loader.js ====================
// fetchAndPopulateCategories, populateCategories, updateCategoryButtons, handleCategoryClick 等功能已整合到image-loader.js模块中

// 壁纸卡片创建和事件处理功能已迁移至image-loader.js
// 如需修改壁纸卡片样式和交互逻辑，请编辑image-loader.js

// 注意：壁纸详情相关函数已移至wallpaper-detail.js中的WallpaperDetailManager

// 壁纸获取功能已迁移至image-loader.js
// 如需修改壁纸数据获取逻辑，请编辑image-loader.js

// 分类相关功能已迁移至image-loader.js
// main.js现在专注于通用功能：分类管理模态框、返回顶部、页头滚动、移动菜单等
// 如需修改分类显示和交互逻辑，请编辑image-loader.js

// 搜索功能已迁移至image-loader.js
// 如需修改搜索逻辑，请编辑image-loader.js

// 简单的HTML转义函数，防止XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ==================== 搜索和事件监听功能已移至image-loader.js ====================
// handleSearch, 加载更多按钮、搜索输入框、分类按钮等事件监听器已整合到image-loader.js模块中
// main.js现在只保留通用功能的事件监听器

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 初始化分类管理功能
    initCategoryManagement();
    
    // 管理分类按钮事件监听
    const manageCategoriesBtn = document.getElementById('manage-categories-btn');
    if (manageCategoriesBtn) {
        manageCategoriesBtn.addEventListener('click', openManageCategoriesModal);
    }

    // 登录/注册模态框遮罩层点击关闭
    document.getElementById('login-modal')?.addEventListener('click', function(e) {
        if (e.target === this) this.classList.add('hidden');
    });
    document.getElementById('register-modal')?.addEventListener('click', function(e) {
        if (e.target === this) this.classList.add('hidden');
    });
    // 登录/注册关闭按钮
    document.getElementById('close-login-modal')?.addEventListener('click', function() {
        document.getElementById('login-modal').classList.add('hidden');
    });
    document.getElementById('close-register-modal')?.addEventListener('click', function() {
        document.getElementById('register-modal').classList.add('hidden');
    });
});

// 这是一个示例，您需要根据实际情况调整API基础URL
const API_BASE_URL = '/api';

// ==================== 分类管理功能 ====================

// 打开管理分类模态框
function openManageCategoriesModal() {
    const modal = document.getElementById('manage-categories-modal');
    const modalContent = document.getElementById('manage-categories-modal-content');
    if (modal && modalContent) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        loadCategoriesForManagement();
    }
}

// 关闭管理分类模态框
function closeManageCategoriesModal() {
    const modal = document.getElementById('manage-categories-modal');
    const modalContent = document.getElementById('manage-categories-modal-content');
    if (modal && modalContent) {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// 加载分类列表用于管理
function loadCategoriesForManagement() {
    fetch(`${API_BASE_URL}/wallpaper.php?action=categories`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                renderCategoriesForManagement(data.data);
            } else {
                console.error('加载分类失败:', data.msg);
                // 使用默认分类
                renderCategoriesForManagement(DEFAULT_CATEGORIES);
            }
        })
        .catch(error => {
            console.error('加载分类出错:', error);
            renderCategoriesForManagement(DEFAULT_CATEGORIES);
        });
}

// 渲染分类管理列表
function renderCategoriesForManagement(categories) {
    const container = document.getElementById('categories-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    categories.forEach((category, index) => {
        if (category === '全部') return; // 跳过"全部"分类，不允许删除
        
        const categoryItem = document.createElement('div');
        categoryItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        categoryItem.innerHTML = `
            <span class="text-gray-800">${escapeHTML(category)}</span>
            <button type="button" class="text-red-500 hover:text-red-700 transition-colors" onclick="removeCategory('${escapeHTML(category)}')">
                <i class="fa fa-trash"></i> 删除
            </button>
        `;
        container.appendChild(categoryItem);
    });
}

// 添加新分类
function addNewCategory() {
    const input = document.getElementById('new-category-name');
    if (!input) return;
    
    const categoryName = input.value.trim();
    if (!categoryName) {
        alert('请输入分类名称');
        return;
    }
    
    if (categoryName === '全部') {
        alert('不能添加"全部"分类');
        return;
    }
    
    // 检查是否已存在
    const existingCategories = Array.from(document.querySelectorAll('#categories-list span')).map(span => span.textContent);
    if (existingCategories.includes(categoryName)) {
        alert('该分类已存在');
        return;
    }
    
    // 添加到列表
    const container = document.getElementById('categories-list');
    const categoryItem = document.createElement('div');
    categoryItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
    categoryItem.innerHTML = `
        <span class="text-gray-800">${escapeHTML(categoryName)}</span>
        <button type="button" class="text-red-500 hover:text-red-700 transition-colors" onclick="removeCategory('${escapeHTML(categoryName)}')">
            <i class="fa fa-trash"></i> 删除
        </button>
    `;
    container.appendChild(categoryItem);
    
    // 清空输入框
    input.value = '';
}

// 删除分类
function removeCategory(categoryName) {
    if (confirm(`确定要删除分类"${categoryName}"吗？`)) {
        const categoryItems = document.querySelectorAll('#categories-list > div');
        categoryItems.forEach(item => {
            const span = item.querySelector('span');
            if (span && span.textContent === categoryName) {
                item.remove();
            }
        });
    }
}

// 保存分类更改
function saveCategories() {
    const categoryItems = document.querySelectorAll('#categories-list span');
    const categories = ['全部']; // 始终包含"全部"分类
    
    categoryItems.forEach(span => {
        const categoryName = span.textContent.trim();
        if (categoryName && categoryName !== '全部') {
            categories.push(categoryName);
        }
    });
    
    // 发送到后端保存
    fetch(`${API_BASE_URL}/wallpaper.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'updateCategories',
            categories: categories
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.code === 0) {
            alert('分类保存成功！');
            closeManageCategoriesModal();
            // 重新加载分类导航
            fetchCategories();
        } else {
            alert('保存失败：' + data.msg);
        }
    })
    .catch(error => {
        console.error('保存分类出错:', error);
        alert('保存失败，请重试');
    });
}

// 初始化分类管理事件监听器
function initCategoryManagement() {
    // 关闭按钮
    const closeBtn = document.getElementById('close-manage-categories-modal');
    const cancelBtn = document.getElementById('cancel-manage-categories');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeManageCategoriesModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeManageCategoriesModal);
    }
    
    // 添加分类按钮
    const addBtn = document.getElementById('submit-add-category');
    if (addBtn) {
        addBtn.addEventListener('click', addNewCategory);
    }
    
    // 保存按钮
    const saveBtn = document.getElementById('save-categories');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCategories);
    }
    
    // 新分类输入框回车事件
    const newCategoryInput = document.getElementById('new-category-name');
    if (newCategoryInput) {
        newCategoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewCategory();
            }
        });
    }
    
    // 模态框遮罩点击关闭
    const modal = document.getElementById('manage-categories-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeManageCategoriesModal();
            }
        });
    }
}

// 其他现有的main.js函数（例如加载壁纸列表等）
// ... existing code ...