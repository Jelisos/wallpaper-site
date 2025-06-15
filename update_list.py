import os
import json
import time
from datetime import datetime
from PIL import Image
import pymysql
import json.decoder # 2024-07-15 新增：导入JSON解码器，用于捕获特定错误

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'wallpaper_db'
}

# 预定义的分类和标签映射
CATEGORY_TAGS = {
    '风景': ['自然', '山水', '天空', '海洋', '森林', '日出', '日落', '风景'],
    '动物': ['宠物', '野生动物', '鸟类', '海洋生物', '动物'],
    '建筑': ['城市', '建筑', '室内', '街道', '建筑'],
    '艺术': ['抽象', '艺术', '创意', '设计', '绘画', '数字艺术'],
    '人物': ['人像', '肖像', '生活', '男性', '女性', '孩子'],
    '科技': ['科技', '未来', '科幻', '机器人', '太空'],
    '美食': ['食物', '饮料', '甜点', '水果', '蔬菜'],
    '运动': ['体育', '运动', '健身', '竞技'],
    '幻想': ['神话', '魔幻', '怪兽', '恶魔', '天使', '龙', '魔法', '异世界'],
    '其他': ['抽象', '简约', '纹理', '通用']
}

# 支持的图片格式
SUPPORTED_FORMATS = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')

def get_image_dimensions(image_path):
    """获取图片尺寸"""
    try:
        with Image.open(image_path) as img:
            return img.size  # 返回 (width, height)
    except Exception as e:
        print(f"Warning: Cannot get dimensions for {image_path}: {e}")
        return (0, 0)

def analyze_filename(filename):
    """
    根据文件名智能判断分类，但标签始终为空
    @param {str} filename - 图片文件名
    @returns {Object} - 包含分类和空标签的字典
    """
    filename_lower = filename.lower()
    category = '其他'
    
    # 2024-07-15 用户要求标签为空，因此注释掉所有标签生成逻辑
    # tags = set() # 使用set避免重复

    # 分类关键词映射 - 按优先级排序
    category_keywords = {
        '幻想': ['fantasy', 'mythical', 'monster', 'demon', 'angel', 'dragon', '幻想', '神话', 
                '魔幻', '怪兽', '恶魔', '天使', '龙', '巨兽', '巨眼', '废土', '鲛人', '魔物', '折翼天使'],
        '人物': ['portrait', 'people', 'person', '人物', '美女', '少年', '公主', '御姐', 
                '克杰逊', '杰克逊', '神秘人', '赛博人机女', '雨夜撑伞女'],
        '动物': ['animal', 'pet', 'bird', 'wildlife', '动物', '犬', '猪', '鹿', '狐狸', '猫', '狼人'],
        '科技': ['tech', 'future', 'sci-fi', '科技', '太空航行', '赛博'],
        '风景': ['landscape', 'nature', 'mountain', 'sea', 'sky', '风景', '自然', '山水'],
        '建筑': ['building', 'city', 'architecture', 'street', '建筑', '城市'],
        '艺术': ['art', 'abstract', 'design', '艺术', '时光之翼', '星芒破晓', '炭笔', 
                '血色残阳', '详云字体', '睡梦公式'],
        '美食': ['food', 'drink', 'dessert', '美食'],
        '运动': ['sport', 'fitness', 'exercise', '运动']
    }

    # 判断分类
    for cat, keywords in category_keywords.items():
        if any(keyword in filename_lower for keyword in keywords):
            category = cat
            break

    # 2024-07-15 用户要求标签为空，因此不生成任何标签
    final_tags = []
    
    return {
        'category': category,
        'tags': final_tags
    }

def escape_sql_string(text):
    """转义SQL字符串中的特殊字符"""
    if text is None:
        return ''
    return text.replace("'", "\\'").replace('"', '\\"').replace('\\', '\\\\')

def generate_unique_id(base_time, index, used_ids):
    """生成唯一的数字ID"""
    unique_id = int(f"{base_time}{index:04d}")
    while unique_id in used_ids:
        unique_id += 1
    used_ids.add(unique_id)
    return unique_id

def get_existing_wallpapers_from_db():
    """
    查询数据库，获取所有已存在的壁纸文件名和ID
    @returns {dict} - {filename: id}
    """
    conn = None
    result = {}
    try:
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset='utf8mb4'
        )
        cursor = conn.cursor()
        cursor.execute("SELECT file_path, id FROM wallpapers")
        for row in cursor.fetchall():
            file_path = row[0]
            filename = os.path.basename(file_path)
            result[filename] = row[1]
    except Exception as e:
        print(f"❌ 数据库查询失败: {e}")
        return None
    finally:
        if conn:
            conn.close()
    return result

def get_all_wallpapers_from_db():
    """
    查询数据库，获取所有壁纸的完整信息
    @returns {list} - 包含所有壁纸完整信息的列表
    """
    conn = None
    wallpapers_data = []
    try:
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset='utf8mb4'
        )
        cursor = conn.cursor(pymysql.cursors.DictCursor) # 使用字典游标方便通过列名访问
        # 确保这里查询所有需要显示在list.json中的字段
        cursor.execute("""
            SELECT id, title, file_path, category, tags, width, height, created_at
            FROM wallpapers
        """)
        for row in cursor.fetchall():
            file_path_full = os.path.join(os.path.dirname(__file__), row['file_path']) # Construct full path
            width, height = (row['width'], row['height']) if row['width'] and row['height'] else get_image_dimensions(file_path_full)

            size_str = ''
            img_format = ''
            try:
                if os.path.exists(file_path_full):
                    size_bytes = os.path.getsize(file_path_full)
                    if size_bytes < 1024 * 1024:
                        size_str = f"{size_bytes / 1024:.1f} KB"
                    else:
                        size_str = f"{size_bytes / (1024 * 1024):.2f} MB"
                    with Image.open(file_path_full) as img:
                        img_format = img.format
            except Exception as e:
                print(f"Warning: Could not get size/format for {row['file_path']}: {e}")

            wallpapers_data.append({
                'id': row['id'],
                'filename': os.path.basename(row['file_path']),
                'path': row['file_path'],
                'name': row['title'],
                'category': row['category'],
                'tags': [], # 2024-07-15 用户要求标签为空，强制设为空列表
                'width': width,
                'height': height,
                'size': size_str,
                'format': img_format,
                'description': '', # 数据库中没有description字段，需要默认
                'created_at': row['created_at'].strftime('%Y-%m-%d') if row['created_at'] else ''
            })
    except Exception as e:
        print(f"❌ 数据库查询所有壁纸信息失败: {e}")
    finally:
        if conn:
            conn.close()
    return wallpapers_data

def generate_short_id(date_str, seq):
    """
    生成短ID，格式为YYYYMMDD+递增号（如202507151、20250715100），递增号不做位数限制
    @param {str} date_str - 日期字符串YYYYMMDD
    @param {int} seq - 当天递增序号
    @returns {int}
    """
    return int(f"{date_str}{seq}")

def update_wallpaper_list():
    """
    增量更新壁纸列表，只为新图片分配新ID并导入，老图片ID不变
    """
    # 路径配置
    base_dir = os.path.dirname(__file__)
    wallpapers_dir = os.path.join(base_dir, 'static', 'wallpapers')
    list_path = os.path.join(base_dir, 'static', 'data', 'list.json')
    sql_path = os.path.join(base_dir, 'wallpapers_import.sql')

    # 读取数据库已存在壁纸
    db_wallpapers = get_existing_wallpapers_from_db()  # {filename: id}
    if db_wallpapers is None:
        print("🔴 数据库查询失败，终止数据生成任务。")
        return False
    print(f"📦 数据库已有壁纸: {len(db_wallpapers)} 个")

    # 读取list.json已有数据
    old_files = []
    should_regenerate_full_list = False
    if os.path.exists(list_path):
        try:
            with open(list_path, 'r', encoding='utf-8') as f:
                old_files = json.load(f)
            if not isinstance(old_files, list) or len(old_files) == 0:
                print(f"⚠️ {list_path} 内容不是有效的JSON数组或为空，将视为空并重新生成。")
                old_files = []
                should_regenerate_full_list = True
        except json.decoder.JSONDecodeError as e:
            print(f"❌ 读取 {list_path} 失败，文件可能已损坏或格式错误: {e}")
            print(f"⚠️ 将视 {list_path} 为空文件并尝试重新生成。")
            old_files = []
            should_regenerate_full_list = True
        except Exception as e:
            print(f"❌ 读取 {list_path} 时发生未知错误: {e}")
            print(f"⚠️ 将视 {list_path} 为空文件并尝试重新生成。")
            old_files = []
            should_regenerate_full_list = True
    else:
        print(f"ℹ️ {list_path} 不存在，将创建新文件。")
        should_regenerate_full_list = True
    
    old_files_map = {item['filename']: item for item in old_files}

    # 获取所有图片文件
    image_files = [
        f for f in os.listdir(wallpapers_dir)
        if os.path.isfile(os.path.join(wallpapers_dir, f))
        and f.lower().endswith(SUPPORTED_FORMATS)
    ]
    print(f"🖼️ 当前壁纸目录图片: {len(image_files)} 个")

    # 找出新图片
    new_files = [f for f in image_files if f not in db_wallpapers]
    print(f"✨ 新增图片: {len(new_files)} 个")

    files = []
    sql_values = []

    if should_regenerate_full_list or new_files:
        if should_regenerate_full_list:
            print("🔄 强制从数据库重新生成完整的list.json...")
            files = get_all_wallpapers_from_db()
            for item in files:
                item['id'] = int(item['id'])
            print(f"数据库中获取到 {len(files)} 条壁纸数据用于完整重建。")
        else:
            print("✅ 执行增量更新，处理新增图片...")
            files = old_files.copy()

        today_str = datetime.now().strftime('%Y%m%d')
        seq = 1
        existing_today_ids = [int(str(item['id'])[8:]) for item in files if str(item['id']).startswith(today_str)]
        if existing_today_ids:
            seq = max(existing_today_ids) + 1

        for filename in new_files:
            file_path = os.path.join(wallpapers_dir, filename)
            name_without_ext = os.path.splitext(filename)[0]
            width, height = get_image_dimensions(file_path)
            size_bytes = os.path.getsize(file_path)
            if size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.2f} MB"
            try:
                with Image.open(file_path) as img:
                    img_format = img.format
            except Exception as e:
                img_format = ''
            
            analyzed_info = analyze_filename(filename)
            category = analyzed_info['category']
            tags_list = analyzed_info['tags']
            
            new_id = generate_short_id(today_str, seq)
            seq += 1
            file_info = {
                'id': new_id,
                'filename': filename,
                'path': f'static/wallpapers/{filename}',
                'name': name_without_ext,
                'category': category,
                'tags': tags_list,
                'width': width,
                'height': height,
                'size': size_str,
                'format': img_format,
                'description': '',
                'created_at': datetime.now().strftime('%Y-%m-%d')
            }
            files.append(file_info)
            tags_string = ','.join(tags_list)
            sql_value = (
                f"  ({new_id}, NULL, '{escape_sql_string(name_without_ext)}', '', '{escape_sql_string(f'static/wallpapers/{filename}')}', '{escape_sql_string(size_str)}', "
                f"{width}, {height}, '{escape_sql_string(category)}', '', '{escape_sql_string(img_format)}', "
                f"0, 0, '{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}', '{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}')"
            )
            sql_values.append(sql_value)
            print(f"✅ 新增: {filename} -> ID: {new_id}")

        with open(list_path, 'w', encoding='utf-8') as f:
            json.dump(files, f, ensure_ascii=False, indent=2)
        print(f"\n📄 list.json已更新: {os.path.abspath(list_path)}")

        if sql_values:
            sql_content = [
                f"-- 新增壁纸数据导入SQL文件\n",
                f"-- 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
                f"-- 数据库: {DB_CONFIG['database']}\n",
                f"-- 新增 {len(sql_values)} 条记录\n\n",
                f"USE `{DB_CONFIG['database']}`;\n\n",
                "INSERT INTO `wallpapers` (`id`, `user_id`, `title`, `description`, `file_path`, `file_size`, `width`, `height`, `category`, `tags`, `format`, `views`, `likes`, `created_at`, `updated_at`) VALUES\n"
            ]
            for i, sql_value in enumerate(sql_values):
                sql_content.append(sql_value)
                if i < len(sql_values) - 1:
                    sql_content.append(",\n")
                else:
                    sql_content.append(";\n")
            with open(sql_path, 'w', encoding='utf-8') as f:
                f.writelines(sql_content)
            print(f"\n🎉 新增图片SQL已生成: {os.path.abspath(sql_path)}")
        else:
            print("无新增图片，无需生成SQL文件")
    else:
        print("ℹ️ 无需更新list.json，文件已最新且无新增图片。")

    print(f"\n📊 当前壁纸总数: {len(files)}")
    return True

if __name__ == '__main__':
    print("🚀 开始更新壁纸列表...")
    success = update_wallpaper_list()
    if success:
        print("\n✨ 所有操作完成！")
    else:
        print("\n💥 操作失败，请检查错误信息")