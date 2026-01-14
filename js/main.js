// main.js - основной код сайта с избранным и без лишних логов
document.addEventListener('DOMContentLoaded', function () {
    const projectsGrid = document.getElementById('projects-grid');
    const noProjects = document.getElementById('no-projects');

    let currentFilter = 'all';
    let currentFaculty = '';
    let currentSort = 'newest';
    let allProjects = [];

    // Проверяем подключение к базе
    if (!window.db) {
        showDemoProjects();
        setupFilters();
        return;
    }

    loadProjectsFromDatabase();
    setupFilters();

    // Загрузка проектов из базы данных
    async function loadProjectsFromDatabase() {
        try {
            const { data: projects, error } = await window.db
                .from('projects')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                showDemoProjects();
                return;
            }

            allProjects = projects || [];

            if (allProjects.length === 0) {
                noProjects.style.display = 'block';
                projectsGrid.innerHTML = '';
                return;
            }

            applyFiltersAndSort();

        } catch (error) {
            showDemoProjects();
        }
    }

    // Настройка фильтров и сортировки
    function setupFilters() {
        // Кнопки фильтров
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                applyFiltersAndSort();
            });
        });

        // Выбор факультета
        const facultySelect = document.querySelector('.faculty-select');
        if (facultySelect) {
            facultySelect.addEventListener('change', function () {
                currentFaculty = this.value;
                applyFiltersAndSort();
            });
        }

        // Добавляем селект сортировки
        addSortSelector();

        // Кнопка избранного
        const favoritesBtn = document.getElementById('favoritesBtn');
        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', function () {
                const favorites = getFavorites();
                if (favorites.length === 0) {
                    showNoFavoritesMessage();
                    return;
                }

                // Показываем только избранные проекты
                const favoriteProjects = allProjects.filter(project =>
                    favorites.includes(project.id.toString())
                );
                displayProjects(favoriteProjects);

                // Обновляем активный фильтр
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = 'favorites';
            });
        }
    }

    // Добавление селектора сортировки
    function addSortSelector() {
        const filterTabs = document.querySelector('.filter-tabs');
        if (!filterTabs) return;

        const sortSelect = document.createElement('select');
        sortSelect.className = 'faculty-select';
        sortSelect.innerHTML = `
            <option value="newest">Сначала новые</option>
            <option value="popular">По популярности</option>
            <option value="ending">Скоро заканчиваются</option>
            <option value="most-funded">Больше собрано</option>
            <option value="least-funded">Меньше собрано</option>
        `;

        sortSelect.addEventListener('change', function () {
            currentSort = this.value;
            applyFiltersAndSort();
        });

        filterTabs.appendChild(sortSelect);
    }

    // Применение фильтров и сортировки
    function applyFiltersAndSort() {
        if (allProjects.length === 0) {
            if (window.db) {
                loadProjectsFromDatabase();
            } else {
                showDemoProjects();
            }
            return;
        }

        let filteredProjects = [...allProjects];

        // Фильтр по типу
        if (currentFilter === 'team') {
            filteredProjects = filteredProjects.filter(p => p.needs_team);
        } else if (currentFilter === 'ending') {
            filteredProjects = filteredProjects.filter(p => {
                if (!p.deadline) return false;
                const daysLeft = calculateDaysLeft(p.deadline);
                return daysLeft > 0 && daysLeft <= 7;
            });
        } else if (currentFilter === 'favorites') {
            const favorites = getFavorites();
            filteredProjects = filteredProjects.filter(p =>
                favorites.includes(p.id.toString())
            );
            if (filteredProjects.length === 0) {
                showNoFavoritesMessage();
                return;
            }
        }

        // Фильтр по факультету
        if (currentFaculty) {
            filteredProjects = filteredProjects.filter(p =>
                p.author_faculty && p.author_faculty.toLowerCase().includes(currentFaculty.toLowerCase())
            );
        }

        // Сортировка
        filteredProjects.sort((a, b) => {
            switch (currentSort) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'popular':
                    return (b.collected_amount || 0) - (a.collected_amount || 0);
                case 'ending':
                    const daysA = a.deadline ? calculateDaysLeft(a.deadline) : Infinity;
                    const daysB = b.deadline ? calculateDaysLeft(b.deadline) : Infinity;
                    return daysA - daysB;
                case 'most-funded':
                    return (b.collected_amount || 0) - (a.collected_amount || 0);
                case 'least-funded':
                    return (a.collected_amount || 0) - (b.collected_amount || 0);
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        displayProjects(filteredProjects);
    }

    // Отображение проектов с иконкой избранного
    function displayProjects(projects) {
        projectsGrid.innerHTML = '';
        noProjects.style.display = 'none';

        if (projects.length === 0) {
            noProjects.style.display = 'block';
            return;
        }

        const favorites = getFavorites();

        projects.forEach(project => {
            const projectCard = createProjectCard(project, favorites.includes(project.id.toString()));
            projectsGrid.appendChild(projectCard);
        });
    }

    // Функция создания карточки проекта с избранным
    function createProjectCard(project, isFavorite) {
        const title = project.title || 'Без названия';
        const authorName = project.author_name || 'Неизвестный';
        const faculty = project.author_faculty || 'Не указан';
        const description = project.description || '';
        const targetAmount = project.target_amount || 0;
        const collectedAmount = project.collected_amount || 0;
        const imageUrl = project.image_url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400';
        const needsTeam = project.needs_team || false;
        const projectId = project.id || 0;
        const progress = targetAmount > 0 ? (collectedAmount / targetAmount) * 100 : 0;
        let daysLeft = 30;

        if (project.deadline) {
            daysLeft = calculateDaysLeft(project.deadline);
        }

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-image" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;">
                ${needsTeam ? '<div class="team-badge"><i class="fas fa-users"></i> Ищет команду</div>' : ''}
                <div class="favorite-icon" style="position: absolute; top: 15px; left: 15px; background: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 2;" onclick="toggleFavorite(${projectId}, this)">
                    <i class="fas ${isFavorite ? 'fa-star' : 'fa-star'} style="color: ${isFavorite ? '#FFD700' : '#E0E0E0'}; font-size: 1.2rem;"></i>
                </div>
            </div>
            <div class="project-content">
                <h3 class="project-title">${escapeHtml(title)}</h3>
                <div class="project-author">
                    <i class="fas fa-user"></i> ${escapeHtml(authorName)} • ${escapeHtml(faculty)}
                </div>
                <p class="project-description">${escapeHtml(description.substring(0, 100))}${description.length > 100 ? '...' : ''}</p>

                <div class="progress-section">
                    <div class="progress-label">
                        <span>Собрано</span>
                        <span class="progress-amount">${collectedAmount.toLocaleString()}₽ из ${targetAmount.toLocaleString()}₽</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </div>

                <div class="project-footer">
                    <div class="days-left">
                        <i class="fas fa-clock"></i> ${daysLeft > 0 ? `${daysLeft} дней` : 'Завершен'}
                    </div>
                    <a href="project.html?id=${projectId}" class="btn-support">
                        Поддержать <i class="fas fa-heart"></i>
                    </a>
                </div>
            </div>
        `;

        return card;
    }

    // Функция переключения избранного
    window.toggleFavorite = function(projectId, element) {
        const favorites = getFavorites();
        const projectIdStr = projectId.toString();
        const icon = element.querySelector('i');

        if (favorites.includes(projectIdStr)) {
            // Удаляем из избранного
            const index = favorites.indexOf(projectIdStr);
            favorites.splice(index, 1);
            icon.style.color = '#E0E0E0';
            showNotification('Удалено из избранного');
        } else {
            // Добавляем в избранное
            favorites.push(projectIdStr);
            icon.style.color = '#FFD700';
            showNotification('Добавлено в избранное');
        }

        // Сохраняем в localStorage
        localStorage.setItem('campusHub_favorites', JSON.stringify(favorites));

        // Если сейчас активен фильтр "Избранное", обновляем список
        if (currentFilter === 'favorites') {
            applyFiltersAndSort();
        }
    };

    // Получение списка избранных проектов
    function getFavorites() {
        try {
            const favorites = localStorage.getItem('campusHub_favorites');
            return favorites ? JSON.parse(favorites) : [];
        } catch (e) {
            return [];
        }
    }

    // Показать сообщение когда нет избранных проектов
    function showNoFavoritesMessage() {
        projectsGrid.innerHTML = '';
        projectsGrid.innerHTML = `
            <div class="no-projects" style="display: block;">
                <i class="fas fa-star" style="font-size: 4rem; margin-bottom: 20px; color: #E0E0E0;"></i>
                <h3>Нет избранных проектов</h3>
                <p>Добавьте проекты в избранное, нажав на звёздочку</p>
                <button onclick="resetFilters()" style="margin-top: 20px; background: #4361EE; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    Показать все проекты
                </button>
            </div>
        `;
    }

    // Сбросить фильтры (кнопка в сообщении)
    window.resetFilters = function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
        applyFiltersAndSort();
    };

    // Тестовые проекты (если Supabase не работает)
    function showDemoProjects() {
        projectsGrid.innerHTML = '';
        noProjects.style.display = 'none';

        const testProjects = [
            {
                id: 1,
                title: "StudySwap: обмен учебниками",
                description: "Мобильное приложение для обмена учебниками между студентами нашего колледжа. Экономим деньги и бережем природу!",
                author_name: "Алекс Петров",
                author_faculty: "Информатика",
                target_amount: 25000,
                collected_amount: 12500,
                image_url: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400",
                needs_team: true,
                deadline: "2024-12-15",
                created_at: "2024-10-15"
            },
            {
                id: 2,
                title: "Арт-фестиваль 'Весна в колледже'",
                description: "Организация весеннего фестиваля с выставкой студенческих работ, перформансами и музыкой.",
                author_name: "Мария Соколова",
                author_faculty: "Дизайн",
                target_amount: 50000,
                collected_amount: 32500,
                image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400",
                needs_team: true,
                deadline: "2024-11-30",
                created_at: "2024-10-10"
            },
            {
                id: 3,
                title: "Умная парковка колледжа",
                description: "Система датчиков для отслеживания свободных мест на парковке с мобильным приложением.",
                author_name: "Дмитрий Иванов",
                author_faculty: "Экономика",
                target_amount: 35000,
                collected_amount: 8000,
                image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
                needs_team: false,
                deadline: "2025-01-20",
                created_at: "2024-10-05"
            }
        ];

        allProjects = testProjects;
        applyFiltersAndSort();
    }

    // Вспомогательные функции
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    // Функция показа уведомлений
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