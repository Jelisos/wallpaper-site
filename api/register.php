<?php
/**
 * 用户注册接口
 * @author AI
 * @return JSON
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php'; // 数据库配置

// 统一返回格式
function response($code, $msg, $data = null) {
    echo json_encode(['code' => $code, 'msg' => $msg, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

// 只允许POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(1, '只允许POST请求');
}

// 获取参数
$username = trim($_POST['username'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

// 参数校验
if (!$username || !$email || !$password) {
    response(2, '所有字段均为必填');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    response(3, '邮箱格式不正确');
}
if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/', $password)) {
    response(4, '密码至少8位，且包含字母和数字');
}

// 连接数据库
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($conn->connect_error) {
    response(5, '数据库连接失败');
}
$conn->set_charset('utf8mb4');

// 检查邮箱唯一
$stmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    response(6, '该邮箱已被注册');
}
$stmt->close();

// 检查用户名唯一
$stmt = $conn->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
$stmt->bind_param('s', $username);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    response(7, '该用户名已被使用');
}
$stmt->close();

// 密码加密
$hash = password_hash($password, PASSWORD_DEFAULT);

// 插入用户
$stmt = $conn->prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
$stmt->bind_param('sss', $username, $email, $hash);
if ($stmt->execute()) {
    response(0, '注册成功', ['id' => $stmt->insert_id, 'username' => $username, 'email' => $email]);
} else {
    response(7, '注册失败，请重试');
}
$stmt->close();
$conn->close();