/**
 * SVG图标处理工具
 * 用于处理SVG图标的颜色变化和动态替换
 */

document.addEventListener('DOMContentLoaded', () => {
    // 初始化SVG图标处理
    initSvgIcons();
});

/**
 * 初始化SVG图标处理
 */
function initSvgIcons() {
    // 监听点赞和收藏按钮的状态变化，更新SVG图标
    observeIconChanges();
    
    // 替换JavaScript动态生成的图标
    setupIconReplacementObserver();
    
    // 处理模态框中的图标
    handleModalIcons();
}

/**
 * 监听Font Awesome图标的变化，替换为SVG图标
 */
function setupIconReplacementObserver() {
    // 创建一个MutationObserver来监视DOM变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // 检查是否有新节点添加
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    // 检查是否是元素节点
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 查找所有Font Awesome图标
                        const icons = node.querySelectorAll('i[class*="fa-"]');
                        icons.forEach(replaceIconWithSvg);
                        
                        // 如果节点本身是图标
                        if (node.tagName === 'I' && node.className.includes('fa-')) {
                            replaceIconWithSvg(node);
                        }
                    }
                });
            }
            
            // 检查属性变化
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.tagName === 'I' && target.className.includes('fa-')) {
                    replaceIconWithSvg(target);
                }
            }
        });
    });
    
    // 开始观察整个文档
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
}

/**
 * 将Font Awesome图标替换为SVG图标
 * @param {Element} iconElement - Font Awesome图标元素
 */
function replaceIconWithSvg(iconElement) {
    // 提取图标名称
    const classes = iconElement.className.split(' ');
    let iconName = '';
    let colorClass = '';
    
    // 查找图标名称和颜色类
    classes.forEach(cls => {
        if (cls.startsWith('fa-') && cls !== 'fa-fw') {
            iconName = cls;
        }
        if (cls.includes('text-')) {
            colorClass = cls;
        }
    });
    
    if (!iconName) return;
    
    // 创建SVG图像元素
    const imgElement = document.createElement('img');
    imgElement.src = `static/icons/${iconName}.svg`;
    imgElement.alt = iconName.replace('fa-', '');
    imgElement.className = `w-5 h-5 ${colorClass}`;
    
    // 保留原始元素的其他类名
    classes.forEach(cls => {
        if (!cls.startsWith('fa-') && !cls.includes('text-')) {
            imgElement.classList.add(cls);
        }
    });
    
    // 替换原始图标
    iconElement.parentNode.replaceChild(imgElement, iconElement);
}

/**
 * 监听点赞和收藏按钮的状态变化
 */
function observeIconChanges() {
    // 监听点赞和收藏按钮的类名变化
    document.addEventListener('click', (event) => {
        // 检查是否点击了点赞或收藏按钮
        const target = event.target.closest('[data-action="like"], [data-favorited]');
        if (target) {
            // 延迟执行，等待原始代码更新图标类名
            setTimeout(() => {
                const icon = target.querySelector('i');
                if (icon) {
                    replaceIconWithSvg(icon);
                }
            }, 100);
        }
    });
}

/**
 * 处理模态框中的图标
 */
function handleModalIcons() {
    // 获取所有模态框
    const modals = document.querySelectorAll('[id$="-modal"]');
    
    // 为每个模态框添加显示事件监听
    modals.forEach(modal => {
        // 使用MutationObserver监听模态框的显示状态变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class' && !modal.classList.contains('hidden')) {
                    // 模态框显示时，处理其中的SVG图标
                    const icons = modal.querySelectorAll('img[src^="static/icons/fa-"]');
                    icons.forEach(icon => {
                        // 确保图标应用了正确的类名和样式
                        updateIconClasses(icon);
                    });
                }
            });
        });
        
        // 开始观察模态框
        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['class']
        });
    });
}

/**
 * 更新图标的类名和样式
 * @param {Element} icon - SVG图标元素
 */
function updateIconClasses(icon) {
    // 获取图标的父元素
    const parent = icon.parentElement;
    
    // 检查父元素是否有特定的类名
    if (parent.classList.contains('text-gray-400')) {
        icon.classList.add('text-gray-400');
    } else if (parent.classList.contains('text-gray-500')) {
        icon.classList.add('text-gray-500');
    } else if (parent.classList.contains('text-gray-600')) {
        icon.classList.add('text-gray-600');
    } else if (parent.classList.contains('text-gray-700')) {
        icon.classList.add('text-gray-700');
    } else if (parent.classList.contains('text-primary')) {
        icon.classList.add('text-primary');
    } else if (parent.classList.contains('text-white')) {
        icon.classList.add('text-white');
    } else if (parent.classList.contains('text-red-400')) {
        icon.classList.add('text-red-400');
    } else if (parent.classList.contains('text-red-500')) {
        icon.classList.add('text-red-500');
    } else if (parent.classList.contains('text-yellow-400')) {
        icon.classList.add('text-yellow-400');
    }
    
    // 检查父元素是否有悬停类名
    if (parent.classList.contains('hover:text-primary')) {
        icon.classList.add('hover:text-primary');
    } else if (parent.classList.contains('hover:text-white')) {
        icon.classList.add('hover:text-white');
    } else if (parent.classList.contains('hover:text-gray-700')) {
        icon.classList.add('hover:text-gray-700');
    }
}