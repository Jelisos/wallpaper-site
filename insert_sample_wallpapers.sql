-- 文件: insert_sample_wallpapers.sql
-- 描述: 按照 list.json 生成的壁纸主表完整插入语句，字段与 list.json 完全对应
-- 维护: AI助手

-- 建表语句（如已存在可跳过）
CREATE TABLE IF NOT EXISTS wallpapers (
  id BIGINT PRIMARY KEY,
  -- user_id INT, -- 如有上传用户可保留
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(255) NOT NULL,
  file_size VARCHAR(32),
  width INT,
  height INT,
  category VARCHAR(64),
  tags VARCHAR(255),
  format VARCHAR(16),
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
);

INSERT INTO wallpapers
(id, title, description, file_path, file_size, width, height, category, tags, format, views, likes, created_at, updated_at)
VALUES
('17496074560012', 'Sample Wallpaper 12', 'A beautiful sample wallpaper.', 'static/wallpapers/sample_12.jpg', '102400', 1920, 1080, 'Nature', 'tree,forest,green', 'jpg', 100, 5, NOW(), NOW()),
('17496074560008', 'Sample Wallpaper 08', 'Another stunning image.', 'static/wallpapers/sample_08.jpg', '153600', 2560, 1440, 'Abstract', 'geometric,colorful', 'jpg', 150, 8, NOW(), NOW()),
('17496074560022', 'Sample Wallpaper 22', 'Relaxing landscape.', 'static/wallpapers/sample_22.jpg', '81920', 1366, 768, 'Landscape', 'mountain,lake,calm', 'jpg', 80, 3, NOW(), NOW()),
('17496074560081', 'Sample Wallpaper 81', 'City at night.', 'static/wallpapers/sample_81.jpg', '204800', 3840, 2160, 'Cityscape', 'city,night,lights', 'jpg', 200, 12, NOW(), NOW()),
('17496074560082', 'Sample Wallpaper 82', 'Minimalist design.', 'static/wallpapers/sample_82.jpg', '51200', 1920, 1080, 'Design', 'minimal,clean,simple', 'jpg', 50, 2, NOW(), NOW()),
('17496074560029', 'Sample Wallpaper 29', 'Space exploration.', 'static/wallpapers/sample_29.jpg', '256000', 2560, 1600, 'Sci-Fi', 'space,galaxy,stars', 'jpg', 300, 20, NOW(), NOW()),
('17496074560015', 'Sample Wallpaper 15', 'Animal kingdom.', 'static/wallpapers/sample_15.jpg', '112640', 1920, 1200, 'Animals', 'lion,wildlife,nature', 'jpg', 120, 7, NOW(), NOW()),
('17496074560096', 'Sample Wallpaper 96', 'Ocean view.', 'static/wallpapers/sample_96.jpg', '184320', 2560, 1600, 'Nature', 'ocean,beach,sunset', 'jpg', 180, 10, NOW(), NOW()),
('17496074560020', 'Sample Wallpaper 20', 'Futuristic city.', 'static/wallpapers/sample_20.jpg', '225280', 3840, 2160, 'Cityscape', 'cyberpunk,future,neon', 'jpg', 250, 15, NOW(), NOW()),
('17496074560040', 'Sample Wallpaper 40', 'Forest path.', 'static/wallpapers/sample_40.jpg', '92160', 1920, 1080, 'Nature', 'forest,path,trees', 'jpg', 90, 4, NOW(), NOW()),
('17496074560099', 'Sample Wallpaper 99', 'Night sky.', 'static/wallpapers/sample_99.jpg', '163840', 2560, 1440, 'Space', 'stars,milkyway,galaxy', 'jpg', 160, 9, NOW(), NOW()),
('17496074560014', 'Sample Wallpaper 14', 'Desert landscape.', 'static/wallpapers/sample_14.jpg', '71680', 1366, 768, 'Landscape', 'desert,sand,canyon', 'jpg', 70, 2, NOW(), NOW()),
('17496074560044', 'Sample Wallpaper 44', 'Abstract colors.', 'static/wallpapers/sample_44.jpg', '133120', 1920, 1200, 'Abstract', 'colors,gradient,fluid', 'jpg', 130, 6, NOW(), NOW()),
('17496074560061', 'Sample Wallpaper 61', 'Mountain range.', 'static/wallpapers/sample_61.jpg', '194560', 2560, 1600, 'Landscape', 'mountain,snow,peak', 'jpg', 190, 11, NOW(), NOW()),
('17496074560095', 'Sample Wallpaper 95', 'Underwater world.', 'static/wallpapers/sample_95.jpg', '102400', 1920, 1080, 'Nature', 'fish,coral,ocean', 'jpg', 110, 5, NOW(), NOW()),
('17496074560054', 'Sample Wallpaper 54', 'Architectural.', 'static/wallpapers/sample_54.jpg', '174080', 2560, 1440, 'Architecture', 'building,city,structure', 'jpg', 170, 9, NOW(), NOW()),
('17496074560058', 'Sample Wallpaper 58', 'Vintage car.', 'static/wallpapers/sample_58.jpg', '143360', 1920, 1200, 'Vehicles', 'car,classic,road', 'jpg', 140, 8, NOW(), NOW()),
('17496074560053', 'Sample Wallpaper 53', 'This is sample wallpaper 53.', 'static/wallpapers/sample_53.jpg', '102400', 1920, 1080, 'nature', 'landscape, mountain', 'jpg', 0, 0, NOW(), NOW()),
('17496074560009', 'Sample Wallpaper 09', 'A scenic landscape view.', 'static/wallpapers/sample_09.jpg', '122880', 1920, 1080, 'Landscape', 'mountain,river,nature', 'jpg', 0, 0, NOW(), NOW()); 