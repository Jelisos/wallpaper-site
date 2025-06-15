/**
 * 用户认证相关功能
 * @author Claude
 * @date 2024-03-21
 */

// API基础URL
const API_BASE_URL = '/api';

// 模态框控制
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const loginModalContent = document.getElementById('login-modal-content');
const registerModalContent = document.getElementById('register-modal-content');

// 打开登录模态框
function openLoginModal() {
    loginModal.classList.remove('hidden');
    setTimeout(() => {
        loginModalContent.classList.remove('scale-95', 'opacity-0');
        loginModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

// 关闭登录模态框
function closeLoginModal() {
    loginModalContent.classList.remove('scale-100', 'opacity-100');
    loginModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        loginModal.classList.add('hidden');
    }, 300);
}

// 打开注册模态框
function openRegisterModal() {
    registerModal.classList.remove('hidden');
    setTimeout(() => {
        registerModalContent.classList.remove('scale-95', 'opacity-0');
        registerModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

// 关闭注册模态框
function closeRegisterModal() {
    registerModalContent.classList.remove('scale-100', 'opacity-100');
    registerModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        registerModal.classList.add('hidden');
    }, 300);
}

// 打开个人设置模态框
function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalContent = document.getElementById('settings-modal-content');
    if (settingsModal && settingsModalContent) {
        settingsModal.classList.remove('hidden');
        setTimeout(() => {
            settingsModalContent.classList.remove('scale-95', 'opacity-0');
            settingsModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        populateSettingsModal(); // 打开时填充用户信息
    }
}

// 关闭个人设置模态框
function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalContent = document.getElementById('settings-modal-content');
    if (settingsModal && settingsModalContent) {
        settingsModalContent.classList.remove('scale-100', 'opacity-100');
        settingsModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            settingsModal.classList.add('hidden');
        }, 300);
    }
}

// 打开修改密码模态框
function openChangePasswordModal() {
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordModalContent = document.getElementById('change-password-modal-content');
    if (changePasswordModal && changePasswordModalContent) {
        changePasswordModal.classList.remove('hidden');
        setTimeout(() => {
            changePasswordModalContent.classList.remove('scale-95', 'opacity-0');
            changePasswordModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

// 关闭修改密码模态框
function closeChangePasswordModal() {
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordModalContent = document.getElementById('change-password-modal-content');
    if (changePasswordModal && changePasswordModalContent) {
        changePasswordModalContent.classList.remove('scale-100', 'opacity-100');
        changePasswordModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            changePasswordModal.classList.add('hidden');
        }, 300);
    }
}

// 表单验证
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    // 至少8位，包含字母和数字
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return re.test(password);
}

// 填充个人设置模态框的用户信息
function populateSettingsModal() {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const usernameElement = document.getElementById('settings-username');
    const emailElement = document.getElementById('settings-email');

    if (usernameElement) {
        usernameElement.value = userData.username || '';
        // 使用户名可编辑
        usernameElement.readOnly = false;
        usernameElement.classList.remove('readonly'); // 如果有readonly的样式类可以移除
    }
    if (emailElement) {
        emailElement.value = userData.email || '';
        // 邮箱通常不可编辑，保持只读
        emailElement.readOnly = true;
    }
}

// 登录处理
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // 表单验证
    if (!email || !validateEmail(email)) {
        alert('请输入有效的邮箱地址');
        return;
    }
    if (!password) {
        alert('请输入密码');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'login',
                email,
                password
            })
        });

        const result = await response.json();

        if (result.code === 200) {
            // 存储用户信息和会话ID
            localStorage.setItem('user', JSON.stringify(result.data));
            
            // 关闭模态框
            closeLoginModal();
            
            // 更新UI显示
            updateUIAfterLogin(result.data);
            
            alert('登录成功！');
        } else {
            alert(result.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败，请重试');
    }
}

// 注册处理
async function handleRegister() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    // 表单验证
    if (!username) {
        alert('请输入用户名');
        return;
    }
    if (!email || !validateEmail(email)) {
        alert('请输入有效的邮箱地址');
        return;
    }
    if (!validatePassword(password)) {
        alert('密码至少8位，必须包含字母和数字');
        return;
    }
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'register',
                username,
                email,
                password
            })
        });

        const result = await response.json();

        if (result.code === 200) {
            // 存储用户信息
            localStorage.setItem('user', JSON.stringify(result.data));
            
            // 关闭模态框
            closeRegisterModal();
            
            // 更新UI显示
            updateUIAfterLogin(result.data);
            
            alert('注册成功！');
        } else {
            alert(result.message || '注册失败');
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败，请重试');
    }
}

// 更新UI显示
function updateUIAfterLogin(userData) {
    const usernameElement = document.getElementById('username');
    const userAvatar = document.getElementById('user-avatar');
    const logoutLink = document.getElementById('logout-link');
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (usernameElement) {
        usernameElement.textContent = userData.username;
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
}

// 登出处理
async function handleLogout() {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.sessionId}`
            },
            body: JSON.stringify({
                action: 'logout'
            })
        });

        const result = await response.json();

        if (result.code === 200) {
            // 清除本地存储
            localStorage.removeItem('user');
            
            // 刷新页面
            location.reload();
        } else {
            alert(result.message || '登出失败');
        }
    } catch (error) {
        console.error('登出错误:', error);
        alert('登出失败，请重试');
    }
}

// 检查登录状态
async function checkLoginStatus() {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (userData.sessionId) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth.php?action=getUserInfo`, {
                headers: {
                    'Authorization': `Bearer ${userData.sessionId}`
                }
            });

            const result = await response.json();

            if (result.code === 200) {
                // 更新用户信息
                userData.username = result.data.username;
                userData.email = result.data.email;
                localStorage.setItem('user', JSON.stringify(userData));
                
                // 更新UI
                updateUIAfterLogin(userData);
            } else {
                // 会话已过期，清除本地存储
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('检查登录状态错误:', error);
            localStorage.removeItem('user');
        }
    }
}

// 处理更新个人信息
async function handleUpdateProfile() {
    const newUsername = document.getElementById('settings-username').value.trim();

    if (!newUsername) {
        alert('用户名不能为空');
        return;
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.sessionId) {
        alert('请先登录');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.sessionId}`
            },
            body: JSON.stringify({
                action: 'updateProfile',
                username: newUsername
            })
        });

        const result = await response.json();

        if (result.code === 200) {
            // 更新本地存储的用户信息
            userData.username = result.data.username;
            localStorage.setItem('user', JSON.stringify(userData));

            // 更新导航栏显示
            updateUIAfterLogin(userData);

            alert('个人信息更新成功！');
            // 可以选择关闭模态框或留在原地
            closeSettingsModal();
        } else {
            alert(result.message || '个人信息更新失败');
        }
    } catch (error) {
        console.error('更新个人信息错误:', error);
        alert('更新个人信息失败，请重试');
    }
}

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    checkLoginStatus();

    // 登录相关事件
    document.getElementById('login-submit')?.addEventListener('click', handleLogin);
    document.getElementById('close-login-modal')?.addEventListener('click', closeLoginModal);
    document.getElementById('switch-to-register')?.addEventListener('click', () => {
        closeLoginModal();
        openRegisterModal();
    });

    // 注册相关事件
    document.getElementById('register-submit')?.addEventListener('click', handleRegister);
    document.getElementById('close-register-modal')?.addEventListener('click', closeRegisterModal);
    document.getElementById('switch-to-login')?.addEventListener('click', () => {
        closeRegisterModal();
        openLoginModal();
    });

    // 登出事件
    logoutLink?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // 个人设置相关事件
    const settingsLink = document.getElementById('settings-link'); // 获取个人设置链接
    settingsLink?.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal();
    });
    
    document.getElementById('close-settings-modal')?.addEventListener('click', closeSettingsModal);
    
    // 修改密码相关事件
    document.getElementById('open-change-password-modal')?.addEventListener('click', () => {
        closeSettingsModal();
        openChangePasswordModal();
    });
    
    document.getElementById('close-change-password-modal')?.addEventListener('click', () => {
        closeChangePasswordModal();
        // 您可能希望在这里重新打开个人设置模态框，或者直接关闭所有模态框
        // 这里选择直接关闭所有，如果您希望返回设置页，可以调用 openSettingsModal();
        openSettingsModal(); // 返回个人设置页面
    });

    document.getElementById('save-new-password')?.addEventListener('click', handlePasswordChange);

    // 个人设置保存按钮事件
    const settingsModalContent = document.getElementById('settings-modal-content');
    if (settingsModalContent) {
        // 在模态框内容中查找并添加保存按钮
        let saveButton = settingsModalContent.querySelector('#settings-modal .items-center button');
        // 检查是否已经有修改密码按钮，在其上方添加保存按钮
        const changePasswordButton = document.getElementById('open-change-password-modal');
        if (changePasswordButton) {
             saveButton = document.createElement('button');
             saveButton.id = 'save-profile-changes';
             saveButton.classList.add('px-4', 'py-2', 'bg-green-500', 'text-white', 'text-base', 'font-medium', 'rounded-md', 'w-full', 'shadow-sm', 'hover:bg-green-600', 'focus:outline-none', 'focus:ring-2', 'focus:ring-green-300', 'mb-2'); // 添加mb-2以与修改密码按钮保持间距
             saveButton.textContent = '保存更改';
             changePasswordButton.parentNode.insertBefore(saveButton, changePasswordButton);
        } else { // 如果没有修改密码按钮，直接添加到items-center div的末尾
            const itemsCenterDiv = settingsModalContent.querySelector('#settings-modal .items-center');
            if (itemsCenterDiv) {
                 saveButton = document.createElement('button');
                 saveButton.id = 'save-profile-changes';
                 saveButton.classList.add('px-4', 'py-2', 'bg-green-500', 'text-white', 'text-base', 'font-medium', 'rounded-md', 'w-full', 'shadow-sm', 'hover:bg-green-600', 'focus:outline-none', 'focus:ring-2', 'focus:ring-green-300', 'mb-2');
                 saveButton.textContent = '保存更改';
                 itemsCenterDiv.insertBefore(saveButton, itemsCenterDiv.firstChild); // 添加到最前面
            }
        }

        if (saveButton) {
            saveButton.addEventListener('click', handleUpdateProfile);
        }
    }
});

// TODO: 实现 handlePasswordChange 函数用于处理密码修改
async function handlePasswordChange() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    // 基本验证
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert('请填写所有密码字段');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        alert('两次输入的新密码不一致');
        return;
    }
    if (!validatePassword(newPassword)) {
        alert('新密码不符合要求（至少8位，包含字母和数字）');
        return;
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.sessionId) {
        alert('请先登录');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.sessionId}`
            },
            body: JSON.stringify({
                action: 'changePassword',
                currentPassword,
                newPassword
            })
        });

        const result = await response.json();

        if (result.code === 200) {
            alert('密码修改成功，请重新登录');
            localStorage.removeItem('user'); // 清除旧的会话信息
            location.reload(); // 刷新页面要求重新登录
        } else {
            alert(result.message || '密码修改失败');
        }
    } catch (error) {
        console.error('修改密码错误:', error);
        alert('密码修改失败，请重试');
    }
}