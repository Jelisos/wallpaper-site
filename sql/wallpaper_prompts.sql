-- 创建壁纸提示词表
CREATE TABLE IF NOT EXISTS `wallpaper_prompts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallpaper_id` varchar(255) NOT NULL COMMENT '壁纸ID（可以是文件路径或唯一标识）',
  `content` text DEFAULT NULL COMMENT '提示词内容',
  `is_locked` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否锁定（1=锁定，0=解锁）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `wallpaper_id` (`wallpaper_id`),
  KEY `idx_wallpaper_id` (`wallpaper_id`),
  KEY `idx_is_locked` (`is_locked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='壁纸提示词表';