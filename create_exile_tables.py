import pymysql
import sys

"""
@file create_exile_tables.py
@brief 创建壁纸流放状态表和操作日志表
@author AI助手
"""

print("开始执行 create_exile_tables.py：创建数据库表...")

# 数据库配置，请根据您的实际情况修改
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'wallpaper_db'
}

def create_tables():
    conn = None
    try:
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset='utf8mb4'
        )
        cursor = conn.cursor()

        # 创建 wallpaper_exile_status 表
        create_exile_status_table_sql = """
        CREATE TABLE IF NOT EXISTS wallpaper_exile_status (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            wallpaper_id BIGINT UNSIGNED NOT NULL UNIQUE,
            status TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            comment TEXT,
            INDEX (wallpaper_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        cursor.execute(create_exile_status_table_sql)
        print("表 `wallpaper_exile_status` 已创建或已存在。")

        # 创建 wallpaper_operation_log 表
        create_operation_log_table_sql = """
        CREATE TABLE IF NOT EXISTS wallpaper_operation_log (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            wallpaper_id BIGINT UNSIGNED NOT NULL,
            action_type VARCHAR(20) NOT NULL,
            operated_by_user_id BIGINT UNSIGNED,
            operation_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            old_status TINYINT(1) NOT NULL,
            new_status TINYINT(1) NOT NULL,
            comment TEXT,
            INDEX (wallpaper_id),
            INDEX (operation_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        cursor.execute(create_operation_log_table_sql)
        print("表 `wallpaper_operation_log` 已创建或已存在。")

        conn.commit()
        print("数据库表创建操作已提交。")

    except pymysql.Error as e:
        print(f"数据库操作失败: {e}")
        if conn:
            conn.rollback()
            print("数据库操作已回滚。")
    finally:
        if conn:
            conn.close()
            print("数据库连接已关闭。")

if __name__ == "__main__":
    create_tables()
    print("create_exile_tables.py 执行完毕。") 