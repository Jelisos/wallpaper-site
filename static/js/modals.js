/**
 * 模态框管理模块
 */
const ModalManager = {
    /**
     * 模态框动画效果
     */
    effects: {
        open(modal, content) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        },
        close(modal, content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, CONFIG.ANIMATION.DURATION);
        }
    },

    /**
     * 初始化所有模态框
     */
    init() {
        // 登录模态框
        this.initLoginModal();
        // 注册模态框
        this.initRegisterModal();
        // 上传模态框
        this.initUploadModal();
        // 添加分类模态框
        this.initAddCategoryModal();
        // 壁纸详情模态框
        this.initWallpaperDetailModal();
        // 二维码模态框
        this.initQRCodeModal();
    },

    /**
     * 初始化登录模态框
     */
    initLoginModal() {
        const loginModal = document.getElementById('login-modal');
        const loginModalContent = document.getElementById('login-modal-content');
        const loginLink = document.getElementById('login-link');
        const closeLoginModal = document.getElementById('close-login-modal');

        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.effects.open(loginModal, loginModalContent);
        });

        closeLoginModal.addEventListener('click', () => {
            this.effects.close(loginModal, loginModalContent);
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

        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.effects.open(registerModal, registerModalContent);
        });

        closeRegisterModal.addEventListener('click', () => {
            this.effects.close(registerModal, registerModalContent);
        });
    },

    /**
     * 初始化上传模态框
     */
    initUploadModal() {
        const uploadModal = document.getElementById('upload-modal');
        const uploadModalContent = document.getElementById('upload-modal-content');
        const uploadBtn = document.getElementById('upload-btn');
        const closeUploadModal = document.getElementById('close-upload-modal');
        const cancelUpload = document.getElementById('cancel-upload');

        uploadBtn.addEventListener('click', () => {
            this.effects.open(uploadModal, uploadModalContent);
        });

        closeUploadModal.addEventListener('click', () => {
            this.effects.close(uploadModal, uploadModalContent);
        });

        cancelUpload.addEventListener('click', () => {
            this.effects.close(uploadModal, uploadModalContent);
        });

        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                this.effects.close(uploadModal, uploadModalContent);
            }
        });
    },

    /**
     * 初始化添加分类模态框
     */
    initAddCategoryModal() {
        const addCategoryModal = document.getElementById('add-category-modal');
        const addCategoryModalContent = document.getElementById('add-category-modal-content');
        const addCategoryBtn = document.getElementById('add-category-btn');
        const closeAddCategoryModal = document.getElementById('close-add-category-modal');

        addCategoryBtn.addEventListener('click', () => {
            this.effects.open(addCategoryModal, addCategoryModalContent);
        });

        closeAddCategoryModal.addEventListener('click', () => {
            this.effects.close(addCategoryModal, addCategoryModalContent);
        });
    },

    /**
     * 初始化壁纸详情模态框
     */
    initWallpaperDetailModal() {
        const detailModal = document.getElementById('wallpaper-detail-modal');
        const detailModalContent = document.getElementById('wallpaper-detail-modal-content');
        const closeDetailModal = document.getElementById('close-detail-modal');

        closeDetailModal.addEventListener('click', () => {
            this.effects.close(detailModal, detailModalContent);
        });

        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                this.effects.close(detailModal, detailModalContent);
            }
        });
    },

    /**
     * 初始化二维码模态框
     */
    initQRCodeModal() {
        const qrcodeModal = document.getElementById('qrcode-modal');
        const qrcodeBtn = document.getElementById('qrcode-btn');
        const closeQrcodeModal = document.getElementById('close-qrcode-modal');

        qrcodeBtn.addEventListener('click', () => {
            qrcodeModal.classList.remove('hidden');
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
            qrcodeModal.classList.add('hidden');
        });

        qrcodeModal.addEventListener('click', (e) => {
            if (e.target === qrcodeModal) {
                qrcodeModal.classList.add('hidden');
            }
        });
    }
}; 