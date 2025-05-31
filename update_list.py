import os
import json

def update_wallpaper_list():
    # 壁纸目录路径
    wallpapers_dir = os.path.join('static', 'wallpapers')
    # list.json路径
    list_path = os.path.join('static', 'data', 'list.json')
    
    try:
        # 获取所有图片文件
        files = []
        for filename in os.listdir(wallpapers_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                files.append({
                    'filename': filename,
                    'path': f'static/wallpapers/{filename}',
                    'name': os.path.splitext(filename)[0]
                })
        
        # 按文件名排序
        files.sort(key=lambda x: x['filename'])
        
        # 写入list.json
        with open(list_path, 'w', encoding='utf-8') as f:
            json.dump(files, f, ensure_ascii=False, indent=2)
        
        print(f'更新成功！共找到 {len(files)} 个图片文件。')
        print(f'list.json 已更新到: {os.path.abspath(list_path)}')
        
    except Exception as e:
        print(f'更新失败：{str(e)}')

if __name__ == '__main__':
    update_wallpaper_list() 