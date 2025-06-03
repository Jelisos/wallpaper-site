<?php
/**
 * 数据库初始化脚本
 * @author Claude
 * @date 2024-03-21
 */

// 读取SQL文件
$sql = file_get_contents(__DIR__ . '/init.sql');

// 创建数据库连接
$conn = new mysqli('localhost', 'root', '');

if ($conn->connect_error) {
    die("连接失败: " . $conn->connect_error);
}

// 执行SQL语句
if ($conn->multi_query($sql)) {
    echo "数据库初始化成功！\n";
} else {
    echo "数据库初始化失败: " . $conn->error . "\n";
}

$conn->close(); 