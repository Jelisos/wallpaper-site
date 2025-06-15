#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动同步壁纸主表脚本
- 检查ID唯一性，防止重复
- 只为新增图片生成 INSERT 并写入数据库
- 可选：为已删除图片生成 DELETE（需二次确认）
- 日志输出
"""
import json
import pymysql
import os
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'wallpaper_db',
    'charset': 'utf8mb4'
}

LIST_PATH = os.path.join('static', 'data', 'list.json')

# 连接数据库
conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor()

def get_db_wallpaper_ids():
    cursor.execute("SELECT id FROM wallpapers")
    return set(str(row[0]) for row in cursor.fetchall())

def get_list_wallpapers():
    with open(LIST_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def insert_new_wallpapers(new_wallpapers):
    if not new_wallpapers:
        print("✅ 没有新增图片需要同步。")
        return
    sql = """
        INSERT INTO wallpapers (
            id, title, description, file_path, file_size, width, height, 
            category, tags, format, views, likes, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, 
            %s, %s, %s, %s, %s, %s, %s
        )
        """
    values_to_insert = []
    for w in new_wallpapers:
        tags_str = ' '.join(w.get('tags', []))
        created_at = w.get('created_at', datetime.now().strftime('%Y-%m-%d')) + ' 00:00:00'
        updated_at = created_at # created_at 和 updated_at 初始值一致
        values_to_insert.append((
            w['id'],
            w['name'],
            w.get('description',''),
            w['path'],
            w['size'],
            w['width'],
            w['height'],
            w['category'],
            tags_str,
            w['format'],
            0, # views
            0, # likes
            created_at,
            updated_at
        ))
    try:
        cursor.executemany(sql, values_to_insert)
        conn.commit()
        print(f"✅ 新增壁纸已同步到数据库，共 {len(new_wallpapers)} 条。")
    except Exception as e:
        print(f"❌ 同步失败: {e}")
        conn.rollback()

def check_duplicate_ids(wallpapers):
    seen = set()
    for w in wallpapers:
        if str(w['id']) in seen:
            print(f"❌ 检测到重复ID: {w['id']}，请检查 list.json！")
            return True
        seen.add(str(w['id']))
    return False

def main():
    print("--- 壁纸主表自动同步开始 ---")
    wallpapers = get_list_wallpapers()
    if check_duplicate_ids(wallpapers):
        print("同步中止：请先解决ID重复问题！")
        return
    db_ids = get_db_wallpaper_ids()
    list_ids = set(str(w['id']) for w in wallpapers)
    # 新增图片
    new_wallpapers = [w for w in wallpapers if str(w['id']) not in db_ids]
    insert_new_wallpapers(new_wallpapers)
    # 可选：检测已删除图片
    deleted_ids = db_ids - list_ids
    if deleted_ids:
        print(f"⚠️ 数据库中有 {len(deleted_ids)} 条已删除图片（list.json 不存在），如需同步删除请手动确认：")
        print(deleted_ids)
    print("--- 同步结束 ---")

if __name__ == '__main__':
    main()
    cursor.close()
    conn.close() 