// admin.js - админ-панель (без лишних логов)
document.addEventListener('DOMContentLoaded', function () {
    const authSection = document.getElementById('authSection');
    const adminPanel = document.getElementById('adminPanel');
    const loginBtn = document.getElementById('loginBtn');
    const adminPassword = document.getElementById('adminPassword');
    const authError = document.getElementById('authError');

    const ADMIN_PASSWORD = 'admin123';
    let allProjects = [];
    let currentTab = 'moderation';

    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';

    if (isAuthenticated) {
        showAdminPanel();
    } else {
        showAuthForm();
    }

    function showAuthForm() {
        authSection.style.display = 'block';
        adminPanel.style.display = 'none';

        loginBtn.addEventListener('click', handleLogin);
        adminPassword.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleLogin();
        });
    }

    function handleLogin() {
        const password = adminPassword.value.trim();

        if (password === ADMIN_PASSWORD) {
            localStorage.setItem('adminAuthenticated', 'true');
            showAdminPanel();
        } else {
            authError.style.display = 'block';
            adminPassword.value = '';
            setTimeout(() => {
                authError.style.display = 'none';
            }, 3000);
        }
    }

    function showAdminPanel() {
        authSection.style.display = 'none';
        adminPanel.style.display = 'block';

        if (!window.db) {
            showError('Ошибка подключения к базе данных');
            return;
        }

        initAdminPanel();
    }

    function initAdminPanel() {
        loadAllProjects();
        setupTabs();
        setupFilters();
        setupLogout();
    }

    async function loadAllProjects() {
        try {
            const { data: projects, error } = await window.db
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allProjects = projects || [];
            updateStatistics();
            showTab(currentTab);

        } catch (error) {
            showError('Не удалось загрузить проекты');
        }
    }

    function updateStatistics() {
        const total = allProjects.length;
        const moderation = allProjects.filter(p => p.status === 'moderation').length;
        const active = allProjects.filter(p => p.status === 'active').length;
        const rejected = allProjects.filter(p => p.status === 'rejected').length;

        const totalAmount = allProjects.reduce((sum, project) =>
            sum + (project.collected_amount || 0), 0);

        document.getElementById('totalProjects').textContent = total;
        document.getElementById('moderationProjects').textContent = moderation;
        document.getElementById('activeProjects').textContent = active;
        document.getElementById('totalAmount').textContent = `${totalAmount.toLocaleString()} ₽`;
    }

    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const tab = this.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                showTab(tab);
                currentTab = tab;
            });
        });
    }

    function showTab(tab) {
        const tabs = ['moderation', 'active', 'rejected', 'all'];

        tabs.forEach(t => {
            const tabElement = document.getElementById(`${t}Tab`);
            if (tabElement) {
                tabElement.style.display = 'none';
            }
        });

        const selectedTab = document.getElementById(`${tab}Tab`);
        if (selectedTab) {
            selectedTab.style.display = 'block';
        }

        fillTabData(tab);
    }

    function fillTabData(tab) {
        let filteredProjects = [];

        switch (tab) {
            case 'moderation':
                filteredProjects = allProjects.filter(p => p.status === 'moderation');
                fillModerationTable(filteredProjects);
                break;

            case 'active':
                filteredProjects = allProjects.filter(p => p.status === 'active');
                fillActiveTable(filteredProjects);
                break;

            case 'rejected':
                filteredProjects = allProjects.filter(p => p.status === 'rejected');
                fillRejectedTable(filteredProjects);
                break;

            case 'all':
                filteredProjects = allProjects;
                fillAllTable(filteredProjects);
                break;
        }
    }

    function fillModerationTable(projects) {
        const container = document.getElementById('moderationProjectsList');

        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="table-row" style="grid-template-columns: 1fr; text-align: center; padding: 40px;">
                    <div style="color: #888;">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 15px;"></i>
                        <h3>Нет проектов на модерации</h3>
                        <p>Все проекты проверены!</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        projects.forEach(project => {
            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div>
                    <div class="project-title">${escapeHtml(project.title)}</div>
                    <div class="project-author">${escapeHtml(project.author_email)}</div>
                    <a href="project.html?id=${project.id}" target="_blank" class="btn-view">
                        <i class="fas fa-external-link-alt"></i> Открыть
                    </a>
                </div>
                <div>${escapeHtml(project.author_name)}</div>
                <div>${escapeHtml(project.author_faculty)}</div>
                <div>${(project.target_amount || 0).toLocaleString()} ₽</div>
                <div>${formatDate(project.created_at)}</div>
                <div>
                    <button class="btn-action btn-approve" onclick="approveProject(${project.id})">
                        <i class="fas fa-check"></i> Одобрить
                    </button>
                    <button class="btn-action btn-reject" onclick="showRejectModal(${project.id})">
                        <i class="fas fa-times"></i> Отклонить
                    </button>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function fillActiveTable(projects) {
        const container = document.getElementById('activeProjectsList');

        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="table-row" style="text-align: center; padding: 40px; color: #888;">Нет активных проектов</div>';
            return;
        }

        container.innerHTML = '';

        projects.forEach(project => {
            const progress = project.target_amount > 0
                ? Math.round((project.collected_amount / project.target_amount) * 100)
                : 0;

            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div>
                    <div class="project-title">${escapeHtml(project.title)}</div>
                    <div class="project-author">${escapeHtml(project.author_faculty)}</div>
                </div>
                <div>${escapeHtml(project.author_name)}</div>
                <div>${(project.collected_amount || 0).toLocaleString()} ₽</div>
                <div>
                    <div style="background: #E8E8E8; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${progress}%; background: #F72585; height: 100%;"></div>
                    </div>
                    <small>${progress}%</small>
                </div>
                <div><span class="status-badge status-active">Активный</span></div>
                <div>
                    <button class="btn-action btn-reject" onclick="rejectProject(${project.id}, 'Нарушение правил')">
                        <i class="fas fa-ban"></i> Заблокировать
                    </button>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function fillRejectedTable(projects) {
        const container = document.getElementById('rejectedProjectsList');

        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="table-row" style="text-align: center; padding: 40px; color: #888;">Нет отклоненных проектов</div>';
            return;
        }

        container.innerHTML = '';

        projects.forEach(project => {
            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div>
                    <div class="project-title">${escapeHtml(project.title)}</div>
                    <div class="project-author">${escapeHtml(project.author_email)}</div>
                </div>
                <div>${escapeHtml(project.author_name)}</div>
                <div>${escapeHtml(project.rejection_reason || 'Причина не указана')}</div>
                <div>${formatDate(project.created_at)}</div>
                <div><span class="status-badge status-rejected">Отклонен</span></div>
                <div>
                    <button class="btn-action btn-approve" onclick="approveProject(${project.id})">
                        <i class="fas fa-redo"></i> Восстановить
                    </button>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function fillAllTable(projects) {
        const container = document.getElementById('allProjectsList');

        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="table-row" style="text-align: center; padding: 40px; color: #888;">Нет проектов</div>';
            return;
        }

        container.innerHTML = '';

        projects.forEach(project => {
            const statusBadge = project.status === 'active' ?
                '<span class="status-badge status-active">Активный</span>' :
                project.status === 'moderation' ?
                    '<span class="status-badge status-moderation">На модерации</span>' :
                    '<span class="status-badge status-rejected">Отклонен</span>';

            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div>
                    <div class="project-title">${escapeHtml(project.title)}</div>
                    <div class="project-author">${escapeHtml(project.author_faculty)}</div>
                </div>
                <div>${escapeHtml(project.author_name)}</div>
                <div>${statusBadge}</div>
                <div>${(project.target_amount || 0).toLocaleString()} ₽</div>
                <div>${(project.collected_amount || 0).toLocaleString()} ₽</div>
                <div>${formatDate(project.created_at)}</div>
            `;
            container.appendChild(row);
        });
    }

    function setupFilters() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Поиск по названию...';
        searchInput.style.padding = '10px';
        searchInput.style.border = '2px solid #E0E0E0';
        searchInput.style.borderRadius = '8px';
        searchInput.style.marginLeft = '20px';
        searchInput.style.width = '250px';

        searchInput.addEventListener('input', function () {
            filterProjects(this.value);
        });

        const adminHeader = document.querySelector('.admin-header');
        if (adminHeader) {
            adminHeader.appendChild(searchInput);
        }

        const statusFilter = document.createElement('select');
        statusFilter.innerHTML = `
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="moderation">На модерации</option>
            <option value="rejected">Отклоненные</option>
        `;
        statusFilter.style.padding = '10px';
        statusFilter.style.border = '2px solid #E0E0E0';
        statusFilter.style.borderRadius = '8px';
        statusFilter.style.marginLeft = '10px';

        statusFilter.addEventListener('change', function () {
            filterProjects('', this.value);
        });

        if (adminHeader) {
            adminHeader.appendChild(statusFilter);
        }
    }

    function filterProjects(searchText = '', status = '') {
        let filtered = allProjects;

        if (searchText) {
            const searchLower = searchText.toLowerCase();
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(searchLower) ||
                p.author_name.toLowerCase().includes(searchLower) ||
                p.author_faculty.toLowerCase().includes(searchLower)
            );
        }

        if (status) {
            filtered = filtered.filter(p => p.status === status);
        }

        fillTabData(currentTab);
    }

    window.approveProject = async function (projectId) {
        if (!confirm('Одобрить этот проект? Он станет виден на главной странице.')) {
            return;
        }

        try {
            const { error } = await window.db
                .from('projects')
                .update({ status: 'active' })
                .eq('id', projectId);

            if (error) throw error;

            alert('Проект одобрен!');
            await loadAllProjects();

        } catch (error) {
            alert('Ошибка при одобрении проекта');
        }
    };

    window.showRejectModal = function (projectId) {
        const reason = prompt('Укажите причину отклонения проекта:',
            'Проект не соответствует правилам платформы');

        if (reason) {
            rejectProject(projectId, reason);
        }
    };

    window.rejectProject = async function (projectId, reason = 'Не указана') {
        try {
            const { error } = await window.db
                .from('projects')
                .update({
                    status: 'rejected',
                    rejection_reason: reason
                })
                .eq('id', projectId);

            if (error) throw error;

            alert('Проект отклонен');
            await loadAllProjects();

        } catch (error) {
            alert('Ошибка при отклонении проекта');
        }
    };

    function setupLogout() {
        const navLinks = document.querySelector('.nav-links');
        const logoutBtn = document.createElement('a');
        logoutBtn.href = '#';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Выйти';
        logoutBtn.style.color = '#F72585';
        logoutBtn.style.cursor = 'pointer';

        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('adminAuthenticated');
            location.reload();
        });

        navLinks.appendChild(logoutBtn);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    function showError(message) {
        const container = document.querySelector('.admin-container');
        const errorDiv = document.createElement('div');
        errorDiv.style.background = '#F8D7DA';
        errorDiv.style.color = '#721C24';
        errorDiv.style.padding = '15px';
        errorDiv.style.borderRadius = '8px';
        errorDiv.style.marginBottom = '20px';
        errorDiv.innerHTML = `<strong>Ошибка:</strong> ${message}`;

        container.prepend(errorDiv);
    }
});