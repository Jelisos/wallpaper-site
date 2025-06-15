/**
 * 文件: static/js/dashboard.js
 * 描述: 仪表盘页面的核心逻辑，包括侧边栏导航、用户信息加载、搜索功能、登出功能，以及头像上传、个人资料修改、密码修改等。
 * 依赖: utils.js, modals.js, user-menu.js
 * 作者: AI助手
 * 日期: 2024-07-29
 */

const Dashboard = {
    init: function() {
        console.log('[Dashboard] 初始化...');
        this.bindEvents();
        this.loadUserInfo();
        this.initSidebarTabSwitching();
    },

    bindEvents: function() {
        // 搜索框回车跳首页并带参数
        const dashboardSearchInput = document.getElementById('dashboard-search-input');
        if (dashboardSearchInput) {
            dashboardSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const kw = dashboardSearchInput.value.trim();
                    if (kw) window.open(`/index.html?search=${encodeURIComponent(kw)}`, '_blank');
                }
            });
        }

        // 退出登录按钮
        const dashboardLogoutBtn = document.getElementById('dashboard-logout-btn');
        if (dashboardLogoutBtn) {
            dashboardLogoutBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                try {
                    const response = await fetch('/api/logout.php');
                    const data = await response.json();
                    if (data.code === 200) {
                        Utils.showToastMessage('登出成功', 'success');
                        setTimeout(() => { window.location.href = '/index.html'; }, 1000);
                    } else {
                        Utils.showToastMessage(data.message || '登出失败', 'error');
                    }
                } catch (error) {
                    console.error("登出请求失败: ", error);
                    Utils.showToastMessage('网络错误，登出失败', 'error');
                }
            });
        }

        // 移动端侧边栏按钮
        const mobileSidebarButton = document.getElementById('mobile-sidebar-button');
        const sidebar = document.getElementById('sidebar');
        if (mobileSidebarButton && sidebar) {
            mobileSidebarButton.addEventListener('click', () => {
                sidebar.classList.toggle('hidden');
                sidebar.classList.toggle('mobile-visible'); // 添加一个类来控制移动端显示
            });
        }

        // TODO: 其他仪表盘相关事件绑定，例如图片管理、个人资料修改、密码修改、头像上传等
        // 这些需要从dashboard.html中复制过来
        this.bindProfileSettingsEvents();
        this.bindAvatarUploadEvents();
    },

    loadUserInfo: async function() {
        try {
            const response = await fetch('/api/userinfo.php?action=getUserInfo');
            const json = await response.json();

            if (json.code === 200 && json.data) {
                const userData = json.data;
                document.querySelectorAll('.user-avatar').forEach(el => {
                    if (userData.avatar) el.src = userData.avatar + '?t=' + Date.now();
                });
                document.querySelectorAll('.user-username').forEach(el => {
                    el.textContent = userData.username;
                });
                document.querySelectorAll('.user-membership').forEach(el => {
                    el.textContent = userData.is_admin ? '管理员' : '普通会员';
                });
                // 2024-07-29 新增：如果用户是管理员，显示流放管理菜单项
                if (userData.is_admin) {
                    const adminExileMenuItem = document.getElementById('admin-exile-menu-item');
                    if (adminExileMenuItem) {
                        adminExileMenuItem.classList.remove('hidden');
                    }
                }

                // 自动填充资料
                const profileUsernameInput = document.getElementById('profile-username');
                const profileEmailInput = document.getElementById('profile-email');
                if (profileUsernameInput) profileUsernameInput.value = userData.username;
                if (profileEmailInput) profileEmailInput.value = userData.email;
                
            } else if (json.code === 401) {
                // 未登录，跳转到登录页
                Utils.showToastMessage('未登录或会话已过期，请重新登录', 'warning');
                setTimeout(() => { window.location.href = '/index.html'; }, 1500);
            } else {
                console.error("获取用户信息失败: ", json.message);
                Utils.showToastMessage(json.message || '获取用户信息失败', 'error');
            }
        } catch (error) {
            console.error("加载用户信息失败: ", error);
            Utils.showToastMessage('网络错误，无法加载用户信息', 'error');
        }
    },

    initSidebarTabSwitching: function() {
        const tabMap = {
            '#dashboard': 'dashboard-section',
            '#liked': 'liked-section',
            '#collections': 'collections-section',
            '#downloads': 'downloads-section',
            '#uploads': 'uploads-section',
            '#history': 'history-section',
            '#settings': 'settings-section',
            '#exile-management': 'exile-management-section' // 2024-07-29 新增
        };
        const navLinks = document.querySelectorAll('aside nav a');
        const sections = Object.values(tabMap).map(id => document.getElementById(id));
        
        navLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const hash = this.getAttribute('href');

                // 隐藏所有内容区域
                sections.forEach(sec => sec && sec.classList.add('hidden'));

                // 显示对应的内容区域
                if (tabMap[hash]) {
                    const showSec = document.getElementById(tabMap[hash]);
                    if (showSec) showSec.classList.remove('hidden');
                }

                // 激活菜单高亮
                navLinks.forEach(l => l.classList.remove('bg-primary/10', 'text-primary'));
                this.classList.add('bg-primary/10', 'text-primary');

                // 如果是流放管理，加载日志
                if (hash === '#exile-management' && typeof AdminExile !== 'undefined') {
                    AdminExile.loadOperationLogs();
                }
            });
        });

        // 初始根据URL hash显示对应内容
        const initialHash = window.location.hash;
        if (initialHash && tabMap[initialHash]) {
            const initialSection = document.getElementById(tabMap[initialHash]);
            if (initialSection) initialSection.classList.remove('hidden');
            const activeLink = document.querySelector(`aside nav a[href="${initialHash}"]`);
            if (activeLink) {
                navLinks.forEach(l => l.classList.remove('bg-primary/10', 'text-primary'));
                activeLink.classList.add('bg-primary/10', 'text-primary');
            }
        } else {
            // 默认显示仪表盘
            const dashboardSection = document.getElementById('dashboard-section');
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            const dashboardLink = document.querySelector('a[href="#dashboard"]');
            if (dashboardLink) dashboardLink.classList.add('bg-primary/10', 'text-primary');
        }
    },

    bindProfileSettingsEvents: function() {
        // 资料修改
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.onsubmit = async function (e) {
                e.preventDefault();
                const username = document.getElementById('profile-username').value.trim();
                const email = document.getElementById('profile-email').value.trim();
                const profileSuccess = document.getElementById('profile-success');
                const profileError = document.getElementById('profile-error');
                profileSuccess.classList.add('hidden');
                profileError.classList.add('hidden');

                try {
                    const response = await fetch('/api/update_profile.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`
                    });
                    const json = await response.json();
                    if (json.code === 200) {
                        profileSuccess.textContent = json.message;
                        profileSuccess.classList.remove('hidden');
                        Dashboard.loadUserInfo(); // 刷新用户信息，更新侧边栏
                    } else {
                        profileError.textContent = json.message;
                        profileError.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error("更新个人资料失败: ", error);
                    profileError.textContent = '网络错误，更新失败';
                    profileError.classList.remove('hidden');
                }
            };
        }

        // 密码修改
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.onsubmit = async function (e) {
                e.preventDefault();
                const old_password = document.getElementById('old-password').value;
                const new_password = document.getElementById('new-password').value;
                const confirm_password = document.getElementById('confirm-password').value;
                const passwordSuccess = document.getElementById('password-success');
                const passwordError = document.getElementById('password-error');
                passwordSuccess.classList.add('hidden');
                passwordError.classList.add('hidden');

                if (new_password !== confirm_password) {
                    passwordError.textContent = '新密码和确认密码不一致';
                    passwordError.classList.remove('hidden');
                    return;
                }
                // 验证密码强度
                if (new_password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(new_password)) {
                    passwordError.textContent = '密码必须至少8位，包含字母和数字';
                    passwordError.classList.remove('hidden');
                    return;
                }

                try {
                    const response = await fetch('/api/change_password.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `old_password=${encodeURIComponent(old_password)}&new_password=${encodeURIComponent(new_password)}&confirm_password=${encodeURIComponent(confirm_password)}`
                    });
                    const json = await response.json();
                    if (json.code === 200) {
                        passwordSuccess.textContent = json.message;
                        passwordSuccess.classList.remove('hidden');
                        passwordForm.reset(); // 清空表单
                    } else {
                        passwordError.textContent = json.message;
                        passwordError.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error("修改密码失败: ", error);
                    passwordError.textContent = '网络错误，修改失败';
                    passwordError.classList.remove('hidden');
                }
            };
        }
    },

    bindAvatarUploadEvents: function() {
        const avatarForm = document.getElementById('avatar-form');
        const avatarUploadBtn = avatarForm ? avatarForm.querySelector('button[type="submit"]') : null;
        let cropper = null;
        let croppedBlob = null;
        
        if (!avatarForm || !avatarUploadBtn) return; // 如果元素不存在，直接返回

        // 上传按钮初始禁用
        avatarUploadBtn.disabled = true;
        avatarUploadBtn.classList.add('opacity-50', 'cursor-not-allowed');

        // 头像选择与裁剪
        const chooseAvatarBtn = document.getElementById('choose-avatar');
        const avatarInput = document.getElementById('avatar-input');
        const avatarCropperModal = document.getElementById('avatar-cropper-modal');
        const cropperImg = document.getElementById('cropper-image');
        const cropperCancelBtn = document.getElementById('cropper-cancel');
        const cropperConfirmBtn = document.getElementById('cropper-confirm');

        if (chooseAvatarBtn) {
            chooseAvatarBtn.onclick = function () {
                avatarInput.click();
            };
        }

        if (avatarInput) {
            avatarInput.onchange = function () {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        if (avatarCropperModal) avatarCropperModal.classList.remove('hidden');
                        if (cropperImg) cropperImg.src = e.target.result;
                        if (cropper) cropper.destroy();
                        cropper = new Cropper(cropperImg, {
                            aspectRatio: 1,
                            viewMode: 1,
                            autoCropArea: 1,
                            movable: true,
                            zoomable: true,
                            rotatable: false,
                            scalable: false
                        });
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        if (cropperCancelBtn) {
            cropperCancelBtn.onclick = function () {
                if (avatarCropperModal) avatarCropperModal.classList.add('hidden');
                if (cropper) cropper.destroy();
                cropper = null;
                if (avatarInput) avatarInput.value = ''; // 清空文件输入框
                croppedBlob = null;
                avatarUploadBtn.disabled = true;
                avatarUploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
            };
        }

        if (cropperConfirmBtn) {
            cropperConfirmBtn.onclick = function () {
                if (!cropper) return;
                cropper.getCroppedCanvas({ width: 256, height: 256 }).toBlob(function (blob) {
                    croppedBlob = blob;
                    const url = URL.createObjectURL(blob);
                    const avatarPreview = document.getElementById('avatar-preview');
                    if (avatarPreview) avatarPreview.src = url;
                    if (avatarCropperModal) avatarCropperModal.classList.add('hidden');
                    if (cropper) cropper.destroy();
                    cropper = null;
                    // 启用上传按钮
                    avatarUploadBtn.disabled = false;
                    avatarUploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }, 'image/png');
            };
        }

        // 头像上传
        avatarForm.onsubmit = async function (e) {
            e.preventDefault();
            const avatarSuccess = document.getElementById('avatar-success');
            const avatarError = document.getElementById('avatar-error');
            avatarSuccess.classList.add('hidden');
            avatarError.classList.add('hidden');

            if (!croppedBlob) {
                avatarError.textContent = '请先选择并裁剪头像';
                avatarError.classList.remove('hidden');
                return;
            }
            avatarUploadBtn.disabled = true;
            avatarUploadBtn.textContent = '上传中...'; // 修改按钮文本
            avatarUploadBtn.classList.add('opacity-50', 'cursor-not-allowed');

            const formData = new FormData();
            formData.append('avatar', croppedBlob, 'avatar.png');

            try {
                const response = await fetch('/api/upload_avatar.php', {
                    method: 'POST',
                    body: formData
                });
                const json = await response.json();

                if (json.code === 200) {
                    avatarSuccess.textContent = json.message;
                    avatarSuccess.classList.remove('hidden');
                    // 直接更新当前页面的头像，无需刷新所有头像
                    const avatarPreview = document.getElementById('avatar-preview');
                    if (avatarPreview) avatarPreview.src = json.data + '?t=' + Date.now();

                    // 更新侧边栏的用户头像
                    document.querySelectorAll('.user-avatar').forEach(el => el.src = json.data + '?t=' + Date.now());

                    // 重置状态
                    croppedBlob = null;
                    if (avatarInput) avatarInput.value = '';
                    avatarUploadBtn.disabled = true;
                    avatarUploadBtn.textContent = '上传头像'; // 恢复按钮文本
                    avatarUploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    avatarError.textContent = json.message;
                    avatarError.classList.remove('hidden');
                    avatarUploadBtn.disabled = false;
                    avatarUploadBtn.textContent = '上传头像'; // 恢复按钮文本
                    avatarUploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            } catch (error) {
                console.error("头像上传失败: ", error);
                avatarError.textContent = '网络错误，头像上传失败';
                avatarError.classList.remove('hidden');
                avatarUploadBtn.disabled = false;
                avatarUploadBtn.textContent = '上传头像'; // 恢复按钮文本
                avatarUploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };
    }
};

// 确保在DOM加载完成后初始化Dashboard模块
// 这一部分会由dashboard.html中的DOMContentLoaded事件处理，这里不再直接调用
// document.addEventListener('DOMContentLoaded', function() {
//     Dashboard.init();
// }); 