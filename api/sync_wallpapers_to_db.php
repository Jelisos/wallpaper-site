<?php
/**
 * 文件: api/sync_wallpapers_to_db.php
 * 描述: 用于从 static/data/list.json 同步壁纸数据到数据库
 * 维护: AI助手
 */

header('Content-Type: application/json');

// 引入数据库配置
require_once __DIR__ . '/../config/database.php';

// 引入统一的日志函数
// 2024-07-16 调试：直接定义临时日志函数，避免utils.php依赖问题
function tempFileLog($message, $logFileName = 'sync_debug_log.txt') {
    $logFile = __DIR__ . '/../logs/' . $logFileName;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[{$timestamp}] {$message}\n", FILE_APPEND);
}

tempFileLog('sync_wallpapers_to_db.php: 脚本开始执行。');

$response = ['code' => 1, 'msg' => '未知错误', 'data' => []];

try {
    // 建立数据库连接
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception('数据库连接失败。');
    }
    tempFileLog('sync_wallpapers_to_db.php: 数据库连接成功。');

    // 读取 JSON 文件
    $jsonFilePath = __DIR__ . '/../static/data/list.json';
    if (!file_exists($jsonFilePath)) {
        throw new Exception('找不到 list.json 文件。');
    }
    $jsonData = file_get_contents($jsonFilePath);
    if ($jsonData === false) {
        throw new Exception('读取 list.json 文件失败。');
    }
    $wallpapers = json_decode($jsonData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('解析 list.json 文件失败: ' . json_last_error_msg());
    }
    tempFileLog('sync_wallpapers_to_db.php: 成功读取并解析 list.json。');

    $insertedCount = 0;
    $updatedCount = 0;
    $skippedCount = 0;

    foreach ($wallpapers as $wallpaper) {
        // 验证必要字段
        if (!isset($wallpaper['id']) || !isset($wallpaper['title']) || !isset($wallpaper['path'])) {
            tempFileLog('sync_wallpapers_to_db.php: 跳过无效壁纸数据 (缺少ID、标题或路径): ' . json_encode($wallpaper));
            $skippedCount++;
            continue;
        }

        // 检查壁纸是否存在
        $checkSql = "SELECT COUNT(*) FROM wallpapers WHERE id = ?";
        $stmtCheck = $conn->prepare($checkSql);
        if (!$stmtCheck) {
            throw new Exception('准备检查语句失败: ' . $conn->error);
        }
        $stmtCheck->bind_param('s', $wallpaper['id']);
        $stmtCheck->execute();
        $stmtCheck->bind_result($count);
        $stmtCheck->fetch();
        $stmtCheck->close();

        if ($count > 0) {
            // 壁纸已存在，执行更新操作
            $updateSql = "UPDATE wallpapers SET 
                          user_id = ?, title = ?, description = ?, file_path = ?, file_size = ?, 
                          width = ?, height = ?, category = ?, tags = ?, views = ?, likes = ?, 
                          updated_at = NOW() 
                          WHERE id = ?";
            $stmtUpdate = $conn->prepare($updateSql);
            if (!$stmtUpdate) {
                throw new Exception('准备更新语句失败: ' . $conn->error);
            }
            $tags = isset($wallpaper['tags']) ? json_encode($wallpaper['tags']) : null; // 假设tags是数组
            $stmtUpdate->bind_param('isssiiisssis', 
                                    $wallpaper['user_id'] ?? 1, // 默认用户ID为1
                                    $wallpaper['title'],
                                    $wallpaper['description'] ?? null,
                                    $wallpaper['path'],
                                    $wallpaper['file_size'] ?? 0,
                                    $wallpaper['width'] ?? 0,
                                    $wallpaper['height'] ?? 0,
                                    $wallpaper['category'] ?? null,
                                    $tags,
                                    $wallpaper['views'] ?? 0,
                                    $wallpaper['likes'] ?? 0,
                                    $wallpaper['id']);
            $stmtUpdate->execute();
            if ($stmtUpdate->error) {
                tempFileLog('sync_wallpapers_to_db.php: 更新壁纸ID ' . $wallpaper['id'] . ' 失败: ' . $stmtUpdate->error);
            } else {
                $updatedCount++;
            }
            $stmtUpdate->close();
        } else {
            // 壁纸不存在，执行插入操作
            $insertSql = "INSERT INTO wallpapers 
                          (id, user_id, title, description, file_path, file_size, width, height, category, tags, views, likes, created_at, updated_at) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            $stmtInsert = $conn->prepare($insertSql);
            if (!$stmtInsert) {
                throw new Exception('准备插入语句失败: ' . $conn->error);
            }
            $tags = isset($wallpaper['tags']) ? json_encode($wallpaper['tags']) : null; // 假设tags是数组
            $stmtInsert->bind_param('sisssiiisssii', 
                                    $wallpaper['id'],
                                    $wallpaper['user_id'] ?? 1, // 默认用户ID为1
                                    $wallpaper['title'],
                                    $wallpaper['description'] ?? null,
                                    $wallpaper['path'],
                                    $wallpaper['file_size'] ?? 0,
                                    $wallpaper['width'] ?? 0,
                                    $wallpaper['height'] ?? 0,
                                    $wallpaper['category'] ?? null,
                                    $tags,
                                    $wallpaper['views'] ?? 0,
                                    $wallpaper['likes'] ?? 0);
            $stmtInsert->execute();
            if ($stmtInsert->error) {
                tempFileLog('sync_wallpapers_to_db.php: 插入壁纸ID ' . $wallpaper['id'] . ' 失败: ' . $stmtInsert->error);
            } else {
                $insertedCount++;
            }
            $stmtInsert->close();
        }
    }

    $response['code'] = 0;
    $response['msg'] = '壁纸同步成功。';
    $response['data'] = [
        'inserted_count' => $insertedCount,
        'updated_count' => $updatedCount,
        'skipped_count' => $skippedCount,
        'total_wallpapers_in_json' => count($wallpapers)
    ];
    tempFileLog('sync_wallpapers_to_db.php: 脚本执行完毕。结果: ' . json_encode($response['data']));

} catch (Exception $e) {
    $response['msg'] = '同步失败: ' . $e->getMessage();
    tempFileLog('sync_wallpapers_to_db.php: 脚本执行失败。错误: ' . $e->getMessage());
} finally {
    if ($conn) {
        $conn->close();
    }
}

echo json_encode($response);
?> 