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

/**
 * 用户菜单与登录状态管理
 * 页面加载时自动检测登录状态，动态显示用户名/头像或游客
 * 支持退出登录
 */
document.addEventListener('DOMContentLoaded', () => {
    const userAvatar = document.getElementById('user-avatar');
    const usernameSpan = document.getElementById('username');
    const logoutLink = document.getElementById('logout-link');
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');

    /**
     * 获取当前登录用户信息
     */
    function checkUserStatus() {
        fetch('api/userinfo.php')
            .then(res => res.json())
            .then(data => {
                if (data.code === 0 && data.data) {
                    // 已登录
                    updateUserMenuForLoggedIn(data.data);
                } else {
                    // 未登录
                    updateUserMenuForGuest();
                }
            })
            .catch(error => {
                console.error('检查用户状态失败:', error);
                updateUserMenuForGuest();
            });
    }

    /**
     * 更新用户菜单为已登录状态
     */
    function updateUserMenuForLoggedIn(userData) {
        // 2024-07-28 新增: 设置全局用户数据，供其他模块使用
        window.currentUser = userData; 

        if (usernameSpan) {
            usernameSpan.textContent = userData.username;
        }
        if (userAvatar) {
            userAvatar.src = userData.avatar || 'static/icons/default-avatar.svg';
            userAvatar.classList.remove('hidden');
        }
        if (logoutLink) logoutLink.classList.remove('hidden');
        if (loginLink) loginLink.classList.add('hidden');
        if (registerLink) registerLink.classList.add('hidden');
        
        // 动态插入个人中心入口
        let centerLink = document.getElementById('center-link');
        if (!centerLink && userDropdown) {
            centerLink = document.createElement('a');
            centerLink.id = 'center-link';
            centerLink.href = 'dashboard.html';
            centerLink.className = 'block px-4 py-2 hover:bg-gray-100 cursor-pointer';
            centerLink.textContent = '个人中心';
            userDropdown.insertBefore(centerLink, logoutLink);
        }
        
        // 2024-12-19 新增: 管理后台入口（仅管理员可见）
        const adminPanelLink = document.getElementById('admin-panel-link');
        if (adminPanelLink) {
            // 检查是否为管理员（is_admin字段为1）
            if (userData.is_admin === 1) {
                adminPanelLink.classList.remove('hidden');
                adminPanelLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.location.href = '/admin.html';
                });
            } else {
                adminPanelLink.classList.add('hidden');
            }
        }
    }

    /**
     * 更新用户菜单为游客状态
     */
    function updateUserMenuForGuest() {
        if (usernameSpan) {
            usernameSpan.textContent = '登录/注册';
        }
        if (userAvatar) {
            userAvatar.classList.add('hidden');
        }
        if (logoutLink) logoutLink.classList.add('hidden');
        if (loginLink) loginLink.classList.remove('hidden');
        if (registerLink) registerLink.classList.remove('hidden');
        
        // 未登录时移除个人中心入口
        let centerLink = document.getElementById('center-link');
        if (centerLink) centerLink.remove();
        
        // 2024-12-19 新增: 未登录时隐藏管理后台入口
        const adminPanelLink = document.getElementById('admin-panel-link');
        if (adminPanelLink) {
            adminPanelLink.classList.add('hidden');
        }
    }

    // 执行用户状态检查
    checkUserStatus();

    /**
     * 退出登录
     */
    logoutLink.addEventListener('click', function (e) {
        e.preventDefault();
        fetch('api/logout.php')
            .then(res => res.json())
            .then(data => {
                if (data.code === 0) {
                    window.location.reload();
                }
            });
    });
});