(function() {
    'use strict';

    // DOM
    var tabs = document.querySelectorAll('.tab-btn');
    var panels = {
        login: document.getElementById('login-panel'),
        register: document.getElementById('register-panel')
    };
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    var errorEl = document.getElementById('auth-error');
    var errorText = errorEl ? errorEl.querySelector('.error-text') : null;
    var toggleBtns = document.querySelectorAll('.toggle-password');
    var switchBtns = document.querySelectorAll('.switch-btn');

    var regPass = document.getElementById('register-password');
    var regConfirm = document.getElementById('register-confirm');
    var termsCheck = document.getElementById('terms-check');
    var confirmHint = document.getElementById('confirm-hint');
    var passHint = document.getElementById('register-password-hint');
    var bars = [
        document.getElementById('s1'),
        document.getElementById('s2'),
        document.getElementById('s3')
    ];

    var currentTab = 'login';

    // Показать ошибку
    function showError(msg) {
        if (!errorEl) return;
        if (msg) {
            errorText.textContent = msg;
            errorEl.style.display = 'flex';
            clearTimeout(window._errTimeout);
            window._errTimeout = setTimeout(function() { errorEl.style.display = 'none'; }, 5000);
        } else {
            errorEl.style.display = 'none';
        }
    }

    // Переключить вкладку
    function switchTab(name) {
        if (name === currentTab) return;
        currentTab = name;
        tabs.forEach(function(b) {
            var active = b.dataset.tab === name;
            b.classList.toggle('active', active);
        });
        Object.keys(panels).forEach(function(k) {
            panels[k].classList.toggle('active', k === name);
        });
        showError(null);
        var first = panels[name].querySelector('input:not([type="hidden"])');
        if (first) setTimeout(function() { first.focus(); }, 100);
        if (name === 'register') resetStrength();
    }

    // Загрузка
    function setLoading(btn, loading) {
        var text = btn.querySelector('.btn-text');
        var loader = btn.querySelector('.btn-loader');
        if (loading) {
            btn.disabled = true;
            text.textContent = 'Загрузка...';
            loader.style.display = 'inline-flex';
        } else {
            btn.disabled = false;
            text.textContent = btn.dataset.orig || text.textContent;
            loader.style.display = 'none';
        }
    }

    // Валидация поля
    function validateField(input) {
        var wrap = input.closest('.input-wrapper');
        if (!wrap) return true;
        wrap.classList.remove('error', 'success');

        var val = input.value.trim();
        var min = parseInt(input.minLength) || 0;
        var max = parseInt(input.maxLength) || 0;
        var req = input.required || false;

        if (!req && !val) return true;
        if (req && !val) { wrap.classList.add('error'); return false; }
        if (val && min > 0 && val.length < min) { wrap.classList.add('error'); return false; }
        if (val && max > 0 && val.length > max) { wrap.classList.add('error'); return false; }

        if (val) wrap.classList.add('success');
        return true;
    }

    // Проверка паролей
    function checkMatch() {
        var wrap = regConfirm.closest('.input-wrapper');
        if (!regConfirm.value) {
            wrap.classList.remove('error', 'success');
            confirmHint.textContent = 'Повторите пароль';
            confirmHint.className = 'form-hint';
            return true;
        }
        if (regPass.value === regConfirm.value) {
            wrap.classList.remove('error');
            wrap.classList.add('success');
            confirmHint.textContent = 'Пароли совпадают';
            confirmHint.className = 'form-hint success';
            return true;
        } else {
            wrap.classList.remove('success');
            wrap.classList.add('error');
            confirmHint.textContent = 'Пароли не совпадают';
            confirmHint.className = 'form-hint error';
            return false;
        }
    }

    // Сложность пароля
    function checkStrength(pass) {
        if (!pass) return 0;
        var s = 0;
        if (pass.length >= 6) s++;
        if (pass.length >= 10) s++;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) s++;
        if (/\d/.test(pass)) s++;
        if (/[^A-Za-z0-9]/.test(pass)) s++;
        return s <= 2 ? 1 : s <= 3 ? 2 : 3;
    }

    function updateStrength(pass) {
        var st = checkStrength(pass);
        bars.forEach(function(b, i) {
            b.className = 'bar';
            if (i < st) {
                if (st === 1) b.classList.add('weak');
                else if (st === 2) b.classList.add('medium');
                else if (st === 3) b.classList.add('strong');
            }
        });
        var hints = ['Введите пароль', 'Слабый', 'Средний', 'Сильный'];
        if (pass.length > 0) {
            passHint.textContent = hints[st] || hints[0];
            passHint.className = 'form-hint ' + (st === 1 ? 'error' : st === 2 ? 'warning' : 'success');
        } else {
            passHint.textContent = 'Минимум 6 символов';
            passHint.className = 'form-hint';
        }
    }

    function resetStrength() {
        bars.forEach(function(b) { b.className = 'bar'; });
        passHint.textContent = 'Минимум 6 символов';
        passHint.className = 'form-hint';
    }

    // Валидация формы
    function validateForm(form) {
        var valid = true;
        form.querySelectorAll('input:not([type="hidden"])').forEach(function(inp) {
            if (inp.id === 'register-confirm') return;
            if (!validateField(inp)) valid = false;
        });
        if (form.id === 'register-form') {
            if (!checkMatch()) valid = false;
            if (termsCheck && !termsCheck.checked) {
                valid = false;
                var lbl = termsCheck.closest('.checkbox-label');
                if (lbl) lbl.classList.add('error');
            }
        }
        return valid;
    }

    // Отправка
    async function handleSubmit(e) {
        e.preventDefault();
        var form = e.target;
        var btn = form.querySelector('.submit-btn');
        if (!btn.dataset.orig) btn.dataset.orig = btn.querySelector('.btn-text').textContent;

        if (!validateForm(form)) {
            var err = form.querySelector('.input-wrapper.error');
            if (err) { err.scrollIntoView({ behavior: 'smooth', block: 'center' });
                var inp = err.querySelector('input'); if (inp) inp.focus(); }
            return;
        }

        setLoading(btn, true);
        showError(null);

        try {
            var fd = new FormData(form);
            var res = await fetch(form.action, {
                method: form.method,
                body: fd,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            var data = await res.json();
            if (res.ok && data.success) {
                window.location.href = data.redirect || '/main_page';
            } else {
                showError(data.error || 'Ошибка. Попробуйте снова.');
                setLoading(btn, false);
            }
        } catch (err) {
            showError('Ошибка соединения с сервером.');
            setLoading(btn, false);
        }
    }

    // ---------- События ----------

    tabs.forEach(function(t) {
        t.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });

    switchBtns.forEach(function(b) {
        b.addEventListener('click', function() { switchTab(this.dataset.switchTo); });
    });

    // Показать/скрыть пароль
    toggleBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var inp = this.closest('.input-wrapper').querySelector('input');
            var img = this.querySelector('.eye-icon');
            if (inp && img) {
                var hidden = inp.type === 'password';
                inp.type = hidden ? 'text' : 'password';
                img.style.opacity = hidden ? '1' : '0.4';
            }
        });
    });

    // Ввод
    document.querySelectorAll('.input-wrapper input').forEach(function(inp) {
        inp.addEventListener('blur', function() { if (this.value.trim()) validateField(this); });

        inp.addEventListener('input', function() {
            if (this.id === 'register-password') {
                updateStrength(this.value);
                if (regConfirm.value) checkMatch();
                validateField(this);
            } else if (this.id === 'register-confirm') {
                checkMatch();
            } else {
                var w = this.closest('.input-wrapper');
                if (w && w.classList.contains('error')) {
                    w.classList.remove('error');
                }
            }
        });

        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                var f = this.closest('form');
                if (f) { e.preventDefault(); f.dispatchEvent(new Event('submit')); }
            }
        });
    });

    if (termsCheck) {
        termsCheck.addEventListener('change', function() {
            var lbl = this.closest('.checkbox-label');
            if (this.checked && lbl) lbl.classList.remove('error');
        });
    }

    if (loginForm) loginForm.addEventListener('submit', handleSubmit);
    if (registerForm) registerForm.addEventListener('submit', handleSubmit);

    // ---------- Инициализация ----------

    var url = new URLSearchParams(window.location.search);
    var tab = url.get('tab');
    if (tab && (tab === 'login' || tab === 'register')) switchTab(tab);

    setTimeout(function() {
        var first = document.querySelector('.auth-panel.active input:not([type="hidden"])');
        if (first) first.focus();
    }, 200);

    console.log('Auth ready');

})();