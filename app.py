from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
import os
import uuid
from PIL import Image
from datetime import datetime

# 配置应用
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///wallpaper.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB

# 初始化扩展
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# 确保上传文件夹存在
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# 用户模型
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(100), nullable=False)
    register_time = db.Column(db.DateTime, default=datetime.utcnow)
    wallpapers = db.relationship('Wallpaper', backref='user', lazy=True)

# 分类模型
class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    wallpapers = db.relationship('Wallpaper', backref='category_rel', lazy=True)

# 壁纸模型
class Wallpaper(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    tags = db.Column(db.String(200))
    upload_time = db.Column(db.DateTime, default=datetime.utcnow)
    views = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# 用户加载函数
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# 图片处理函数
def compress_image(image, max_size=(1920, 1080), quality=80):
    """压缩图片尺寸和质量"""
    image.thumbnail(max_size, Image.LANCZOS)
    return image

# 路由 - 首页
@app.route('/')
def index():
    # 获取热门壁纸（按浏览量排序）
    wallpapers = Wallpaper.query.order_by(Wallpaper.views.desc()).limit(20).all()
    return render_template('index.html', wallpapers=wallpapers)

# 路由 - 分类浏览
@app.route('/category/<category_name>')
def category(category_name):
    wallpapers = Wallpaper.query.filter_by(category=category_name).order_by(Wallpaper.upload_time.desc()).all()
    return render_template('category.html', wallpapers=wallpapers, category_name=category_name)

# 路由 - 搜索
@app.route('/search')
def search():
    keyword = request.args.get('q', '')
    wallpapers = Wallpaper.query.filter(
        (Wallpaper.title.ilike(f'%{keyword}%')) |
        (Wallpaper.category.ilike(f'%{keyword}%')) |
        (Wallpaper.tags.ilike(f'%{keyword}%'))
    ).order_by(Wallpaper.upload_time.desc()).all()
    return render_template('search.html', wallpapers=wallpapers, keyword=keyword)

# 路由 - 壁纸详情
@app.route('/wallpaper/<int:id>')
def wallpaper_detail(id):
    wallpaper = Wallpaper.query.get_or_404(id)
    wallpaper.views += 1
    db.session.commit()
    return render_template('detail.html', wallpaper=wallpaper)

# 路由 - 注册
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        if User.query.filter_by(username=username).first():
            return jsonify({'status': 'error', 'message': '用户名已存在'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'status': 'error', 'message': '邮箱已注册'}), 400
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(username=username, email=email, password_hash=hashed_password)
        
        db.session.add(user)
        db.session.commit()
        
        # 注册成功后自动登录
        login_user(user)
        return jsonify({'status': 'success', 'message': '注册成功', 'redirect': url_for('index')})
    
    return render_template('register.html')

# 路由 - 登录
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        user = User.query.filter_by(email=email).first()
        
        if user and bcrypt.check_password_hash(user.password_hash, password):
            login_user(user)
            return jsonify({'status': 'success', 'message': '登录成功', 'redirect': url_for('index')})
        else:
            return jsonify({'status': 'error', 'message': '邮箱或密码错误'}), 401
    
    return render_template('login.html')

# 路由 - 登出
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# 路由 - 上传壁纸
@app.route('/upload', methods=['GET', 'POST'])
@login_required
def upload():
    if request.method == 'POST':
        # 检查是否有文件上传
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': '没有选择文件'}), 400
        
        file = request.files['file']
        
        # 检查文件是否有名称
        if file.filename == '':
            return jsonify({'status': 'error', 'message': '没有选择文件'}), 400
        
        # 检查文件类型
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            return jsonify({'status': 'error', 'message': '不支持的文件类型'}), 400
        
        title = request.form.get('title')
        category = request.form.get('category')
        tags = request.form.get('tags')
        
        if not title or not category:
            return jsonify({'status': 'error', 'message': '标题和分类不能为空'}), 400
        
        # 生成唯一文件名
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            # 打开并压缩图片
            img = Image.open(file.stream)
            img = compress_image(img)
            img.save(save_path)
            
            # 保存壁纸信息到数据库
            wallpaper = Wallpaper(
                filename=filename,
                title=title,
                category=category,
                tags=tags,
                user_id=current_user.id
            )
            
            db.session.add(wallpaper)
            db.session.commit()
            
            return jsonify({'status': 'success', 'message': '上传成功', 'redirect': url_for('index')})
        
        except Exception as e:
            app.logger.error(f"上传失败: {str(e)}")
            return jsonify({'status': 'error', 'message': '上传失败，请重试'}), 500
    
    # 获取用户自定义分类
    user_categories = Category.query.filter_by(user_id=current_user.id).all()
    # 获取系统分类
    system_categories = Category.query.filter(Category.user_id.is_(None)).all()
    
    return render_template('upload.html', user_categories=user_categories, system_categories=system_categories)

# 路由 - 添加分类
@app.route('/add_category', methods=['POST'])
@login_required
def add_category():
    name = request.form.get('name')
    
    if not name:
        return jsonify({'status': 'error', 'message': '分类名称不能为空'}), 400
    
    if Category.query.filter_by(name=name, user_id=current_user.id).first():
        return jsonify({'status': 'error', 'message': '分类已存在'}), 400
    
    category = Category(name=name, user_id=current_user.id)
    db.session.add(category)
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': '分类添加成功', 'category': {'id': category.id, 'name': category.name}})

# 路由 - 用户个人中心
@app.route('/user/profile')
@login_required
def user_profile():
    user_wallpapers = Wallpaper.query.filter_by(user_id=current_user.id).order_by(Wallpaper.upload_time.desc()).all()
    return render_template('profile.html', user_wallpapers=user_wallpapers)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # 添加默认分类
        default_categories = ['风景', '动物', '动漫', '城市', '抽象', '科技', '创意', '美食']
        for category_name in default_categories:
            if not Category.query.filter_by(name=category_name, user_id=None).first():
                db.session.add(Category(name=category_name))
        db.session.commit()
    app.run(debug=True)    