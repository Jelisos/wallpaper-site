<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
function log_debug($msg) {
    file_put_contents(__DIR__.'/../static/avatar/upload_debug.log', date('Y-m-d H:i:s').' '. $msg."\n", FILE_APPEND);
}
ob_start();
log_debug('接口开始');
/**
 * 用户头像上传接口
 * @author AI
 * @return JSON
 */
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

if (!isset($_SESSION['user'])) {
    log_debug('未登录');
    ob_clean();
    echo json_encode([
        'code' => 401,
        'msg' => '未登录',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$user_id = $_SESSION['user']['id'];
if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    log_debug('未选择文件或上传失败');
    ob_clean();
    echo json_encode([
        'code' => 2,
        'msg' => '未选择文件或上传失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = $_FILES['avatar'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allow_ext = ['jpg', 'jpeg', 'png', 'webp'];
if (!in_array($ext, $allow_ext)) {
    log_debug('格式不支持:'.$ext);
    ob_clean();
    echo json_encode([
        'code' => 3,
        'msg' => '仅支持jpg/jpeg/png/webp格式',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
if ($file['size'] > 2 * 1024 * 1024) {
    log_debug('文件过大:'.$file['size']);
    ob_clean();
    echo json_encode([
        'code' => 4,
        'msg' => '文件不能超过2MB',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
$upload_dir = '../static/avatar/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
    log_debug('创建目录:'.$upload_dir);
}
$filename = 'avatar_' . $user_id . '_' . time() . '.' . $ext;
$target = $upload_dir . $filename;
if (!move_uploaded_file($file['tmp_name'], $target)) {
    log_debug('move_uploaded_file失败');
    ob_clean();
    echo json_encode([
        'code' => 5,
        'msg' => '保存失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
log_debug('文件保存成功:'.$target);
// 保存路径到数据库
$conn = new mysqli(DB_HOST, DB_USER, DB_PWD, DB_NAME);
if ($conn->connect_error) {
    log_debug('数据库连接失败:'.$conn->connect_error);
    ob_clean();
    echo json_encode([
        'code' => 500,
        'msg' => '数据库连接失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
$url = '/static/avatar/' . $filename;
$stmt = $conn->prepare('UPDATE users SET avatar=? WHERE id=?');
$stmt->bind_param('si', $url, $user_id);
if ($stmt->execute()) {
    $_SESSION['user']['avatar'] = $url;
    log_debug('数据库更新成功:'.$url);
    ob_clean();
    echo json_encode([
        'code' => 0,
        'msg' => '上传成功',
        'data' => $url
    ], JSON_UNESCAPED_UNICODE);
} else {
    log_debug('数据库保存失败');
    ob_clean();
    echo json_encode([
        'code' => 6,
        'msg' => '数据库保存失败',
        'data' => null
    ], JSON_UNESCAPED_UNICODE);
}
$stmt->close();
$conn->close();
log_debug('接口结束'); 