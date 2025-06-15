<?php
/**
 * 用户登录接口
 * @author AI
 * @return JSON
 */
session_start();
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
$password = $_POST['password'] ?? '';

// 参数校验
if (!$username || !$password) {
    response(2, '用户名/邮箱和密码均为必填');
}

// 连接数据库
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($conn->connect_error) {
    response(4, '数据库连接失败');
}
$conn->set_charset('utf8mb4');

// 判断输入是邮箱还是用户名
$isEmail = filter_var($username, FILTER_VALIDATE_EMAIL);

// 查询用户
if ($isEmail) {
    // 使用邮箱查询
    $stmt = $conn->prepare('SELECT id, username, email, password, is_admin FROM users WHERE email = ? LIMIT 1');
} else {
    // 使用用户名查询
    $stmt = $conn->prepare('SELECT id, username, email, password, is_admin FROM users WHERE username = ? LIMIT 1');
}

$stmt->bind_param('s', $username);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
if (!$user) {
    response(5, '账号不存在');
}

// 验证密码
if (!password_verify($password, $user['password'])) {
    response(6, '密码错误');
}
// 登录成功，写session
$_SESSION['user'] = [
    'id' => $user['id'],
    'username' => $user['username'],
    'email' => $user['email'],
    'is_admin' => $user['is_admin']
];
$_SESSION['user_id'] = $user['id'];
// 强制刷新session cookie
setcookie('PHPSESSID', session_id(), time() + 3600, '/');
response(0, '登录成功', ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email'], 'is_admin' => $user['is_admin']]);
$stmt->close();
$conn->close();