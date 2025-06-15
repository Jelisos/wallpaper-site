<?php
/**
 * 用户资料修改接口
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
$username = trim($_POST['username'] ?? '');
$email = trim($_POST['email'] ?? '');

if (!$username || !$email) {
    echo json_encode([
        'code' => 2,
        'msg' => '昵称和邮箱不能为空',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'code' => 3,
        'msg' => '邮箱格式不正确',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($conn->connect_error) {
    echo json_encode([
        'code' => 500,
        'msg' => '数据库连接失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $conn->prepare('UPDATE users SET username=?, email=? WHERE id=?');
$stmt->bind_param('ssi', $username, $email, $user_id);
if ($stmt->execute()) {
    $_SESSION['user']['username'] = $username;
    $_SESSION['user']['email'] = $email;
    echo json_encode([
        'code' => 0,
        'msg' => '资料修改成功',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'code' => 4,
        'msg' => '资料修改失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
}
$stmt->close();
$conn->close(); 