import pymysql
import sys

"""
@file mysql_test.py
@brief 输出 wallpaper_likes 表结构，确认列名
@author AI助手
"""

print("开始执行 mysql_test.py")

def run_sql_query(host, user, password, database, query):
    conn = None
    try:
        conn = pymysql.connect(host=host, user=user, password=password, database=database)
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return columns, results
    except pymysql.Error as e:
        print(f"数据库查询失败: {e}")
        return None, None
    finally:
        if conn:
            conn.close()

# 数据库配置，请根据您的实际情况修改
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'wallpaper_db'
}

# 2024-07-27 新增：查询 wallpaper_favorites 表中 user_id 为 1 的所有记录
print("正在查询 wallpaper_favorites 表中 user_id 为 1 的所有记录...")
query_favorites = "SELECT * FROM wallpaper_favorites WHERE user_id = 1;"
columns_favorites, data_favorites = run_sql_query(
    DB_CONFIG['host'],
    DB_CONFIG['user'],
    DB_CONFIG['password'],
    DB_CONFIG['database'],
    query_favorites
)

if columns_favorites and data_favorites is not None:
    print("\n--- wallpaper_favorites 表中 user_id = 1 的记录 ---")
    print("|" + "|".join([f"{col:<20}" for col in columns_favorites]) + "|")
    print("|" + "-" * (len(columns_favorites) * 21 - 1) + "|")
    if data_favorites:
        for row in data_favorites:
            print("|" + "|".join([f"{str(item):<20}" for item in row]) + "|")
    else:
        print("| {:<18} | ".format("没有找到记录"))
    print("|" + "-" * (len(columns_favorites) * 21 - 1) + "|")
else:
    print("查询 wallpaper_favorites 表失败或没有返回数据。")

print("mysql_test.py 执行完毕")

def main():
    conn = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='',
        database='wallpaper_db',
        charset='utf8mb4'
    )
    cursor = conn.cursor()
    try:
        print("\n=== wallpaper_favorites 表结构 ===")
        cursor.execute("DESCRIBE wallpaper_favorites;")
        columns_fav = cursor.fetchall()
        for col in columns_fav:
            print(col)
            
        print("\n=== wallpapers 表结构 ===")
        cursor.execute("DESCRIBE wallpapers;")
        columns_wal = cursor.fetchall()
        for col in columns_wal:
            print(col)

        print("\n=== wallpaper_favorites 表内容 (前10条) ===")
        cursor.execute("SELECT user_id, wallpaper_id FROM wallpaper_favorites LIMIT 10;")
        rows_fav = cursor.fetchall()
        if rows_fav:
            for row in rows_fav:
                print(row)
        else:
            print("wallpaper_favorites 表为空或没有数据。")
            
        print("\n=== wallpapers 表内容 (前10条 id, title) ===")
        cursor.execute("SELECT id, title FROM wallpapers LIMIT 10;")
        rows_wal = cursor.fetchall()
        if rows_wal:
            for row in rows_wal:
                print(row)
        else:
            print("wallpapers 表为空或没有数据。")

        # 2024-07-16 调试：查询 `wallpaper_favorites` 表中特定壁纸ID的记录
        print("\n--- 查询 wallpaper_favorites 表中特定壁纸ID的记录 ---")
        specific_wallpaper_id = 17496074560053 # 您遇到的未同步的壁纸ID
        check_specific_favorite_query = """
        SELECT id, user_id, wallpaper_id, created_at
        FROM wallpaper_favorites
        WHERE user_id = 1 AND wallpaper_id = %s
        """
        try:
            cursor.execute(check_specific_favorite_query, (specific_wallpaper_id,))
            specific_favorite_records = cursor.fetchall()
            if specific_favorite_records:
                print(f"发现 {len(specific_favorite_records)} 条 user_id=1, wallpaper_id={specific_wallpaper_id} 的收藏记录:")
                for record in specific_favorite_records:
                    print(record)
            else:
                print(f"未发现 user_id=1, wallpaper_id={specific_wallpaper_id} 的收藏记录。")
        except pymysql.Error as e:
            print(f"查询特定收藏记录时出错: {e}")

        # 查询 `wallpaper_favorites` 表前10条记录
        print("\n--- 查询 wallpaper_favorites 表前10条记录 ---")
        try:
            cursor.execute("SELECT * FROM wallpaper_favorites LIMIT 10;")
            rows_fav = cursor.fetchall()
            if rows_fav:
                for row in rows_fav:
                    print(row)
            else:
                print("wallpaper_favorites 表为空或没有数据。")
        except pymysql.Error as e:
            print(f"查询 wallpaper_favorites 表前10条记录时出错: {e}")

        # 2024-07-27 新增：查询 `wallpapers` 表的总记录数
        print("\n--- 查询 wallpapers 表总记录数 ---")
        try:
            cursor.execute("SELECT COUNT(*) FROM wallpapers;")
            total_wallpapers_count = cursor.fetchone()[0]
            print(f"wallpapers 表中共有 {total_wallpapers_count} 条记录。")
        except pymysql.Error as e:
            print(f"查询 wallpapers 表总记录数时出错: {e}")

        # 2024-07-27 新增：查询 `wallpaper_favorites` 表的总记录数
        print("\n--- 查询 wallpaper_favorites 表总记录数 ---")
        try:
            cursor.execute("SELECT COUNT(*) FROM wallpaper_favorites;")
            total_favorites_count = cursor.fetchone()[0]
            print(f"wallpaper_favorites 表中共有 {total_favorites_count} 条记录。")
        except pymysql.Error as e:
            print(f"查询 wallpaper_favorites 表总记录数时出错: {e}")

        # 2024-07-27 新增：查询 `wallpapers` 表所有 id
        print("\n--- 查询 wallpapers 表所有 ID ---")
        try:
            cursor.execute("SELECT id FROM wallpapers;")
            all_wallpaper_ids = [row[0] for row in cursor.fetchall()]
            print(f"wallpapers 表中所有 ID ({len(all_wallpaper_ids)} 个):\n{all_wallpaper_ids}")
        except pymysql.Error as e:
            print(f"查询 wallpapers 表所有 ID 时出错: {e}")

        print("\n=== users 表结构 ===")
        cursor.execute("DESCRIBE users;")
        columns_users = cursor.fetchall()
        for col in columns_users:
            print(col)

        print(f"\n--- 查询用户 582311520@qq.com 的权限 ---")
        user_email = '582311520@qq.com'
        query_user_permission = """
        SELECT id, username, email, is_admin
        FROM users
        WHERE email = %s
        """
        try:
            cursor.execute(query_user_permission, (user_email,))
            user_record = cursor.fetchone()
            if user_record:
                # user_record[3] 现在是 is_admin 列
                is_admin_status = "是" if user_record[3] == 1 else "否"
                print(f"找到用户: ID={user_record[0]}, 用户名={user_record[1]}, 邮箱={user_record[2]}, 是否管理员: {is_admin_status}")
                if user_record[3] == 1: # 0 代表否，1 代表是
                    print(f"用户 {user_email} 拥有管理员权限。")
                else:
                    print(f"用户 {user_email} 不拥有管理员权限。")
            else:
                print(f"未找到邮箱为 {user_email} 的用户。")
        except pymysql.Error as e:
            print(f"查询用户权限时出错: {e}")
            
    except Exception as e:
        print(f"错误: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()