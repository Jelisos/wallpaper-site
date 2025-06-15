<?php
/**
 * 简单测试getUserInfo功能
 * 文件: simple_test.php
 */

// 启动会话
session_start();
ini_set('session.gc_maxlifetime', 604800);
ini_set('session.cookie_lifetime', 604800);

require_once 'config/database.php';
require_once 'api/utils.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h2>管理员登录验证测试</h2>";

// 1. 检查数据库中是否有管理员用户
echo "<h3>1. 检查管理员用户</h3>";
$conn = getDBConnection();
if ($conn) {
    $stmt = $conn->prepare("SELECT id, username, email, is_admin FROM users WHERE is_admin = 1");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo "✅ 找到管理员用户:<br>";
        while ($admin = $result->fetch_assoc()) {
            echo "ID: {$admin['id']}, 用户名: {$admin['username']}, 邮箱: {$admin['email']}, is_admin: {$admin['is_admin']}<br>";
        }
    } else {
        echo "❌ 数据库中没有管理员用户<br>";
    }
    $stmt->close();
    closeDBConnection($conn);
}

// 2. 模拟管理员登录
echo "<h3>2. 模拟管理员登录</h3>";
$conn = getDBConnection();
if ($conn) {
    $stmt = $conn->prepare("SELECT id, username, email, is_admin FROM users WHERE is_admin = 1 LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $admin = $result->fetch_assoc();
        $_SESSION['user_id'] = $admin['id'];
        echo "✅ 已设置Session: user_id = {$admin['id']} ({$admin['username']})<br>";
        echo "Session ID: " . session_id() . "<br>";
    }
    $stmt->close();
    closeDBConnection($conn);
}

// 3. 测试getUserInfo逻辑
echo "<h3>3. 测试getUserInfo逻辑</h3>";

if (!isset($_SESSION['user_id'])) {
    echo "❌ Session中没有user_id<br>";
} else {
    echo "✅ Session中有user_id: " . $_SESSION['user_id'] . "<br>";
    
    $userId = $_SESSION['user_id'];
    $conn = getDBConnection();
    if ($conn) {
        $stmt = $conn->prepare("SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo "❌ 数据库中找不到用户<br>";
        } else {
            $user = $result->fetch_assoc();
            echo "✅ 找到用户信息:<br>";
            echo "ID: " . $user['id'] . "<br>";
            echo "用户名: " . $user['username'] . "<br>";
            echo "邮箱: " . $user['email'] . "<br>";
            echo "是否管理员: " . ($user['is_admin'] ? '是' : '否') . " (值: " . $user['is_admin'] . ")<br>";
            echo "创建时间: " . $user['created_at'] . "<br>";
            
            // 检查管理员权限验证逻辑
            echo "<br><strong>管理员权限验证:</strong><br>";
            if ($user['is_admin'] == 1) {
                echo "✅ 用户具有管理员权限 (is_admin == 1)<br>";
            } else {
                echo "❌ 用户没有管理员权限 (is_admin = {$user['is_admin']})<br>";
            }
        }
        
        $stmt->close();
        closeDBConnection($conn);
    } else {
        echo "❌ 数据库连接失败<br>";
    }
}

// 4. 直接调用API
echo "<h3>4. 直接调用getUserInfo API</h3>";
echo "<a href='/api/auth.php?action=getUserInfo' target='_blank'>点击测试API</a><br>";

?>