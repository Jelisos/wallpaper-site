<?php
require_once '../config.php';
header('Content-Type: application/json');
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['code' => 1, 'msg' => '请求方式错误']);
    exit;
}

$wallpaper_id = intval($_GET['wallpaper_id'] ?? 0);
if ($wallpaper_id <= 0) {
    echo json_encode(['code' => 1, 'msg' => '参数错误']);
    exit;
}

$db = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($db->connect_errno) {
    echo json_encode(['code' => 1, 'msg' => '数据库连接失败']);
    exit;
}

$stmt = $db->prepare('SELECT COUNT(*) FROM wallpaper_likes WHERE wallpaper_id=?');
$stmt->bind_param('i', $wallpaper_id);
$stmt->execute();
$stmt->bind_result($count);
$stmt->fetch();
$stmt->close();
$db->close();

echo json_encode(['code' => 0, 'count' => intval($count)]); 