<?php
/**
 * 壁纸上传API
 * 专门处理壁纸上传功能
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 引入数据库连接
require_once '../config/database.php';

// 启动session
session_start();

/**
 * 发送JSON响应
 */
function sendResponse($code, $message, $data = null) {
    $response = [
        'code' => $code,
        'message' => $message
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * 记录日志
 */
function logMessage($message) {
    $logFile = __DIR__ . '/../logs/upload_log.txt';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    file_put_contents($logFile, date('Y-m-d H:i:s') . ' - ' . $message . PHP_EOL, FILE_APPEND);
}

/**
 * 验证图片文件
 */
function validateImageFile($file) {
    // 检查文件是否上传成功
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return '文件上传失败';
    }
    
    // 验证文件类型
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        return '只允许上传 JPG, PNG, WebP 格式的图片';
    }
    
    // 验证文件大小 (10MB)
    $maxFileSize = 10 * 1024 * 1024;
    if ($file['size'] > $maxFileSize) {
        return '文件大小不能超过 10MB';
    }
    
    // 验证图片尺寸
    $imageInfo = getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        return '无法读取图片信息';
    }
    
    return null; // 验证通过
}

/**
 * 生成安全的文件名
 */
function generateSafeFileName($originalName) {
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $timestamp = time();
    $randomString = bin2hex(random_bytes(8));
    return $timestamp . '_' . $randomString . '.' . $extension;
}

/**
 * 处理壁纸上传
 */
function handleWallpaperUpload() {
    global $conn;
    
    try {
        // 验证用户登录状态
        if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
            sendResponse(401, '请先登录');
        }
        
        $userId = $_SESSION['user']['id'];
        logMessage("用户 {$userId} 开始上传壁纸");
        
        // 验证请求方法
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendResponse(405, '只支持POST请求');
        }
        
        // 检查是否有文件上传
        if (!isset($_FILES['wallpaper'])) {
            sendResponse(400, '没有上传文件');
        }
        
        $file = $_FILES['wallpaper'];
        
        // 验证文件
        $validationError = validateImageFile($file);
        if ($validationError) {
            sendResponse(400, $validationError);
        }
        
        // 获取表单数据
        $title = isset($_POST['title']) ? trim($_POST['title']) : '';
        $description = isset($_POST['description']) ? trim($_POST['description']) : '';
        $category = isset($_POST['category']) ? trim($_POST['category']) : '';
        $tags = isset($_POST['tags']) ? trim($_POST['tags']) : '';
        
        // 验证必填字段
        if (empty($title)) {
            sendResponse(400, '壁纸标题不能为空');
        }
        
        // 获取图片信息
        $imageInfo = getimagesize($file['tmp_name']);
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        
        // 创建上传目录
        $uploadDir = '../static/wallpapers/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                logMessage("创建上传目录失败: {$uploadDir}");
                sendResponse(500, '创建上传目录失败');
            }
        }
        
        // 生成文件名并保存文件
        $fileName = generateSafeFileName($file['name']);
        $filePath = $uploadDir . $fileName;
        
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            logMessage("文件移动失败: {$file['tmp_name']} -> {$filePath}");
            sendResponse(500, '文件保存失败');
        }
        
        logMessage("文件保存成功: {$filePath}");
        
        // 处理标签
        $tagsArray = array_filter(array_map('trim', explode(',', $tags)));
        $tagsString = implode(',', $tagsArray);
        
        // 保存到数据库
        $stmt = $conn->prepare("
            INSERT INTO wallpapers 
            (user_id, title, description, file_path, file_size, width, height, category, tags, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $relativePath = 'static/wallpapers/' . $fileName;
        $stmt->bind_param(
            'issiisiss',
            $userId,
            $title,
            $description,
            $relativePath,
            $file['size'],
            $width,
            $height,
            $category,
            $tagsString
        );
        
        if ($stmt->execute()) {
            $wallpaperId = $conn->insert_id;
            logMessage("壁纸保存成功: ID {$wallpaperId}");
            
            sendResponse(200, '壁纸上传成功', [
                'wallpaper_id' => $wallpaperId,
                'file_path' => $relativePath,
                'title' => $title
            ]);
        } else {
            // 数据库保存失败，删除已上传的文件
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            logMessage("数据库保存失败: " . $stmt->error);
            sendResponse(500, '数据库保存失败');
        }
        
    } catch (Exception $e) {
        logMessage("上传异常: " . $e->getMessage());
        sendResponse(500, '服务器内部错误');
    }
}

// 主要逻辑
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'upload') {
        handleWallpaperUpload();
    } else {
        sendResponse(400, '无效的操作');
    }
} else {
    sendResponse(405, '只支持POST请求');
}
?>