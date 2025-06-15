<?php
session_start(); // 启动会话
require_once 'utils.php'; // 引入新的日志工具文件
require_once '../config.php'; // 引入数据库配置
header('Content-Type: application/json; charset=utf-8'); // 设置响应头为 JSON 格式
ini_set('display_errors', 0); // 关闭错误显示
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING); // 仅报告致命错误和解析错误，忽略通知和警告

// 调试日志：检查当前会话状态
sendDebugLog(json_encode([
    'msg' => 'check_favorite.php 接收请求',
    'session_id' => session_id(), // 获取当前会话ID
    'user_id_in_session' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'not_set',
    'request_method' => $_SERVER['REQUEST_METHOD']
]), 'wallpaper_debug_log.txt', 'append', 'check_fav_session_status');

/**
 * @file check_favorite.php
 * @brief 检查用户是否收藏了某个壁纸接口
 * @author 方圆 (Administrator)
 * @version 1.0
 * @date 2025-06-05
 * @details
 *   该接口用于检查用户是否收藏了某个壁纸。
 *   需要用户已登录。
 *   接收 GET 请求，参数包括：
 *   - wallpaper_id: 待检查壁纸的唯一标识符（例如，路径或ID）。
 *
 *   返回 JSON 格式结果：
 *   - 成功: {"code": 0, "msg": "已收藏"或"未收藏", "is_favorited": true/false}
 *   - 未登录: {"code": 401, "msg": "未登录"}
 *   - 参数错误: {"code": 1, "msg": "参数错误"}
 *   - 数据库操作失败: {"code": 500, "msg": "数据库操作失败"}
 */

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendDebugLog(['code'=>1, 'msg'=>'请求方式错误', 'method'=>$_SERVER['REQUEST_METHOD']], 'wallpaper_debug_log.txt', 'append', 'check_fav_method_error');
    echo json_encode(['code' => 1, 'msg' => '请求方式错误']);
    exit();
}

// 检查用户是否登录
if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
    sendDebugLog(['code'=>401, 'msg'=>'未登录', 'user_id'=>(isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'not_set')], 'wallpaper_debug_log.txt', 'append', 'check_fav_need_login');
    echo json_encode(['code' => 401, 'msg' => '未登录']);
    exit();
}

$user_id = $_SESSION['user_id']; // 获取当前登录用户ID
$wallpaper_id = intval($_GET['wallpaper_id'] ?? 0);
if ($wallpaper_id <= 0) {
    echo json_encode(['code' => 1, 'msg' => '参数错误: wallpaper_id 不能为空']);
    exit();
}

/**
 * @var mysqli $conn
 */
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($conn->connect_errno) {
    sendDebugLog(['code'=>500, 'msg'=>'数据库连接失败', 'error'=>$conn->connect_error], 'wallpaper_debug_log.txt', 'append', 'check_fav_db_connect_error');
    echo json_encode(['code' => 500, 'msg' => '数据库连接失败']);
    exit();
}

try {
    // 检查是否已经收藏过
    $stmt = $conn->prepare("SELECT * FROM user_favorites WHERE user_id = ? AND wallpaper_id = ?");
    $stmt->bind_param("ii", $user_id, $wallpaper_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        sendDebugLog(['code'=>0, 'msg'=>'收藏', 'is_favorited'=>true, 'wallpaper_id'=>$wallpaper_id, 'user_id'=>$user_id], 'wallpaper_debug_log.txt', 'append', 'check_fav_true');
        echo json_encode(['code' => 0, 'msg' => '收藏', 'is_favorited' => true]);
    } else {
        sendDebugLog(['code'=>0, 'msg'=>'未收藏', 'is_favorited'=>false, 'wallpaper_id'=>$wallpaper_id, 'user_id'=>$user_id], 'wallpaper_debug_log.txt', 'append', 'check_fav_false');
        echo json_encode(['code' => 0, 'msg' => '未收藏', 'is_favorited' => false]);
    }

    $stmt->close();
} catch (Exception $e) {
    sendDebugLog(['code'=>500, 'msg'=>'服务器内部错误', 'error'=>$e->getMessage()], 'wallpaper_debug_log.txt', 'append', 'check_fav_exception');
    echo json_encode(['code' => 500, 'msg' => '服务器内部错误']);
}

$conn->close();

?> 