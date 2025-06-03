/**
 * 用户菜单功能
 * @author Claude
 * @date 2024-03-21
 */

// 用户菜单控制
const userMenu = document.getElementById('user-menu');
const userBtn = document.getElementById('user-btn');
const userDropdown = document.getElementById('user-dropdown');

// 切换用户下拉菜单
function toggleUserDropdown(e) {
    if (!userBtn || !userDropdown) return;
    
    e.stopPropagation(); // 阻止事件冒泡
    userDropdown.classList.toggle('hidden');
}

// 点击页面其他地方关闭下拉菜单
function closeUserDropdown(e) {
    if (!userMenu || !userDropdown) return;
    
    if (!userMenu.contains(e.target)) {
        userDropdown.classList.add('hidden');
    }
}

// 初始化用户菜单
function initUserMenu() {
    if (!userBtn || !userDropdown) return;
    
    // 绑定点击事件
    userBtn.addEventListener('click', toggleUserDropdown);
    document.addEventListener('click', closeUserDropdown);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initUserMenu); 