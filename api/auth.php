<?php
/**
 * 用户认证API
 * @author Claude
 * @date 2024-03-21
 */

require_once '../config/database.php';

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);

// 处理请求
switch ($method) {
    case 'POST':
        // 根据action参数处理不同的请求
        $action = isset($data['action']) ? $data['action'] : '';
        
        switch ($action) {
            case 'register':
                handleRegister($data);
                break;
            case 'login':
                handleLogin($data);
                break;
            case 'logout':
                handleLogout();
                break;
            case 'changePassword':
                handleChangePassword($data);
                break;
            case 'updateProfile':
                handleUpdateProfile($data);
                break;
            default:
                sendResponse(400, '无效的请求');
        }
        break;
        
    case 'GET':
        // 获取用户信息
        if (isset($_GET['action']) && $_GET['action'] === 'getUserInfo') {
            handleGetUserInfo();
        } else {
            sendResponse(400, '无效的请求');
        }
        break;
        
    default:
        sendResponse(405, '不支持的请求方法');
}

/**
 * 处理用户注册
 */
function handleRegister($data) {
    // 验证必要字段
    if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        sendResponse(400, '缺少必要字段');
        return;
    }
    
    // 验证邮箱格式
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        sendResponse(400, '邮箱格式不正确');
        return;
    }
    
    // 验证密码强度
    if (strlen($data['password']) < 8 || !preg_match('/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/', $data['password'])) {
        sendResponse(400, '密码必须至少8位，包含字母和数字');
        return;
    }
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    // 检查邮箱是否已存在
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $data['email']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        sendResponse(400, '该邮箱已被注册');
        $stmt->close();
        closeDBConnection($conn);
        return;
    }
    
    // 密码加密
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
    
    // 插入新用户
    $stmt = $conn->prepare("INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("sss", $data['username'], $data['email'], $hashedPassword);
    
    if ($stmt->execute()) {
        // 创建用户成功，返回用户信息
        $userId = $conn->insert_id;
        $response = [
            'id' => $userId,
            'username' => $data['username'],
            'email' => $data['email']
        ];
        sendResponse(200, '注册成功', $response);
    } else {
        sendResponse(500, '注册失败');
    }
    
    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理用户登录
 */
function handleLogin($data) {
    // 验证必要字段
    if (!isset($data['email']) || !isset($data['password'])) {
        sendResponse(400, '缺少必要字段');
        return;
    }
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    // 查询用户
    $stmt = $conn->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $data['email']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(401, '用户不存在');
        $stmt->close();
        closeDBConnection($conn);
        return;
    }
    
    $user = $result->fetch_assoc();
    
    // 验证密码
    if (!password_verify($data['password'], $user['password'])) {
        sendResponse(401, '密码错误');
        $stmt->close();
        closeDBConnection($conn);
        return;
    }
    
    // 生成会话ID
    $sessionId = bin2hex(random_bytes(32));
    
    // 存储会话信息
    $stmt = $conn->prepare("INSERT INTO sessions (user_id, session_id, created_at) VALUES (?, ?, NOW())");
    $stmt->bind_param("is", $user['id'], $sessionId);
    $stmt->execute();
    
    // 返回用户信息和会话ID
    $response = [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'sessionId' => $sessionId
    ];
    
    sendResponse(200, '登录成功', $response);
    
    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理用户登出
 */
function handleLogout() {
    // 获取会话ID
    $headers = getallheaders();
    $sessionId = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$sessionId) {
        sendResponse(401, '未登录');
        return;
    }
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    // 删除会话
    $stmt = $conn->prepare("DELETE FROM sessions WHERE session_id = ?");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    
    sendResponse(200, '登出成功');
    
    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理修改密码
 */
function handleChangePassword($data) {
    // 获取会话ID
    $headers = getallheaders();
    $sessionId = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$sessionId) {
        sendResponse(401, '未登录或会话已过期');
        return;
    }

    // 验证必要字段
    if (!isset($data['currentPassword']) || !isset($data['newPassword'])) {
        sendResponse(400, '缺少必要字段');
        return;
    }

    $currentPassword = $data['currentPassword'];
    $newPassword = $data['newPassword'];

    // 验证新密码强度
    if (strlen($newPassword) < 8 || !preg_match('/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/', $newPassword)) {
        sendResponse(400, '新密码必须至少8位，包含字母和数字');
        return;
    }
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    // 根据会话ID获取用户信息和当前密码哈希
    $stmt = $conn->prepare("
        SELECT u.id, u.password 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.session_id = ?
    ");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(401, '会话已过期或用户不存在');
        $stmt->close();
        closeDBConnection($conn);
        return;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // 验证当前密码
    if (!password_verify($currentPassword, $user['password'])) {
        sendResponse(401, '当前密码不正确');
        closeDBConnection($conn);
        return;
    }
    
    // 加密新密码
    $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // 更新数据库中的密码
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->bind_param("si", $hashedNewPassword, $user['id']);
    
    if ($stmt->execute()) {
        // 密码修改成功后，删除当前会话，要求用户重新登录
        $stmt->close();
        $stmt = $conn->prepare("DELETE FROM sessions WHERE session_id = ?");
        $stmt->bind_param("s", $sessionId);
        $stmt->execute();
        $stmt->close();
        
        sendResponse(200, '密码修改成功，请重新登录');
    } else {
        sendResponse(500, '密码修改失败');
    }
    
    closeDBConnection($conn);
}

/**
 * 获取用户信息
 */
function handleGetUserInfo() {
    // 获取会话ID
    $headers = getallheaders();
    $sessionId = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$sessionId) {
        sendResponse(401, '未登录');
        return;
    }
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    // 查询用户信息
    $stmt = $conn->prepare("
        SELECT u.id, u.username, u.email, u.created_at 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.session_id = ?
    ");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(401, '会话已过期');
        $stmt->close();
        closeDBConnection($conn);
        return;
    }
    
    $user = $result->fetch_assoc();
    sendResponse(200, '获取成功', $user);
    
    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理更新个人信息
 */
function handleUpdateProfile($data) {
    // 获取会话ID
    $headers = getallheaders();
    $sessionId = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$sessionId) {
        sendResponse(401, '未登录或会话已过期');
        return;
    }

    // 验证必要字段
    if (!isset($data['username']) || empty(trim($data['username']))) {
        sendResponse(400, '用户名不能为空');
        return;
    }

    $newUsername = trim($data['username']);
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    // 根据会话ID获取用户ID
    $stmt = $conn->prepare("
        SELECT user_id FROM sessions WHERE session_id = ?
    ");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(401, '会话已过期或用户不存在');
        $stmt->close();
        closeDBConnection($conn);
        return;
    }
    
    $user = $result->fetch_assoc();
    $userId = $user['user_id'];
    $stmt->close();
    
    // 更新用户名
    $stmt = $conn->prepare("UPDATE users SET username = ? WHERE id = ?");
    $stmt->bind_param("si", $newUsername, $userId);
    
    if ($stmt->execute()) {
        sendResponse(200, '个人信息更新成功', ['username' => $newUsername]);
    } else {
        sendResponse(500, '个人信息更新失败');
    }
    
    closeDBConnection($conn);
}

/**
 * 发送JSON响应
 */
function sendResponse($code, $message, $data = null) {
    http_response_code($code);
    echo json_encode([
        'code' => $code,
        'message' => $message,
        'data' => $data
    ]);
    exit();
} 