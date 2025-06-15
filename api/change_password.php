<?php
/**
 * 用户密码修改接口
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
$old_password = $_POST['old_password'] ?? '';
$new_password = $_POST['new_password'] ?? '';
$confirm_password = $_POST['confirm_password'] ?? '';

if (!$old_password || !$new_password || !$confirm_password) {
    echo json_encode([
        'code' => 2,
        'msg' => '所有字段均为必填',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
if ($new_password !== $confirm_password) {
    echo json_encode([
        'code' => 3,
        'msg' => '两次输入的新密码不一致',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
if (strlen($new_password) < 6) {
    echo json_encode([
        'code' => 4,
        'msg' => '新密码长度不能少于6位',
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

$stmt = $conn->prepare('SELECT password FROM users WHERE id=?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$stmt->bind_result($db_password);
$stmt->fetch();
$stmt->close();

if (!password_verify($old_password, $db_password)) {
    echo json_encode([
        'code' => 5,
        'msg' => '旧密码错误',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
$stmt = $conn->prepare('UPDATE users SET password=? WHERE id=?');
$stmt->bind_param('si', $new_password_hash, $user_id);
if ($stmt->execute()) {
    echo json_encode([
        'code' => 0,
        'msg' => '密码修改成功',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'code' => 6,
        'msg' => '密码修改失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
}
$stmt->close();
$conn->close(); 