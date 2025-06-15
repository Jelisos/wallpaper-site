<!DOCTYPE html>
<html>
<head>
    <title>问题测试页面</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>问题测试页面</h1>
    
    <h2>1. 管理员账号测试</h2>
    <?php
    $conn = new mysqli('localhost', 'root', '', 'wallpaper_db');
    if ($conn->connect_error) {
        echo '<p style="color:red;">数据库连接失败: ' . $conn->connect_error . '</p>';
    } else {
        echo '<p style="color:green;">数据库连接成功</p>';
        
        // 检查管理员账号
        $result = $conn->query("SELECT id, username, email, is_admin FROM users WHERE username='admin' OR email='admin@wallpaper.com'");
        if ($result->num_rows > 0) {
            echo '<h3>管理员账号信息:</h3>';
            while($row = $result->fetch_assoc()) {
                echo '<p>ID: ' . $row['id'] . ', 用户名: ' . $row['username'] . ', 邮箱: ' . $row['email'] . ', 管理员: ' . $row['is_admin'] . '</p>';
            }
        } else {
            echo '<p style="color:red;">未找到管理员账号</p>';
            
            // 创建管理员账号
            $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $insertSql = "INSERT INTO users (username, email, password, is_admin) VALUES ('admin', 'admin@wallpaper.com', '$hashedPassword', 1)";
            if ($conn->query($insertSql) === TRUE) {
                echo '<p style="color:green;">管理员账号创建成功</p>';
            } else {
                echo '<p style="color:red;">管理员账号创建失败: ' . $conn->error . '</p>';
            }
        }
        
        // 检查所有用户
        echo '<h3>所有用户列表:</h3>';
        $result = $conn->query("SELECT id, username, email, is_admin FROM users");
        while($row = $result->fetch_assoc()) {
            echo '<p>ID: ' . $row['id'] . ', 用户名: ' . $row['username'] . ', 邮箱: ' . $row['email'] . ', 管理员: ' . $row['is_admin'] . '</p>';
        }
    }
    ?>
    
    <h2>2. 壁纸详情API测试</h2>
    <?php
    // 测试壁纸详情API
    $wallpaperApiUrl = 'http://localhost/api/wallpaper.php?action=details&wallpaperId=1';
    $context = stream_context_create([
        'http' => [
            'timeout' => 10
        ]
    ]);
    $response = @file_get_contents($wallpaperApiUrl, false, $context);
    if ($response !== false) {
        echo '<h3>API响应:</h3>';
        echo '<pre>' . htmlspecialchars($response) . '</pre>';
    } else {
        echo '<p style="color:red;">API请求失败</p>';
    }
    ?>
    
    <h2>3. 壁纸列表测试</h2>
    <?php
    // 检查壁纸数据
    if ($conn && !$conn->connect_error) {
        $result = $conn->query("SELECT id, title, file_path FROM wallpapers LIMIT 5");
        if ($result->num_rows > 0) {
            echo '<h3>前5个壁纸:</h3>';
            while($row = $result->fetch_assoc()) {
                echo '<p>ID: ' . $row['id'] . ', 标题: ' . $row['title'] . ', 路径: ' . $row['file_path'] . '</p>';
            }
        } else {
            echo '<p style="color:red;">没有找到壁纸数据</p>';
        }
        $conn->close();
    }
    ?>
    
    <h2>4. JavaScript测试</h2>
    <div id="test-area">
        <div class="masonry-item" data-wallpaper-id="1" style="border: 1px solid #ccc; padding: 10px; margin: 10px; cursor: pointer;">
            <p>点击这个测试壁纸卡片</p>
            <p>壁纸ID: 1</p>
        </div>
    </div>
    
    <script>
    // 测试壁纸点击事件
    document.addEventListener('DOMContentLoaded', function() {
        const testCard = document.querySelector('.masonry-item');
        if (testCard) {
            testCard.addEventListener('click', function(e) {
                const wallpaperId = this.dataset.wallpaperId;
                alert('壁纸卡片点击成功！壁纸ID: ' + wallpaperId);
                
                // 测试API调用
                fetch('/api/wallpaper.php?action=details&wallpaperId=' + wallpaperId)
                    .then(response => response.json())
                    .then(data => {
                        console.log('API响应:', data);
                        alert('API调用结果: ' + JSON.stringify(data));
                    })
                    .catch(error => {
                        console.error('API调用失败:', error);
                        alert('API调用失败: ' + error.message);
                    });
            });
        }
    });
    </script>
</body>
</html>