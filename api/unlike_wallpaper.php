<?php
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
include_once '../config.php';
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

$stmt = $db->prepare('DELETE FROM wallpaper_likes WHERE ip_address = ? AND wallpaper_id = ?');
$stmt->bind_param('si', $ip_address, $wallpaper_id);
if ($stmt->execute()) {
    echo json_encode(['code' => 0, 'msg' => '取消点赞成功']);
    exit;
} else {
    echo json_encode(['code' => 1, 'msg' => '取消点赞失败']);
    exit;
}
$stmt->close();
$db->close();
exit;