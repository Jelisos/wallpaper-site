<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
/**
 * 获取当前登录用户信息接口（每次查数据库，返回最新头像）
 * @author AI
 * @return JSON
 */
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
    if ($conn->connect_error) {
        echo json_encode([
            'code' => 500,
            'msg' => '数据库连接失败',
            'data' => null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $stmt = $conn->prepare('SELECT id, username, email, avatar, is_admin FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    if ($user) {
        echo json_encode([
            'code' => 0,
            'msg' => '已登录',
            'data' => $user
        ], JSON_UNESCAPED_UNICODE);
    } else {
        session_unset();
        session_destroy();
        echo json_encode([
            'code' => 404,
            'msg' => '用户不存在或会话无效',
            'data' => null
        ], JSON_UNESCAPED_UNICODE);
    }
} else {
    echo json_encode([
        'code' => 1,
        'msg' => '未登录',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
} 