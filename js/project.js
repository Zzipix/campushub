// project.js - страница проекта с обновленным списком сторонников
document.addEventListener('DOMContentLoaded', function () {
    // Убираем console.log загрузки
    // console.log('📄 Загрузка страницы проекта...');

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        showError('Проект не найден');
        return;
    }

    // console.log(`🔍 Загружаем проект #${projectId}`);

    if (!window.db) {
        showError('База данных не подключена');
        return;
    }

    loadProject(projectId);
    initSupportForm(projectId);
    initModalListeners();

    // ============ ФУНКЦИИ ============

    // Загрузка данных проекта
    async function loadProject(id) {
        try {
            const { data: project, error } = await window.db
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!project) {
                showError('Проект не найден');
                return;
            }

            // console.log('✅ Проект загружен:', project.title);
            displayProject(project);
            loadSupporters(id);

        } catch (error) {
            // console.error('Ошибка загрузки проекта:', error);
            showError('Не удалось загрузить проект');
        }
    }

    // Отображение проекта
    function displayProject(project) {
        document.getElementById('projectTitle').textContent = project.title;
        document.getElementById('projectAuthor').textContent = project.author_name;
        document.getElementById('projectFaculty').textContent = project.author_faculty;
        document.getElementById('projectDate').textContent = formatDate(project.created_at);
        document.getElementById('projectStatus').textContent = getStatusText(project.status);
        document.getElementById('projectDescription').innerHTML = formatDescription(project.description);

        const collected = project.collected_amount || 0;
        const target = project.target_amount || 1;
        const progress = Math.min(Math.round((collected / target) * 100), 100);

        document.getElementById('collectedAmount').textContent = `${collected.toLocaleString()} ₽`;
        document.getElementById('targetAmount').textContent = `${target.toLocaleString()} ₽`;
        document.getElementById('progressFill').style.width = `${progress}%`;

        if (project.deadline) {
            const days = calculateDaysLeft(project.deadline);
            document.getElementById('daysLeft').textContent = days > 0 ? days : '0';
        } else {
            document.getElementById('daysLeft').textContent = '30';
        }

        if (project.image_url) {
            document.getElementById('projectImage').style.backgroundImage = `url('${project.image_url}')`;
        }

        displayTeam(project);
        displayBudget(project);
    }

    // Отображение команды проекта
    function displayTeam(project) {
        const teamSection = document.getElementById('teamSection');
        const teamGrid = document.getElementById('teamGrid');

        try {
            let teamMembers = [];

            if (project.team_members) {
                teamMembers = JSON.parse(project.team_members);
            }

            if (project.author_name) {
                teamMembers.unshift({
                    name: project.author_name,
                    role: 'Автор проекта',
                    faculty: project.author_faculty,
                    contacts: project.author_email
                });
            }

            if (teamMembers.length > 0) {
                teamSection.style.display = 'block';
                teamGrid.innerHTML = teamMembers.map(member => `
                    <div class="team-member">
                        <div class="team-avatar">${(member.name || 'А').charAt(0).toUpperCase()}</div>
                        <h4>${escapeHtml(member.name || 'Не указано')}</h4>
                        <p style="color: #4361EE; font-weight: 600;">${escapeHtml(member.role || 'Участник')}</p>
                        <p style="color: #666; font-size: 0.9rem;">${escapeHtml(member.faculty || '')}</p>
                        ${member.contacts ? `<p style="color: #888; font-size: 0.8rem; margin-top: 5px;">
                            <i class="fas fa-envelope"></i> ${escapeHtml(member.contacts)}
                        </p>` : ''}
                    </div>
                `).join('');
            } else {
                teamSection.style.display = 'none';
            }

        } catch (error) {
            // console.warn('Ошибка парсинга команды:', error);
            teamSection.style.display = 'none';
        }
    }

    // Отображение бюджета проекта
    function displayBudget(project) {
        const budgetItems = document.getElementById('budgetItems');

        try {
            let budgetList = [];

            if (project.budget_items) {
                budgetList = JSON.parse(project.budget_items);
            }

            if (budgetList.length > 0) {
                budgetItems.innerHTML = budgetList.map(item => `
                    <div style="margin-bottom: 15px; padding: 20px; background: #F8F9FA; border-radius: 10px; border-left: 4px solid #4CC9F0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="font-weight: 600; font-size: 1.1rem;">${escapeHtml(item.description)}</span>
                            <span style="color: #4361EE; font-weight: 700; font-size: 1.2rem;">${(item.amount || 0).toLocaleString()} ₽</span>
                        </div>
                        <div style="background: #E8E8E8; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: 100%; height: 100%; background: #4CC9F0;"></div>
                        </div>
                    </div>
                `).join('');
            } else {
                budgetItems.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #666;">
                        <i class="fas fa-chart-pie" style="font-size: 2rem; margin-bottom: 15px; color: #4CC9F0;"></i>
                        <h3 style="color: #4361EE; margin-bottom: 10px;">Общая цель сбора</h3>
                        <p style="font-size: 1.5rem; font-weight: 700; color: #F72585;">
                            ${(project.target_amount || 0).toLocaleString()} ₽
                        </p>
                        <p style="margin-top: 10px;">Бюджет не детализирован автором проекта</p>
                    </div>
                `;
            }

        } catch (error) {
            // console.warn('Ошибка парсинга бюджета:', error);
            budgetItems.innerHTML = '<p style="color: #888; text-align: center;">Информация о бюджете недоступна</p>';
        }
    }

    // Инициализация слушателей модальных окон
    function initModalListeners() {
        const showAllBtn = document.getElementById('showAllSupportersBtn');
        const closeModalBtn = document.getElementById('closeAllSupportersBtn');

        if (showAllBtn) {
            showAllBtn.addEventListener('click', showAllSupportersModal);
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('allSupportersModal').style.display = 'none';
            });
        }
    }

    // Загрузка списка поддержавших
    async function loadSupporters(projectId) {
        const recentSupporters = document.getElementById('recentSupporters');
        const supportersCountDisplay = document.getElementById('supportersCountDisplay');
        const supportersCountElement = document.getElementById('supportersCount');
        const viewAllSupporters = document.getElementById('viewAllSupporters');

        try {
            // Пробуем загрузить из базы
            const { data: supporters, error } = await window.db
                .from('supporters')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                // Используем демо-данные из localStorage
                const demoSupporters = getDemoSupporters(projectId);
                displayRecentSupporters(demoSupporters, recentSupporters, supportersCountDisplay, supportersCountElement);
                return;
            }

            displayRecentSupporters(supporters || [], recentSupporters, supportersCountDisplay, supportersCountElement);

            // Показываем кнопку "Показать всех" если сторонников больше 3
            if ((supporters?.length || 0) > 3) {
                viewAllSupporters.style.display = 'block';
            }

        } catch (err) {
            // console.error('Ошибка загрузки сторонников:', err);
            const demoSupporters = getDemoSupporters(projectId);
            displayRecentSupporters(demoSupporters, recentSupporters, supportersCountDisplay, supportersCountElement);
        }
    }

    // Отображение последних 3 сторонников
    function displayRecentSupporters(supporters, container, counterDisplay, progressCounter) {
        if (!container) return;

        // Обновляем счетчики
        const supportersCount = supporters.length;
        if (counterDisplay) {
            counterDisplay.textContent = supportersCount;
        }
        if (progressCounter) {
            progressCounter.textContent = supportersCount;
        }

        if (!supporters || supporters.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #888;">
                    <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Пока никто не поддержал</p>
                </div>
            `;
            return;
        }

        // Берем только последние 3
        const recent = supporters.slice(0, 3);

        container.innerHTML = recent.map(supporter => {
            const name = supporter.is_anonymous || !supporter.supporter_name ? 'Аноним' : supporter.supporter_name;
            const firstLetter = name.charAt(0).toUpperCase();
            const amount = supporter.amount || 0;
            const date = supporter.created_at ? formatDate(supporter.created_at) : 'Сегодня';

            return `
                <div class="supporter-card">
                    <div class="supporter-avatar">${firstLetter}</div>
                    <div class="supporter-info">
                        <h4 title="${escapeHtml(name)}">${escapeHtml(name)}</h4>
                        <p title="${date}">${date}</p>
                    </div>
                    <div class="supporter-amount" title="${amount.toLocaleString()} ₽">
                        ${amount.toLocaleString()} ₽
                    </div>
                </div>
            `;
        }).join('');
    }

    // Показать модальное окно со всеми сторонниками
    async function showAllSupportersModal() {
        const modal = document.getElementById('allSupportersModal');
        const allSupportersList = document.getElementById('allSupportersList');
        const projectId = new URLSearchParams(window.location.search).get('id');

        if (!modal || !allSupportersList || !projectId) return;

        try {
            let allSupporters = [];

            if (window.db) {
                const { data: supporters, error } = await window.db
                    .from('supporters')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false });

                if (!error && supporters) {
                    allSupporters = supporters;
                }
            }

            if (allSupporters.length === 0) {
                allSupporters = getDemoSupporters(projectId);
            }

            if (allSupporters.length === 0) {
                allSupportersList.innerHTML = `
                    <div class="no-supporters-message">
                        <i class="fas fa-users"></i>
                        <h4>Пока никто не поддержал</h4>
                        <p>Будьте первым!</p>
                    </div>
                `;
            } else {
                allSupportersList.innerHTML = allSupporters.map(supporter => {
                    const name = supporter.is_anonymous || !supporter.supporter_name ? 'Аноним' : supporter.supporter_name;
                    const firstLetter = name.charAt(0).toUpperCase();
                    const amount = supporter.amount || 0;
                    const date = supporter.created_at ? formatDate(supporter.created_at) : 'Сегодня';

                    return `
                        <div class="all-supporter-item">
                            <div class="all-supporter-avatar">${firstLetter}</div>
                            <div class="all-supporter-info">
                                <h4>${escapeHtml(name)}</h4>
                                <p>${date}</p>
                            </div>
                            <div class="all-supporter-amount">${amount.toLocaleString()} ₽</div>
                        </div>
                    `;
                }).join('');
            }

            modal.style.display = 'flex';

            modal.addEventListener('click', function (e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });

        } catch (error) {
            // console.error('Ошибка загрузки всех сторонников:', error);
            allSupportersList.innerHTML = `
                <div class="no-supporters-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Ошибка загрузки</h4>
                    <p>Не удалось загрузить список сторонников</p>
                </div>
            `;
            modal.style.display = 'flex';
        }
    }

    // Инициализация формы поддержки
    function initSupportForm(projectId) {
        const amountBtns = document.querySelectorAll('.amount-btn');
        const customAmountSection = document.getElementById('customAmountSection');
        const customAmountInput = document.getElementById('customAmount');
        const supportBtn = document.getElementById('supportBtn');

        let selectedAmount = 500;

        if (amountBtns.length > 0) {
            amountBtns[1].classList.add('active');
        }

        amountBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                amountBtns.forEach(b => b.classList.remove('active'));

                if (this.dataset.amount === 'custom') {
                    this.classList.add('active');
                    customAmountSection.style.display = 'block';
                    customAmountInput.focus();
                    selectedAmount = null;
                } else {
                    this.classList.add('active');
                    customAmountSection.style.display = 'none';
                    selectedAmount = parseInt(this.dataset.amount);
                }
            });
        });

        customAmountInput.addEventListener('input', function () {
            selectedAmount = parseInt(this.value) || null;
        });

        supportBtn.addEventListener('click', async function () {
            if (!selectedAmount || selectedAmount < 10) {
                showNotification('Пожалуйста, выберите или введите сумму не менее 10 ₽', 'error');
                return;
            }

            if (selectedAmount > 1000000) {
                showNotification('Сумма не может превышать 1 000 000 ₽', 'error');
                return;
            }

            const supporterName = prompt('Введите ваше имя (или оставьте пустым для анонимного пожертвования):', '');

            if (supporterName === null) {
                return;
            }

            supportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
            supportBtn.disabled = true;

            try {
                await updateProjectAmount(projectId, selectedAmount);
                await addSupporterRecord(projectId, selectedAmount, supporterName);
                showSuccessModal(selectedAmount, supporterName);
                await reloadProjectData(projectId);
                showNotification(`Вы успешно поддержали проект на ${selectedAmount.toLocaleString()} ₽!`, 'success');

            } catch (error) {
                // console.error('Ошибка поддержки проекта:', error);
                showNotification('Произошла ошибка. Пожалуйста, попробуйте позже.', 'error');
            } finally {
                supportBtn.innerHTML = '<i class="fas fa-heart"></i> Поддержать проект';
                supportBtn.disabled = false;
            }
        });
    }

    // Обновление суммы сбора в проекте
    async function updateProjectAmount(projectId, amount) {
        try {
            const { data: project, error: getError } = await window.db
                .from('projects')
                .select('collected_amount')
                .eq('id', projectId)
                .single();

            const currentAmount = project?.collected_amount || 0;
            const newAmount = currentAmount + amount;

            const { error: updateError } = await window.db
                .from('projects')
                .update({ collected_amount: newAmount })
                .eq('id', projectId);

            if (updateError) {
                updateUIAmount(newAmount);
                return true;
            }

            return true;

        } catch (error) {
            // console.error('Ошибка обновления суммы:', error);
            throw error;
        }
    }

    // Обновление суммы на UI
    function updateUIAmount(newAmount) {
        const collectedElement = document.getElementById('collectedAmount');
        const progressFill = document.getElementById('progressFill');

        if (collectedElement) {
            collectedElement.textContent = `${newAmount.toLocaleString()} ₽`;
        }

        const targetElement = document.getElementById('targetAmount');
        if (targetElement && progressFill) {
            const targetText = targetElement.textContent.replace(' ₽', '').replace(/\s/g, '');
            const targetAmount = parseInt(targetText) || 1;
            const progress = Math.min(Math.round((newAmount / targetAmount) * 100), 100);
            progressFill.style.width = `${progress}%`;
        }
    }

    // Добавление записи о поддержке
    async function addSupporterRecord(projectId, amount, name) {
        try {
            const { data, error } = await window.db
                .from('supporters')
                .insert([{
                    project_id: projectId,
                    amount: amount,
                    supporter_name: name || null,
                    is_anonymous: !name,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) {
                // console.warn('⚠️ Не удалось сохранить в базу сторонников:', error.message);
            }

            const supporter = {
                supporter_name: name || null,
                amount: amount,
                is_anonymous: !name,
                created_at: new Date().toISOString()
            };

            saveDemoSupporter(projectId, supporter);
            await reloadProjectData(projectId);

            return true;

        } catch (error) {
            // console.error('❌ Ошибка добавления записи:', error);
            const supporter = {
                supporter_name: name || null,
                amount: amount,
                is_anonymous: !name,
                created_at: new Date().toISOString()
            };
            saveDemoSupporter(projectId, supporter);
            await reloadProjectData(projectId);
            return true;
        }
    }

    // Перезагрузка данных проекта
    async function reloadProjectData(projectId) {
        try {
            const { data: project, error } = await window.db
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (!error && project) {
                const collected = project.collected_amount || 0;
                const target = project.target_amount || 1;
                const progress = Math.min(Math.round((collected / target) * 100), 100);

                document.getElementById('collectedAmount').textContent = `${collected.toLocaleString()} ₽`;
                document.getElementById('progressFill').style.width = `${progress}%`;
            }

            await loadSupporters(projectId);

        } catch (error) {
            // console.warn('Ошибка перезагрузки данных:', error);
        }
    }

    // Показ модального окна успеха
    function showSuccessModal(amount, name) {
        const modal = document.getElementById('successModal');
        const message = document.getElementById('successMessage');
        const closeBtn = document.getElementById('closeModalBtn');

        if (!modal || !message) return;

        message.innerHTML = `Вы успешно поддержали проект на <strong>${amount.toLocaleString()} ₽</strong>.`;

        modal.style.display = 'flex';

        const closeModal = function () {
            modal.style.display = 'none';
            closeBtn.removeEventListener('click', closeModal);
            modal.removeEventListener('click', outsideClick);
        };

        const outsideClick = function (e) {
            if (e.target === modal) {
                closeModal();
            }
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', outsideClick);
    }

    // Вспомогательные функции
    function getDemoSupporters(projectId) {
        try {
            const savedSupporters = localStorage.getItem(`campusHub_supporters_${projectId}`);
            if (savedSupporters) {
                return JSON.parse(savedSupporters);
            }
        } catch (e) {
            // console.warn('Ошибка чтения из localStorage:', e);
        }

        return [
            { supporter_name: 'Иван Иванов', amount: 1000, created_at: new Date(Date.now() - 3600000).toISOString() },
            { supporter_name: 'Мария Соколова', amount: 500, created_at: new Date(Date.now() - 7200000).toISOString() },
            { supporter_name: null, amount: 2000, is_anonymous: true, created_at: new Date(Date.now() - 10800000).toISOString() },
            { supporter_name: 'Алексей Петров', amount: 300, created_at: new Date(Date.now() - 14400000).toISOString() },
            { supporter_name: 'Елена Васильева', amount: 1500, created_at: new Date(Date.now() - 18000000).toISOString() },
        ];
    }

    function saveDemoSupporter(projectId, supporter) {
        try {
            const supporters = getDemoSupporters(projectId);
            supporters.unshift(supporter);
            const toSave = supporters.slice(0, 20);
            localStorage.setItem(`campusHub_supporters_${projectId}`, JSON.stringify(toSave));
            return true;
        } catch (e) {
            // console.warn('Ошибка сохранения в localStorage:', e);
            return false;
        }
    }

    function formatDescription(text) {
        if (!text) return '<p>Описание отсутствует</p>';
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }

    function getStatusText(status) {
        switch (status) {
            case 'active': return 'Активный';
            case 'moderation': return 'На модерации';
            case 'rejected': return 'Отклонен';
            default: return 'Неизвестно';
        }
    }

    function calculateDaysLeft(deadline) {
        try {
            const deadlineDate = new Date(deadline);
            const today = new Date();
            const diffTime = deadlineDate - today;
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return daysLeft > 0 ? daysLeft : 0;
        } catch (e) {
            return 30;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'Сегодня';

        try {
            const date = new Date(dateString);
            const today = new Date();

            if (date.toDateString() === today.toDateString()) {
                return 'Сегодня';
            }

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                return 'Вчера';
            }

            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return 'Недавно';
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showError(message) {
        const container = document.querySelector('.project-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 100px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: #F72585; margin-bottom: 20px;"></i>
                <h2 style="color: #333; margin-bottom: 15px;">Ошибка</h2>
                <p style="color: #666; margin-bottom: 30px;">${message}</p>
                <a href="index.html" class="btn-support-large" style="background: #4361EE; display: inline-block; width: auto; padding: 15px 30px; text-decoration: none;">
                    <i class="fas fa-arrow-left"></i> Вернуться к проектам
                </a>
            </div>
        `;
    }

    // Показ уведомления
    function showNotification(message, type = 'success') {
        const colors = {
            success: '#4CC9F0',
            error: '#F72585',
            warning: '#FFC107'
        };

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.success}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
});