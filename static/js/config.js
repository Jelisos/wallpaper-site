/**
 * 全局配置项
 */
const CONFIG = {
    // 分页配置。 
    PAGINATION: {
        ITEMS_PER_PAGE: 12
    },
    
    // 图片处理配置
    IMAGE: {
        MAX_WIDTH: 1920,
        MAX_HEIGHT: 1080,
        QUALITY: 0.85,
        TYPE: 'image/jpeg'
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

// 2024-07-31 新增: 全局调试模式开关，控制台日志输出。
// 设置为 `false` 以禁用除 `error` 外的所有 `console` 输出，适用于生产环境。
const DEBUG_MODE = true;

// 根据 DEBUG_MODE 重写 console 方法，避免生产环境的冗余日志输出
// 2024-07-31 优化：仅在非调试模式下禁用 log 和 warn，保留 error
if (!DEBUG_MODE) {
    if (typeof console !== 'undefined') {
        // 保存原始的 console 方法，以防将来需要恢复或作为其他用途
        const originalConsole = { ...console };

        // 重写 console.log 为空函数 (noop)
        console.log = function() {};

        // 重写 console.warn 为空函数 (noop)
        console.warn = function() {};

        // console.error 保持不变，以便在生产环境中也能捕获并报告错误
    }
} 