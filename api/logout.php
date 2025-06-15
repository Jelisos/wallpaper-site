<?php
/**
 * 用户退出登录接口
 * @author AI
 * @return JSON
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

// 清理登录相关 session 变量
unset($_SESSION['user_id']); // 只用 user_id 统一登录状态
session_destroy();
echo json_encode([
    'code' => 0,
    'msg' => '退出成功',
    'data' => null
], JSON_UNESCAPED_UNICODE); 