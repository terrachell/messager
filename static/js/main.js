/**
 * MAIN.JS — Клиентская логика для страницы чата
 * Версия: 2.0.0
 */

(function() {
    'use strict';

    // ============================================================
    // 1. ПОДКЛЮЧЕНИЕ К СЕРВЕРУ
    // ============================================================
    
    const socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    // ============================================================
    // 2. СОСТОЯНИЕ
    // ============================================================
    
    let currentChat = 1;
    let currentUser = '';
    let isSending = false;
    let messageCache = {};

    // ============================================================
    // 3. DOM ЭЛЕМЕНТЫ
    // ============================================================
    
    const DOM = {
        createNewChatBtn: document.getElementById('create_new_chat'),
        messagesContainer: document.getElementById('messages'),
        messageInput: document.getElementById('message-input'),
        sendBtn: document.getElementById('send-btn'),
        currentChatName: document.getElementById('current-chat-name'),
        account: document.getElementById('account'),
        darkBlock: document.getElementById('dark-block'),
        cancelBtn: document.getElementById('cancel'),
        createChatForm: document.getElementById('create-chat-form'),
        chatItems: document.querySelectorAll('.chat-item')
    };

    // ============================================================
    // 4. ИНИЦИАЛИЗАЦИЯ
    // ============================================================
    
    function init() {
        // Получаем имя пользователя
        currentUser = DOM.account?.textContent?.trim() || 'User';
        
        // Настройка текстового поля
        setupTextarea();
        
        // Настройка обработчиков
        setupEventListeners();
        
        // Приветствие
        addSystemMessage(`👋 Добро пожаловать, ${currentUser}!`);
        
        console.log('Main.js initialized, user:', currentUser);
    }

    // ============================================================
    // 5. SOCKET.IO ОБРАБОТЧИКИ
    // ============================================================
    
    socket.on('connect', () => {
        console.log('✅ Подключено к серверу, SID:', socket.id);
        addSystemMessage('🟢 Подключено к чату');
        loadMessages(currentChat);
    });

    socket.on('connected', (data) => {
        console.log('Сервер подтвердил подключение:', data);
    });

    socket.on('disconnect', () => {
        console.log('❌ Отключено от сервера');
        addSystemMessage('🔴 Потеряно соединение. Переподключение...');
    });

    socket.on('reconnect', () => {
        console.log('🔄 Переподключено');
        addSystemMessage('🟢 Переподключено к серверу');
        loadMessages(currentChat);
    });

    // Получение нового сообщения
    socket.on('new_message', (data) => {
        console.log('📩 Новое сообщение:', data);
        
        // Проверяем, что сообщение для текущего чата
        if (data.chat_id == currentChat) {
            addMessage(data.user, data.message, data.user === currentUser, data.timestamp);
        }
        
        // Обновляем превью в списке чатов
        updateChatPreview(data.chat_id, data.user, data.message);
    });

    // Ошибки от сервера
    socket.on('error', (data) => {
        console.error('❌ Ошибка сервера:', data);
        addSystemMessage(`⚠️ Ошибка: ${data.message || 'Неизвестная ошибка'}`);
    });

    // ============================================================
    // 6. ЗАГРУЗКА СООБЩЕНИЙ
    // ============================================================
    
    function loadMessages(chatId) {
        // Проверяем кэш
        if (messageCache[chatId]) {
            displayMessages(messageCache[chatId]);
            return;
        }

        const url = `/api/messages/${chatId}`;
        console.log('📥 Загрузка сообщений:', url);
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(messages => {
                // Сохраняем в кэш
                messageCache[chatId] = messages;
                displayMessages(messages);
            })
            .catch(err => {
                console.error('❌ Ошибка загрузки сообщений:', err);
                addSystemMessage('⚠️ Не удалось загрузить сообщения');
            });
    }

    function displayMessages(messages) {
        const container = DOM.messagesContainer;
        container.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>💬 Нет сообщений</p>
                    <p style="font-size: 12px; color: #999;">Напишите первое сообщение</p>
                </div>
            `;
            return;
        }
        
        messages.forEach(msg => {
            // Безопасное форматирование времени
            let time = msg.created_at || '';
            if (time) {
                const match = time.match(/(\d{2}):(\d{2})/);
                time = match ? match[0] : time;
            }
            
            addMessage(
                msg.username || 'Unknown',
                msg.message || '',
                (msg.username || '') === currentUser,
                time
            );
        });
        
        scrollToBottom();
    }

    // ============================================================
    // 7. ОТПРАВКА СООБЩЕНИЙ
    // ============================================================
    
    function sendMessage() {
        const message = DOM.messageInput.value.trim();
        
        if (!message) return;
        if (isSending) return;
        
        isSending = true;
        
        const data = {
            user: currentUser,
            message: message,
            chatid: currentChat
        };
        
        console.log('📤 Отправка:', data);
        
        socket.emit('send_message', data);
        
        // Оптимистичное отображение
        const now = new Date();
        const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        addMessage(currentUser, message, true, time);
        
        // Очистка
        DOM.messageInput.value = '';
        DOM.messageInput.style.height = 'auto';
        
        setTimeout(() => {
            isSending = false;
        }, 500);
        
        scrollToBottom();
    }

    // ============================================================
    // 8. ОТОБРАЖЕНИЕ СООБЩЕНИЙ
    // ============================================================
    
    function addMessage(username, message, isSent, timestamp) {
        const container = DOM.messagesContainer;
        
        // Удаляем пустое состояние
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = timestamp || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-info">
                <span class="username">${escapeHtml(username)}</span>
                <span class="time">${escapeHtml(time)}</span>
            </div>
            <div class="message-bubble">${escapeHtml(message)}</div>
        `;
        
        // Анимация появления
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';
        container.appendChild(messageDiv);
        
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
        
        scrollToBottom();
    }

    function addSystemMessage(text) {
        const container = DOM.messagesContainer;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.textContent = text;
        container.appendChild(msgDiv);
        scrollToBottom();
    }

    // ============================================================
    // 9. ОБНОВЛЕНИЕ СПИСКА ЧАТОВ
    // ============================================================
    
    function updateChatPreview(chatId, username, message) {
        const chatElement = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (!chatElement) return;
        
        const lastMessage = chatElement.querySelector('.chat-last-message');
        if (lastMessage) {
            const preview = username === currentUser ? `Вы: ${message}` : `${username}: ${message}`;
            lastMessage.textContent = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
        }
    }

    function switchChat(chatElement) {
        // Обновляем активный класс
        document.querySelectorAll('.chat-item').forEach(c => c.classList.remove('active'));
        chatElement.classList.add('active');
        
        // Получаем ID чата
        const chatId = parseInt(chatElement.dataset.chatId);
        if (isNaN(chatId)) return;
        
        currentChat = chatId;
        
        // Обновляем название
        const chatName = chatElement.querySelector('.chat-name')?.textContent || 'Чат';
        DOM.currentChatName.textContent = chatName;
        
        // Загружаем сообщения
        loadMessages(currentChat);
    }

    // ============================================================
    // 10. СОЗДАНИЕ НОВОГО ЧАТА
    // ============================================================
    
    function showCreateChatModal() {
        if (DOM.darkBlock) {
            DOM.darkBlock.style.display = 'flex';
        }
    }

    function hideCreateChatModal() {
        if (DOM.darkBlock) {
            DOM.darkBlock.style.display = 'none';
        }
        // Очищаем форму
        if (DOM.createChatForm) {
            DOM.createChatForm.reset();
        }
    }

    async function handleCreateChat(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const username = formData.get('user1')?.trim();
        
        if (!username) {
            alert('Введите имя пользователя');
            return;
        }
        
        if (username === currentUser) {
            alert('Нельзя создать чат с самим собой');
            return;
        }
        
        const button = form.querySelector('.submit-btn');
        const originalText = button?.textContent || 'Создать';
        
        if (button) {
            button.disabled = true;
            button.textContent = 'Создание...';
        }
        
        try {
            const response = await fetch('/api/create_private_chat', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // Проверяем, не редирект ли это
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }
            
            // Пробуем парсить JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Успешно создан чат - делаем редирект
                    hideCreateChatModal();
                    window.location.href = result.redirect || '/main_page';
                } else {
                    alert(result.error || 'Ошибка создания чата');
                    if (button) {
                        button.disabled = false;
                        button.textContent = originalText;
                    }
                }
            } else {
                // Если не JSON, возможно это HTML с редиректом
                window.location.reload();
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            alert('Ошибка соединения с сервером');
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }

    // ============================================================
    // 11. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================================
    
    function scrollToBottom() {
        const container = DOM.messagesContainer;
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setupTextarea() {
        const textarea = DOM.messageInput;
        if (!textarea) return;
        
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    // ============================================================
    // 12. НАСТРОЙКА ОБРАБОТЧИКОВ
    // ============================================================
    
    function setupEventListeners() {
        // Отправка по кнопке
        if (DOM.sendBtn) {
            DOM.sendBtn.addEventListener('click', sendMessage);
        }
        
        // Отправка по Enter
        if (DOM.messageInput) {
            DOM.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Переключение чатов
        DOM.chatItems.forEach(chat => {
            chat.addEventListener('click', function() {
                switchChat(this);
            });
        });
        
        // Создание нового чата
        if (DOM.createNewChatBtn) {
            DOM.createNewChatBtn.addEventListener('click', showCreateChatModal);
        }
        
        // Отмена создания чата
        if (DOM.cancelBtn) {
            DOM.cancelBtn.addEventListener('click', hideCreateChatModal);
        }
        
        // Закрытие по клику вне модального окна
        if (DOM.darkBlock) {
            DOM.darkBlock.addEventListener('click', function(e) {
                if (e.target === this) {
                    hideCreateChatModal();
                }
            });
        }
        
        // Отправка формы создания чата
        if (DOM.createChatForm) {
            DOM.createChatForm.addEventListener('submit', handleCreateChat);
        }
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && DOM.darkBlock?.style.display === 'flex') {
                hideCreateChatModal();
            }
        });
    }

    // ============================================================
    // 13. ЗАПУСК
    // ============================================================
    
    // Запускаем после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();