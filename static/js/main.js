/**
 * 主入口文件
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化模态框
    ModalManager.init();
    
    // 初始化壁纸管理
    await WallpaperManager.init();
    
    // 初始化回到顶部按钮
    initBackToTop();
    
    // 初始化导航栏滚动效果
    initHeaderScroll();
    
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
 * 初始化导航栏滚动效果
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