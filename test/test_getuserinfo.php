<?php
/**
 * 测试getUserInfo API
 * 文件: test/test_getuserinfo.php
 */

// 启动会话
session_start();
ini_set('session.gc_maxlifetime', 604800);
ini_set('session.cookie_lifetime', 604800);

require_once '../config/database.php';

echo "<h2>测试getUserInfo API</h2>";

// 模拟设置一个管理员用户的session
$conn = getDBConnection();
if ($conn) {
    $stmt = $conn->prepare("SELECT id, username, email, is_admin FROM users WHERE is_admin = 1 LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $admin = $result->fetch_assoc();
        $_SESSION['user_id'] = $admin['id'];
        echo "已设置管理员用户Session: user_id = " . $admin['id'] . " (" . $admin['username'] . ")<br><br>";
    } else {
        echo "未找到管理员用户<br><br>";
    }
    
    $stmt->close();
    closeDBConnection($conn);
}

// 直接调用getUserInfo逻辑
echo "<h3>直接调用getUserInfo逻辑:</h3>";

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
        }
        
        $stmt->close();
        closeDBConnection($conn);
    } else {
        echo "❌ 数据库连接失败<br>";
    }
}

echo "<br><h3>通过API调用测试:</h3>";
echo "<iframe src='/api/auth.php?action=getUserInfo' width='100%' height='100'></iframe>";
?>