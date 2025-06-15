#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
壁纸名称修复脚本
从调试日志中提取原始文件名，更新数据库和list.json文件
"""

import re
import json
import mysql.connector
from datetime import datetime
import os

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'wallpaper_db',
    'charset': 'utf8mb4'
}

# 分类和标签映射
CATEGORY_TAGS = {
    '风景': ['自然', '山水', '海洋', '森林', '天空', '日落', '日出', '雪景', '春天', '夏天', '秋天', '冬天'],
    '人物': ['美女', '帅哥', '明星', '模特', '艺术人像', '街拍', '写真'],
    '动物': ['猫', '狗', '鸟', '野生动物', '宠物', '海洋生物'],
    '建筑': ['城市', '建筑', '桥梁', '古建筑', '现代建筑', '夜景'],
    '艺术': ['绘画', '插画', '抽象', '艺术', '创意', '设计'],
    '科技': ['科幻', '未来', '机器人', '太空', '数码'],
    '游戏': ['游戏', '动漫', '二次元', '角色'],
    '汽车': ['跑车', '摩托车', '汽车', '交通工具'],
    '美食': ['食物', '美食', '甜品', '饮品'],
    '运动': ['体育', '运动', '健身', '球类'],
    '其他': ['纹理', '通用', '简约', '抽象']
}

def extract_id_from_log_line(line):
    """从日志行中提取壁纸ID"""
    match = re.search(r'- ID: (\d+)', line)
    return match.group(1) if match else None

def extract_original_name_from_log_line(line):
    """从日志行中提取原始文件名"""
    match = re.search(r'- 原始名称: (.+)', line)
    return match.group(1).strip() if match else None

def analyze_filename(filename):
    """分析文件名，确定分类和标签"""
    if not filename:
        return '其他', ['其他']
    
    filename_lower = filename.lower()
    
    # 检查每个分类的关键词
    for category, keywords in CATEGORY_TAGS.items():
        for keyword in keywords:
            if keyword in filename or keyword.lower() in filename_lower:
                # 找到匹配的分类，返回该分类和相关标签
                matched_tags = [keyword]
                # 添加其他可能匹配的标签
                for tag in keywords:
                    if tag != keyword and (tag in filename or tag.lower() in filename_lower):
                        matched_tags.append(tag)
                return category, matched_tags
    
    # 特殊关键词检查
    special_keywords = {
        '雨': ('风景', ['雨天', '自然']),
        '夜': ('风景', ['夜景', '夜晚']),
        '撑伞': ('人物', ['雨天', '人物']),
        '美女': ('人物', ['美女', '人物']),
        '冷色': ('艺术', ['冷色调', '艺术']),
        '废土': ('科技', ['科幻', '废土']),
        '地震': ('风景', ['灾难', '自然']),
        '巨物': ('科技', ['科幻', '巨物']),
        '东京': ('建筑', ['城市', '日本']),
        '魔物': ('游戏', ['魔物', '奇幻']),
        '国王': ('人物', ['人物', '皇室'])
    }
    
    for keyword, (category, tags) in special_keywords.items():
        if keyword in filename:
            return category, tags
    
    return '其他', ['其他']

def parse_debug_log():
    """解析调试日志，提取ID和原始文件名的映射"""
    log_file = 'f:\\XAMPP\\htdocs\\logs\\wallpaper_debug_log.txt'
    id_name_mapping = {}
    
    try:
        # 尝试不同的编码格式
        encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
        content = None
        
        for encoding in encodings:
            try:
                with open(log_file, 'r', encoding=encoding) as f:
                    content = f.read()
                print(f"成功使用 {encoding} 编码读取日志文件")
                break
            except UnicodeDecodeError:
                continue
        
        if content is None:
            print("无法读取日志文件，尝试所有编码都失败")
            return id_name_mapping
            
        # 直接按行解析，寻找ID和原始名称的配对
        lines = content.split('\n')
        
        current_id = None
        
        for i, line in enumerate(lines):
            # 查找ID行
            if '- ID:' in line:
                current_id = extract_id_from_log_line(line)
                
                # 在接下来的几行中查找原始名称
                for j in range(i+1, min(i+10, len(lines))):
                    if '- 原始名称:' in lines[j]:
                        current_name = extract_original_name_from_log_line(lines[j])
                        if current_id and current_name:
                            id_name_mapping[current_id] = current_name
                            print(f"找到映射: {current_id} -> {current_name}")
                        break
        
        # 如果还是没找到，尝试更简单的正则匹配
        if not id_name_mapping:
            print("尝试使用正则表达式直接匹配...")
            # 匹配包含ID和原始名称的模式
            pattern = r'- ID: (\d+).*?- 原始名称: ([^\n]+)'
            matches = re.findall(pattern, content, re.DOTALL)
            
            for match in matches:
                wallpaper_id, original_name = match
                id_name_mapping[wallpaper_id] = original_name.strip()
                print(f"正则匹配: {wallpaper_id} -> {original_name.strip()}")
                    
    except Exception as e:
        print(f"解析日志文件时出错: {e}")
        
    return id_name_mapping

def update_database(id_name_mapping):
    """更新数据库中的标题和分类信息"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        updated_count = 0
        
        for wallpaper_id, original_name in id_name_mapping.items():
            # 分析文件名获取分类和标签
            category, tags = analyze_filename(original_name)
            tags_str = ','.join(tags)
            
            # 去掉文件扩展名作为标题
            title = os.path.splitext(original_name)[0]
            
            # 更新数据库
            update_sql = """
                UPDATE wallpapers 
                SET title = %s, category = %s, tags = %s, updated_at = %s 
                WHERE id = %s
            """
            
            cursor.execute(update_sql, (title, category, tags_str, datetime.now(), wallpaper_id))
            
            if cursor.rowcount > 0:
                updated_count += 1
                print(f"更新 ID {wallpaper_id}: {title} -> {category}")
        
        conn.commit()
        print(f"\n数据库更新完成，共更新 {updated_count} 条记录")
        
    except Exception as e:
        print(f"更新数据库时出错: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def update_list_json(id_name_mapping):
    """更新list.json文件"""
    list_file = 'f:\\XAMPP\\htdocs\\static\\data\\list.json'
    
    try:
        # 读取现有的list.json
        with open(list_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        updated_count = 0
        
        for item in data:
            item_id = str(item.get('id', ''))
            if item_id in id_name_mapping:
                original_name = id_name_mapping[item_id]
                category, tags = analyze_filename(original_name)
                
                # 更新名称和分类
                item['name'] = os.path.splitext(original_name)[0]
                item['category'] = category
                item['tags'] = tags
                
                updated_count += 1
                print(f"更新 JSON ID {item_id}: {item['name']} -> {category}")
        
        # 写回文件
        with open(list_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\nlist.json更新完成，共更新 {updated_count} 条记录")
        
    except Exception as e:
        print(f"更新list.json时出错: {e}")

def main():
    """主函数"""
    print("开始修复壁纸名称和分类...")
    
    # 1. 解析调试日志
    print("\n1. 解析调试日志...")
    id_name_mapping = parse_debug_log()
    print(f"找到 {len(id_name_mapping)} 个ID和原始文件名的映射")
    
    if not id_name_mapping:
        print("未找到任何映射关系，退出")
        return
    
    # 显示前几个映射示例
    print("\n映射示例:")
    for i, (id_val, name) in enumerate(list(id_name_mapping.items())[:5]):
        print(f"  {id_val} -> {name}")
    
    # 2. 更新数据库
    print("\n2. 更新数据库...")
    update_database(id_name_mapping)
    
    # 3. 更新list.json
    print("\n3. 更新list.json...")
    update_list_json(id_name_mapping)
    
    print("\n修复完成！")
    print("\n分类统计:")
    
    # 统计分类
    category_count = {}
    for original_name in id_name_mapping.values():
        category, _ = analyze_filename(original_name)
        category_count[category] = category_count.get(category, 0) + 1
    
    for category, count in sorted(category_count.items()):
        print(f"  {category}: {count} 张")

if __name__ == '__main__':
    main()