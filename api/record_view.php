<?php
/**
 * 文件: api/record_view.php
 * 描述: 记录壁纸查看次数（按天和IP去重）
 * 依赖: 无外部依赖，但需要数据库配置
 * 维护: 负责处理壁纸查看记录的逻辑
 */

header('Content-Type: application/json');

// 数据库配置 (请根据您的实际情况修改)
$host = 'localhost';
$db   = 'wallpaper_db'; // 替换为您的数据库名
$user = 'root'; // 替换为您的数据库用户名
$pass = ''; // 替换为您的数据库密码
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$response = ['code' => 1, 'msg' => '未知错误']; // 默认错误响应

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // 2024-07-30 修复: 支持JSON和表单数据两种格式
    $wallpaperId = null;
    
    // 检查Content-Type来决定如何获取数据
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        // JSON格式数据
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        $wallpaperId = $data['wallpaper_id'] ?? null;
    } else {
        // 表单数据格式
        $wallpaperId = $_POST['wallpaper_id'] ?? null;
    }
    if (!$wallpaperId) {
        $response = ['code' => 1, 'msg' => '缺少壁纸ID'];
        echo json_encode($response);
        exit;
    }

    // 获取用户IP地址
    function getUserIpAddr(){
        if(!empty($_SERVER['HTTP_CLIENT_IP'])){
            // IP from shared internet
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        }elseif(!empty($_SERVER['HTTP_X_FORWARDED_FOR'])){
            // IP passed from proxy
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        }else{
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        return $ip;
    }
    $ipAddress = getUserIpAddr();
    $viewDate = date('Y-m-d'); // 获取当前日期

    // 检查是否已存在今天的查看记录 (基于壁纸ID、IP和日期)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM wallpaper_views_log WHERE wallpaper_id = ? AND ip_address = ? AND view_date = ?");
    $stmt->execute([$wallpaperId, $ipAddress, $viewDate]);
    $count = $stmt->fetchColumn();

    if ($count == 0) {
        // 不存在记录，插入新记录
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO wallpaper_views_log (wallpaper_id, ip_address, view_date) VALUES (?, ?, ?)");
            $stmt->execute([$wallpaperId, $ipAddress, $viewDate]);

            // 更新壁纸的查看次数
            $stmt = $pdo->prepare("UPDATE wallpapers SET views = views + 1 WHERE id = ?");
            $stmt->execute([$wallpaperId]);

            $pdo->commit();
            $response = ['code' => 0, 'msg' => '查看记录成功'];
        } catch (PDOException $e) {
            $pdo->rollBack();
            // 检查是否是唯一键冲突 (重复查看)
            if ($e->getCode() == 23000) { // SQLSTATE for integrity constraint violation
                $response = ['code' => 0, 'msg' => '已记录今日查看']; // 已经存在，但也算成功处理
            } else {
                $response = ['code' => 1, 'msg' => '数据库操作失败: ' . $e->getMessage()];
            }
        }
    } else {
        $response = ['code' => 0, 'msg' => '已记录今日查看']; // 已经存在，无需重复记录
    }

} catch (PDOException $e) {
    $response = ['code' => 1, 'msg' => '数据库连接失败或处理错误: ' . $e->getMessage()];
}

echo json_encode($response);
?>