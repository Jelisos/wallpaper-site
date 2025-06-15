<?php
/**
 * 文件: api/wallpaper_prompt.php
 * 描述: 处理壁纸提示词的获取和更新
 * 依赖: ../config/database.php, utils.php
 * 维护: 负责提供壁纸提示词的 CRUD 操作
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/utils.php'; // 假设 utils.php 中包含 isAdmin() 和 sendResponse() 函数

header('Content-Type: application/json; charset=utf-8');

// 创建数据库连接
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
$conn->set_charset("utf8mb4");

// 检查连接
if ($conn->connect_error) {
    sendResponse(500, '数据库连接失败: ' . $conn->connect_error);
    exit();
}

// 获取提示词
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $wallpaper_id = isset($_GET['id']) ? $_GET['id'] : '';

    if (empty($wallpaper_id)) {
        sendResponse(400, '缺少壁纸ID');
    }

    $stmt = $conn->prepare("SELECT content, is_locked FROM wallpaper_prompts WHERE wallpaper_id = ?");
    if (!$stmt) {
        sendResponse(500, 'SQL预处理失败: ' . $conn->error);
        $conn->close();
        exit();
    }
    $stmt->bind_param('s', $wallpaper_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        sendResponse(200, '获取成功', $row);
    } else {
        // 如果没有找到提示词，返回默认值，且默认是未锁定的 (0)
        sendResponse(200, '暂无提示词', ['content' => '', 'is_locked' => 0]);
    }
    $stmt->close();
}

// 更新提示词
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = getCurrentUserId();
    if (!$user_id) {
        sendResponse(401, '请先登录');
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $wallpaper_id = $data['wallpaper_id'] ?? '';
    $content = $data['content'] ?? '';
    $is_locked = $data['is_locked'] ?? 1; // 默认为锁定

    if (empty($wallpaper_id)) {
        sendResponse(400, '缺少壁纸ID');
    }

    // 检查用户是否是管理员或者壁纸的上传者
    $can_edit = isAdmin(); // 首先检查是否为管理员

    if (!$can_edit) {
        // 如果不是管理员，则检查是否是壁纸上传者
        $stmt_owner = $conn->prepare("SELECT user_id FROM wallpapers WHERE id = ? LIMIT 1");
        if (!$stmt_owner) {
            sendResponse(500, 'SQL预处理失败 (检查上传者): ' . $conn->error);
        }
        $stmt_owner->bind_param('s', $wallpaper_id);
        $stmt_owner->execute();
        $result_owner = $stmt_owner->get_result();
        $wallpaper_owner = $result_owner->fetch_assoc();
        $stmt_owner->close();

        if ($wallpaper_owner && $wallpaper_owner['user_id'] == $user_id) {
            $can_edit = true;
        }
    }

    if (!$can_edit) {
        sendResponse(403, '无权限修改提示词');
    }
    
    // 使用 ON DUPLICATE KEY UPDATE 实现插入或更新
    $stmt = $conn->prepare("INSERT INTO wallpaper_prompts (wallpaper_id, content, is_locked) 
                           VALUES (?, ?, ?) 
                           ON DUPLICATE KEY UPDATE content = ?, is_locked = ?, updated_at = CURRENT_TIMESTAMP");
    if (!$stmt) {
        sendResponse(500, 'SQL预处理失败: ' . $conn->error);
    }
    $stmt->bind_param('ssiss', $wallpaper_id, $content, $is_locked, $content, $is_locked);
    
    if ($stmt->execute()) {
        sendResponse(200, '更新成功');
    } else {
        sendResponse(500, '更新失败: ' . $stmt->error);
    }
    $stmt->close();
}

$conn->close();
?>