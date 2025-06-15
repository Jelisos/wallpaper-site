<?php
$conn = new mysqli('localhost', 'root', '', 'wallpaper_db');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== 检查管理员账号 ===\n";
$result = $conn->query("SELECT id, username, email, is_admin FROM users WHERE username='admin' OR email='admin@wallpaper.com'");
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        echo 'ID: ' . $row['id'] . ', Username: ' . $row['username'] . ', Email: ' . $row['email'] . ', Is_Admin: ' . $row['is_admin'] . "\n";
    }
} else {
    echo "No admin user found\n";
}

echo "\n=== 所有用户列表 ===\n";
$result = $conn->query("SELECT id, username, email, is_admin FROM users");
while($row = $result->fetch_assoc()) {
    echo 'ID: ' . $row['id'] . ', Username: ' . $row['username'] . ', Email: ' . $row['email'] . ', Is_Admin: ' . $row['is_admin'] . "\n";
}

$conn->close();
?>