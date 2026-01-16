// profile.js - УПРОЩЕННЫЙ ПРОФИЛЬ
document.addEventListener('DOMContentLoaded', function() {
    // Всегда разрешаем доступ к профилю
    const user = getUser();

    if (!user) {
        // Если пользователя нет, создаем временного на основе сохраненного профиля
        createGuestUser();
    }

    initProfile();

    function initProfile() {
        loadUserProfile();
        setupTabs();
        setupEventListeners();
    }

    function getUser() {
        try {
            const userData = localStorage.getItem('campusHub_user');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            return null;
        }
    }

    function createGuestUser() {
        // Пробуем взять данные из сохраненного профиля
        const savedProfile = localStorage.getItem('campusHub_profile');
        let userData = {
            email: 'guest@example.com',
            name: 'Гость',
            faculty: '',
            registeredAt: new Date().toISOString(),
            isActive: true,
            isGuest: true
        };

        if (savedProfile) {
            try {
                const profile = JSON.parse(savedProfile);
                userData.email = profile.email || userData.email;
                userData.name = profile.name || userData.name;
                userData.faculty = profile.faculty || userData.faculty;
            } catch (e) {
                console.warn('Не удалось загрузить профиль:', e);
            }
        }

        localStorage.setItem('campusHub_user', JSON.stringify(userData));
        return userData;
    }

    // Загрузка данных профиля
    async function loadUserProfile() {
        displayUserInfo();
        await loadUserProjects();
        await loadUserStats();
        await loadUserActivity();
    }

    // Отображение информации пользователя
    function displayUserInfo() {
        const user = getUser();

        document.getElementById('userName').textContent = user.name || 'Пользователь';
        document.getElementById('userEmail').textContent = user.email || '';

        // Аватар
        const avatar = document.getElementById('userAvatar');
        const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        avatar.textContent = firstLetter;

        // Статус
        const verificationBadge = document.getElementById('verificationBadge');
        if (user.isGuest) {
            verificationBadge.innerHTML = `
                <span class="verification-badge not-verified">
                    <i class="fas fa-user-clock"></i> Гостевой режим
                </span>
            `;
        } else {
            verificationBadge.innerHTML = `
                <span class="verification-badge verified">
                    <i class="fas fa-user-check"></i> Активный пользователь
                </span>
            `;
        }

        // Заполняем поля формы
        if (user.name) {
            document.getElementById('updateName').value = user.name;
        }
        if (user.faculty) {
            document.getElementById('updateFaculty').value = user.faculty;
        }
    }

    // Загрузка проектов пользователя
    async function loadUserProjects() {
        try {
            const user = getUser();
            const { data: projects, error } = await window.db
                .from('projects')
                .select('*')
                .eq('author_email', user.email)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const container = document.getElementById('myProjectsList');
            if (!projects || projects.length === 0) {
                return;
            }

            container.innerHTML = projects.map(project => `
                <div class="project-card">
                    <div class="project-image" style="background-image: url('${project.image_url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'}');">
                        ${project.needs_team ? '<div class="team-badge"><i class="fas fa-users"></i> Ищет команду</div>' : ''}
                    </div>
                    <div class="project-content">
                        <h3 class="project-title">${escapeHtml(project.title)}</h3>
                        <p class="project-description">${escapeHtml(project.description.substring(0, 100))}...</p>
                        <div class="progress-section">
                            <div class="progress-label">
                                <span>Собрано</span>
                                <span class="progress-amount">${(project.collected_amount || 0).toLocaleString()}₽ из ${(project.target_amount || 0).toLocaleString()}₽</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${project.target_amount > 0 ? Math.min((project.collected_amount / project.target_amount) * 100, 100) : 0}%"></div>
                            </div>
                        </div>
                        <div class="project-footer">
                            <div class="days-left">
                                <i class="fas fa-clock"></i> ${project.status === 'active' ? 'Активный' : project.status === 'moderation' ? 'На модерации' : 'Отклонен'}
                            </div>
                            <a href="project.html?id=${project.id}" class="btn-support">
                                Открыть <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `).join('');

            document.getElementById('projectsCount').textContent = projects.length;

        } catch (error) {
            console.error('Ошибка загрузки проектов:', error);
        }
    }

    // Загрузка статистики
    async function loadUserStats() {
        try {
            const user = getUser();

            // Подсчет поддержанных проектов
            const { data: supporters, error } = await window.db
                .from('supporters')
                .select('amount')
                .eq('supporter_email', user.email);

            if (!error && supporters) {
                const totalDonated = supporters.reduce((sum, s) => sum + (s.amount || 0), 0);
                document.getElementById('supportedCount').textContent = supporters.length;
                document.getElementById('totalDonated').textContent = `${totalDonated.toLocaleString()} ₽`;
            }

            // Подсчет комментариев
            const { data: comments, error: commentsError } = await window.db
                .from('comments')
                .select('id')
                .eq('author_email', user.email);

            if (!commentsError && comments) {
                document.getElementById('commentsCount').textContent = comments.length;
            }

        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }

    // Загрузка активности
    async function loadUserActivity() {
        try {
            const user = getUser();
            const container = document.getElementById('activityList');

            // Если гость - показываем только приветствие
            if (user.isGuest) {
                container.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="activity-content">
                            <h4>Гостевой режим</h4>
                            <p>Создайте проект чтобы получить полный доступ к статистике</p>
                            <div class="activity-date">Сегодня</div>
                        </div>
                    </div>
                `;
                return;
            }

            // ... остальной код загрузки активности ...

        } catch (error) {
            console.error('Ошибка загрузки активности:', error);
        }
    }

    // Настройка вкладок
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                document.getElementById(`${tab}Tab`).classList.add('active');
            });
        });
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        // Обновление профиля
        document.getElementById('updateProfileBtn').addEventListener('click', updateProfile);

        // Выход
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Убираем всё связанное с email подтверждением
        const emailSection = document.querySelector('.verification-status');
        if (emailSection) {
            emailSection.style.display = 'none';
        }
    }

    // Обновление профиля
    async function updateProfile() {
        const name = document.getElementById('updateName').value.trim();
        const faculty = document.getElementById('updateFaculty').value;
        const updateBtn = document.getElementById('updateProfileBtn');
        const messageDiv = document.getElementById('updateMessage');

        if (!name) {
            showMessage('Введите имя', 'error');
            return;
        }

        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

        try {
            const user = getUser();
            user.name = name;
            user.faculty = faculty;

            // Сохраняем в localStorage
            localStorage.setItem('campusHub_user', JSON.stringify(user));

            // Сохраняем для автозаполнения
            localStorage.setItem('campusHub_profile', JSON.stringify({
                name: name,
                email: user.email,
                faculty: faculty,
                lastUpdated: new Date().toISOString()
            }));

            // Обновляем интерфейс
            displayUserInfo();

            // Показываем сообщение
            showMessage('Профиль успешно обновлен!', 'success');

            updateBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';

        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            showMessage('Не удалось обновить профиль', 'error');
            updateBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
        }
    }

    // Выход из аккаунта
    function logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('campusHub_user');
            window.location.href = 'index.html';
        }
    }

    function showMessage(message, type = 'success') {
        const messageDiv = document.getElementById('updateMessage');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.style.color = type === 'success' ? '#155724' : '#721C24';
            messageDiv.style.backgroundColor = type === 'success' ? '#D4EDDA' : '#F8D7DA';
            messageDiv.style.padding = '10px 15px';
            messageDiv.style.borderRadius = '8px';
            messageDiv.style.marginTop = '15px';
            messageDiv.style.display = 'block';

            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});