<?php
session_start();

/**
 * 文件: api/get_exiled_wallpaper_ids.php
 * 描述: 获取所有被流放壁纸的ID列表
 * 作者: AI助手
 * 日期: 2024-07-28
 */

require_once '../config/database.php';
require_once 'utils.php'; // 引入utils.php，用于sendResponse等工具函数

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2024-12-19 修复：移除权限检查，所有用户都可以获取流放壁纸ID列表
// 这样可以确保首页正确显示流放/召回图标状态
$conn = getDBConnection();
if (!$conn) {
    sendResponse(500, '数据库连接失败');
    exit();
}

try {
    // 2024-12-19 修改：查询流放壁纸ID和时间信息，按最新流放时间排序
    $sql = "SELECT wallpaper_id, updated_at FROM wallpaper_exile_status WHERE status = 1 ORDER BY updated_at DESC";
    $result = $conn->query($sql);

    if ($result) {
        $exiledData = [];
        while ($row = $result->fetch_assoc()) {
            $exiledData[] = [
                'id' => (int)$row['wallpaper_id'],
                'exile_time' => $row['updated_at']
            ];
        }
        sendResponse(200, '成功获取流放壁纸列表', $exiledData);
    } else {
        sendResponse(500, '获取流放壁纸列表失败: ' . $conn->error);
    }
} catch (Exception $e) {
    sendResponse(500, '服务器错误: ' . $e->getMessage());
} finally {
    closeDBConnection($conn);
}