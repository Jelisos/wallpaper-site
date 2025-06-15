<?php
ini_set('display_errors', 1); // 临时开启错误显示
error_reporting(E_ALL);     // 显示所有错误
mb_internal_encoding("UTF-8"); // 2024-07-28 新增: 确保PHP内部字符串处理使用UTF-8
/**
 * 文件: api/wallpaper_detail.php
 * 描述: 根据壁纸ID获取壁纸详情数据
 * 依赖: ../config/database.php, utils.php
 * 维护: 负责提供单个壁纸的详细信息
 */

// 引入数据库配置和工具函数
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/utils.php';

header('Content-Type: application/json; charset=utf-8');

sendDebugLog('api/wallpaper_detail.php', '请求壁纸详情', $_GET);

$wallpaper_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($wallpaper_id <= 0) {
    sendDebugLog('api/wallpaper_detail.php', '参数错误', ['msg' => '缺少壁纸ID或ID无效', 'id' => $wallpaper_id], 'ERROR');
    echo json_encode(['code' => 1, 'msg' => '缺少壁纸ID或ID无效']);
    exit();
}

// 创建数据库连接
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
$conn->set_charset("utf8mb4"); // 2024-07-28 新增: 显式设置数据库连接字符集

// 检查连接
if ($conn->connect_error) {
    sendDebugLog('api/wallpaper_detail.php', '数据库连接失败', ['error' => $conn->connect_error], 'ERROR');
    echo json_encode(['code' => 1, 'msg' => '数据库连接失败']);
    exit();
}

$stmt = $conn->prepare("SELECT id, title, file_path, category, tags, width, height, file_size, format, likes, views, created_at, updated_at FROM wallpapers WHERE id = ?");
if ($stmt === false) {
    sendDebugLog('api/wallpaper_detail.php', 'SQL预处理失败', ['error' => $conn->error], 'ERROR');
    echo json_encode(['code' => 1, 'msg' => 'SQL预处理失败: ' . $conn->error]);
    $conn->close();
    exit();
}

$stmt->bind_param("i", $wallpaper_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    // 映射数据库字段到前端需要的字段名
    $wallpaper_data = [
        'id' => $row['id'],
        'name' => $row['title'], // 前端用 name，数据库用 title
        'path' => str_replace('\\', '/', $row['file_path']), // 修正路径中的反斜杠，并前端用 path，数据库用 file_path
        'category' => $row['category'],
        'tags' => explode(',', $row['tags']), // tags 字段在数据库中是字符串，前端需要数组
        'width' => $row['width'],
        'height' => $row['height'],
        'size' => $row['file_size'] ?? 0, // 从数据库获取文件大小，如果不存在则默认为0
        'format' => $row['format'] ?? '', // 从数据库获取文件格式，如果不存在则默认为空字符串
        'upload_time' => $row['created_at'], // 使用创建时间作为上传时间
        'likes' => $row['likes'],
        'views' => $row['views'],
        'prompt' => '', // 数据库中不存在此字段，默认为空字符串
    ];
    
    // 2024-07-28 调试: 检查name和category在json_encode前的状态
    sendDebugLog('api/wallpaper_detail.php', '准备发送的壁纸详情', [
        'wallpaper_id' => $wallpaper_id,
        'name_debug' => $wallpaper_data['name'],
        'category_debug' => $wallpaper_data['category'],
        'name_encoding' => mb_check_encoding($wallpaper_data['name'], 'UTF-8') ? 'UTF-8' : 'NOT UTF-8',
        'category_encoding' => mb_check_encoding($wallpaper_data['category'], 'UTF-8') ? 'UTF-8' : 'NOT UTF-8'
    ], 'DEBUG');

    // 2024-07-28 调试: 确保所有字符串数据都是UTF-8编码 (保留，再次验证)
    foreach ($wallpaper_data as $key => &$value) {
        if (is_string($value) && !mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', mb_detect_encoding($value, 'UTF-8, ISO-8859-1, GBK, BIG5', true));
        }
    }
    unset($value); // 务必在循环后解除引用
    
    sendDebugLog('api/wallpaper_detail.php', '成功获取壁纸详情', ['id' => $wallpaper_id], 'INFO');
    echo json_encode(['code' => 0, 'data' => $wallpaper_data]);
} else {
    sendDebugLog('api/wallpaper_detail.php', '未找到壁纸', ['id' => $wallpaper_id], 'WARNING');
    echo json_encode(['code' => 1, 'msg' => '未找到该壁纸']);
}

$stmt->close();
$conn->close();

?> 