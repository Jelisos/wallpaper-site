/**
 * 壁纸上传功能模块
 */

class WallpaperUploader {
    constructor() {
        this.selectedFile = null;
        this.isUploading = false;
        this.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost/api' 
            : '/api';
        
        this.initElements();
        this.bindEvents();
        this.checkLoginStatus();
    }

    initElements() {
        // 获取DOM元素
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.browseBtn = document.getElementById('browse-btn');
        this.changeFileBtn = document.getElementById('change-file-btn');
        this.uploadPlaceholder = document.getElementById('upload-placeholder');
        this.previewArea = document.getElementById('preview-area');
        this.previewImage = document.getElementById('preview-image');
        this.fileInfo = document.getElementById('file-info');
        this.uploadForm = document.getElementById('upload-form');
        this.submitBtn = document.getElementById('submit-btn');
        this.uploadProgress = document.getElementById('upload-progress');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.successModal = document.getElementById('success-modal');
        this.uploadAnotherBtn = document.getElementById('upload-another-btn');
        
        // 表单字段
        this.titleInput = document.getElementById('title');
        this.categorySelect = document.getElementById('category');
        this.tagsInput = document.getElementById('tags');
        this.descriptionTextarea = document.getElementById('description');
        this.promptInput = document.getElementById('prompt');
    }

    bindEvents() {
        // 文件选择事件
        this.browseBtn.addEventListener('click', () => this.openFileDialog());
        this.changeFileBtn.addEventListener('click', () => this.openFileDialog());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖拽事件
        this.uploadArea.addEventListener('click', () => {
            if (!this.selectedFile) this.openFileDialog();
        });
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 表单提交事件
        this.uploadForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // 成功模态框事件
        this.uploadAnotherBtn.addEventListener('click', () => this.resetForm());
    }

    async checkLoginStatus() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth.php?action=check`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.code !== 200) {
                // 未登录，跳转到登录页面
                alert('请先登录才能上传壁纸');
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
            alert('网络错误，请稍后重试');
        }
    }

    openFileDialog() {
        this.fileInput.click();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('只支持 JPG, PNG, WebP 格式的图片');
            return;
        }
        
        // 验证文件大小 (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('文件大小不能超过 10MB');
            return;
        }
        
        this.selectedFile = file;
        this.showPreview(file);
    }

    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.fileInfo.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            
            // 切换显示状态
            this.uploadPlaceholder.classList.add('hidden');
            this.previewArea.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isUploading) return;
        
        // 验证表单
        if (!this.selectedFile) {
            alert('请选择要上传的壁纸文件');
            return;
        }
        
        const title = this.titleInput.value.trim();
        if (!title) {
            alert('请输入壁纸标题');
            this.titleInput.focus();
            return;
        }
        
        await this.uploadFile();
    }

    async uploadFile() {
        this.isUploading = true;
        this.showProgress();
        
        try {
            // 创建FormData
            const formData = new FormData();
            formData.append('action', 'upload');
            formData.append('wallpaper', this.selectedFile);
            formData.append('title', this.titleInput.value.trim());
            formData.append('category', this.categorySelect.value);
            formData.append('tags', this.tagsInput.value.trim());
            formData.append('description', this.descriptionTextarea.value.trim());
            formData.append('prompt', this.promptInput.value.trim());
            
            // 创建XMLHttpRequest以支持进度监控
            const xhr = new XMLHttpRequest();
            
            // 监听上传进度
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateProgress(percentComplete);
                }
            });
            
            // 处理响应
            xhr.addEventListener('load', () => {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.code === 200) {
                        this.showSuccess();
                    } else {
                        throw new Error(result.message || '上传失败');
                    }
                } catch (error) {
                    console.error('解析响应失败:', error);
                    alert('上传失败，请重试');
                }
                this.hideProgress();
                this.isUploading = false;
            });
            
            xhr.addEventListener('error', () => {
                alert('网络错误，上传失败');
                this.hideProgress();
                this.isUploading = false;
            });
            
            // 发送请求
            xhr.open('POST', `${this.API_BASE_URL}/wallpaper.php`);
            xhr.withCredentials = true;
            xhr.send(formData);
            
        } catch (error) {
            console.error('上传错误:', error);
            alert('上传失败，请重试');
            this.hideProgress();
            this.isUploading = false;
        }
    }

    showProgress() {
        this.uploadProgress.classList.remove('hidden');
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = '上传中...';
        this.updateProgress(0);
    }

    updateProgress(percent) {
        const roundedPercent = Math.round(percent);
        this.progressBar.style.width = `${roundedPercent}%`;
        this.progressText.textContent = `${roundedPercent}%`;
    }

    hideProgress() {
        this.uploadProgress.classList.add('hidden');
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = '上传壁纸';
    }

    showSuccess() {
        this.successModal.classList.remove('hidden');
    }

    resetForm() {
        // 隐藏成功模态框
        this.successModal.classList.add('hidden');
        
        // 重置文件选择
        this.selectedFile = null;
        this.fileInput.value = '';
        
        // 重置预览
        this.previewArea.classList.add('hidden');
        this.uploadPlaceholder.classList.remove('hidden');
        this.previewImage.src = '';
        this.fileInfo.textContent = '';
        
        // 重置表单
        this.uploadForm.reset();
        
        // 重置状态
        this.isUploading = false;
        this.hideProgress();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new WallpaperUploader();
});