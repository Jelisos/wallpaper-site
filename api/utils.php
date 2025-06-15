<?php
// 2024-07-31 清理文件以移除潜在的BOM或多余空白字符

/**
 * PHP 后端专用的调试日志记录函数
 * 将调试信息写入指定的日志文件。
 *
 * @param mixed $log_data 任何要记录的数据，会被转换为 JSON 字符串
 * @param string $log_file 日志文件名，默认为 'debug.log'
 * @param string $mode 写入模式，'append'（追加）或 'overwrite'（覆盖），默认为追加
 * @param string $tag 日志标签，用于分类和过滤日志
 */
function sendDebugLog($log_data, $log_file = 'wallpaper_debug_log.txt', $mode = 'append', $tag = 'debug') {
    $log_dir = __DIR__ . '/../logs/'; // 日志文件存储在 htdocs/logs/ 目录下
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0777, true);
    }
    $filepath = $log_dir . $log_file;

    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN_IP';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN_UA';
    $referer = $_SERVER['HTTP_REFERER'] ?? 'UNKNOWN_REFERER';

    // 尝试将数据编码为 JSON，如果失败则直接使用 var_export
    $log_content = json_encode($log_data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $log_content = var_export($log_data, true); // Fallback for non-JSON serializable data
    }

    $log_entry = sprintf(
        "==== [%s] [ip:%s] [ua:%s] [referer:%s] [tag:%s] %s ====\n",
        $timestamp, $ip, $userAgent, $referer, $tag, $log_content
    );

    if ($mode === 'overwrite') {
        file_put_contents($filepath, $log_entry, LOCK_EX);
    } else {
        file_put_contents($filepath, $log_entry, FILE_APPEND | LOCK_EX);
    }
}

/**
 * 发送统一的 JSON 响应
 * @param int $code 响应码 (0表示成功，其他表示错误)
 * @param string $msg 响应消息
 * @param mixed $data 响应数据
 */
function sendResponse($code, $msg, $data = null) {
    echo json_encode([
        'code' => $code,
        'msg' => $msg,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * 获取当前登录用户的ID
 * @return int|null 用户ID，如果未登录则返回null
 */
function getCurrentUserId() {
    if (session_status() == PHP_SESSION_NONE) {
        session_start(); // 仅在session未启动时启动
    }
    return $_SESSION['user_id'] ?? null;
}

/**
 * 检查当前用户是否是管理员
 * @return bool 如果是管理员则返回true，否则返回false
 */
function isAdmin() {
    $user_id = getCurrentUserId();
    if (!$user_id) {
        return false;
    }

    // 引入数据库配置
    require_once __DIR__ . '/../config/database.php';

    $conn = null;
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
        $conn->set_charset("utf8mb4");

        if ($conn->connect_error) {
            sendDebugLog('数据库连接失败 (isAdmin):', ['error' => $conn->connect_error], 'ERROR');
            return false;
        }

        $stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ? LIMIT 1");
        if (!$stmt) {
            sendDebugLog('SQL预处理失败 (isAdmin):', ['error' => $conn->error], 'ERROR');
            return false;
        }
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        
        return isset($row['is_admin']) && $row['is_admin'] === 1;

    } catch (Exception $e) {
        sendDebugLog('isAdmin函数执行异常:', ['error' => $e->getMessage()], 'ERROR');
        return false;
    } finally {
        if ($conn) {
            $conn->close();
        }
    }
}
