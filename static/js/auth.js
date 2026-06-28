/**
 * AUTH.JS — Клиентская логика для страницы аутентификации
 * Версия: 2.1.0 (PNG иконка глаза)
 */

(function() {
    'use strict';

    // ---------- DOM элементы ----------
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = {
        login: document.getElementById('login-panel'),
        register: document.getElementById('register-panel')
    };
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorContainer = document.getElementById('auth-error');
    const errorText = errorContainer?.querySelector('.error-text');
    
    const loginSubmit = document.getElementById('login-submit');
    const registerSubmit = document.getElementById('register-submit');
    
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    
    const switchBtns = document.querySelectorAll('.switch-btn');
    
    // Поля входа
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    
    // Поля регистрации
    const registerUsername = document.getElementById('register-username');
    const registerPassword = document.getElementById('register-password');
    const registerConfirm = document.getElementById('register-confirm');
    const termsCheck = document.getElementById('terms-check');
    
    // Подсказки
    const loginHint = document.getElementById('login-hint');
    const loginPasswordHint = document.getElementById('login-password-hint');
    const registerUsernameHint = document.getElementById('register-username-hint');
    const registerPasswordHint = document.getElementById('register-password-hint');
    const confirmHint = document.getElementById('confirm-hint');
    
    // Индикатор сложности пароля
    const strengthBars = [
        document.getElementById('strength-1'),
        document.getElementById('strength-2'),
        document.getElementById('strength-3')
    ];

    // ---------- Состояние ----------
    let currentTab = 'login';
    let isSubmitting = false;

    // ---------- Функции ----------

    /**
     * Показать/скрыть ошибку
     */
    function showError(message) {
        if (!errorContainer) return;
        if (message) {
            errorText.textContent = message;
            errorContainer.style.display = 'flex';
            clearTimeout(window.errorTimeout);
            window.errorTimeout = setTimeout(function() {
                errorContainer.style.display = 'none';
            }, 5000);
        } else {
            errorContainer.style.display = 'none';
        }
    }

    /**
     * Переключить вкладку
     */
    function switchTab(tabName) {
        if (tabName === currentTab) return;
        currentTab = tabName;
        
        tabs.forEach(function(btn) {
            var isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        
        Object.keys(panels).forEach(function(key) {
            panels[key].classList.toggle('active', key === tabName);
        });
        
        showError(null);
        
        var firstInput = panels[tabName].querySelector('input:not([type="hidden"])');
        if (firstInput) {
            setTimeout(function() {
                firstInput.focus();
            }, 100);
        }
        
        if (tabName === 'register') {
            resetPasswordStrength();
        }
    }

    /**
     * Показать индикатор загрузки
     */
    function setLoading(button, loading) {
        var textSpan = button.querySelector('.btn-text');
        var loaderSpan = button.querySelector('.btn-loader');
        
        if (loading) {
            button.disabled = true;
            textSpan.textContent = 'Загрузка...';
            loaderSpan.style.display = 'inline-flex';
        } else {
            button.disabled = false;
            textSpan.textContent = button.dataset.originalText || textSpan.textContent;
            loaderSpan.style.display = 'none';
        }
    }

    /**
     * Валидация поля
     */
    function validateField(input, options) {
        options = options || {};
        var wrapper = input.closest('.input-wrapper');
        var hint = wrapper ? wrapper.parentElement.querySelector('.form-hint:not(.password-match-hint)') : null;
        
        if (!wrapper) return true;
        
        wrapper.classList.remove('error', 'success');
        if (hint) {
            hint.classList.remove('error', 'success');
        }
        
        var value = input.value.trim();
        var rules = {
            minLength: parseInt(input.minLength) || 0,
            maxLength: parseInt(input.maxLength) || Infinity,
            pattern: input.pattern || null,
            required: input.required || false
        };
        
        if (!rules.required && !value) {
            return true;
        }
        
        if (rules.required && !value) {
            wrapper.classList.add('error');
            if (hint) {
                hint.textContent = 'Это поле обязательно';
                hint.classList.add('error');
            }
            return false;
        }
        
        if (value && rules.minLength > 0 && value.length < rules.minLength) {
            wrapper.classList.add('error');
            if (hint) {
                hint.textContent = 'Минимум ' + rules.minLength + ' символов';
                hint.classList.add('error');
            }
            return false;
        }
        
        if (value && rules.maxLength < Infinity && value.length > rules.maxLength) {
            wrapper.classList.add('error');
            if (hint) {
                hint.textContent = 'Максимум ' + rules.maxLength + ' символов';
                hint.classList.add('error');
            }
            return false;
        }
        
        if (value && rules.pattern) {
            try {
                var regex = new RegExp(rules.pattern);
                if (!regex.test(value)) {
                    wrapper.classList.add('error');
                    if (hint) {
                        hint.textContent = 'Недопустимые символы';
                        hint.classList.add('error');
                    }
                    return false;
                }
            } catch (e) {
                // Если паттерн невалидный, пропускаем
            }
        }
        
        if (value) {
            wrapper.classList.add('success');
            if (hint && !hint.classList.contains('error')) {
                if (input.id === 'register-username') {
                    hint.textContent = 'Доступный логин';
                    hint.classList.add('success');
                } else if (input.id === 'register-password' && value.length >= 6) {
                    hint.textContent = 'Хороший пароль';
                    hint.classList.add('success');
                }
            }
        }
        
        return true;
    }

    /**
     * Проверка совпадения паролей
     */
    function checkPasswordMatch() {
        var password = registerPassword.value;
        var confirm = registerConfirm.value;
        var wrapper = registerConfirm.closest('.input-wrapper');
        
        if (!confirm) {
            wrapper.classList.remove('error', 'success');
            confirmHint.textContent = 'Повторите пароль для подтверждения';
            confirmHint.classList.remove('error', 'success');
            return true;
        }
        
        if (password === confirm) {
            wrapper.classList.remove('error');
            wrapper.classList.add('success');
            confirmHint.textContent = 'Пароли совпадают';
            confirmHint.classList.remove('error');
            confirmHint.classList.add('success');
            return true;
        } else {
            wrapper.classList.remove('success');
            wrapper.classList.add('error');
            confirmHint.textContent = 'Пароли не совпадают';
            confirmHint.classList.remove('success');
            confirmHint.classList.add('error');
            return false;
        }
    }

    /**
     * Оценка сложности пароля
     */
    function checkPasswordStrength(password) {
        var score = 0;
        
        if (password.length === 0) return 0;
        
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score <= 2) return 1;
        if (score <= 3) return 2;
        return 3;
    }

    /**
     * Обновление индикатора сложности пароля
     */
    function updatePasswordStrength(password) {
        var strength = checkPasswordStrength(password);
        
        strengthBars.forEach(function(bar, index) {
            bar.className = 'bar';
            if (index < strength) {
                if (strength === 1) bar.classList.add('weak');
                else if (strength === 2) bar.classList.add('medium');
                else if (strength === 3) bar.classList.add('strong');
            }
        });
        
        var hints = {
            0: 'Введите пароль',
            1: 'Слабый пароль',
            2: 'Средний пароль',
            3: 'Сильный пароль'
        };
        
        if (password.length > 0) {
            registerPasswordHint.textContent = hints[strength] || hints[0];
            registerPasswordHint.className = 'form-hint';
            if (strength === 1) registerPasswordHint.classList.add('error');
            else if (strength === 2) registerPasswordHint.classList.add('warning');
            else if (strength === 3) registerPasswordHint.classList.add('success');
        } else {
            registerPasswordHint.textContent = 'Минимум 6 символов';
            registerPasswordHint.className = 'form-hint';
        }
    }

    /**
     * Сброс индикатора сложности пароля
     */
    function resetPasswordStrength() {
        strengthBars.forEach(function(bar) {
            bar.className = 'bar';
        });
        registerPasswordHint.textContent = 'Минимум 6 символов';
        registerPasswordHint.className = 'form-hint';
    }

    /**
     * Валидация всей формы
     */
    function validateForm(form) {
        var isValid = true;
        var inputs = form.querySelectorAll('input:not([type="hidden"])');
        
        inputs.forEach(function(input) {
            if (input.id === 'register-confirm') return;
            
            var isInputValid = validateField(input);
            if (!isInputValid) isValid = false;
        });
        
        if (form.id === 'register-form') {
            var passwordsMatch = checkPasswordMatch();
            if (!passwordsMatch) isValid = false;
            
            if (termsCheck && !termsCheck.checked) {
                isValid = false;
                var label = termsCheck.closest('.checkbox-label');
                if (label) label.classList.add('error');
            } else if (termsCheck) {
                var label = termsCheck.closest('.checkbox-label');
                if (label) label.classList.remove('error');
            }
        }
        
        return isValid;
    }

    /**
     * Обработка отправки формы
     */
    async function handleSubmit(e) {
        e.preventDefault();
        var form = e.target;
        var button = form.querySelector('.submit-btn');
        
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.querySelector('.btn-text').textContent;
        }
        
        if (!validateForm(form)) {
            var firstError = form.querySelector('.input-wrapper.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                var input = firstError.querySelector('input');
                if (input) input.focus();
            }
            return;
        }
        
        setLoading(button, true);
        showError(null);
        
        try {
            var formData = new FormData(form);
            var response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            var result = await response.json();
            
            if (response.ok && result.success) {
                window.location.href = result.redirect || '/main_page';
            } else {
                showError(result.error || 'Произошла ошибка. Попробуйте снова.');
                setLoading(button, false);
            }
        } catch (err) {
            showError('Ошибка соединения с сервером. Проверьте подключение.');
            setLoading(button, false);
        }
    }

    // ---------- Обработчики событий ----------

    // Переключение вкладок
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Кнопки переключения
    switchBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.switchTo);
        });
    });

    // Показать/скрыть пароль (PNG иконка)
    togglePasswordBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var input = this.closest('.input-wrapper').querySelector('input');
            var img = this.querySelector('.eye-icon');
            
            if (input && img) {
                var isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                
                // Меняем opacity для визуальной обратной связи
                img.style.opacity = isPassword ? '1' : '0.4';
            }
        });
    });

    // Валидация на ввод
    document.querySelectorAll('.input-wrapper input').forEach(function(input) {
        input.addEventListener('blur', function() {
            if (this.value.trim()) {
                validateField(this);
            }
        });
        
        input.addEventListener('input', function() {
            if (this.id === 'register-password') {
                updatePasswordStrength(this.value);
                if (registerConfirm.value) {
                    checkPasswordMatch();
                }
                validateField(this);
            } else if (this.id === 'register-confirm') {
                checkPasswordMatch();
            } else if (this.id === 'register-username') {
                validateField(this);
            } else {
                var wrapper = this.closest('.input-wrapper');
                if (wrapper && wrapper.classList.contains('error')) {
                    wrapper.classList.remove('error');
                    var hint = wrapper.parentElement.querySelector('.form-hint');
                    if (hint) {
                        hint.textContent = '';
                        hint.classList.remove('error');
                    }
                }
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                var form = this.closest('form');
                if (form) {
                    e.preventDefault();
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });
    });

    // Чекбокс условий
    if (termsCheck) {
        termsCheck.addEventListener('change', function() {
            var label = this.closest('.checkbox-label');
            if (this.checked) {
                if (label) label.classList.remove('error');
            }
        });
    }

    // Отправка форм
    if (loginForm) loginForm.addEventListener('submit', handleSubmit);
    if (registerForm) registerForm.addEventListener('submit', handleSubmit);

    // ---------- Инициализация ----------

    // Установка вкладки из URL
    var urlParams = new URLSearchParams(window.location.search);
    var tabParam = urlParams.get('tab');
    if (tabParam && (tabParam === 'login' || tabParam === 'register')) {
        switchTab(tabParam);
    }

    // Фокус на первое поле
    setTimeout(function() {
        var firstInput = document.querySelector('.auth-panel.active input:not([type="hidden"])');
        if (firstInput) firstInput.focus();
    }, 200);

    // Flash-сообщения
    var flashMessage = document.querySelector('[data-flash]');
    if (flashMessage) {
        showError(flashMessage.dataset.flash);
    }

    // ============================================================
    // ФИКС ПРОБЛЕМЫ С БЕЛЫМ ПОЛЕМ ВВОДА (автозаполнение)
    // ============================================================

    function fixInputStyle(input) {
        if (!input) return;
        
        var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        input.style.backgroundColor = isDark ? '#374151' : '#f8f9fa';
        input.style.color = isDark ? '#f9fafb' : '#1a1a2e';
        input.style.webkitTextFillColor = isDark ? '#f9fafb' : '#1a1a2e';
    }
    
    function handleInputField(input) {
        // При вводе
        input.addEventListener('input', function() {
            var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.style.color = isDark ? '#f9fafb' : '#1a1a2e';
            this.style.webkitTextFillColor = isDark ? '#f9fafb' : '#1a1a2e';
            
            if (this.value === '') {
                this.style.backgroundColor = isDark ? '#374151' : '#f8f9fa';
            }
        });
        
        // При фокусе
        input.addEventListener('focus', function() {
            var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.style.backgroundColor = isDark ? '#4a5568' : '#ffffff';
            this.style.color = isDark ? '#f9fafb' : '#1a1a2e';
            this.style.webkitTextFillColor = isDark ? '#f9fafb' : '#1a1a2e';
        });
        
        // При потере фокуса
        input.addEventListener('blur', function() {
            fixInputStyle(this);
        });
        
        // При загрузке
        setTimeout(function() {
            fixInputStyle(input);
        }, 100);
        
        // Проверка каждые 500 мс (для автозаполнения)
        setInterval(function() {
            if (document.activeElement !== input && input.value !== '') {
                fixInputStyle(input);
            }
        }, 500);
    }
    
    // Применяем ко всем полям ввода
    document.addEventListener('DOMContentLoaded', function() {
        var inputs = document.querySelectorAll('.input-wrapper input');
        inputs.forEach(function(input) {
            handleInputField(input);
        });
        
        // Наблюдатель за изменениями в DOM
        var observer = new MutationObserver(function() {
            var newInputs = document.querySelectorAll('.input-wrapper input:not([data-fixed])');
            newInputs.forEach(function(input) {
                input.setAttribute('data-fixed', 'true');
                handleInputField(input);
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
    
    // Отслеживание изменения темы
    var darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMedia.addEventListener('change', function() {
        var inputs = document.querySelectorAll('.input-wrapper input');
        inputs.forEach(function(input) {
            fixInputStyle(input);
        });
    });

    console.log('Auth page initialized');

})();