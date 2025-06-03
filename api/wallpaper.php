<?php
/**
 * 壁纸管理API
 * @author Claude
 * @date 2024-03-21
 */

require_once '../config/database.php';

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

// 处理请求
switch ($method) {
    case 'POST':
        // 获取action参数
        $action = isset($_POST['action']) ? $_POST['action'] : ''; // 文件上传通常使用 multipart/form-data，所以用$_POST
        
        switch ($action) {
            case 'upload':
                handleUploadWallpaper();
                break;
            // 其他壁纸相关的POST操作可以在这里添加
            default:
                sendResponse(400, '无效的请求');
        }
        break;
        
    case 'GET':
        // 获取action参数
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        
        switch ($action) {
            // 其他壁纸相关的GET操作可以在这里添加（例如获取壁纸列表、详情等）
            case 'list':
                 handleListWallpapers();
                 break;
            case 'details':
                 handleGetWallpaperDetails();
                 break;
            case 'categories':
                 handleGetCategories();
                 break;
            case 'search':
                 handleSearchWallpapers();
                 break;
            default:
                 sendResponse(400, '无效的请求');
        }
        break;
        
    default:
        sendResponse(405, '不支持的请求方法');
}

/**
 * 处理壁纸上传
 */
function handleUploadWallpaper() {
    // 获取会话ID并验证用户是否登录
    $headers = getallheaders();
    $sessionId = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    $userId = validateSessionAndGetUserId($conn, $sessionId);
    if (!$userId) {
        sendResponse(401, '未登录或会话已过期');
        closeDBConnection($conn);
        return;
    }

    // 检查文件是否已上传
    if (!isset($_FILES['wallpaper']) || $_FILES['wallpaper']['error'] !== UPLOAD_ERR_OK) {
        sendResponse(400, '文件上传失败或没有文件上传');
        closeDBConnection($conn);
        return;
    }

    $file = $_FILES['wallpaper'];
    $title = isset($_POST['title']) ? trim($_POST['title']) : '';
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';
    $category = isset($_POST['category']) ? trim($_POST['category']) : '';
    $tags = isset($_POST['tags']) ? trim($_POST['tags']) : '';

    // 验证必要字段
    if (empty($title)) {
        sendResponse(400, '壁纸标题不能为空');
        closeDBConnection($conn);
        return;
    }
    
    // 验证文件类型 (只允许图片)
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($file['type'], $allowedTypes)) {
        sendResponse(400, '只允许上传 JPG, PNG, WebP 格式的图片');
        closeDBConnection($conn);
        return;
    }

    // 验证文件大小 (例如：最大10MB)
    $maxFileSize = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $maxFileSize) {
        sendResponse(400, '文件大小不能超过 10MB');
        closeDBConnection($conn);
        return;
    }

    // 获取图片尺寸
    $imageInfo = getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        sendResponse(500, '无法获取图片信息');
        closeDBConnection($conn);
        return;
    }
    $width = $imageInfo[0];
    $height = $imageInfo[1];

    // 生成唯一文件名并确定保存路径
    $uploadDir = '../static/wallpapers/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true); // 创建目录如果不存在
    }
    $fileName = uniqid('', true) . '.' . pathinfo($file['name'], PATHINFO_EXTENSION);
    $filePath = $uploadDir . $fileName;

    // 移动上传的文件
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        sendResponse(500, '文件移动失败');
        closeDBConnection($conn);
        return;
    }
    
    // 将标签字符串转换为适合存储的格式（例如JSON或逗号分隔）
    // 这里使用逗号分隔字符串
    $tagsString = implode(',', array_map('trim', explode(',', $tags)));

    // 插入壁纸信息到数据库
    $stmt = $conn->prepare("INSERT INTO wallpapers (user_id, title, description, file_path, file_size, width, height, category, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $stmt->bind_param("issiisiss", $userId, $title, $description, $filePath, $file['size'], $width, $height, $category, $tagsString);

    if ($stmt->execute()) {
        sendResponse(200, '壁纸上传成功', ['wallpaperId' => $conn->insert_id, 'filePath' => 'static/wallpapers/' . $fileName]);
    } else {
        // 如果数据库插入失败，删除已上传的文件
        unlink($filePath);
        sendResponse(500, '壁纸信息保存失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理获取壁纸列表
 */
function handleListWallpapers() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 获取分页参数
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20; // 每页默认20张壁纸
    $offset = ($page - 1) * $limit;

    // 处理分类过滤
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';

    // 构建查询
    $sql = "SELECT id, title, file_path, width, height, category, likes, views FROM wallpapers";
    $params = [];
    $types = "";

    if (!empty($category) && $category !== '全部') {
        $sql .= " WHERE category = ?";
        $params[] = $category;
        $types .= "s";
    }

    $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";


    $stmt = $conn->prepare($sql);
    // 使用 call_user_func_array 绑定参数
    if (!empty($params)) {
        $bind_names[] = $types;
        for ($i=0; $i<count($params); $i++) {
            $bind_name = 'bind' . $i;
            $$bind_name = $params[$i];
            $bind_names[] = &$$bind_name;
        }
        call_user_func_array([$stmt, 'bind_param'], $bind_names);
    }

    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $wallpapers = [];
        while ($row = $result->fetch_assoc()) {
             // 修正文件路径，使其可以直接通过HTTP访问
            $row['file_path'] = str_replace('../', '', $row['file_path']);
            $wallpapers[] = $row;
        }

        // TODO: 获取总数用于分页信息

        sendResponse(200, '成功获取壁纸列表', $wallpapers);
    } else {
        sendResponse(500, '获取壁纸列表失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理获取壁纸详情
 */
function handleGetWallpaperDetails() {
    // 验证是否提供了壁纸ID
    if (!isset($_GET['wallpaperId']) || !is_numeric($_GET['wallpaperId'])) {
        sendResponse(400, '缺少有效的壁纸ID');
        return;
    }

    $wallpaperId = intval($_GET['wallpaperId']);

    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 构建查询，获取壁纸详情，包括上传用户信息
    $sql = "
        SELECT 
            w.id, w.title, w.description, w.file_path, w.file_size, w.width, w.height, w.category, w.tags, w.views, w.likes, w.created_at,
            u.username AS uploader_username
        FROM wallpapers w
        JOIN users u ON w.user_id = u.id
        WHERE w.id = ?
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $wallpaperId);

    if ($stmt->execute()) {
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $wallpaperDetails = $result->fetch_assoc();
            // 修正文件路径
            $wallpaperDetails['file_path'] = str_replace('../', '', $wallpaperDetails['file_path']);

            // 增加壁纸浏览次数 (可选，可以在这里或前端处理)
            // updateWallpaperViews($conn, $wallpaperId);

            sendResponse(200, '成功获取壁纸详情', $wallpaperDetails);
        } else {
            sendResponse(404, '壁纸不存在');
        }
    } else {
        sendResponse(500, '获取壁纸详情失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理获取壁纸分类列表
 */
function handleGetCategories() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 查询所有唯一的分类
    $sql = "SELECT DISTINCT category FROM wallpapers WHERE category IS NOT NULL AND category != '' ORDER BY category";
    $result = $conn->query($sql);

    if ($result) {
        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row['category'];
        }
        // 可以选择在分类列表前添加一个"全部"选项
        array_unshift($categories, '全部');
        sendResponse(200, '成功获取分类列表', $categories);
    } else {
        sendResponse(500, '获取分类列表失败: ' . $conn->error);
    }

    closeDBConnection($conn);
}

/**
 * 处理壁纸搜索
 */
function handleSearchWallpapers() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 获取搜索关键词
    $query = isset($_GET['query']) ? trim($_GET['query']) : '';

    if (empty($query)) {
        // 如果没有关键词，返回空列表或全部壁纸（这里返回空列表）
        sendResponse(200, '请输入搜索关键词', []);
        closeDBConnection($conn);
        return;
    }

    // 获取分页参数 (搜索结果也分页)
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20; // 每页默认20张壁纸
    $offset = ($page - 1) * $limit;

    // 构建搜索查询，在标题、描述、标签中进行模糊匹配
    // 使用 CONCAT 和 LIKE 进行模糊匹配
    $searchQuery = "%" . $query . "%";
    $sql = "
        SELECT id, title, file_path, width, height, category, likes, views 
        FROM wallpapers 
        WHERE title LIKE ? OR description LIKE ? OR tags LIKE ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssii", $searchQuery, $searchQuery, $searchQuery, $limit, $offset);

    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $wallpapers = [];
        while ($row = $result->fetch_assoc()) {
             // 修正文件路径
            $row['file_path'] = str_replace('../', '', $row['file_path']);
            $wallpapers[] = $row;
        }

        // TODO: 获取搜索结果总数用于分页信息

        sendResponse(200, '搜索成功', $wallpapers);
    } else {
        sendResponse(500, '壁纸搜索失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 验证会话并获取用户ID
 */
function validateSessionAndGetUserId($conn, $sessionId) {
    if (!$sessionId) {
        return false;
    }

    $stmt = $conn->prepare("SELECT user_id FROM sessions WHERE session_id = ?");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $session = $result->fetch_assoc();
        $stmt->close();
        return $session['user_id'];
    } else {
        $stmt->close();
        return false;
    }
}

/**
 * 发送JSON响应
 */
function sendResponse($code, $message, $data = null) {
    http_response_code($code);
    echo json_encode([
        'code' => $code,
        'message' => $message,
        'data' => $data
    ]);
    exit();
} 