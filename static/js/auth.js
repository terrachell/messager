/**
 * AUTH.JS — Клиентская логика для страницы аутентификации
 * Версия: 3.0.0 (Полная переработка)
 */

(function() {
    'use strict';

    // ============================================================
    // 1. DOM ЭЛЕМЕНТЫ
    // ============================================================
    
    const DOM = {
        // Вкладки
        tabs: document.querySelectorAll('.tab-btn'),
        panels: {
            login: document.getElementById('login-panel'),
            register: document.getElementById('register-panel')
        },
        
        // Формы
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        
        // Кнопки
        loginSubmit: document.getElementById('login-submit'),
        registerSubmit: document.getElementById('register-submit'),
        switchBtns: document.querySelectorAll('.switch-btn'),
        
        // Поля входа
        login: {
            username: document.getElementById('login-username'),
            password: document.getElementById('login-password')
        },
        
        // Поля регистрации
        register: {
            username: document.getElementById('register-username'),
            password: document.getElementById('register-password'),
            confirm: document.getElementById('register-confirm')
        },
        
        // Подсказки
        hints: {
            login: document.getElementById('login-hint'),
            loginPassword: document.getElementById('login-password-hint'),
            registerUsername: document.getElementById('register-username-hint'),
            registerPassword: document.getElementById('register-password-hint'),
            confirm: document.getElementById('confirm-hint')
        },
        
        // Индикатор сложности
        strengthBars: [
            document.getElementById('strength-1'),
            document.getElementById('strength-2'),
            document.getElementById('strength-3')
        ],
        
        // Прочее
        errorContainer: document.getElementById('auth-error'),
        errorText: document.querySelector('.error-text'),
        termsCheck: document.getElementById('terms-check'),
        togglePasswordBtns: document.querySelectorAll('.toggle-password')
    };

    // ============================================================
    // 2. СОСТОЯНИЕ
    // ============================================================
    
    const State = {
        currentTab: 'login',
        isSubmitting: false,
        errorTimeout: null
    };

    // ============================================================
    // 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================================
    
    /**
     * Безопасное получение значения атрибута
     */
    function getSafeAttribute(element, attribute, defaultValue) {
        if (!element) return defaultValue;
        const value = element.getAttribute(attribute);
        if (value === null || value === undefined) return defaultValue;
        return value;
    }

    /**
     * Безопасное получение числа из атрибута
     */
    function getSafeNumber(element, attribute, defaultValue) {
        const value = getSafeAttribute(element, attribute, null);
        if (value === null) return defaultValue;
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Показать/скрыть ошибку
     */
    function showError(message) {
        const { errorContainer, errorText } = DOM;
        if (!errorContainer) return;
        
        if (message) {
            errorText.textContent = message;
            errorContainer.style.display = 'flex';
            errorContainer.classList.add('show');
            
            clearTimeout(State.errorTimeout);
            State.errorTimeout = setTimeout(() => {
                hideError();
            }, 5000);
        } else {
            hideError();
        }
    }

    function hideError() {
        const { errorContainer } = DOM;
        if (!errorContainer) return;
        errorContainer.style.display = 'none';
        errorContainer.classList.remove('show');
        clearTimeout(State.errorTimeout);
    }

    /**
     * Установить состояние поля
     */
    function setFieldState(wrapper, state, message) {
        if (!wrapper) return;
        
        // Сбрасываем все состояния
        wrapper.classList.remove('error', 'success', 'warning');
        
        if (state === 'error') {
            wrapper.classList.add('error');
        } else if (state === 'success') {
            wrapper.classList.add('success');
        } else if (state === 'warning') {
            wrapper.classList.add('warning');
        }
        
        // Обновляем подсказку
        const hint = wrapper.parentElement?.querySelector('.form-hint:not(.password-match-hint)');
        if (hint) {
            hint.classList.remove('error', 'success', 'warning');
            if (message) {
                hint.textContent = message;
                hint.classList.add(state);
            } else {
                hint.textContent = '';
            }
        }
    }

    /**
     * Получить обертку поля
     */
    function getWrapper(input) {
        return input?.closest('.input-wrapper');
    }

    /**
     * Получить подсказку поля
     */
    function getHint(input) {
        const wrapper = getWrapper(input);
        return wrapper?.parentElement?.querySelector('.form-hint:not(.password-match-hint)');
    }

    // ============================================================
    // 4. ВАЛИДАЦИЯ
    // ============================================================
    
    /**
     * Валидация одного поля
     */
    function validateField(input) {
        if (!input) return true;
        
        const wrapper = getWrapper(input);
        if (!wrapper) return true;
        
        const value = input.value.trim();
        const isRequired = input.hasAttribute('required');
        
        // Получаем ограничения
        const minLength = getSafeNumber(input, 'minlength', 0);
        const maxLength = getSafeNumber(input, 'maxlength', null);
        const pattern = getSafeAttribute(input, 'pattern', null);
        
        // Сбрасываем состояние
        setFieldState(wrapper, null);
        
        // Проверка required
        if (isRequired && !value) {
            setFieldState(wrapper, 'error', 'Это поле обязательно');
            return false;
        }
        
        // Если поле пустое и не обязательное - пропускаем
        if (!isRequired && !value) {
            return true;
        }
        
        // Проверка минимальной длины
        if (minLength > 0 && value.length < minLength) {
            setFieldState(wrapper, 'error', `Минимум ${minLength} символов`);
            return false;
        }
        
        // Проверка максимальной длины (только если задана)
        if (maxLength !== null && value.length > maxLength) {
            setFieldState(wrapper, 'error', `Максимум ${maxLength} символов`);
            return false;
        }
        
        // Проверка паттерна
        if (pattern && value) {
            try {
                const regex = new RegExp(pattern);
                if (!regex.test(value)) {
                    setFieldState(wrapper, 'error', 'Недопустимые символы');
                    return false;
                }
            } catch (e) {
                // Невалидный паттерн - пропускаем
            }
        }
        
        // Успех
        const successMessage = getSuccessMessage(input.id);
        setFieldState(wrapper, 'success', successMessage);
        return true;
    }

    /**
     * Сообщение успеха для поля
     */
    function getSuccessMessage(inputId) {
        const messages = {
            'login-username': 'Ok',
            'login-password': 'Ok',
            'register-username': 'Доступный логин',
            'register-password': 'Хороший пароль',
            'register-confirm': 'Пароли совпадают'
        };
        return messages[inputId] || 'Ok';
    }

    /**
     * Проверка совпадения паролей
     */
    function checkPasswordMatch() {
        const password = DOM.register.password?.value || '';
        const confirm = DOM.register.confirm?.value || '';
        const wrapper = getWrapper(DOM.register.confirm);
        
        if (!wrapper) return true;
        
        if (!confirm) {
            setFieldState(wrapper, null, 'Повторите пароль');
            return true;
        }
        
        if (password === confirm) {
            setFieldState(wrapper, 'success', 'Пароли совпадают');
            return true;
        } else {
            setFieldState(wrapper, 'error', 'Пароли не совпадают');
            return false;
        }
    }

    /**
     * Оценка сложности пароля
     */
    function checkPasswordStrength(password) {
        if (!password || password.length === 0) return 0;
        
        let score = 0;
        
        // Длина
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        
        // Разнообразие символов
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        // Возвращаем от 1 до 3
        if (score <= 2) return 1;
        if (score <= 4) return 2;
        return 3;
    }

    /**
     * Обновление индикатора сложности пароля
     */
    function updatePasswordStrength(password) {
        const { strengthBars } = DOM;
        const strength = checkPasswordStrength(password);
        const hint = DOM.hints.registerPassword;
        
        // Обновляем полоски
        strengthBars.forEach((bar, index) => {
            if (!bar) return;
            bar.className = 'bar';
            if (index < strength) {
                if (strength === 1) bar.classList.add('weak');
                else if (strength === 2) bar.classList.add('medium');
                else if (strength === 3) bar.classList.add('strong');
            }
        });
        
        // Обновляем подсказку
        if (!hint) return;
        
        if (!password || password.length === 0) {
            hint.textContent = 'Минимум 6 символов';
            hint.className = 'form-hint';
            return;
        }
        
        const strengthTexts = {
            1: { text: 'Слабый пароль', class: 'error' },
            2: { text: 'Средний пароль', class: 'warning' },
            3: { text: 'Сильный пароль', class: 'success' }
        };
        
        const info = strengthTexts[strength] || strengthTexts[1];
        hint.textContent = info.text;
        hint.className = `form-hint ${info.class}`;
    }

    /**
     * Сброс индикатора сложности
     */
    function resetPasswordStrength() {
        const { strengthBars, hints } = DOM;
        
        strengthBars.forEach(bar => {
            if (bar) bar.className = 'bar';
        });
        
        if (hints.registerPassword) {
            hints.registerPassword.textContent = 'Минимум 6 символов';
            hints.registerPassword.className = 'form-hint';
        }
    }

    /**
     * Валидация всей формы
     */
    function validateForm(form) {
        if (!form) return false;
        
        let isValid = true;
        const inputs = form.querySelectorAll('input:not([type="hidden"])');
        
        // Валидируем все поля
        inputs.forEach(input => {
            // Пропускаем поле подтверждения пароля
            if (input.id === 'register-confirm') return;
            
            const isInputValid = validateField(input);
            if (!isInputValid) isValid = false;
        });
        
        // Дополнительные проверки для регистрации
        if (form.id === 'register-form') {
            // Проверка совпадения паролей
            const passwordsMatch = checkPasswordMatch();
            if (!passwordsMatch) isValid = false;
            
            // Проверка чекбокса
            if (DOM.termsCheck) {
                const label = DOM.termsCheck.closest('.checkbox-label');
                if (DOM.termsCheck.checked) {
                    if (label) label.classList.remove('error');
                } else {
                    if (label) label.classList.add('error');
                    isValid = false;
                }
            }
        }
        
        return isValid;
    }

    // ============================================================
    // 5. ОБРАБОТЧИКИ ФОРМ
    // ============================================================
    
    /**
     * Обработка отправки формы
     */
        /**
     * Обработка отправки формы
     */
    async function handleSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const button = form.querySelector('.submit-btn');
        
        if (!button) return;
        
        const textSpan = button.querySelector('.btn-text');
        const originalText = textSpan?.textContent || 'Отправить';
        const loaderSpan = button.querySelector('.btn-loader');
        
        // Валидация
        if (!validateForm(form)) {
            const firstError = form.querySelector('.input-wrapper.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const input = firstError.querySelector('input');
                if (input) input.focus();
            }
            return;
        }
        
        // Блокируем кнопку
        button.disabled = true;
        if (textSpan) textSpan.textContent = 'Загрузка...';
        if (loaderSpan) loaderSpan.style.display = 'inline-flex';
        
        hideError();
        
        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: form.method || 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // Проверяем статус
            if (response.ok) {
                // Пробуем получить JSON
                try {
                    const result = await response.json();
                    if (result.success) {
                        if (result.redirect) {
                            window.location.href = result.redirect;
                        } else {
                            window.location.href = '/main_page';
                        }
                        return;
                    } else {
                        showError(result.error || 'Ошибка авторизации');
                        button.disabled = false;
                        if (textSpan) textSpan.textContent = originalText;
                        if (loaderSpan) loaderSpan.style.display = 'none';
                        return;
                    }
                } catch (jsonError) {
                    // Если не JSON - возможно сервер делает редирект
                    console.log('Сервер вернул не JSON, возможно редирект');
                    // Проверяем, не редирект ли это
                    if (response.redirected) {
                        window.location.href = response.url;
                        return;
                    }
                    // Или просто обновляем страницу
                    window.location.reload();
                    return;
                }
            } else {
                // Ошибка на сервере
                try {
                    const errorData = await response.json();
                    showError(errorData.error || `Ошибка ${response.status}`);
                } catch {
                    showError(`Ошибка сервера (${response.status})`);
                }
                button.disabled = false;
                if (textSpan) textSpan.textContent = originalText;
                if (loaderSpan) loaderSpan.style.display = 'none';
            }
        } catch (error) {
            console.error('Ошибка отправки:', error);
            showError('Ошибка соединения с сервером. Проверьте подключение.');
            button.disabled = false;
            if (textSpan) textSpan.textContent = originalText;
            if (loaderSpan) loaderSpan.style.display = 'none';
        }
    }

    // ============================================================
    // 6. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
    // ============================================================
    
    /**
     * Переключение вкладки
     */
    function switchTab(tabName) {
        if (tabName === State.currentTab) return;
        State.currentTab = tabName;
        
        // Обновляем кнопки
        DOM.tabs.forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        
        // Обновляем панели
        Object.keys(DOM.panels).forEach(key => {
            const panel = DOM.panels[key];
            if (panel) {
                panel.classList.toggle('active', key === tabName);
            }
        });
        
        // Скрываем ошибки
        hideError();
        
        // Фокус на первое поле
        const panel = DOM.panels[tabName];
        if (panel) {
            const firstInput = panel.querySelector('input:not([type="hidden"])');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
        
        // Сброс индикатора пароля
        if (tabName === 'register') {
            resetPasswordStrength();
        }
    }

    // ============================================================
    // 7. ИНТЕРФЕЙС ПОЛЬЗОВАТЕЛЯ
    // ============================================================
    
    /**
     * Показать/скрыть пароль
     */
    function togglePassword(button) {
        const wrapper = button?.closest('.input-wrapper');
        if (!wrapper) return;
        
        const input = wrapper.querySelector('input');
        const icon = button.querySelector('.eye-icon');
        
        if (!input) return;
        
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        
        if (icon) {
            icon.style.opacity = isPassword ? '1' : '0.4';
        }
    }

    /**
     * Фикс стилей для полей ввода (автозаполнение)
     */
    function fixInputStyle(input) {
        if (!input) return;
        
        const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
        
        input.style.backgroundColor = isDark ? '#374151' : '#f8f9fa';
        input.style.color = isDark ? '#f9fafb' : '#1a1a2e';
        input.style.webkitTextFillColor = isDark ? '#f9fafb' : '#1a1a2e';
    }

    function setupInputFix(input) {
        if (!input) return;
        
        // При вводе
        input.addEventListener('input', function() {
            const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
            this.style.color = isDark ? '#f9fafb' : '#1a1a2e';
            this.style.webkitTextFillColor = isDark ? '#f9fafb' : '#1a1a2e';
            
            if (this.value === '') {
                this.style.backgroundColor = isDark ? '#374151' : '#f8f9fa';
            }
        });
        
        // При фокусе
        input.addEventListener('focus', function() {
            const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
            this.style.backgroundColor = isDark ? '#4a5568' : '#ffffff';
            this.style.color = isDark ? '#f9fafb' : '#1a1a2e';
            this.style.webkitTextFillColor = isDark ? '#f9fafb' : '#1a1a2e';
        });
        
        // При потере фокуса
        input.addEventListener('blur', function() {
            fixInputStyle(this);
        });
        
        // При загрузке
        setTimeout(() => fixInputStyle(input), 100);
        
        // Интервал для автозаполнения
        setInterval(() => {
            if (document.activeElement !== input && input.value !== '') {
                fixInputStyle(input);
            }
        }, 500);
    }

    // ============================================================
    // 8. ИНИЦИАЛИЗАЦИЯ
    // ============================================================
    
    function init() {
        // ---- Переключение вкладок ----
        DOM.tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                switchTab(this.dataset.tab);
            });
        });
        
        // ---- Кнопки переключения ----
        DOM.switchBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                switchTab(this.dataset.switchTo);
            });
        });
        
        // ---- Показать/скрыть пароль ----
        DOM.togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                togglePassword(this);
            });
        });
        
        // ---- Валидация полей ----
        document.querySelectorAll('.input-wrapper input').forEach(input => {
            // На blur
            input.addEventListener('blur', function() {
                if (this.value.trim()) {
                    validateField(this);
                }
            });
            
            // На input
            input.addEventListener('input', function() {
                const id = this.id;
                
                // Обновляем сложность пароля
                if (id === 'register-password') {
                    updatePasswordStrength(this.value);
                    if (DOM.register.confirm?.value) {
                        checkPasswordMatch();
                    }
                    validateField(this);
                    return;
                }
                
                // Проверка совпадения паролей
                if (id === 'register-confirm') {
                    checkPasswordMatch();
                    return;
                }
                
                // Обычная валидация
                validateField(this);
            });
            
            // Enter для отправки
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    const form = this.closest('form');
                    if (form) {
                        e.preventDefault();
                        form.dispatchEvent(new Event('submit'));
                    }
                }
            });
            
            // Фикс стилей
            setupInputFix(input);
        });
        
        // ---- Чекбокс условий ----
        if (DOM.termsCheck) {
            DOM.termsCheck.addEventListener('change', function() {
                const label = this.closest('.checkbox-label');
                if (this.checked) {
                    if (label) label.classList.remove('error');
                }
            });
        }
        
        // ---- Отправка форм ----
        if (DOM.loginForm) DOM.loginForm.addEventListener('submit', handleSubmit);
        if (DOM.registerForm) DOM.registerForm.addEventListener('submit', handleSubmit);
        
        // ---- Восстановление вкладки из URL ----
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam && ['login', 'register'].includes(tabParam)) {
            switchTab(tabParam);
        }
        
        // ---- Flash-сообщения ----
        const flashMessage = document.querySelector('[data-flash]');
        if (flashMessage) {
            showError(flashMessage.dataset.flash);
        }
        
        // ---- Фокус на первом поле ----
        setTimeout(() => {
            const firstInput = document.querySelector('.auth-panel.active input:not([type="hidden"])');
            if (firstInput) firstInput.focus();
        }, 200);
        
        // ---- Отслеживание темы ----
        if (window.matchMedia) {
            const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeMedia.addEventListener('change', function() {
                document.querySelectorAll('.input-wrapper input').forEach(input => {
                    fixInputStyle(input);
                });
            });
        }
        
        console.log('Auth.js initialized successfully');
    }

    // ============================================================
    // 9. ЗАПУСК
    // ============================================================
    
    // Запускаем после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();