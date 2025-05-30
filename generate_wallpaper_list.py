import os
import json

def generate_wallpaper_list():
    """
    生成壁纸列表文件
    """
    # 壁纸目录路径
    wallpaper_dir = 'static/wallpapers'
    
    # 确保目录存在
    if not os.path.exists(wallpaper_dir):
        os.makedirs(wallpaper_dir)
        print(f"创建目录: {wallpaper_dir}")
    
    # 获取所有图片文件
    image_files = []
    for file in os.listdir(wallpaper_dir):
        if file.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            image_files.append(file)
    
    # 生成JSON文件
    output_file = os.path.join(wallpaper_dir, 'list.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(image_files, f, ensure_ascii=False, indent=2)
    
    print(f"已生成壁纸列表文件: {output_file}")
    print(f"共找到 {len(image_files)} 个图片文件")

if __name__ == '__main__':
    generate_wallpaper_list() 