<?php
session_start(); // 启动会话
ini_set('session.gc_maxlifetime', 604800); // 设置 Session 垃圾回收最大生命周期为 7 天 (604800 秒)
ini_set('session.cookie_lifetime', 604800); // 设置 Session Cookie 的生命周期为 7 天 (604800 秒)
require_once 'utils.php'; // 引入新的日志工具文件
ini_set('display_errors', 0); // 关闭错误显示
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING); // 仅报告致命错误和解析错误，忽略通知和警告
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
        // 获取用户信息或检查登录状态
        if (isset($_GET['action'])) {
            switch ($_GET['action']) {
                case 'getUserInfo':
                    handleGetUserInfo();
                    break;
                case 'check':
                    handleCheckLogin();
                    break;
                case 'logout':
                    handleLogout();
                    break;
                default:
                    sendResponse(400, '无效的请求');
            }
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
    $stmt = $conn->prepare("SELECT id, username, email, password, is_admin FROM users WHERE email = ?");
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

    // 设置会话变量，用于收藏等功能的用户ID判断
    $_SESSION['user_id'] = $user['id'];

    // 新增调试日志：记录会话ID和存储的用户ID
    sendDebugLog([
        'msg' => '登录成功，会话已设置',
        'session_id' => session_id(), // 获取当前会话ID
        'user_id_in_session' => $_SESSION['user_id']
    ], 'wallpaper_debug_log.txt', 'append', 'auth_login_session_set');

    // 强制设置 PHPSESSID cookie，保证前端能获取到 session
    setcookie('PHPSESSID', session_id(), time() + 604800, '/'); // 延长 PHPSESSID cookie 的有效期到 7 天

    // 返回用户信息（不再返回自定义 sessionId）
    $response = [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'is_admin' => (bool)$user['is_admin']
    ];
    sendResponse(200, '登录成功', $response);
    
    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理用户登出
 */
function handleLogout() {
    // 检查 Session 中是否存在 user_id
    if (!isset($_SESSION['user_id'])) {
        sendResponse(401, '未登录');
        return;
    }
    
    // 清除 Session 数据
    session_unset();
    session_destroy();
    
    sendResponse(200, '登出成功');
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
    // 检查 Session 中是否存在 user_id
    sendDebugLog(['msg' => 'handleGetUserInfo called', 'session_id' => session_id(), 'session_data' => $_SESSION], 'wallpaper_debug_log.txt', 'append', 'auth_getuserinfo_start');

    if (!isset($_SESSION['user_id'])) {
        sendDebugLog(['msg' => 'handleGetUserInfo: user_id not in session', 'session_data' => $_SESSION], 'wallpaper_debug_log.txt', 'append', 'auth_getuserinfo_no_user_id');
        sendResponse(401, '未登录或会话已过期');
        return;
    }
    
    $userId = $_SESSION['user_id'];
    
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }
    
    // 查询用户信息
    $stmt = $conn->prepare("
        SELECT id, username, email, is_admin, created_at 
        FROM users 
        WHERE id = ?
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Session 中有 user_id 但数据库中找不到用户，可能是数据不同步，视为未登录
        session_unset();
        session_destroy();
        sendResponse(401, '用户不存在或会话无效');
        $stmt->close();
        closeDBConnection($conn);
        return;
    }
    
    $user = $result->fetch_assoc();
    sendDebugLog(['msg' => 'handleGetUserInfo: user found', 'user_data' => $user], 'wallpaper_debug_log.txt', 'append', 'auth_getuserinfo_success');
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
 * 检查用户登录状态
 */
function handleCheckLogin() {
    // 检查session中是否有用户信息
    if (isset($_SESSION['user']) && isset($_SESSION['user']['id'])) {
        // 用户已登录，返回成功状态
        sendResponse(200, '用户已登录', [
            'user_id' => $_SESSION['user']['id'],
            'username' => $_SESSION['user']['username'] ?? '',
            'email' => $_SESSION['user']['email'] ?? ''
        ]);
    } else {
        // 用户未登录
        sendResponse(401, '用户未登录');
    }
}

// sendResponse函数已在utils.php中定义，此处移除重复定义