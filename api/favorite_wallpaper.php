<?php
session_start(); // 启动会话
ini_set('display_errors', 0); // 关闭错误显示
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING); // 仅报告致命错误和解析错误，忽略通知和警告
require_once '../config.php'; // 引入数据库配置
require_once 'utils.php'; // 引入新的日志工具文件
/**
 * @file favorite_wallpaper.php
 * @brief 收藏壁纸接口
 * @author 方圆 (Administrator)
 * @version 1.0
 * @date 2025-06-05
 * @details
 *   该接口用于用户收藏壁纸。
 *   需要用户已登录。
 *   接收 POST 请求，参数包括：
 *   - wallpaper_id: 待收藏壁纸的唯一标识符（例如，路径或ID）。
 *
 *   返回 JSON 格式结果：
 *   - 成功: {"code": 0, "msg": "收藏成功"}
 *   - 未登录: {"code": 401, "msg": "未登录"}
 *   - 参数错误: {"code": 1, "msg": "参数错误"}
 *   - 数据库操作失败: {"code": 500, "msg": "数据库操作失败"}
 */

header('Content-Type: application/json'); // 设置响应头为 JSON 格式

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['code' => 1, 'msg' => '请求方式错误']);
    exit;
}

$wallpaper_id = isset($_POST['wallpaper_id']) ? intval($_POST['wallpaper_id']) : 0;
if (!$wallpaper_id) {
    echo json_encode(['code' => 1, 'msg' => '参数错误: wallpaper_id 不能为空']);
    exit;
}

$user_id = 0;
if (isset($_SESSION['user_id']) && $_SESSION['user_id']) {
    $user_id = $_SESSION['user_id'];
} elseif (isset($_SESSION['user']['id']) && $_SESSION['user']['id']) {
    $user_id = $_SESSION['user']['id'];
}
if (!$user_id) {
    echo json_encode(['code' => 1, 'msg' => '未登录']);
    exit;
}

$db = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($db->connect_errno) {
    echo json_encode(['code' => 1, 'msg' => '数据库连接失败']);
    exit;
}

$stmt = $db->prepare('INSERT IGNORE INTO wallpaper_favorites (user_id, wallpaper_id) VALUES (?, ?)');
$stmt->bind_param('ii', $user_id, $wallpaper_id);
if ($stmt->execute()) {
    echo json_encode(['code' => 0, 'msg' => '收藏成功']);
    exit;
} else {
    echo json_encode(['code' => 1, 'msg' => '收藏失败']);
    exit;
}

$db->close();
?>