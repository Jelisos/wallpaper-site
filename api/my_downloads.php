<?php
/**
 * 获取当前登录用户下载的壁纸列表接口
 * @author AI
 * @return JSON
 */
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

if (!isset($_SESSION['user'])) {
    echo json_encode([
        'code' => 401,
        'msg' => '未登录',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$user_id = $_SESSION['user']['id'];

// 数据库连接
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($conn->connect_error) {
    echo json_encode([
        'code' => 500,
        'msg' => '数据库连接失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 查询用户下载的壁纸
$sql = "SELECT w.id, w.title, w.thumb, w.created_at FROM wallpapers w INNER JOIN downloads d ON w.id = d.wallpaper_id WHERE d.user_id = ? ORDER BY d.created_at DESC LIMIT 50";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $user_id);
$stmt->execute();
$result = $stmt->get_result();
$list = [];
while ($row = $result->fetch_assoc()) {
    $list[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode([
    'code' => 0,
    'msg' => 'success',
    'data' => $list
], JSON_UNESCAPED_UNICODE); 