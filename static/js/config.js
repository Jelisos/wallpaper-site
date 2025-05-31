/**
 * 全局配置项
 */
const CONFIG = {
    // 分页配置
    PAGINATION: {
        ITEMS_PER_PAGE: 12,
        // 移动端分页配置
        MOBILE: {
            ITEMS_PER_PAGE: 6
        }
    },
    
    // 图片处理配置
    IMAGE: {
        MAX_WIDTH: 1920,
        MAX_HEIGHT: 1080,
        QUALITY: 0.85,
        TYPE: 'image/jpeg',
        // 移动端图片配置
        MOBILE: {
            MAX_WIDTH: 800,
            MAX_HEIGHT: 600,
            QUALITY: 0.85  // 提高移动端图片质量
        }
    },
    
    // 动画配置
    ANIMATION: {
        DURATION: 300
    },
    
    // 搜索配置
    SEARCH: {
        DEBOUNCE_DELAY: 2000
    }
}; 