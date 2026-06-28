import secrets
import string
from typing import Optional

def generate_chat_id(length: int = 16) -> str:
    """
    Генерирует безопасный ID для чата
    
    Args:
        length: Длина генерируемого ключа, по умолчанию 16
        
    Returns:
        str: Сгенерированный ID чата
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_room_hash(length: int = 32) -> str:
    """
    Генерирует криптографически стойкий хеш для комнаты
    
    Args:
        length: Длина хеша в байтах, по умолчанию 32
        
    Returns:
        str: Хеш комнаты в hex формате
    """
    return secrets.token_hex(length)

def generate_secure_token(length: int = 32) -> str:
    """
    Генерирует безопасный токен
    
    Args:
        length: Длина токена в байтах
        
    Returns:
        str: Токен в hex формате
    """
    return secrets.token_hex(length)

def generate_room_id(length: int = 8) -> str:
    """
    Генерирует читаемый ID для комнаты
    
    Args:
        length: Длина ID
        
    Returns:
        str: ID комнаты (только заглавные буквы и цифры)
    """
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_invite_code(length: int = 6) -> str:
    """
    Генерирует код приглашения
    
    Args:
        length: Длина кода
        
    Returns:
        str: Код приглашения (цифры)
    """
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def is_valid_room_hash(hash_value: str, expected_length: int = 64) -> bool:
    """
    Проверяет, является ли хеш валидным
    
    Args:
        hash_value: Хеш для проверки
        expected_length: Ожидаемая длина (по умолчанию 64 для hex(32))
        
    Returns:
        bool: True если хеш валидный
    """
    return (len(hash_value) == expected_length and 
            all(c in string.hexdigits for c in hash_value))

def create_unique_room_hash(cursor, length: int = 32) -> str:
    """
    Создает уникальный хеш комнаты с проверкой в БД
    
    Args:
        cursor: Курсор БД
        length: Длина хеша в байтах
        
    Returns:
        str: Уникальный хеш комнаты
    """
    while True:
        room_hash = generate_room_hash(length)
        cursor.execute('SELECT id FROM private_room WHERE hash = %s', (room_hash,))
        if not cursor.fetchone():
            return room_hash

if __name__ == '__main__':
    # Тестирование функций
    print("=== Тестирование генераторов ===")
    print(f"Room hash (32 bytes): {generate_room_hash()}")
    print(f"Room hash (16 bytes): {generate_room_hash(16)}")
    print(f"Chat ID: {generate_chat_id()}")
    print(f"Chat ID (8 chars): {generate_chat_id(8)}")
    print(f"Secure token: {generate_secure_token()}")
    print(f"Room ID: {generate_room_id()}")
    print(f"Invite code: {generate_invite_code()}")
    
    # Тестирование валидации
    test_hash = generate_room_hash()
    print(f"\n=== Проверка валидации ===")
    print(f"Хеш: {test_hash}")
    print(f"Валидный: {is_valid_room_hash(test_hash)}")
    print(f"Длина: {len(test_hash)}")