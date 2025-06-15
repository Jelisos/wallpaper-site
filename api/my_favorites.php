<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT); // 2024-07-27 新增：报告 MySQLi 错误和严格模式

// 临时直接写入日志的函数，用于紧急调试
function tempFileLog($message, $filename = 'debug.log', $tag = 'DEBUG') {
    $log_dir = __DIR__ . '/../logs/';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0777, true);
    }
    $filepath = $log_dir . $filename;
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = sprintf("[%s] [%s] %s\n", $timestamp, $tag, $message);
    file_put_contents($filepath, $log_entry, FILE_APPEND | LOCK_EX);
}

tempFileLog('my_favorites.php: 文件开始执行', 'favorite_debug_log.txt', 'FILE_START');

/**
 * 获取当前登录用户收藏的壁纸列表接口
 * @author AI
 * @return JSON
 */
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';
// require_once './utils.php'; // 2024-07-27 修复：确保引入 utils.php 以便使用 sendDebugLog (暂时注释，使用临时嵌入函数)

// 2024-07-27 新增：调试日志，打印SESSION内容
// error_log('my_favorites.php: SESSION内容 - [RAW]: ' . json_encode($_SESSION, JSON_UNESCAPED_UNICODE)); // 2024-07-27 紧急调试：直接写入错误日志
tempFileLog('my_favorites.php: SESSION内容: ' . json_encode($_SESSION, JSON_UNESCAPED_UNICODE), 'favorite_debug_log.txt', 'SESSION_CONTENT');

try {
if (!isset($_SESSION['user'])) {
        // sendDebugLog(['code'=>401, 'msg'=>'未登录', 'user_id'=>(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : 'not_set')], 'favorite_debug_log.txt', 'append', 'my_fav_not_logged_in');
        tempFileLog('my_favorites.php: 未登录用户', 'favorite_debug_log.txt', 'NOT_LOGGED_IN');
        echo json_encode(
            [
        'code' => 401,
        'msg' => '未登录',
        'data' => null
            ],
            JSON_UNESCAPED_UNICODE
        );
    exit;
}

$user_id = $_SESSION['user']['id'];
    // 2024-07-27 新增：调试日志，打印获取到的 user_id
    // error_log('my_favorites.php: 获取用户ID - [RAW]: ' . $user_id); // 2024-07-27 紧急调试：直接写入错误日志
    tempFileLog('my_favorites.php: 获取用户ID: ' . $user_id, 'favorite_debug_log.txt', 'USER_ID_CHECK');

// 数据库连接
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($conn->connect_error) {
        throw new Exception("数据库连接失败: " . $conn->connect_error);
    }

    // 2024-07-27 新增：直接查询，用于验证数据库连接和基本查询功能
    tempFileLog('my_favorites.php: 开始执行直接查询验证', 'favorite_debug_log.txt', 'DIRECT_QUERY_START');
    $direct_query_sql = "SELECT * FROM wallpaper_favorites WHERE user_id = " . (int)$user_id . " LIMIT 50";
    $direct_result = $conn->query($direct_query_sql);
    
    if ($direct_result) {
        $direct_data = [];
        while ($row = $direct_result->fetch_assoc()) {
            $direct_data[] = $row;
        }
        tempFileLog('my_favorites.php: 直接查询结果行数: ' . $direct_result->num_rows, 'favorite_debug_log.txt', 'DIRECT_QUERY_ROWS');
        tempFileLog('my_favorites.php: 直接查询返回数据: ' . json_encode($direct_data, JSON_UNESCAPED_UNICODE), 'favorite_debug_log.txt', 'DIRECT_QUERY_DATA');
        $direct_result->free();
    } else {
        tempFileLog('my_favorites.php: 直接查询失败: ' . $conn->error, 'favorite_debug_log.txt', 'DIRECT_QUERY_ERROR');
    }

    // 查询用户收藏的壁纸 (现在恢复为 INNER JOIN，以便调试)
    $sql = "SELECT w.id, w.title, w.file_path, w.created_at FROM wallpapers w INNER JOIN wallpaper_favorites f ON w.id = f.wallpaper_id WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 50";
    // 2024-07-27 新增：调试日志，打印 SQL 语句
    // sendDebugLog(['msg'=>'my_favorites.php: SQL 语句', 'sql'=>$sql, 'user_id'=>$user_id], 'favorite_debug_log.txt', 'append', 'sql_query');
    tempFileLog('my_favorites.php: 预处理语句 SQL: ' . $sql . ', user_id: ' . $user_id, 'favorite_debug_log.txt', 'PREPARED_SQL_QUERY');

    $stmt = $conn->prepare($sql);

    // 2024-07-27 新增：调试日志，打印 prepare 错误
    if ($stmt === false) {
        // error_log('my_favorites.php: prepare 语句失败 - [RAW]: ' . $conn->error); // 2024-07-27 紧急调试：直接写入错误日志
        // sendDebugLog(['msg'=>'my_favorites.php: prepare 语句失败', 'error'=>$conn->error], 'favorite_debug_log.txt', 'append', 'prepare_error');
        tempFileLog('my_favorites.php: prepare 语句失败: ' . $conn->error, 'favorite_debug_log.txt', 'PREPARE_ERROR');
        echo json_encode(['code' => 500, 'msg' => '准备查询失败', 'data' => null], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt->bind_param('i', $user_id);

    // 2024-07-27 新增：调试日志，打印 execute 错误
    if (!$stmt->execute()) {
        // error_log('my_favorites.php: execute 语句失败 - [RAW]: ' . $stmt->error); // 2024-07-27 紧急调试：直接写入错误日志
        // sendDebugLog(['msg'=>'my_favorites.php: execute 语句失败', 'error'=>$stmt->error], 'favorite_debug_log.txt', 'append', 'execute_error');
        tempFileLog('my_favorites.php: execute 语句失败: ' . $stmt->error, 'favorite_debug_log.txt', 'EXECUTE_ERROR');
        echo json_encode(['code' => 500, 'msg' => '执行查询失败', 'data' => null], JSON_UNESCAPED_UNICODE);
        exit;
    }

$result = $stmt->get_result();

    // 2024-07-27 新增：调试日志，打印查询结果的行数
    // error_log('my_favorites.php: 查询结果行数 - [RAW]: ' . $result->num_rows); // 2024-07-27 紧急调试：直接写入错误日志
    tempFileLog('my_favorites.php: 查询结果行数: ' . $result->num_rows, 'favorite_debug_log.txt', 'QUERY_RESULT_CHECK');

$list = [];
while ($row = $result->fetch_assoc()) {
    $list[] = $row;
}
$stmt->close();
$conn->close();

    // error_log('my_favorites.php: 返回的列表数据 - [RAW]: ' . json_encode($list, JSON_UNESCAPED_UNICODE)); // 2024-07-27 紧急调试：直接写入错误日志
    // 2024-07-27 新增：调试日志，打印最终返回的列表数据
    // sendDebugLog(['msg'=>'my_favorites.php: 最终返回的收藏列表', 'data'=>$list], 'favorite_debug_log.txt', 'append', 'final_data');
    tempFileLog('my_favorites.php: 最终返回的收藏列表: ' . json_encode($list, JSON_UNESCAPED_UNICODE), 'favorite_debug_log.txt', 'FINAL_DATA');

echo json_encode([
    'code' => 0,
    'msg' => 'success',
    'data' => $list
], JSON_UNESCAPED_UNICODE); 
} catch (Exception $e) {
    echo json_encode([
        'code' => 500,
        'msg' => '服务器错误',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
} 