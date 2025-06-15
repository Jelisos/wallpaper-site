/**
 * 工具函数集合
 */
const Utils = {
    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间
     * @returns {Function} - 防抖后的函数
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * 随机打乱数组
     * @param {Array} array - 要打乱的数组
     * @returns {Array} - 打乱后的数组
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * 解析壁纸文件名
     * @param {string} filename - 文件名
     * @returns {Object} - 包含分类和标签的对象
     */
    parseWallpaperFilename(filename) {
        const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');
        const categoryMatch = nameWithoutExt.match(/^[\u4e00-\u9fa5a-zA-Z]+/);
        const category = categoryMatch ? categoryMatch[0] : '未分类';
        const tags = nameWithoutExt.match(/[\u4e00-\u9fa5a-zA-Z]+/g) || [];
        const uniqueTags = [...new Set(tags.filter(tag => tag !== category))];
        
        return { category, tags: uniqueTags };
    },

    /**
     * 图片压缩
     * @param {File} file - 图片文件。
     * @param {Object} options - 压缩选项
     * @returns {Promise<Blob>} - 压缩后的图片Blob
     */
    async compressImage(file, options = {}) {
        const {
            maxWidth = CONFIG.IMAGE.MAX_WIDTH,
            maxHeight = CONFIG.IMAGE.MAX_HEIGHT,
            quality = CONFIG.IMAGE.QUALITY,
            type = CONFIG.IMAGE.TYPE
        } = options;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, type, quality);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    },

    /**
     * 弹出右下角消息提示 (Toast)
     * @param {string} msg - 提示内容
     * @param {string} [type='info'] - 消息类型：'info', 'success', 'warning', 'error'
     * @param {number} [duration=2000] - 显示时长（毫秒），默认2000
     */
    showToastMessage(msg, type = 'info', duration = 2000) {
        // 创建提示容器
        let toastContainer = document.getElementById('utils-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'utils-toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.right = '24px';
            toastContainer.style.bottom = '24px';
            toastContainer.style.zIndex = '9999';
            toastContainer.style.display = 'flex';
            toastContainer.style.flexDirection = 'column';
            toastContainer.style.alignItems = 'flex-end';
            document.body.appendChild(toastContainer);
        }
        // 创建单条toast
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
        toast.style.marginTop = '8px';
        toast.style.borderRadius = '6px';
        toast.style.fontSize = '15px';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '1';

        let backgroundColor;
        switch (type) {
            case 'success':
                backgroundColor = '#4CAF50'; // Green
                break;
            case 'warning':
                backgroundColor = '#FFC107'; // Amber
                break;
            case 'error':
                backgroundColor = '#F44336'; // Red
                break;
            case 'info':
            default:
                backgroundColor = 'rgba(0,0,0,0.85)'; // Dark gray
        }
        toast.style.background = backgroundColor;

        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
                // 如果没有toast了，移除容器
                if (!toastContainer.hasChildNodes()) {
                    toastContainer.remove();
                }
            }, 300);
        }, duration);
    }
};

// 将 Utils 对象暴露到全局作用域
window.Utils = Utils; 