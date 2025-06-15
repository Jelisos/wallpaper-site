/**
 * 文件: static/js/wallpaper.js
 * 描述: 兼容旧版页面功能，主要功能已迁移至ImageLoader模块
 * 维护: 请尽量避免修改此文件，推荐使用ImageLoader模块进行开发
 */

const WallpaperManager = {
    // 空的初始化方法，因为功能已迁移
    init() {},

    // 兼容性方法，内部调用ImageLoader
    async getWallpaperListUrl(category = 'all') {
        // 功能已迁移至image-loader.js
        return ImageLoader.getWallpaperListUrl(category);
    },

    init() {
        // 功能已迁移至image-loader.js
        ImageLoader.init();
    },

    initView() {
        // 功能已迁移至image-loader.js
        ImageLoader.initUI();
    },

    switchToListView() {
        // 功能已迁移至image-loader.js
        ImageLoader.switchViewMode('list');
    },

    switchToGridView() {
        // 功能已迁移至image-loader.js
        ImageLoader.switchViewMode('grid');
    },

    loadWallpaperList(category = 'all', append = false) {
        // 功能已迁移至image-loader.js
        ImageLoader.loadWallpapers(append);
    },

    initEventListeners() {
        // 功能已迁移至image-loader.js
        ImageLoader.bindEvents();
    },

    handleSearch(keyword) {
        // 功能已迁移至image-loader.js
        ImageLoader.handleSearch(keyword);
    },

    handleWallpaperAction(action, wallpaperId) {
        // 功能已迁移至image-loader.js
        // 根据action调用ImageLoader或WallpaperDetailManager的对应方法
        if (action === 'favorite') {
            // ImageLoader._handleCardFavoriteClick(document.querySelector(`.card[data-wallpaper-id="${wallpaperId}"] .card-favorite-btn`));
        } else if (action === 'like') {
            // ImageLoader._handleCardLikeClick(document.querySelector(`.card[data-wallpaper-id="${wallpaperId}"] .card-like-btn`));
        }
    },

    handleWallpaperClick(wallpaper) {
        // 功能已迁移至image-loader.js
        ImageLoader.handleWallpaperClick(wallpaper);
    },

    saveWallpaperState(wallpaper) {
        // 功能已迁移至image-loader.js
        // ImageLoader.saveWallpaperState(wallpaper);
    },

    getNextPageWallpapers() {
        // 功能已迁移至image-loader.js
        // return ImageLoader.getNextPageWallpapers();
    },

    resetPagination() {
        // 功能已迁移至image-loader.js
        // ImageLoader.resetPagination();
    },

    renderWallpaperCards(wallpapers, append = false) {
        // 功能已迁移至image-loader.js
        // ImageLoader.renderWallpapers(append);
    }
};

// 将 WallpaperManager 暴露给全局，以便旧代码可以继续引用
window.WallpaperManager = WallpaperManager;