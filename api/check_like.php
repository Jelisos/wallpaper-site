<?php
require_once '../config.php';
header('Content-Type: application/json');
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['code' => 1, 'msg' => '请求方式错误']);
    exit;
}

$wallpaper_id = $_GET['wallpaper_id'] ?? '';
if (empty($wallpaper_id)) {
    echo json_encode(['code' => 1, 'msg' => '参数错误: wallpaper_id 不能为空']);
    exit;
}

$ip = $_SERVER['REMOTE_ADDR'];
$db = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($db->connect_errno) {
    echo json_encode(['code' => 1, 'msg' => '数据库连接失败']);
    exit;
}

$stmt = $db->prepare('SELECT id FROM wallpaper_likes WHERE wallpaper_id=? AND ip_address=?');
$stmt->bind_param('ss', $wallpaper_id, $ip);
$stmt->execute();
$stmt->store_result();

$liked = $stmt->num_rows > 0;
$stmt->close();
$db->close();

echo json_encode(['code' => 0, 'liked' => $liked]); 