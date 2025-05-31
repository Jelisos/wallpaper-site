import os
import json
import re
from difflib import SequenceMatcher

def get_image_size(file_path):
    """获取图片尺寸"""
    try:
        from PIL import Image
        with Image.open(file_path) as img:
            return f"{img.width}x{img.height}"
    except:
        return "未知"

def get_file_size(file_path):
    """获取文件大小"""
    try:
        size_bytes = os.path.getsize(file_path)
        if size_bytes < 1024:
            return f"{size_bytes}B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes/1024:.1f}KB"
        else:
            return f"{size_bytes/1024/1024:.1f}MB"
    except:
        return "未知"

def calculate_similarity(str1, str2):
    """计算两个字符串的相似度"""
    return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

def find_matching_prompt(image_name, prompts):
    """查找匹配的提示词，使用模糊匹配"""
    # 移除文件扩展名和数字后缀
    base_name = re.sub(r'\d*\.(jpeg|jpg|png|gif|webp)$', '', image_name.lower())
    
    best_match = None
    best_score = 0.3  # 设置最低相似度阈值
    
    for prompt in prompts:
        # 计算标题相似度
        title_score = calculate_similarity(base_name, prompt['title'])
        
        # 计算内容相似度（取内容中与图片名最相似的部分）
        content_words = prompt['content'].split()
        content_score = max(calculate_similarity(base_name, word) for word in content_words)
        
        # 计算标签相似度
        tag_score = max(calculate_similarity(base_name, tag) for tag in prompt['tags'])
        
        # 综合评分（标题权重最高，内容次之，标签最低）
        total_score = (title_score * 0.5) + (content_score * 0.3) + (tag_score * 0.2)
        
        if total_score > best_score:
            best_score = total_score
            best_match = prompt
    
    return best_match

def main():
    # 定义目录路径
    wallpaper_dir = 'static/wallpapers'
    data_dir = 'static/data'
    
    # 确保目录存在
    if not os.path.exists(wallpaper_dir):
        os.makedirs(wallpaper_dir)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    # 读取提示词文件
    prompts_file = os.path.join(data_dir, 'prompts.json')
    if os.path.exists(prompts_file):
        with open(prompts_file, 'r', encoding='utf-8') as f:
            prompts_data = json.load(f)
            prompts = prompts_data.get('prompts', [])
    else:
        prompts = []
    
    # 扫描壁纸目录
    wallpaper_list = []
    for filename in os.listdir(wallpaper_dir):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            file_path = os.path.join(wallpaper_dir, filename)
            relative_path = os.path.join('static/wallpapers', filename).replace('\\', '/')
            
            # 获取图片信息
            image_info = {
                'filename': filename,
                'path': relative_path,
                'name': os.path.splitext(filename)[0],
                'size': get_image_size(file_path),
                'file_size': get_file_size(file_path)
            }
            wallpaper_list.append(image_info)
    
    # 创建合并后的数据结构
    merged_data = {
        'wallpapers': []
    }
    
    # 为每个提示词创建条目
    for prompt in prompts:
        prompt_entry = {
            'id': prompt['id'],
            'title': prompt['title'],
            'content': prompt['content'],
            'tags': prompt['tags'],
            'images': []
        }
        
        # 查找匹配的图片
        for wallpaper in wallpaper_list:
            if find_matching_prompt(wallpaper['filename'], [prompt]):
                prompt_entry['images'].append({
                    'filename': wallpaper['filename'],
                    'path': wallpaper['path'],
                    'name': wallpaper['name'],
                    'size': wallpaper['size'],
                    'file_size': wallpaper['file_size']
                })
        
        # 只添加有匹配图片的提示词
        if prompt_entry['images']:
            merged_data['wallpapers'].append(prompt_entry)
    
    # 保存合并后的数据
    merged_file = os.path.join(data_dir, 'wallpapers.json')
    with open(merged_file, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)
    
    print(f'已生成合并后的壁纸列表文件：{merged_file}')
    print(f'共找到 {len(wallpaper_list)} 个图片文件')
    print(f'共合并 {len(merged_data["wallpapers"])} 个提示词条目')

if __name__ == '__main__':
    main() 