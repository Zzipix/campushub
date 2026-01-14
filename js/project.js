// project.js - страница проекта с обновленным списком сторонников
document.addEventListener('DOMContentLoaded', function () {

    // ============================================
    // КОММЕНТАРИИ - ПЕРЕМЕННЫЕ И КОНСТАНТЫ
    // ============================================

    // Настройки комментариев
    const COMMENTS_PER_PAGE = 3;
    let currentCommentPage = 1;
    let allComments = [];
    let commentReplies = {}; // Для хранения ответов

    // ============================================
    // КОММЕНТАРИИ - ИНИЦИАЛИЗАЦИЯ
    // ============================================

    // Инициализация системы комментариев
    function initCommentsSystem(projectId) {
        // Загружаем комментарии
        loadComments(projectId);

        // Настройка формы добавления комментария
        setupCommentForm(projectId);

        // Настройка кнопки "Показать ещё"
        setupLoadMoreButton(projectId);
    }

    // ============================================
    // КОММЕНТАРИИ - ЗАГРУЗКА ДАННЫХ
    // ============================================

    // Загрузка комментариев из базы данных
    async function loadComments(projectId) {
        try {
            const { data: comments, error } = await window.db
                .from('comments')
                .select('*')
                .eq('project_id', projectId)
                .is('parent_id', null) // Только родительские комментарии
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Сохраняем все комментарии
            allComments = comments || [];

            // Если комментариев нет
            if (allComments.length === 0) {
                document.getElementById('noCommentsMessage').style.display = 'block';
                document.getElementById('commentsList').innerHTML = '';
                document.getElementById('loadMoreContainer').style.display = 'none';
                return;
            }

            // Загружаем ответы для каждого комментария
            await loadCommentReplies(projectId);

            // Отображаем комментарии
            displayComments();

        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
            showCommentError('Не удалось загрузить комментарии');
        }
    }

    // Загрузка ответов на комментарии
    async function loadCommentReplies(projectId) {
        try {
            const { data: replies, error } = await window.db
                .from('comments')
                .select('*')
                .eq('project_id', projectId)
                .not('parent_id', 'is', null)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Группируем ответы по родительскому комментарию
            commentReplies = {};
            if (replies) {
                replies.forEach(reply => {
                    if (!commentReplies[reply.parent_id]) {
                        commentReplies[reply.parent_id] = [];
                    }
                    commentReplies[reply.parent_id].push(reply);
                });
            }

        } catch (error) {
            console.error('Ошибка загрузки ответов:', error);
        }
    }

    // ============================================
    // КОММЕНТАРИИ - ОТОБРАЖЕНИЕ
    // ============================================

    // Отображение комментариев с пагинацией
    function displayComments() {
        const commentsList = document.getElementById('commentsList');
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        const noCommentsMessage = document.getElementById('noCommentsMessage');

        // Скрываем сообщение "нет комментариев"
        noCommentsMessage.style.display = 'none';

        // Рассчитываем сколько комментариев показывать
        const startIndex = 0;
        const endIndex = currentCommentPage * COMMENTS_PER_PAGE;
        const commentsToShow = allComments.slice(startIndex, endIndex);

        // Если комментариев нет
        if (commentsToShow.length === 0) {
            commentsList.innerHTML = '';
            noCommentsMessage.style.display = 'block';
            loadMoreContainer.style.display = 'none';
            return;
        }

        // Отображаем комментарии
        commentsList.innerHTML = commentsToShow.map(comment => createCommentHTML(comment)).join('');

        // Показываем/скрываем кнопку "Показать ещё"
        if (endIndex >= allComments.length) {
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreContainer.style.display = 'block';
        }

        // Настраиваем обработчики для кнопок лайков и ответов
        setupCommentActions();
    }

    // Создание HTML для комментария
    function createCommentHTML(comment) {
        const replies = commentReplies[comment.id] || [];
        const hasReplies = replies.length > 0;
        const date = formatCommentDate(comment.created_at);
        const initial = comment.author_name ? comment.author_name.charAt(0).toUpperCase() : 'А';

        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <div class="comment-avatar">${initial}</div>
                        <div class="comment-author-info">
                            <h4>${escapeHtml(comment.author_name)}</h4>
                            <span class="comment-date">${date}</span>
                        </div>
                    </div>
                    <div class="comment-likes">
                        <button class="like-btn ${comment.likes > 0 ? 'liked' : ''}" data-comment-id="${comment.id}">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${comment.likes}</span>
                        </button>
                    </div>
                </div>

                <div class="comment-content">
                    ${escapeHtml(comment.content)}
                </div>

                <div class="comment-actions">
                    <button class="reply-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-reply"></i> Ответить
                    </button>

                    ${hasReplies ? `
                        <button class="view-replies-btn" data-comment-id="${comment.id}">
                            <i class="fas fa-comments"></i>
                            <span class="reply-count">${replies.length}</span> ответов
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                </div>

                <!-- Форма ответа (скрыта по умолчанию) -->
                <div class="reply-form" id="replyForm-${comment.id}">
                    <textarea class="reply-content" placeholder="Ваш ответ..." rows="2"></textarea>
                    <div class="reply-form-actions">
                        <button class="submit-reply-btn" data-comment-id="${comment.id}" style="background: #4361EE; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 0.9rem;">
                            Отправить ответ
                        </button>
                        <button class="cancel-reply-btn" data-comment-id="${comment.id}" style="background: #F8F9FA; color: #666; border: 1px solid #E0E0E0; padding: 8px 16px; border-radius: 6px; font-size: 0.9rem;">
                            Отмена
                        </button>
                    </div>
                </div>

                <!-- Список ответов (скрыт по умолчанию) -->
                ${hasReplies ? `
                    <div class="comment-replies" id="replies-${comment.id}" style="display: none;">
                        ${replies.map(reply => createReplyHTML(reply)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Создание HTML для ответа
    function createReplyHTML(reply) {
        const date = formatCommentDate(reply.created_at);
        const initial = reply.author_name ? reply.author_name.charAt(0).toUpperCase() : 'А';

        return `
            <div class="reply-item" data-reply-id="${reply.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <div class="comment-avatar" style="width: 32px; height: 32px; font-size: 0.9rem;">${initial}</div>
                        <div class="comment-author-info">
                            <h4 style="font-size: 0.95rem;">${escapeHtml(reply.author_name)}</h4>
                            <span class="comment-date" style="font-size: 0.8rem;">${date}</span>
                        </div>
                    </div>
                    <div class="comment-likes">
                        <button class="like-btn ${reply.likes > 0 ? 'liked' : ''}" data-reply-id="${reply.id}" style="font-size: 0.85rem;">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${reply.likes}</span>
                        </button>
                    </div>
                </div>
                <div class="comment-content" style="font-size: 0.95rem; padding-left: 42px;">
                    ${escapeHtml(reply.content)}
                </div>
            </div>
        `;
    }

    // ============================================
    // КОММЕНТАРИИ - ФОРМЫ И ОБРАБОТКА
    // ============================================

    // Настройка формы добавления комментария
    function setupCommentForm(projectId) {
        const submitBtn = document.getElementById('submitCommentBtn');
        const authorInput = document.getElementById('commentAuthor');
        const contentInput = document.getElementById('commentContent');
        const errorDiv = document.getElementById('commentError');

        if (!submitBtn) return;

        submitBtn.addEventListener('click', async () => {
            const author = authorInput.value.trim();
            const content = contentInput.value.trim();

            // Валидация
            if (!author) {
                showCommentError('Пожалуйста, введите ваше имя');
                return;
            }

            if (!content) {
                showCommentError('Пожалуйста, введите комментарий');
                return;
            }

            if (content.length < 5) {
                showCommentError('Комментарий должен содержать минимум 5 символов');
                return;
            }

            // Скрываем ошибку
            hideCommentError();

            // Показываем загрузку
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitBtn.disabled = true;

            try {
                // Отправляем комментарий в базу данных
                const { data, error } = await window.db
                    .from('comments')
                    .insert([{
                        project_id: projectId,
                        author_name: author,
                        content: content,
                        parent_id: null
                    }])
                    .select();

                if (error) throw error;

                // Очищаем форму
                authorInput.value = '';
                contentInput.value = '';

                // Добавляем комментарий в начало списка
                if (data && data[0]) {
                    allComments.unshift(data[0]);
                    displayComments();

                    // Показываем уведомление
                    showNotification('Комментарий успешно добавлен!', 'success');
                }

            } catch (error) {
                console.error('Ошибка отправки комментария:', error);
                showCommentError('Не удалось отправить комментарий. Попробуйте позже.');
            } finally {
                // Восстанавливаем кнопку
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить комментарий';
                submitBtn.disabled = false;
            }
        });

        // Отправка по Enter (Shift+Enter для новой строки)
        contentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitBtn.click();
            }
        });
    }

    // Настройка кнопки "Показать ещё"
    function setupLoadMoreButton(projectId) {
        const loadMoreBtn = document.getElementById('loadMoreCommentsBtn');

        if (!loadMoreBtn) return;

        loadMoreBtn.addEventListener('click', () => {
            currentCommentPage++;
            displayComments();
        });
    }

    // Настройка действий для комментариев (лайки, ответы)
    function setupCommentActions() {
        // Лайки для комментариев
        document.querySelectorAll('.like-btn[data-comment-id]').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.dataset.commentId;
                toggleCommentLike(commentId, this);
            });
        });

        // Лайки для ответов
        document.querySelectorAll('.like-btn[data-reply-id]').forEach(btn => {
            btn.addEventListener('click', function() {
                const replyId = this.dataset.replyId;
                toggleReplyLike(replyId, this);
            });
        });

        // Кнопки ответа
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.dataset.commentId;
                toggleReplyForm(commentId);
            });
        });

        // Кнопки просмотра ответов
        document.querySelectorAll('.view-replies-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.dataset.commentId;
                toggleReplies(commentId, this);
            });
        });

        // Отправка ответов
        document.querySelectorAll('.submit-reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.dataset.commentId;
                submitReply(commentId);
            });
        });

        // Отмена ответа
        document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.dataset.commentId;
                toggleReplyForm(commentId);
            });
        });
    }

    // ============================================
    // КОММЕНТАРИИ - ФУНКЦИОНАЛ
    // ============================================

    // Переключение лайка комментария
    async function toggleCommentLike(commentId, button) {
        try {
            const comment = allComments.find(c => c.id == commentId);
            if (!comment) return;

            // Обновляем локально для мгновенной обратной связи
            const wasLiked = button.classList.contains('liked');
            const newLikes = wasLiked ? comment.likes - 1 : comment.likes + 1;

            button.classList.toggle('liked');
            button.querySelector('.like-count').textContent = newLikes;

            // Обновляем в базе данных
            const { error } = await window.db
                .from('comments')
                .update({ likes: newLikes })
                .eq('id', commentId);

            if (error) throw error;

            // Обновляем локальные данные
            comment.likes = newLikes;

        } catch (error) {
            console.error('Ошибка лайка:', error);
            // Откатываем визуальное изменение
            button.classList.toggle('liked');
        }
    }

    // Переключение лайка ответа
    async function toggleReplyLike(replyId, button) {
        try {
            // Находим ответ в наших данных
            let targetReply = null;
            for (const parentId in commentReplies) {
                const reply = commentReplies[parentId].find(r => r.id == replyId);
                if (reply) {
                    targetReply = reply;
                    break;
                }
            }

            if (!targetReply) return;

            // Обновляем локально
            const wasLiked = button.classList.contains('liked');
            const newLikes = wasLiked ? targetReply.likes - 1 : targetReply.likes + 1;

            button.classList.toggle('liked');
            button.querySelector('.like-count').textContent = newLikes;

            // Обновляем в базе данных
            const { error } = await window.db
                .from('comments')
                .update({ likes: newLikes })
                .eq('id', replyId);

            if (error) throw error;

            // Обновляем локальные данные
            targetReply.likes = newLikes;

        } catch (error) {
            console.error('Ошибка лайка ответа:', error);
            button.classList.toggle('liked');
        }
    }

    // Переключение формы ответа
    function toggleReplyForm(commentId) {
        const form = document.getElementById(`replyForm-${commentId}`);
        if (!form) return;

        form.classList.toggle('active');

        // Фокус на текстовое поле при открытии
        if (form.classList.contains('active')) {
            const textarea = form.querySelector('.reply-content');
            setTimeout(() => textarea.focus(), 100);
        }
    }

    // Переключение отображения ответов
    function toggleReplies(commentId, button) {
        const repliesDiv = document.getElementById(`replies-${commentId}`);
        const icon = button.querySelector('.fa-chevron-down');

        if (!repliesDiv) return;

        if (repliesDiv.style.display === 'none' || !repliesDiv.style.display) {
            repliesDiv.style.display = 'block';
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
            button.querySelector('.reply-count').style.fontWeight = '600';
        } else {
            repliesDiv.style.display = 'none';
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
            button.querySelector('.reply-count').style.fontWeight = 'normal';
        }
    }

    // Отправка ответа на комментарий
    async function submitReply(commentId) {
        const form = document.getElementById(`replyForm-${commentId}`);
        if (!form) return;

        const textarea = form.querySelector('.reply-content');
        const content = textarea.value.trim();

        if (!content) {
            showNotification('Введите текст ответа', 'error');
            return;
        }

        // Используем имя из основного комментария или "Аноним"
        const authorName = document.getElementById('commentAuthor').value.trim() || 'Аноним';
        const projectId = new URLSearchParams(window.location.search).get('id');

        if (!projectId) return;

        try {
            // Отправляем ответ в базу данных
            const { data, error } = await window.db
                .from('comments')
                .insert([{
                    project_id: projectId,
                    parent_id: commentId,
                    author_name: authorName,
                    content: content
                }])
                .select();

            if (error) throw error;

            // Очищаем поле ввода
            textarea.value = '';

            // Скрываем форму
            form.classList.remove('active');

            // Добавляем ответ локально
            if (data && data[0]) {
                if (!commentReplies[commentId]) {
                    commentReplies[commentId] = [];
                }
                commentReplies[commentId].push(data[0]);

                // Обновляем отображение
                const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
                if (commentElement) {
                    const repliesDiv = commentElement.querySelector('.comment-replies');
                    const viewRepliesBtn = commentElement.querySelector('.view-replies-btn');

                    if (repliesDiv) {
                        // Если ответы уже видны, добавляем новый
                        if (repliesDiv.style.display !== 'none') {
                            repliesDiv.innerHTML += createReplyHTML(data[0]);
                        }
                    }

                    // Обновляем счетчик ответов
                    if (viewRepliesBtn) {
                        const countSpan = viewRepliesBtn.querySelector('.reply-count');
                        const newCount = commentReplies[commentId].length;
                        countSpan.textContent = newCount;
                        countSpan.style.fontWeight = '600';
                    }
                }

                // Показываем уведомление
                showNotification('Ответ отправлен!', 'success');
            }

        } catch (error) {
            console.error('Ошибка отправки ответа:', error);
            showNotification('Не удалось отправить ответ', 'error');
        }
    }

    // ============================================
    // КОММЕНТАРИИ - ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================

    // Форматирование даты комментария
    function formatCommentDate(dateString) {
        if (!dateString) return 'Только что';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return 'Только что';
            if (diffMins < 60) return `${diffMins} мин назад`;
            if (diffHours < 24) return `${diffHours} ч назад`;
            if (diffDays === 1) return 'Вчера';
            if (diffDays < 7) return `${diffDays} дн назад`;

            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

        } catch (e) {
            return 'Недавно';
        }
    }

    // Показать ошибку комментария
    function showCommentError(message) {
        const errorDiv = document.getElementById('commentError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';

            // Автоматически скрыть через 5 секунд
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    // Скрыть ошибку комментария
    function hideCommentError() {
        const errorDiv = document.getElementById('commentError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // ============================================
    // ОБНОВЛЕНИЕ ОСНОВНОЙ ФУНКЦИИ ЗАГРУЗКИ
    // ============================================

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
            initCommentsSystem(id);

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