<?php
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once '../config.php'; // 引入数据库配置
require_once 'utils.php';
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

$stmt = $db->prepare('DELETE FROM wallpaper_favorites WHERE user_id = ? AND wallpaper_id = ?');
$stmt->bind_param('ii', $user_id, $wallpaper_id);
if ($stmt->execute()) {
    echo json_encode(['code' => 0, 'msg' => '取消收藏成功']);
    exit;
} else {
    echo json_encode(['code' => 1, 'msg' => '取消收藏失败']);
    exit;
}

$stmt->close();
$db->close();
exit();