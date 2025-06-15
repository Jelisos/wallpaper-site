<?php
/**
 * 数据库配置文件
 * @author Claude
 * @date 2024-03-21
 */

// 数据库连接配置
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PWD', '');
define('DB_NAME', 'wallpaper_db');

/**
 * 获取数据库连接
 * @return mysqli|false 数据库连接对象或false
 */
function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
    
    if ($conn->connect_error) {
        error_log("数据库连接失败: " . $conn->connect_error);
        return false;
    }
    
    $conn->set_charset("utf8mb4");
    return $conn;
}

/**
 * 关闭数据库连接
 * @param mysqli $conn 数据库连接对象
 */
function closeDBConnection($conn) {
    if ($conn) {
        $conn->close();
    }
} 