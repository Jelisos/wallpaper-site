<?php
/**
 * 测试管理员登录验证
 * 文件: test/test_admin_login.php
 * 功能: 模拟管理员登录验证过程，生成调试日志
 */

// 启动会话
session_start();
ini_set('session.gc_maxlifetime', 604800);
ini_set('session.cookie_lifetime', 604800);

require_once '../api/utils.php';
require_once '../config/database.php';

echo "<h2>管理员登录验证测试</h2>";

// 测试1: 检查当前会话状态
echo "<h3>1. 当前会话状态</h3>";
echo "Session ID: " . session_id() . "<br>";
echo "Session 数据: ";
var_dump($_SESSION);
echo "<br><br>";

// 测试2: 模拟登录一个管理员用户
echo "<h3>2. 模拟管理员登录</h3>";
$conn = getDBConnection();
if ($conn) {
    // 查找一个管理员用户
    $stmt = $conn->prepare("SELECT id, username, email, is_admin FROM users WHERE is_admin = 1 LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $admin = $result->fetch_assoc();
        echo "找到管理员用户: " . $admin['username'] . " (ID: " . $admin['id'] . ")<br>";
        
        // 设置会话
        $_SESSION['user_id'] = $admin['id'];
        echo "已设置 Session user_id: " . $_SESSION['user_id'] . "<br>";
        
        // 强制设置 cookie
        setcookie('PHPSESSID', session_id(), time() + 604800, '/');
        echo "已设置 PHPSESSID Cookie<br><br>";
    } else {
        echo "未找到管理员用户<br><br>";
    }
    
    $stmt->close();
    closeDBConnection($conn);
} else {
    echo "数据库连接失败<br><br>";
}

// 测试3: 调用 getUserInfo API
echo "<h3>3. 测试 getUserInfo API</h3>";
echo "<iframe src='/api/auth.php?action=getUserInfo' width='100%' height='200'></iframe><br><br>";

// 测试4: 检查会话数据
echo "<h3>4. 最终会话状态</h3>";
echo "Session ID: " . session_id() . "<br>";
echo "Session 数据: ";
var_dump($_SESSION);
echo "<br>";

echo "<h3>5. 查看调试日志</h3>";
echo "<a href='/wallpaper_debug_log.txt' target='_blank'>查看调试日志文件</a>";
?>