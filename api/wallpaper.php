<?php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

/**
 * 壁纸管理API
 * @author Claude
 * @date 2024-03-21
 */

require_once '../config/database.php';
require_once 'utils.php'; // 引入utils.php，用于sendDebugLog等工具函数

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

// 2024-07-31 新增：处理JSON请求体
$input_data = [];
$content_type = $_SERVER['CONTENT_TYPE'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($content_type, 'application/json') !== false) {
    $json_input = file_get_contents('php://input');
    $input_data = json_decode($json_input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse(400, '无效的JSON请求体');
    }
}

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

// 处理请求
switch ($method) {
    case 'POST':
        // 获取action参数，优先从JSON输入中获取，然后才是$_POST
        $action = $input_data['action'] ?? ($_POST['action'] ?? ''); // 2024-07-31 修改：优先从JSON获取action
        
        switch ($action) {
            case 'upload':
                // 重定向到专门的上传API
                require_once 'upload_wallpaper.php';
                break;
            case 'exile_wallpaper': // 2024-07-28 新增：流放壁纸
                handleExileWallpaper($input_data); // 2024-07-31 传递input_data
                break;
            case 'recall_wallpaper': // 2024-07-28 新增：召回壁纸
                handleRecallWallpaper($input_data); // 2024-07-31 传递input_data
                break;
            case 'admin_batch_recall': // 2024-07-29 新增：批量召回
                handleAdminBatchRecall();
                break;
            case 'admin_batch_exile': // 2025-01-27 新增：批量流放
                handleAdminBatchExile();
                break;
                
            // 其他壁纸相关的POST操作可以在这里添加
            default:
                sendResponse(400, '无效的请求');
        }
        break;
        
    case 'GET':
        // 获取action参数
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        
        switch ($action) {
            // 其他壁纸相关的GET操作可以在这里添加（例如获取壁纸列表、详情等）
            case 'list':
                 handleListWallpapers();
                 break;
            case 'details':
                 handleGetWallpaperDetails();
                 break;
            case 'categories':
                 handleGetCategories();
                 break;
            case 'search':
                 handleSearchWallpapers();
                 break;
            case 'admin_get_operation_logs': // 2024-07-29 新增：获取操作日志
                handleAdminGetOperationLogs();
                break;
            case 'admin_exile_stats': // 2025-01-27 新增：流放状态统计
                handleAdminExileStats();
                break;
            default:
                 sendResponse(400, '无效的请求');
        }
        break;
        
    default:
        sendResponse(405, '不支持的请求方法');
}



/**
 * 处理获取壁纸列表
 */
function handleListWallpapers() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 获取分页参数
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20; // 每页默认20张壁纸
    $offset = ($page - 1) * $limit;

    // 处理分类过滤
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';

    // 2024-07-28 新增：处理显示模式（正常或流放列表）
    $displayMode = isset($_GET['display_mode']) ? $_GET['display_mode'] : 'normal';

    // 流放列表对所有用户可见，但操作权限仍受限制
    // 这里不再检查查看权限，让所有用户都能查看流放列表

    // 构建查询基础
    $sql = "SELECT w.id, w.title, w.file_path, w.width, w.height, w.category, w.likes, w.views FROM wallpapers w";
    $countSql = "SELECT COUNT(*) FROM wallpapers w";
    $whereClauses = [];
    $params = [];
    $types = "";

    // 联查 wallpaper_exile_status 表
    $sql .= " LEFT JOIN wallpaper_exile_status wes ON w.id = wes.wallpaper_id";
    $countSql .= " LEFT JOIN wallpaper_exile_status wes ON w.id = wes.wallpaper_id";

    // 根据 display_mode 添加过滤条件
    if ($displayMode === 'normal') {
        // 正常模式：显示未流放的壁纸 (wes.status = 0 或 不存在于wes表)
        $whereClauses[] = "(wes.status = 0 OR wes.wallpaper_id IS NULL)";
    } elseif ($displayMode === 'exiled_list') {
        // 流放列表模式：只显示已流放的壁纸 (wes.status = 1)
        $whereClauses[] = "wes.status = 1";
    }

    // 处理分类过滤
    if (!empty($category) && $category !== '全部') {
        $whereClauses[] = "w.category = ?";
        $params[] = $category;
        $types .= "s";
    }

    // 组合WHERE子句
    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(" AND ", $whereClauses);
        $countSql .= " WHERE " . implode(" AND ", $whereClauses);
    }

    // 添加排序
    if ($displayMode === 'normal') {
        // 正常模式下，进行随机排序
        $sql .= " ORDER BY RAND()";
    } elseif ($displayMode === 'exiled_list') {
        // 流放列表按创建时间倒序
        $sql .= " ORDER BY w.created_at DESC";
    }

    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    // 获取总数用于分页信息
    $stmtCount = $conn->prepare($countSql);
    if (!empty($params)) {
        // 仅绑定countSql的参数，不包含limit和offset
        $countParams = array_slice($params, 0, count($params) - 2);
        $countTypes = substr($types, 0, strlen($types) - 2);
        if (!empty($countParams)) {
            $bind_names_count[] = $countTypes;
            for ($i=0; $i<count($countParams); $i++) {
                $bind_name = 'bindCount' . $i;
                $$bind_name = $countParams[$i];
                $bind_names_count[] = &$$bind_name;
            }
            call_user_func_array([$stmtCount, 'bind_param'], $bind_names_count);
        }
    }
    $stmtCount->execute();
    $stmtCount->bind_result($total);
    $stmtCount->fetch();
    $stmtCount->close();

    // 准备主查询
    $stmt = $conn->prepare($sql);
    if (!empty($params)) {
        $bind_names[] = $types;
        for ($i=0; $i<count($params); $i++) {
            $bind_name = 'bind' . $i;
            $$bind_name = $params[$i];
            $bind_names[] = &$$bind_name;
        }
        call_user_func_array([$stmt, 'bind_param'], $bind_names);
    }

    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $wallpapers = [];
        while ($row = $result->fetch_assoc()) {
            // 修正文件路径，使其可以直接通过HTTP访问
            $row['file_path'] = str_replace('../', '', $row['file_path']);
            $wallpapers[] = $row;
        }

        sendResponse(200, '成功获取壁纸列表', [
            'total' => $total,
            'wallpapers' => $wallpapers
        ]);
    } else {
        sendResponse(500, '获取壁纸列表失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理获取壁纸详情
 */
function handleGetWallpaperDetails() {
    // 验证是否提供了壁纸ID
    if (!isset($_GET['wallpaperId']) || !is_numeric($_GET['wallpaperId'])) {
        sendResponse(400, '缺少有效的壁纸ID');
        return;
    }

    $wallpaperId = intval($_GET['wallpaperId']);

    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 构建查询，获取壁纸详情，包括上传用户信息
    $sql = "
        SELECT 
            w.id, w.title, w.description, w.file_path, w.file_size, w.width, w.height, w.category, w.tags, w.views, w.likes, w.created_at,
            u.username AS uploader_username
        FROM wallpapers w
        JOIN users u ON w.user_id = u.id
        WHERE w.id = ?
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $wallpaperId);

    if ($stmt->execute()) {
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $wallpaperDetails = $result->fetch_assoc();
            // 修正文件路径
            $wallpaperDetails['file_path'] = str_replace('../', '', $wallpaperDetails['file_path']);

            // 增加壁纸浏览次数 (可选，可以在这里或前端处理)
            // updateWallpaperViews($conn, $wallpaperId);

            sendResponse(200, '成功获取壁纸详情', $wallpaperDetails);
        } else {
            sendResponse(404, '壁纸不存在');
        }
    } else {
        sendResponse(500, '获取壁纸详情失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理获取壁纸分类列表
 */
function handleGetCategories() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 查询所有唯一的分类
    $sql = "SELECT DISTINCT category FROM wallpapers WHERE category IS NOT NULL AND category != '' ORDER BY category";
    $result = $conn->query($sql);

    if ($result) {
        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row['category'];
        }
        // 可以选择在分类列表前添加一个"全部"选项
        array_unshift($categories, '全部');
        sendResponse(200, '成功获取分类列表', $categories);
    } else {
        sendResponse(500, '获取分类列表失败: ' . $conn->error);
    }

    closeDBConnection($conn);
}

/**
 * 处理壁纸搜索
 */
function handleSearchWallpapers() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    // 获取搜索关键词
    $query = isset($_GET['query']) ? trim($_GET['query']) : '';

    if (empty($query)) {
        // 如果没有关键词，返回空列表或全部壁纸（这里返回空列表）
        sendResponse(200, '请输入搜索关键词', []);
        closeDBConnection($conn);
        return;
    }

    // 获取分页参数 (搜索结果也分页)
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20; // 每页默认20张壁纸
    $offset = ($page - 1) * $limit;

    // 构建搜索查询，在标题、描述、标签中进行模糊匹配
    // 使用 CONCAT 和 LIKE 进行模糊匹配
    $searchQuery = "%" . $query . "%";
    $sql = "
        SELECT id, title, file_path, width, height, category, likes, views 
        FROM wallpapers 
        WHERE title LIKE ? OR description LIKE ? OR tags LIKE ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssii", $searchQuery, $searchQuery, $searchQuery, $limit, $offset);

    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $wallpapers = [];
        while ($row = $result->fetch_assoc()) {
             // 修正文件路径
            $row['file_path'] = str_replace('../', '', $row['file_path']);
            $wallpapers[] = $row;
        }

        // TODO: 获取搜索结果总数用于分页信息

        sendResponse(200, '搜索成功', $wallpapers);
    } else {
        sendResponse(500, '壁纸搜索失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理流放壁纸
 */
function handleExileWallpaper($input_data) {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        sendResponse(401, '未登录或会话已过期');
        closeDBConnection($conn);
        return;
    }
    $userId = $_SESSION['user_id'];

    if (!isAdmin($conn, $userId)) {
        sendResponse(403, '权限不足，只有管理员才能执行此操作');
        closeDBConnection($conn);
        return;
    }

    $wallpaperId = $input_data['wallpaper_id'] ?? 0;
    if ($wallpaperId <= 0) {
        sendResponse(400, '缺少有效的壁纸ID');
        closeDBConnection($conn);
        return;
    }

    // 检查壁纸是否存在
    $stmtCheck = $conn->prepare("SELECT id FROM wallpapers WHERE id = ?");
    $stmtCheck->bind_param("i", $wallpaperId);
    $stmtCheck->execute();
    if ($stmtCheck->get_result()->num_rows === 0) {
        sendResponse(404, '壁纸不存在');
        $stmtCheck->close();
        closeDBConnection($conn);
        return;
    }
    $stmtCheck->close();

    // 查询当前流放状态 (old_status)
    $oldStatus = 0; // 默认正常
    $stmtQuery = $conn->prepare("SELECT status FROM wallpaper_exile_status WHERE wallpaper_id = ?");
    $stmtQuery->bind_param("i", $wallpaperId);
    $stmtQuery->execute();
    $resultQuery = $stmtQuery->get_result();
    if ($resultQuery->num_rows > 0) {
        $row = $resultQuery->fetch_assoc();
        $oldStatus = $row['status'];
    }
    $stmtQuery->close();

    // 更新或插入流放状态
    $stmt = $conn->prepare("
        INSERT INTO wallpaper_exile_status (wallpaper_id, status)
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE status = 1, updated_at = CURRENT_TIMESTAMP;
    ");
    $stmt->bind_param("i", $wallpaperId);

    if ($stmt->execute()) {
        // 记录操作日志
        $stmtLog = $conn->prepare("
            INSERT INTO wallpaper_operation_log (wallpaper_id, action_type, operated_by_user_id, old_status, new_status)
            VALUES (?, 'exile', ?, ?, 1);
        ");
        $newStatus = 1; // 创建变量以便引用传递
        $stmtLog->bind_param("iii", $wallpaperId, $userId, $oldStatus);
        $stmtLog->execute();
        $stmtLog->close();

        sendResponse(200, '壁纸已成功流放');
    } else {
        sendResponse(500, '流放壁纸失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 处理召回壁纸
 */
function handleRecallWallpaper($input_data) {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        sendResponse(401, '未登录或会话已过期');
        closeDBConnection($conn);
        return;
    }
    $userId = $_SESSION['user_id'];

    if (!isAdmin($conn, $userId)) {
        sendResponse(403, '权限不足，只有管理员才能执行此操作');
        closeDBConnection($conn);
        return;
    }

    $wallpaperId = $input_data['wallpaper_id'] ?? 0;
    if ($wallpaperId <= 0) {
        sendResponse(400, '缺少有效的壁纸ID');
        closeDBConnection($conn);
        return;
    }

    // 检查壁纸是否存在
    $stmtCheck = $conn->prepare("SELECT id FROM wallpapers WHERE id = ?");
    $stmtCheck->bind_param("i", $wallpaperId);
    $stmtCheck->execute();
    if ($stmtCheck->get_result()->num_rows === 0) {
        sendResponse(404, '壁纸不存在');
        $stmtCheck->close();
        closeDBConnection($conn);
        return;
    }
    $stmtCheck->close();

    // 查询当前流放状态 (old_status)
    $oldStatus = 0; // 默认正常
    $stmtQuery = $conn->prepare("SELECT status FROM wallpaper_exile_status WHERE wallpaper_id = ?");
    $stmtQuery->bind_param("i", $wallpaperId);
    $stmtQuery->execute();
    $resultQuery = $stmtQuery->get_result();
    if ($resultQuery->num_rows > 0) {
        $row = $resultQuery->fetch_assoc();
        $oldStatus = $row['status'];
    }
    $stmtQuery->close();

    // 更新流放状态为0 (召回)
    $stmt = $conn->prepare("UPDATE wallpaper_exile_status SET status = 0, updated_at = CURRENT_TIMESTAMP WHERE wallpaper_id = ?");
    $stmt->bind_param("i", $wallpaperId);

    if ($stmt->execute()) {
        // 记录操作日志
        $stmtLog = $conn->prepare("
            INSERT INTO wallpaper_operation_log (wallpaper_id, action_type, operated_by_user_id, old_status, new_status)
            VALUES (?, 'recall', ?, ?, 0);
        ");
        $newStatus = 0; // 创建变量以便引用传递
        $stmtLog->bind_param("iii", $wallpaperId, $userId, $oldStatus);
        $stmtLog->execute();
        $stmtLog->close();

        sendResponse(200, '壁纸已成功召回');
    } else {
        sendResponse(500, '召回壁纸失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 2024-07-29 新增：处理获取操作日志
 */
function handleAdminGetOperationLogs() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        sendResponse(401, '未登录或会话已过期');
        closeDBConnection($conn);
        return;
    }
    $userId = $_SESSION['user_id'];

    if (!isAdmin($conn, $userId)) {
        sendResponse(403, '权限不足，只有管理员才能查看操作日志');
        closeDBConnection($conn);
        return;
    }

    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $offset = ($page - 1) * $limit;

    $sql = "SELECT * FROM wallpaper_operation_log ORDER BY operation_time DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $limit, $offset);

    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $logs = [];
        while ($row = $result->fetch_assoc()) {
            $logs[] = $row;
        }

        $countSql = "SELECT COUNT(*) FROM wallpaper_operation_log";
        $stmtCount = $conn->prepare($countSql);
        $stmtCount->execute();
        $stmtCount->bind_result($total);
        $stmtCount->fetch();
        $stmtCount->close();

        sendResponse(200, '成功获取操作日志', [
            'total' => $total,
            'logs' => $logs
        ]);
    } else {
        sendResponse(500, '获取操作日志失败: ' . $stmt->error);
    }

    $stmt->close();
    closeDBConnection($conn);
}

/**
 * 2024-07-29 新增：处理批量召回壁纸
 */
function handleAdminBatchRecall() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        sendResponse(401, '未登录或会话已过期');
        closeDBConnection($conn);
        return;
    }
    $userId = $_SESSION['user_id'];

    if (!isAdmin($conn, $userId)) {
        sendResponse(403, '权限不足，只有管理员才能执行此操作');
        closeDBConnection($conn);
        return;
    }

    // 2025-01-27 修复：支持JSON请求体
    $input_data = json_decode(file_get_contents('php://input'), true);
    $wallpaperIds = isset($input_data['wallpaper_ids']) ? $input_data['wallpaper_ids'] : 
                   (isset($_POST['wallpaper_ids']) ? $_POST['wallpaper_ids'] : []);
    if (!is_array($wallpaperIds) || empty($wallpaperIds)) {
        sendResponse(400, '缺少有效的壁纸ID列表');
        closeDBConnection($conn);
        return;
    }

    // 过滤掉非数字的ID，并转换为整数数组
    $wallpaperIds = array_filter($wallpaperIds, 'is_numeric');
    $wallpaperIds = array_map('intval', $wallpaperIds);

    if (empty($wallpaperIds)) {
        sendResponse(400, '未提供有效的壁纸ID进行批量召回');
        closeDBConnection($conn);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($wallpaperIds), '?'));
    $types = str_repeat('i', count($wallpaperIds));

    try {
        $conn->begin_transaction();

        // 批量更新 wallpaper_exile_status 表
        $stmtUpdate = $conn->prepare("UPDATE wallpaper_exile_status SET status = 0, updated_at = CURRENT_TIMESTAMP WHERE wallpaper_id IN ($placeholders)");
        $stmtUpdate->bind_param($types, ...$wallpaperIds);
        $stmtUpdate->execute();
        $updatedRows = $stmtUpdate->affected_rows;
        $stmtUpdate->close();

        // 批量记录操作日志
        $stmtLog = $conn->prepare("INSERT INTO wallpaper_operation_log (wallpaper_id, action_type, operated_by_user_id, old_status, new_status) VALUES (?, 'admin_recall', ?, ?, 0)");

        foreach ($wallpaperIds as $wallpaperId) {
            // 查询旧状态（这里简化，假设召回前都是流放状态1）
            // 实际应用中可能需要更复杂的逻辑来获取准确的old_status
            $oldStatus = 1; // 假设召回的都是流放状态，这里简化处理
            $stmtLog->bind_param("iii", $wallpaperId, $userId, $oldStatus);
            $stmtLog->execute();
        }
        $stmtLog->close();

        $conn->commit();
        sendResponse(200, "成功召回 {$updatedRows} 张壁纸");

    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(500, '批量召回壁纸失败: ' . $e->getMessage());
    } finally {
        closeDBConnection($conn);
    }
}

/**
 * 处理批量流放壁纸
 * 文件: api/wallpaper.php
 * 描述: 管理员批量流放多个壁纸
 * 作者: AI助手
 * 日期: 2025-01-27
 */
function handleAdminBatchExile() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        sendResponse(401, '未登录或会话已过期');
        closeDBConnection($conn);
        return;
    }

    $userId = $_SESSION['user_id'];

    // 检查管理员权限
    if (!isAdmin($userId)) {
        sendResponse(403, '权限不足，只有管理员才能执行此操作');
        closeDBConnection($conn);
        return;
    }

    // 2025-01-27 支持JSON请求体 - 使用全局$input_data变量
    global $input_data;
    $wallpaperIds = isset($input_data['wallpaper_ids']) ? $input_data['wallpaper_ids'] : 
                   (isset($_POST['wallpaper_ids']) ? $_POST['wallpaper_ids'] : []);
    $comment = isset($input_data['comment']) ? trim($input_data['comment']) : 
              (isset($_POST['comment']) ? trim($_POST['comment']) : '批量流放操作');

    if (!is_array($wallpaperIds) || empty($wallpaperIds)) {
        sendResponse(400, '缺少有效的壁纸ID列表');
        closeDBConnection($conn);
        return;
    }

    // 过滤掉非数字的ID，并转换为整数数组
    $wallpaperIds = array_filter($wallpaperIds, 'is_numeric');
    $wallpaperIds = array_map('intval', $wallpaperIds);

    if (empty($wallpaperIds)) {
        sendResponse(400, '未提供有效的壁纸ID进行批量流放');
        closeDBConnection($conn);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($wallpaperIds), '?'));
    $types = str_repeat('i', count($wallpaperIds));

    try {
        $conn->begin_transaction();

        // 批量插入或更新 wallpaper_exile_status 表
        $stmtUpsert = $conn->prepare(
            "INSERT INTO wallpaper_exile_status (wallpaper_id, status, created_at, updated_at) 
             VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
             ON DUPLICATE KEY UPDATE status = 1, updated_at = CURRENT_TIMESTAMP"
        );

        $affectedRows = 0;
        foreach ($wallpaperIds as $wallpaperId) {
            $stmtUpsert->bind_param("i", $wallpaperId);
            $stmtUpsert->execute();
            $affectedRows += $stmtUpsert->affected_rows;
        }
        $stmtUpsert->close();

        // 批量记录操作日志
        $stmtLog = $conn->prepare(
            "INSERT INTO wallpaper_operation_log (wallpaper_id, action_type, operated_by_user_id, old_status, new_status, comment) 
             VALUES (?, 'admin_exile', ?, 0, 1, ?)"
        );

        foreach ($wallpaperIds as $wallpaperId) {
            $stmtLog->bind_param("iis", $wallpaperId, $userId, $comment);
            $stmtLog->execute();
        }
        $stmtLog->close();

        $conn->commit();
        sendResponse(200, "成功流放 " . count($wallpaperIds) . " 张壁纸");

    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(500, '批量流放壁纸失败: ' . $e->getMessage());
    } finally {
        closeDBConnection($conn);
    }
}

/**
 * 处理流放状态统计
 * 文件: api/wallpaper.php
 * 描述: 获取流放管理相关的统计数据
 * 作者: AI助手
 * 日期: 2025-01-27
 */
function handleAdminExileStats() {
    $conn = getDBConnection();
    if (!$conn) {
        sendResponse(500, '数据库连接失败');
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        sendResponse(401, '未登录或会话已过期');
        closeDBConnection($conn);
        return;
    }

    $userId = $_SESSION['user_id'];

    // 检查管理员权限
    if (!isAdmin($userId)) {
        sendResponse(403, '权限不足，只有管理员才能执行此操作');
        closeDBConnection($conn);
        return;
    }

    try {
        // 获取总流放数量
        $stmt = $conn->prepare("SELECT COUNT(*) as total_exiled FROM wallpaper_exile_status WHERE status = 1");
        $stmt->execute();
        $result = $stmt->get_result();
        $totalExiled = $result->fetch_assoc()['total_exiled'];
        $stmt->close();

        // 获取总召回数量（通过操作日志统计）
        $stmt = $conn->prepare("SELECT COUNT(*) as total_recalled FROM wallpaper_operation_log WHERE action_type = 'admin_recall'");
        $stmt->execute();
        $result = $stmt->get_result();
        $totalRecalled = $result->fetch_assoc()['total_recalled'];
        $stmt->close();

        // 获取今日操作数量
        $stmt = $conn->prepare(
            "SELECT COUNT(*) as today_operations FROM wallpaper_operation_log 
             WHERE DATE(created_at) = CURDATE() AND action_type IN ('admin_exile', 'admin_recall')"
        );
        $stmt->execute();
        $result = $stmt->get_result();
        $todayOperations = $result->fetch_assoc()['today_operations'];
        $stmt->close();

        // 获取最近活动（最近10条操作记录）
        $stmt = $conn->prepare(
            "SELECT wol.wallpaper_id, wol.action_type, wol.created_at, w.title 
             FROM wallpaper_operation_log wol 
             LEFT JOIN wallpapers w ON wol.wallpaper_id = w.id 
             WHERE wol.action_type IN ('admin_exile', 'admin_recall') 
             ORDER BY wol.created_at DESC LIMIT 10"
        );
        $stmt->execute();
        $result = $stmt->get_result();
        $recentActivities = [];
        while ($row = $result->fetch_assoc()) {
            $recentActivities[] = [
                'wallpaper_id' => $row['wallpaper_id'],
                'action_type' => $row['action_type'],
                'created_at' => $row['created_at'],
                'wallpaper_title' => $row['title'] ?: '未知壁纸'
            ];
        }
        $stmt->close();

        $stats = [
            'total_exiled' => (int)$totalExiled,
            'total_recalled' => (int)$totalRecalled,
            'today_operations' => (int)$todayOperations,
            'recent_activities' => $recentActivities
        ];

        sendResponse(200, '获取统计数据成功', $stats);

    } catch (Exception $e) {
        sendResponse(500, '获取统计数据失败: ' . $e->getMessage());
    } finally {
        closeDBConnection($conn);
    }
}