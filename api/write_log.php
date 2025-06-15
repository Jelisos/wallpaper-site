<?php
// 通用型日志写入接口
// 支持参数：log（日志内容，必填），logfile（日志文件名，可选，默认wallpaper_debug_log.txt），mode（append/overwrite，可选，默认append），tag/user等其他参数

/**
 * 获取请求参数，支持GET和POST
 * @param string $key 参数名
 * @param mixed $default 默认值
 * @return mixed 参数值
 */
function get_param($key, $default = '') {
    return isset($_POST[$key]) ? $_POST[$key] : (isset($_GET[$key]) ? $_GET[$key] : $default);
}

/**
 * 写入日志条目到文件
 * @param string $log_content 日志内容
 * @param string $logfile_name 日志文件名 (可选，默认wallpaper_debug_log.txt)
 * @param string $mode 写入模式 (append/overwrite，可选，默认append)
 * @param string $tag 日志标签 (可选)
 * @param string $user 用户ID (可选)
 * @param string $location 发生位置 (可选)
 * @param string $userAgent 客户端UserAgent (可选)
 * @param string $cookie 客户端Cookie (可选)
 * @return bool 写入是否成功
 */
function sendDebugLog($log_content, $logfile_name = 'wallpaper_debug_log.txt', $mode = 'append', $tag = '', $user = '', $location = '', $userAgent = '', $cookie = '') {
    $logdir = __DIR__ . '/../logs/';
    if (!is_dir($logdir)) {
        if (!mkdir($logdir, 0777, true)) {
            return false;
        }
    }
    $logfile_name = basename($logfile_name);
    $file_path = $logdir . $logfile_name;

    // 初始化日志文件，如果是新文件或覆盖模式
    if ($mode === 'overwrite' || !file_exists($file_path) || filesize($file_path) === 0) {
        $header = "# 壁纸系统调试日志\n\n";
        $header .= "## 日志格式说明\n";
        $header .= "- 每条日志包含时间戳、IP地址、操作类型、请求参数和响应结果\n";
        $header .= "- 按照操作类型和时间顺序组织，便于问题定位\n";
        $header .= "- 错误日志会特别标记，方便快速识别\n\n";
        
        if ($mode === 'overwrite') {
            file_put_contents($file_path, $header);
        } else {
            file_put_contents($file_path, $header, FILE_APPEND);
        }
    }

    $time = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';

    // 解析log_content为数组
    $logArr = null;
    if (is_array($log_content)) {
        $logArr = $log_content;
    } else {
        $json = json_decode($log_content, true);
        if (is_array($json)) {
            $logArr = $json;
        }
    }

    // 确定日志类型和分类
    $logType = '';
    if (strpos($tag, 'error') !== false || strpos($tag, '错误') !== false) {
        $logType = '错误日志';
    } elseif (strpos($tag, 'like') !== false || strpos($tag, '点赞') !== false) {
        $logType = 'API请求日志';
        $subType = '点赞操作日志';
    } elseif (strpos($tag, 'click') !== false || strpos($tag, '点击') !== false) {
        $logType = 'API请求日志';
        $subType = '点击事件日志';
    } else {
        $logType = 'API请求日志';
        $subType = '其他操作日志';
    }

    // 开始构建日志内容
    $output = "```\n";
    $output .= "[{$time}] [IP: {$ip}]";
    if ($tag) {
        $output .= " [操作: {$tag}]";
    }
    $output .= "\n";

    // 处理请求参数
    if (isset($logArr['params']) && is_array($logArr['params'])) {
        $output .= "请求参数: \n";
        foreach ($logArr['params'] as $key => $value) {
            if (is_scalar($value)) {
                $output .= "- {$key}: {$value}\n";
            } elseif (is_array($value)) {
                $output .= "- {$key}: " . json_encode($value, JSON_UNESCAPED_UNICODE) . "\n";
            }
        }
        $output .= "\n";
    }

    // 处理壁纸信息
    if (isset($logArr['wallpaper']) && is_array($logArr['wallpaper'])) {
        $output .= "壁纸信息:\n";
        $wallpaperInfo = $logArr['wallpaper'];
        $wallpaperFields = ['id' => 'ID', 'filename' => '文件名', 'origin_name' => '原始名称', 'category' => '分类'];
        
        foreach ($wallpaperFields as $field => $label) {
            if (isset($wallpaperInfo[$field])) {
                $output .= "- {$label}: {$wallpaperInfo[$field]}\n";
            }
        }
        
        // 特殊处理标签数组
        if (isset($wallpaperInfo['tags']) && is_array($wallpaperInfo['tags'])) {
            $output .= "- 标签: " . implode(',', $wallpaperInfo['tags']) . "\n";
        }
        $output .= "\n";
    }

    // 处理目标元素（点击事件）
    if (isset($logArr['params']['target_tag']) || isset($logArr['params']['target_id']) || isset($logArr['params']['target_classes'])) {
        $output .= "目标元素: \n";
        if (isset($logArr['params']['target_tag'])) {
            $output .= "- 标签: {$logArr['params']['target_tag']}\n";
        }
        if (isset($logArr['params']['target_id'])) {
            $output .= "- ID: {$logArr['params']['target_id']}\n";
        }
        if (isset($logArr['params']['target_classes']) && is_array($logArr['params']['target_classes'])) {
            $output .= "- 类名: " . implode(' ', $logArr['params']['target_classes']) . "\n";
        }
        $output .= "\n";
    }

    // 处理错误信息
    if (isset($logArr['response']['error']) || (isset($logArr['tag']) && (strpos($logArr['tag'], 'error') !== false || strpos($logArr['tag'], '错误') !== false))) {
        $output .= "错误信息: \n";
        if (isset($logArr['params']['wallpaper_id'])) {
            $output .= "- 壁纸ID: {$logArr['params']['wallpaper_id']}\n";
        }
        if (isset($logArr['response']['error'])) {
            $output .= "- 错误类型: {$logArr['response']['error']}\n";
        } elseif (isset($logArr['response']['msg'])) {
            $output .= "- 错误信息: {$logArr['response']['msg']}\n";
        }
        $output .= "\n";
    }

    // 处理响应结果
    if (isset($logArr['response']) && is_array($logArr['response']) && !isset($logArr['response']['error'])) {
        $output .= "响应结果: \n";
        foreach ($logArr['response'] as $key => $value) {
            if (is_scalar($value)) {
                $output .= "- {$key}: {$value}\n";
            }
        }
        $output .= "\n";
    } else if (is_string($log_content) && trim($log_content) !== '' && !is_array($logArr)) {
        // 普通字符串日志
        $output .= "日志内容:\n- {$log_content}\n\n";
    }

    // 系统信息
    $output .= "调试追踪：本次调试涉及文件 wallpaper.js、api/write_log.php、logs/{$logfile_name}\n";
    $output .= "请在问题解决后清理这些调试内容\n";
    $output .= "```\n\n";

    // 根据日志类型添加到相应的部分
    $fullContent = '';
    if (file_exists($file_path)) {
        $fullContent = file_get_contents($file_path);
    }

    // 查找或创建日志类型和子类型的标记
    $logTypeMark = "## {$logType}\n\n";
    $subTypeMark = isset($subType) ? "### {$subType}\n\n" : "";
    
    // 如果日志类型不存在，添加到文件末尾
    if (strpos($fullContent, $logTypeMark) === false) {
        $fullContent .= $logTypeMark;
        if ($subTypeMark) {
            $fullContent .= $subTypeMark;
        }
        $fullContent .= $output;
    } else {
        // 如果日志类型存在但子类型不存在
        if ($subTypeMark && strpos($fullContent, $subTypeMark) === false) {
            $pos = strpos($fullContent, $logTypeMark) + strlen($logTypeMark);
            $fullContent = substr_replace($fullContent, $subTypeMark . $output, $pos, 0);
        } else {
            // 如果子类型存在，在子类型下添加日志
            if ($subTypeMark) {
                $pos = strpos($fullContent, $subTypeMark) + strlen($subTypeMark);
                $fullContent = substr_replace($fullContent, $output, $pos, 0);
            } else {
                // 如果没有子类型，直接在日志类型下添加
                $pos = strpos($fullContent, $logTypeMark) + strlen($logTypeMark);
                $fullContent = substr_replace($fullContent, $output, $pos, 0);
            }
        }
    }

    return file_put_contents($file_path, $fullContent) !== false;
}

// 检查是否作为API直接访问 (通过判断当前执行文件是否是write_log.php本身)
if (basename($_SERVER['SCRIPT_FILENAME']) === basename(__FILE__)) {
    // 启动输出缓冲，以防意外输出
    ob_start();
    // 获取API请求参数
    $log = get_param('log');
    $logfile = get_param('logfile', 'wallpaper_debug_log.txt');
    $mode = strtolower(get_param('mode', 'append')); // 默认append
    $tag = get_param('tag', '');

    // 清理调试指令
    if (trim($log) === '清理调试') {
        $logdir = __DIR__ . '/../logs/';
        $file_to_clear = $logdir . basename($logfile);
        
        // 重新初始化日志文件
        $header = "# 壁纸系统调试日志\n\n";
        $header .= "## 日志格式说明\n";
        $header .= "- 每条日志包含时间戳、IP地址、操作类型、请求参数和响应结果\n";
        $header .= "- 按照操作类型和时间顺序组织，便于问题定位\n";
        $header .= "- 错误日志会特别标记，方便快速识别\n\n";
        
        file_put_contents($file_to_clear, $header);
        echo json_encode(['code'=>0, 'msg'=>'日志已清空', 'file'=>$file_to_clear]);
        ob_end_flush();
        exit;
    }

    if (!empty($log)) {
        // 调用sendDebugLog函数写入日志
        $ok = sendDebugLog($log, $logfile, $mode, $tag, get_param('user'), get_param('location'), get_param('userAgent'), get_param('cookie'));
        if ($ok) {
            echo json_encode(['code'=>0, 'msg'=>'写入成功', 'file'=>__DIR__ . '/../logs/' . basename($logfile)]);
        } else {
            echo json_encode(['code'=>3, 'msg'=>'日志写入失败', 'file'=>__DIR__ . '/../logs/' . basename($logfile)]);
        }
    } else {
        // log参数为空也写日志 (心跳日志已处理，这里只需返回JSON)
        echo json_encode(['code'=>1, 'msg'=>'无日志内容']);
    }
    ob_end_flush();
}