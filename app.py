from flask import Flask, render_template, session, request, redirect, jsonify
from flask_mysqldb import MySQL
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime
import bcrypt
from dotenv import load_dotenv
from static.crypter import generate_room_hash
from config import Config

# Загрузка переменных окружения
load_dotenv()

# Инициализация приложения
app = Flask(__name__)
app.config.from_object(Config)

# Инициализация MySQL
mysql = MySQL(app)

# Инициализация Socket.IO
socketio = SocketIO(app, 
                   cors_allowed_origins=app.config['SOCKETIO_CORS_ALLOWED_ORIGINS'],
                   async_mode=app.config['SOCKETIO_ASYNC_MODE'])

# ============ Вспомогательные функции ============
def get_user_id(username):
    """Получить ID пользователя по имени"""
    cursor = mysql.connection.cursor()
    cursor.execute('SELECT id FROM users WHERE username = %s', (username,))
    user = cursor.fetchone()
    cursor.close()
    return user['id'] if user else None

def get_room_hash(chat_id):
    """Получить хеш комнаты по ID чата"""
    cursor = mysql.connection.cursor()
    cursor.execute('SELECT hash FROM private_room WHERE id = %s OR user0 = %s OR user1 = %s', 
                  (chat_id, session['user'], session['user']))
    room = cursor.fetchone()
    cursor.close()
    return room['hash'] if room else None

# ============ Маршруты ============
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/registration', methods=['POST'])
def reg():
    username = request.form.get('login')
    password = request.form.get('password')
    
    if not username or not password:
        return redirect('/')
    
    # Хешируем пароль
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    
    cursor = mysql.connection.cursor()
    try:
        cursor.execute('INSERT INTO users (username, password, chats) VALUES (%s, %s, 1)', 
                      (username, hashed.decode('utf-8')))
        mysql.connection.commit()
        session['user'] = username
    except Exception as e:
        print(f"Ошибка регистрации: {e}")
        return redirect('/')
    finally:
        cursor.close()
    
    return redirect('/main_page')

@app.route('/auth', methods=['POST'])
def auth():
    username = request.form.get('login')
    password = request.form.get('password')
    
    cursor = mysql.connection.cursor()
    cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
    user = cursor.fetchone()
    cursor.close()
    
    if user and bcrypt.checkpw(password.encode(), user['password'].encode()):
        session['user'] = username
        return redirect('/main_page')
    else:
        return redirect('/')

@app.route('/main_page')
def main():
    if 'user' not in session:
        return redirect('/')
    
    # Создаем общий чат
    chats = """<div class="chat-item active" data-chat-id="1">
                <div class="chat-name">Общий чат</div>
                <div class="chat-last-message"></div>
            </div>"""
    
    # Получаем приватные чаты пользователя
    cursor = mysql.connection.cursor()
    cursor.execute('SELECT * FROM private_room WHERE user0 = %s OR user1 = %s', 
                  (session['user'], session['user']))
    chats_ = cursor.fetchall()
    
    for chat in chats_:
        # Определяем собеседника
        other_user = chat['user1'] if chat['user0'] == session['user'] else chat['user0']
        chats += f"""<div class="chat-item" data-chat-id="{chat['id']}">
        <div class="chat-name">{other_user}</div>
        <div class="chat-last-message"></div></div>"""
    
    cursor.close()
    return render_template('main_page.html', acc=session['user'], chats=chats)

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/api/messages/<int:chat_id>')
def get_messages(chat_id):
    """Получить историю сообщений чата"""
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    cursor = mysql.connection.cursor()
    
    # Проверяем доступ к чату
    if chat_id != 1:  # Если не общий чат
        cursor.execute('''
            SELECT * FROM private_room 
            WHERE id = %s AND (user0 = %s OR user1 = %s)
        ''', (chat_id, session['user'], session['user']))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({'error': 'Access denied'}), 403
    
    cursor.execute('''
        SELECT m.*, u.username
        FROM chats m 
        JOIN users u ON m.user_id = u.id 
        WHERE m.chat_id = %s 
        ORDER BY m.created_at ASC
        LIMIT %s
    ''', (chat_id, app.config['MAX_MESSAGES_PER_CHAT']))
    messages = cursor.fetchall()
    cursor.close()
    
    # Форматируем дату для JSON
    for msg in messages:
        if isinstance(msg['created_at'], datetime):
            msg['created_at'] = msg['created_at'].strftime('%Y-%m-%d %H:%M:%S')
    
    return jsonify(messages)

@app.route('/api/create_private_chat', methods=['POST'])
def create_private_chat():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_id = session['user']
    other_username = request.form.get('user1')
    
    if not other_username:
        return jsonify({'error': 'Username required'}), 400
    
    cursor = mysql.connection.cursor()
    
    # Проверяем существование пользователя
    cursor.execute('SELECT id FROM users WHERE username = %s', (other_username,))
    other_user = cursor.fetchone()
    
    if not other_user:
        cursor.close()
        return jsonify({'error': 'User not found'}), 404
    
    other_id = other_user['id']
    
    # Сортируем ID для избежания дублирования
    id1, id2 = sorted([user_id, other_id])
    
    # Проверяем, есть ли уже чат
    cursor.execute('SELECT id, hash FROM private_room WHERE user0 = %s AND user1 = %s', (id1, id2))
    existing = cursor.fetchone()
    
    if existing:
        room_hash = existing['hash']
        chat_id = existing['id']
    else:
        room_hash = generate_room_hash()
        cursor.execute('''
            INSERT INTO private_room (user0, user1, hash)
            VALUES (%s, %s, %s)
        ''', (id1, id2, room_hash))
        mysql.connection.commit()
        chat_id = cursor.lastrowid
    
    cursor.close()
    
    return jsonify({
        'success': True,
        'chat_id': chat_id,
        'room_hash': room_hash
    })

# ============ Socket.IO обработчики ============
@socketio.on('connect')
def handle_connect():
    print(f"Клиент подключился: {request.sid}")
    
    # Проверяем авторизацию через сессию
    if 'user' in session:
        # Автоматически подключаем к общему чату
        join_room('general_chat')
        emit('connected', {
            'message': f'Connected to server as {session["user"]}',
            'user': session['user']
        })
    else:
        emit('connected', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Клиент отключился: {request.sid}")
    
    # Если пользователь был авторизован, удаляем его из всех комнат
    if 'user' in session:
        # Оставляем только общий чат
        leave_room('general_chat')
        # Приватные комнаты удаляются автоматически

@socketio.on('join_private_chat')
def handle_join_private_chat(data):
    """Присоединение к приватному чату"""
    chat_id = data.get('chat_id')
    room_hash = data.get('room_hash')
    user = session.get('user')
    
    if not user:
        emit('error', {'message': 'Not authenticated'})
        return
    
    if not chat_id or not room_hash:
        emit('error', {'message': 'Invalid chat data'})
        return
    
    # Проверяем доступ к чату
    cursor = mysql.connection.cursor()
    cursor.execute('''
        SELECT * FROM private_room 
        WHERE id = %s AND hash = %s AND (user0 = %s OR user1 = %s)
    ''', (chat_id, room_hash, user, user))
    room = cursor.fetchone()
    cursor.close()
    
    if not room:
        emit('error', {'message': 'Access denied'})
        return
    
    # Присоединяемся к комнате
    room_name = f"private_chat_{chat_id}"
    join_room(room_name)
    
    emit('joined_private_chat', {
        'chat_id': chat_id,
        'message': f'Joined private chat {chat_id}'
    })

@socketio.on('leave_private_chat')
def handle_leave_private_chat(data):
    """Выход из приватного чата"""
    chat_id = data.get('chat_id')
    room_name = f"private_chat_{chat_id}"
    leave_room(room_name)
    
    emit('left_private_chat', {
        'chat_id': chat_id,
        'message': f'Left private chat {chat_id}'
    })

@socketio.on('send_message')
def handle_send_message(data):
    """Обработка отправки сообщения"""
    print(f"Получено сообщение: {data}")
    
    user = session.get('user')
    if not user:
        emit('error', {'message': 'Not authenticated'})
        return
    
    message = data.get('message')
    chat_id = data.get('chatid', 1)
    
    if not message:
        emit('error', {'message': 'Message cannot be empty'})
        return
    
    # Проверяем доступ к чату
    if chat_id != 1:  # Если не общий чат
        cursor = mysql.connection.cursor()
        cursor.execute('''
            SELECT * FROM private_room 
            WHERE id = %s AND (user0 = %s OR user1 = %s)
        ''', (chat_id, user, user))
        room = cursor.fetchone()
        cursor.close()
        
        if not room:
            emit('error', {'message': 'Access denied'})
            return
    
    # Сохраняем сообщение в БД
    try:
        cursor = mysql.connection.cursor()
        cursor.execute('''
            INSERT INTO chats (user_id, message, chat_id, created_at) 
            VALUES ((SELECT id FROM users WHERE username = %s), %s, %s, %s)
        ''', (user, message, chat_id, datetime.now()))
        mysql.connection.commit()
        cursor.close()
    except Exception as e:
        print(f"Ошибка сохранения сообщения: {e}")
        emit('error', {'message': 'Failed to save message'})
        return
    
    # Определяем комнату для отправки
    if chat_id == 1:
        room = 'general_chat'
    else:
        room = f'private_chat_{chat_id}'
    
    # Отправляем сообщение в комнату
    now = datetime.now()
    emit('new_message', {
        'user': user,
        'message': message,
        'chat_id': chat_id,
        'timestamp': now.strftime("%H:%M"),
        'full_time': now.strftime("%Y-%m-%d %H:%M:%S")
    }, room=room, broadcast=True)

@socketio.on('typing')
def handle_typing(data):
    """Обработка статуса печатания"""
    user = session.get('user')
    if not user:
        return
    
    chat_id = data.get('chat_id')
    is_typing = data.get('is_typing', False)
    
    if chat_id == 1:
        room = 'general_chat'
    else:
        room = f'private_chat_{chat_id}'
    
    emit('user_typing', {
        'user': user,
        'chat_id': chat_id,
        'is_typing': is_typing
    }, room=room, broadcast=True, include_self=False)

# ============ Запуск приложения ============
if __name__ == '__main__':
    socketio.run(app, 
                port=5001, 
                debug=app.config['DEBUG'], 
                host='0.0.0.0')