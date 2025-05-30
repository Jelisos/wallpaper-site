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
    }
}; 