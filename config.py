import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Основные настройки приложения
    SECRET_KEY = os.getenv('SECRET_KEY', 'secret')
    DEBUG = os.getenv('DEBUG', True)
    
    # Настройки MySQL
    MYSQL_HOST = os.getenv('MYSQL_HOST', '127.0.0.1')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '2005')
    MYSQL_DB = os.getenv('MYSQL_DB', 'messager')
    MYSQL_CURSORCLASS = 'DictCursor'
    
    # Настройки Socket.IO
    SOCKETIO_CORS_ALLOWED_ORIGINS = "*"
    SOCKETIO_ASYNC_MODE = 'threading'
    
    # Другие настройки
    MAX_MESSAGES_PER_CHAT = 100