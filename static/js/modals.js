/**
 * 模态框管理模块
 */
const ModalManager = {
    /**
     * 模态框动画效果
     */
    effects: {
        open(modal, content) {
            // 确保移除hidden类并添加show类
            modal.classList.remove('hidden');
            modal.classList.add('show');
            
            // 延迟一帧以确保过渡效果正常触发
            requestAnimationFrame(() => {
                // 添加show类以显示内容并触发动画
                content.classList.add('show');
            });
        },
        close(modal, content) {
            // 移除show类以隐藏内容并触发动画
            content.classList.remove('show');
            
            // 延迟后隐藏整个模态框
            setTimeout(() => {
                modal.classList.remove('show');
                modal.classList.add('hidden');
            }, CONFIG.ANIMATION.DURATION);
        }
    },

    /**
     * 初始化所有模态框
     */
    init() {
        // 为所有模态框内容添加modal-content类
        this.setupModalContentClasses();
        
        // 登录模态框
        this.initLoginModal();
        // 注册模态框
        this.initRegisterModal();
        // 登录/注册弹窗切换
        this.initSwitchAuthModal();
        // 登录表单校验与交互
        this.initLoginForm();
        // 注册表单校验与交互
        this.initRegisterForm();
        // 上传模态框

        // 添加分类模态框
        this.initAddCategoryModal();
        // 壁纸详情模态框
        // initWallpaperDetailModal已迁移至wallpaper-detail.js
        // 二维码模态框
        this.initQRCodeModal();
    },
    
    /**
     * 为所有模态框内容添加modal-content类
     */
    setupModalContentClasses() {
        // 获取所有模态框内容元素
        const modalContents = document.querySelectorAll('[id$="-modal-content"]');
        
        // 为每个模态框内容添加modal-content类
        modalContents.forEach(content => {
            content.classList.add('modal-content');
        });
        
        // 为所有模态框添加modal类
        const modals = document.querySelectorAll('[id$="-modal"]');
        modals.forEach(modal => {
            if (!modal.id.endsWith('-modal-content')) {
                modal.classList.add('modal');
            }
        });
    },

    /**
     * 初始化登录模态框
     */
    initLoginModal() {
        const loginModal = document.getElementById('login-modal');
        const loginModalContent = document.getElementById('login-modal-content');
        const loginLink = document.getElementById('login-link');
        const closeLoginModal = document.getElementById('close-login-modal');

        if (!loginModal || !loginModalContent || !loginLink || !closeLoginModal) {
            return;
        }

        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.effects.open(loginModal, loginModalContent);
        });

        closeLoginModal.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止关闭按钮的点击事件冒泡
            this.effects.close(loginModal, loginModalContent);
        });
        
        // 添加点击模态框背景关闭的事件监听器
        loginModal.addEventListener('click', (e) => {
            // 只有当点击的是模态框背景时才关闭
            if (e.target === loginModal) {
                this.effects.close(loginModal, loginModalContent);
            }
        });
        
        // 阻止模态框内容的点击事件冒泡
        loginModalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    },

    /**
     * 初始化注册模态框
     */
    initRegisterModal() {
        const registerModal = document.getElementById('register-modal');
        const registerModalContent = document.getElementById('register-modal-content');
        const registerLink = document.getElementById('register-link');
        const closeRegisterModal = document.getElementById('close-register-modal');

        if (!registerModal || !registerModalContent || !registerLink || !closeRegisterModal) {
            return;
        }

        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.effects.open(registerModal, registerModalContent);
        });

        closeRegisterModal.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止关闭按钮的点击事件冒泡
            this.effects.close(registerModal, registerModalContent);
        });
        
        // 添加点击模态框背景关闭的事件监听器
        registerModal.addEventListener('click', (e) => {
            // 只有当点击的是模态框背景时才关闭
            if (e.target === registerModal) {
                this.effects.close(registerModal, registerModalContent);
            }
        });
        
        // 阻止模态框内容的点击事件冒泡
        registerModalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    },

    /**
     * 登录/注册弹窗切换
     */
    initSwitchAuthModal() {
        const loginModal = document.getElementById('login-modal');
        const loginModalContent = document.getElementById('login-modal-content');
        const registerModal = document.getElementById('register-modal');
        const registerModalContent = document.getElementById('register-modal-content');
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        if (switchToRegister) {
            switchToRegister.addEventListener('click', () => {
                this.effects.close(loginModal, loginModalContent);
                setTimeout(() => {
                    this.effects.open(registerModal, registerModalContent);
                }, CONFIG.ANIMATION.DURATION);
            });
        }
        if (switchToLogin) {
            switchToLogin.addEventListener('click', () => {
                this.effects.close(registerModal, registerModalContent);
                setTimeout(() => {
                    this.effects.open(loginModal, loginModalContent);
                }, CONFIG.ANIMATION.DURATION);
            });
        }
    },

    /**
     * 登录表单校验与交互
     */
    initLoginForm() {
        const loginModal = document.getElementById('login-modal');
        const loginModalContent = document.getElementById('login-modal-content');
        const loginForm = loginModal.querySelector('form');
        // 修改这里，使用正确的ID：login-username而不是login-email
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const submitBtn = document.getElementById('login-submit');
        const errorMsg = loginForm ? loginForm.querySelector('.form-error-msg') : null;
        if (!loginForm) return;
        /**
         * 清空错误提示
         */
        function clearError() {
            errorMsg.textContent = '';
        }
        /**
         * 显示错误提示
         * @param {string} msg 错误信息
         */
        function showError(msg) {
            errorMsg.textContent = msg;
        }
        /**
         * 校验用户名或邮箱格式
         * @param {string} username 用户名或邮箱
         * @returns {boolean}
         */
        function isValidUsernameOrEmail(username) {
            // 允许用户名或邮箱格式
            return username.length >= 3 || /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(username);
        }
        submitBtn.addEventListener('click', async () => {
            clearError();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            // 校验
            if (!username) {
                showError('请输入用户名或邮箱');
                return;
            }
            if (!isValidUsernameOrEmail(username)) {
                showError('用户名或邮箱格式不正确');
                return;
            }
            if (!password) {
                showError('请输入密码');
                return;
            }
            // 按钮防抖
            submitBtn.disabled = true;
            submitBtn.textContent = '登录中...';
            try {
                /**
                 * 调用后端登录接口
                 */
                const res = await fetch('api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });
                const data = await res.json();
                if (data.code === 0) {
                    // 登录成功
                    showError('登录成功，正在跳转...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                } else {
                    showError(data.msg || '登录失败');
                }
            } catch (e) {
                showError('网络异常，请重试');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        });
        // 支持回车键提交
        loginForm.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitBtn.click();
            }
        });
        // 输入时清空错误
        usernameInput.addEventListener('input', clearError);
        passwordInput.addEventListener('input', clearError);
    },

    /**
     * 注册表单校验与交互
     */
    initRegisterForm() {
        const registerModal = document.getElementById('register-modal');
        const registerModalContent = document.getElementById('register-modal-content');
        const registerForm = registerModal.querySelector('form');
        const usernameInput = document.getElementById('register-username');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const confirmInput = document.getElementById('register-confirm-password');
        const submitBtn = document.getElementById('register-submit');
        const errorMsg = registerForm ? registerForm.querySelector('.form-error-msg') : null;
        if (!registerForm) return;
        /**
         * 清空错误提示
         */
        function clearError() {
            errorMsg.textContent = '';
        }
        /**
         * 显示错误提示
         * @param {string} msg 错误信息
         */
        function showError(msg) {
            errorMsg.textContent = msg;
        }
        /**
         * 校验邮箱格式
         * @param {string} email 邮箱
         * @returns {boolean}
         */
        function isValidEmail(email) {
            return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email);
        }
        /**
         * 校验密码强度
         * @param {string} pwd 密码
         * @returns {boolean}
         */
        function isStrongPassword(pwd) {
            return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pwd);
        }
        submitBtn.addEventListener('click', async () => {
            clearError();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirm = confirmInput.value;
            // 校验
            if (!username) {
                showError('请输入用户名');
                return;
            }
            if (!email) {
                showError('请输入邮箱');
                return;
            }
            if (!isValidEmail(email)) {
                showError('邮箱格式不正确');
                return;
            }
            if (!password) {
                showError('请输入密码');
                return;
            }
            if (!isStrongPassword(password)) {
                showError('密码至少8位，且包含字母和数字');
                return;
            }
            if (!confirm) {
                showError('请再次输入密码');
                return;
            }
            if (password !== confirm) {
                showError('两次输入的密码不一致');
                return;
            }
            // 按钮防抖
            submitBtn.disabled = true;
            submitBtn.textContent = '注册中...';
            try {
                /**
                 * 调用后端注册接口
                 */
                const res = await fetch('api/register.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
                });
                const data = await res.json();
                if (data.code === 0) {
                    // 注册成功
                    showError('注册成功，请登录');
                    setTimeout(() => {
                        // 自动切换到登录弹窗并自动填充邮箱
                        registerModal.classList.add('hidden');
                        const loginModal = document.getElementById('login-modal');
                        const loginModalContent = document.getElementById('login-modal-content');
                        ModalManager.effects.open(loginModal, loginModalContent);
                        document.getElementById('login-email').value = email;
                        document.getElementById('login-password').focus();
                    }, 1000);
                } else {
                    showError(data.msg || '注册失败');
                }
            } catch (e) {
                showError('网络异常，请重试');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = '注册';
        });
        // 支持回车键提交
        registerForm.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitBtn.click();
            }
        });
        // 输入时清空错误
        usernameInput.addEventListener('input', clearError);
        emailInput.addEventListener('input', clearError);
        passwordInput.addEventListener('input', clearError);
        confirmInput.addEventListener('input', clearError);
    },

    /**
     * 初始化添加分类模态框
     */
    initAddCategoryModal() {
        const addCategoryModal = document.getElementById('addCategoryModal');
        const addCategoryModalContent = document.querySelector('#addCategoryModal .modal-content');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        const closeAddCategoryModal = document.getElementById('closeAddCategoryModal');
        const cancelAddCategory = document.getElementById('cancelAddCategory');
        
        // 检查元素是否存在
        if (!addCategoryModal || !addCategoryModalContent) {
            return;
        }
        
        if (!addCategoryBtn || !closeAddCategoryModal || !cancelAddCategory) {
            return;
        }

        addCategoryBtn.addEventListener('click', () => {
            this.effects.open(addCategoryModal, addCategoryModalContent);
        });

        closeAddCategoryModal.addEventListener('click', () => {
            this.effects.close(addCategoryModal, addCategoryModalContent);
        });

        // 添加取消按钮事件监听器
        cancelAddCategory.addEventListener('click', () => {
            this.effects.close(addCategoryModal, addCategoryModalContent);
        });

        // 点击模态框背景关闭
        addCategoryModal.addEventListener('click', (e) => {
            if (e.target === addCategoryModal) {
                this.effects.close(addCategoryModal, addCategoryModalContent);
            }
        });
    },

    /**
     * 壁纸详情模态框初始化已迁移至wallpaper-detail.js
     * 位置：static/js/wallpaper-detail.js - WallpaperDetailManager.initEventListeners()
     */

    /**
     * 初始化二维码模态框。
     */
    initQRCodeModal() {
        const qrcodeModal = document.getElementById('qrcode-modal');
        const qrcodeModalContent = document.getElementById('qrcode-modal-content');
        const qrcodeBtn = document.getElementById('qrcode-btn');
        const closeQrcodeModal = document.getElementById('close-qrcode-modal');

        qrcodeBtn.addEventListener('click', () => {
            // 使用动画效果打开模态框
            this.effects.open(qrcodeModal, qrcodeModalContent);
            
            // 生成二维码
            const qrcodeCanvas = document.getElementById('qrcode-canvas');
            qrcodeCanvas.getContext('2d').clearRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);
            new QRious({
                element: qrcodeCanvas,
                value: window.location.href,
                size: 200,
                level: 'H'
            });
        });

        closeQrcodeModal.addEventListener('click', () => {
            // 使用动画效果关闭模态框
            this.effects.close(qrcodeModal, qrcodeModalContent);
        });

        qrcodeModal.addEventListener('click', (e) => {
            if (e.target === qrcodeModal) {
                // 使用动画效果关闭模态框
                this.effects.close(qrcodeModal, qrcodeModalContent);
            }
        });
    },

    /**
     * 显示一个通用的确认模态框
     * @param {string} message - 确认消息
     * @returns {Promise<boolean>} - 如果用户确认则返回 true，否则返回 false
     */
    async confirm(message) {
        return new Promise(resolve => {
            const confirmModalId = 'general-confirm-modal';
            const confirmModalContentId = 'general-confirm-modal-content';

            // 检查是否已存在模态框，如果存在则重用
            let confirmModal = document.getElementById(confirmModalId);
            let confirmModalContent = document.getElementById(confirmModalContentId);

            if (!confirmModal) {
                confirmModal = document.createElement('div');
                confirmModal.id = confirmModalId;
                confirmModal.className = 'modal hidden';
                confirmModal.innerHTML = `
                    <div id="${confirmModalContentId}" class="modal-content transform transition-transform translate-y-full max-w-xs w-full mx-4 p-4 bg-white rounded-lg shadow-xl relative">
                        <p class="text-center text-base mb-4 text-gray-700 confirm-message leading-relaxed">${this.escapeHtml(message)}</p>
                        <div class="flex justify-center space-x-3">
                            <button class="confirm-cancel-btn px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm">取消</button>
                            <button class="confirm-ok-btn px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm">确定</button>
                        </div>
                        <button class="absolute top-2 right-2 text-gray-400 hover:text-gray-600" data-modal-dismiss="${confirmModalId}">
                            <img src="static/icons/fa-times.svg" alt="关闭" class="w-4 h-4">
                        </button>
                    </div>
                `;
                document.body.appendChild(confirmModal);

                confirmModalContent = document.getElementById(confirmModalContentId);
                // 由于是动态添加，可能需要再次调用 setupModalContentClasses 确保新元素被正确处理，
                // 或者确保 confirmModal 的结构符合 setupModalContentClasses 的选择器。
                // 简单起见，这里假设直接添加的元素会符合CSS。
            } else {
                // 如果已存在，更新消息
                confirmModal.querySelector('.confirm-message').textContent = message;
            }

            const okBtn = confirmModal.querySelector('.confirm-ok-btn');
            const cancelBtn = confirmModal.querySelector('.confirm-cancel-btn');
            const dismissBtn = confirmModal.querySelector('[data-modal-dismiss]');

            const cleanupAndResolve = (result) => {
                this.effects.close(confirmModal, confirmModalContent);
                // 移除事件监听器，避免内存泄露和重复触发
                okBtn.removeEventListener('click', okHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
                dismissBtn.removeEventListener('click', cancelHandler);
                confirmModal.removeEventListener('click', backgroundClickHandler);
                resolve(result);
            };

            const okHandler = () => cleanupAndResolve(true);
            const cancelHandler = () => cleanupAndResolve(false);
            const backgroundClickHandler = (e) => {
                if (e.target === confirmModal) {
                    cleanupAndResolve(false); // 点击背景视为取消
                }
            };

            // 确保每次打开都重新绑定，因为模态框可能被关闭后重新打开
            okBtn.addEventListener('click', okHandler);
            cancelBtn.addEventListener('click', cancelHandler);
            dismissBtn.addEventListener('click', cancelHandler);
            confirmModal.addEventListener('click', backgroundClickHandler); // 点击背景关闭

            this.effects.open(confirmModal, confirmModalContent);
        });
    },

    /**
     * HTML转义，防止XSS
     * @param {string} text - 需要转义的文本
     * @returns {string} - 转义后的文本
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
};

// 全局暴露 ModalManager 为 modals
window.modals = ModalManager;