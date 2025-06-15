<?php
session_start(); // 启动会话
ini_set('display_errors', 0); // 关闭错误显示
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING); // 仅报告致命错误和解析错误，忽略通知和警告
include_once '../config.php';
include_once './write_log.php'; // 引入日志函数
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['code' => 1, 'msg' => '请求方式错误']);
    exit;
}

$wallpaper_id = isset($_POST['wallpaper_id']) ? intval($_POST['wallpaper_id']) : 0;
if (!$wallpaper_id) {
    echo json_encode(['code' => 1, 'msg' => '参数错误: wallpaper_id 不能为空']);
    exit;
}

// 获取用户IP地址
$ip_address = $_SERVER['REMOTE_ADDR'];
if (!$ip_address) {
    $ip_address = '127.0.0.1';
}

$db = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($db->connect_errno) {
    echo json_encode(['code' => 1, 'msg' => '数据库连接失败']);
    exit;
}

$stmt = $db->prepare('INSERT IGNORE INTO wallpaper_likes (ip_address, wallpaper_id) VALUES (?, ?)');
$stmt->bind_param('si', $ip_address, $wallpaper_id);
if ($stmt->execute()) {
    sendDebugLog(json_encode(['code'=>200, 'msg'=>'点赞成功', 'wallpaper_id'=>$wallpaper_id, 'ip_address'=>$ip_address]), 'wallpaper_debug_log.txt', 'append', 'like_success');
    echo json_encode(['code' => 0, 'msg' => '点赞成功']);
} else {
    sendDebugLog(json_encode(['code'=>500, 'msg'=>'点赞失败', 'error'=>$stmt->error]), 'wallpaper_debug_log.txt', 'append', 'like_fail');
    echo json_encode(['code' => 1, 'msg' => '点赞失败']);
}
$stmt->close();
$db->close();
exit;