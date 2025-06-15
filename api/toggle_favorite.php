<?php
ob_start(); // 2024-07-26 新增：启动输出缓冲
session_start();
require_once '../config.php';
require_once './write_log.php';
header('Content-Type: application/json');
ob_clean(); // 2024-07-26 新增：清除之前的所有输出

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['code' => 1, 'msg' => '请求方式错误']);
    ob_end_flush();
    exit;
}

// 2024-07-26 获取从JSON请求体中获取数据
$input = json_decode(file_get_contents('php://input'), true);
$wallpaper_id = isset($input['wallpaper_id']) ? intval($input['wallpaper_id']) : 0;

if (!$wallpaper_id) {
    sendDebugLog("参数错误: wallpaper_id 不能为空, input: " . print_r($input, true), 'favorite_debug_log.txt', 'append', 'param_error');
    echo json_encode(['code' => 1, 'msg' => '参数错误: wallpaper_id 不能为空']);
    ob_end_flush();
    exit;
}

// 2024-07-26 修复：使用user_id进行收藏，而不是ip_address
$user_id = 0;
if (isset($_SESSION['user']['id']) && $_SESSION['user']['id']) {
    $user_id = $_SESSION['user']['id'];
}

if (!$user_id) {
    // 如果未登录，返回401错误
    echo json_encode(['code' => 401, 'msg' => '未登录，请先登录才能收藏']);
    ob_end_flush();
    exit;
}

$db = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($db->connect_errno) {
    sendDebugLog("数据库连接失败: " . $db->connect_error, 'favorite_debug_log.txt', 'append', 'db_connect_fail');
    echo json_encode(['code' => 500, 'msg' => '数据库连接失败']);
    ob_end_flush();
    exit;
}

// 检查是否已收藏
$stmt_check = $db->prepare('SELECT COUNT(*) FROM wallpaper_favorites WHERE user_id = ? AND wallpaper_id = ?');
$stmt_check->bind_param('ii', $user_id, $wallpaper_id);
$stmt_check->execute();
$stmt_check->bind_result($count);
$stmt_check->fetch();
$stmt_check->close();

if ($count > 0) {
    // 已收藏，执行取消收藏操作 (DELETE)
    $stmt_delete = $db->prepare('DELETE FROM wallpaper_favorites WHERE user_id = ? AND wallpaper_id = ?');
    $stmt_delete->bind_param('ii', $user_id, $wallpaper_id);
    if ($stmt_delete->execute()) {
        sendDebugLog("取消收藏成功: user_id={$user_id}, wallpaper_id={$wallpaper_id}", 'favorite_debug_log.txt', 'append', 'unfavorite_success');
        echo json_encode(['code' => 0, 'msg' => '取消收藏成功', 'action' => 'unfavorited']);
    } else {
        sendDebugLog("取消收藏失败: " . $stmt_delete->error, 'favorite_debug_log.txt', 'append', 'unfavorite_fail');
        echo json_encode(['code' => 1, 'msg' => '取消收藏失败']);
    }
    $stmt_delete->close();
} else {
    // 未收藏，执行添加收藏操作 (INSERT)
    $stmt_insert = $db->prepare('INSERT INTO wallpaper_favorites (user_id, wallpaper_id) VALUES (?, ?)');
    $stmt_insert->bind_param('ii', $user_id, $wallpaper_id);
    if ($stmt_insert->execute()) {
        sendDebugLog("收藏成功: user_id={$user_id}, wallpaper_id={$wallpaper_id}", 'favorite_debug_log.txt', 'append', 'favorite_success');
        echo json_encode(['code' => 0, 'msg' => '收藏成功', 'action' => 'favorited']);
    } else {
        sendDebugLog("收藏失败: " . $stmt_insert->error, 'favorite_debug_log.txt', 'append', 'favorite_fail');
        echo json_encode(['code' => 1, 'msg' => '收藏失败']);
    }
    $stmt_insert->close();
}

$db->close();
ob_end_flush();
exit;
?> 