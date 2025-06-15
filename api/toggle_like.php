<?php
ob_start(); // 2024-07-26 新增：启动输出缓冲

session_start();
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/write_log.php';
header('Content-Type: application/json');

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') { // 2024-07-26 修复：处理 REQUEST_METHOD 未定义警告
    ob_clean(); // 2024-07-26 优化：确保在输出前清除所有缓冲内容
    echo json_encode(['code' => 1, 'msg' => '请求方式错误']);
    ob_end_flush();
    exit;
}

// 2024-07-26 修复：从JSON请求体中获取数据，并确保wallpaper_id作为字符串处理，避免BIGINT截断问题
$input = json_decode(file_get_contents('php://input'), true);
$wallpaper_id = isset($input['wallpaper_id']) ? (string)$input['wallpaper_id'] : '0'; // 强制转换为字符串

if (!$wallpaper_id) {
    sendDebugLog("参数错误: wallpaper_id 不能为空, input: " . print_r($input, true), 'like_debug_log.txt', 'append', 'param_error');
    ob_clean(); // 2024-07-26 优化：确保在输出前清除所有缓冲内容
    echo json_encode(['code' => 1, 'msg' => '参数错误: wallpaper_id 不能为空']);
    ob_end_flush();
    exit;
}

// 获取用户IP地址
$ip_address = $_SERVER['REMOTE_ADDR'];
if (!$ip_address) {
    $ip_address = '127.0.0.1'; // 确保有一个默认IP，防止空值
}

$db = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($db->connect_errno) {
    sendDebugLog("数据库连接失败: " . $db->connect_error, 'like_debug_log.txt', 'append', 'db_connect_fail');
    ob_clean(); // 2024-07-26 优化：确保在输出前清除所有缓冲内容
    echo json_encode(['code' => 500, 'msg' => '数据库连接失败']);
    ob_end_flush();
    exit;
}

// 检查是否已点赞
$stmt_check = $db->prepare('SELECT COUNT(*) FROM wallpaper_likes WHERE ip_address = ? AND wallpaper_id = ?');
$stmt_check->bind_param('ss', $ip_address, $wallpaper_id);
$stmt_check->execute();
$stmt_check->bind_result($count);
$stmt_check->fetch();
$stmt_check->close();

$action_performed = '';
if ($count > 0) {
    // 已点赞，执行取消点赞操作 (DELETE)
    $stmt_delete = $db->prepare('DELETE FROM wallpaper_likes WHERE ip_address = ? AND wallpaper_id = ?');
    $stmt_delete->bind_param('ss', $ip_address, $wallpaper_id);
    if ($stmt_delete->execute()) {
        $action_performed = 'unliked';
        // 2024-07-26 新增：更新壁纸点赞数
        $stmt_update_wallpaper = $db->prepare('UPDATE wallpapers SET likes = likes - 1 WHERE id = ?');
        $stmt_update_wallpaper->bind_param('s', $wallpaper_id);
        $stmt_update_wallpaper->execute();
        $stmt_update_wallpaper->close();

        sendDebugLog("取消点赞成功: ip_address={$ip_address}, wallpaper_id={$wallpaper_id}", 'like_debug_log.txt', 'append', 'unlike_success');
        ob_clean(); // 2024-07-26 优化：确保在输出前清除所有缓冲内容
        echo json_encode(['code' => 0, 'msg' => '取消点赞成功', 'action' => $action_performed]);
    } else {
        sendDebugLog("取消点赞失败: " . $stmt_delete->error, 'like_debug_log.txt', 'append', 'unlike_fail');
        ob_clean(); // 2024-07-26 优化：确保在输出前清除所有缓冲内容
        echo json_encode(['code' => 1, 'msg' => '取消点赞失败']);
    }
    $stmt_delete->close();
} else {
    // 未点赞，执行添加点赞操作 (INSERT)
    $stmt_insert = $db->prepare('INSERT INTO wallpaper_likes (ip_address, wallpaper_id) VALUES (?, ?)');
    $stmt_insert->bind_param('ss', $ip_address, $wallpaper_id);
    if ($stmt_insert->execute()) {
        $action_performed = 'liked';
        // 2024-07-26 新增：更新壁纸点赞数
        $stmt_update_wallpaper = $db->prepare('UPDATE wallpapers SET likes = likes + 1 WHERE id = ?');
        $stmt_update_wallpaper->bind_param('s', $wallpaper_id);
        $stmt_update_wallpaper->execute();
        $stmt_update_wallpaper->close();

        sendDebugLog("点赞成功: ip_address={$ip_address}, wallpaper_id={$wallpaper_id}", 'like_debug_log.txt', 'append', 'like_success');
        ob_clean(); // 2024-07-26 优化：确保在输出前清除所有缓冲内容
        echo json_encode(['code' => 0, 'msg' => '点赞成功', 'action' => $action_performed]);
    } else {
        sendDebugLog("点赞失败: " . $stmt_insert->error, 'like_debug_log.txt', 'append', 'like_fail');
        ob_clean(); // 2024-07-26 优化：确保在输出前清除所有缓冲内容
        echo json_encode(['code' => 1, 'msg' => '点赞失败']);
    }
    $stmt_insert->close();
}

$db->close();
ob_end_flush();
exit;
?> 