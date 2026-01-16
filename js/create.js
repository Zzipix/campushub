// create.js - УПРОЩЕННАЯ ВЕРСИЯ
document.addEventListener('DOMContentLoaded', function () {
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.step');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const summarySection = document.getElementById('summarySection');

    let currentStep = 1;
    const totalSteps = 4;
    const projectData = {
        team: [],
        budget: []
    };

    if (!window.db) {
        alert('Ошибка подключения к базе данных. Пожалуйста, обновите страницу.');
        return;
    }

    initForm();

    function initForm() {
        updateStep();

        prevBtn.addEventListener('click', goToPrevStep);
        nextBtn.addEventListener('click', goToNextStep);
        submitBtn.addEventListener('click', submitProject);

        document.getElementById('hasDeadline').addEventListener('change', function () {
            document.getElementById('deadlineField').style.display = this.checked ? 'block' : 'none';
        });

        document.getElementById('addTeamMember').addEventListener('click', addTeamMember);
        document.getElementById('addBudgetItem').addEventListener('click', addBudgetItem);

        // Автозаполнение из сохраненного профиля
        autofillFromProfile();
    }

    function goToPrevStep() {
        if (currentStep > 1) {
            currentStep--;
            updateStep();
        }
    }

    function goToNextStep() {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                currentStep++;
                if (currentStep === 4) {
                    updateSummary();
                }
                updateStep();
            }
        }
    }

    function updateStep() {
        steps.forEach(step => step.classList.remove('active'));
        stepIndicators.forEach(indicator => {
            indicator.classList.remove('active', 'completed');
        });

        document.getElementById(`step${currentStep}`).classList.add('active');

        for (let i = 1; i <= totalSteps; i++) {
            const indicator = document.querySelector(`.step[data-step="${i}"]`);
            if (i < currentStep) {
                indicator.classList.add('completed');
            } else if (i === currentStep) {
                indicator.classList.add('active');
            }
        }

        prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
        nextBtn.style.display = currentStep < totalSteps ? 'block' : 'none';
        submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';

        if (currentStep === totalSteps) {
            nextBtn.style.display = 'none';
        }
    }

    function validateStep(step) {
        switch (step) {
            case 1:
                const title = document.getElementById('projectTitle').value.trim();
                const description = document.getElementById('projectDescription').value.trim();
                const authorName = document.getElementById('authorName').value.trim();
                const authorFaculty = document.getElementById('authorFaculty').value;
                const authorEmail = document.getElementById('authorEmail').value.trim();

                if (!title || title.length < 5) {
                    alert('Пожалуйста, введите название проекта (минимум 5 символов)');
                    return false;
                }

                if (!description || description.length < 100) {
                    alert('Описание проекта должно содержать минимум 100 символов');
                    return false;
                }

                if (!authorName) {
                    alert('Пожалуйста, введите ваше имя');
                    return false;
                }

                if (!authorFaculty) {
                    alert('Пожалуйста, выберите факультет');
                    return false;
                }

                if (!authorEmail || !authorEmail.includes('@')) {
                    alert('Пожалуйста, введите корректный email');
                    return false;
                }

                projectData.title = title;
                projectData.description = description;
                projectData.author_name = authorName;
                projectData.author_faculty = authorFaculty;
                projectData.author_email = authorEmail;
                projectData.image_url = document.getElementById('projectImage').value.trim() || null;
                projectData.needs_team = document.getElementById('needsTeam').checked;

                return true;

            case 2:
                collectTeamData();
                return true;

            case 3:
                const targetAmount = document.getElementById('targetAmount').value;
                if (!targetAmount || targetAmount < 1000) {
                    alert('Целевая сумма должна быть не менее 1000 рублей');
                    return false;
                }

                collectBudgetData();
                projectData.target_amount = parseInt(targetAmount);
                projectData.collected_amount = 0;
                projectData.payment_details = document.getElementById('paymentDetails').value.trim();

                return true;

            default:
                return true;
        }
    }

    function addTeamMember() {
        const teamMembers = document.getElementById('teamMembers');
        const memberId = Date.now();

        const memberDiv = document.createElement('div');
        memberDiv.className = 'team-member-item';
        memberDiv.dataset.id = memberId;
        memberDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <input type="text" class="form-input team-name" placeholder="Имя и фамилия">
                <input type="text" class="form-input team-role" placeholder="Роль в проекте">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" class="form-input team-faculty" placeholder="Факультет">
                <input type="text" class="form-input team-contacts" placeholder="Контакты (email/телеграм)">
            </div>
            <button type="button" class="remove-member" style="background: #FFE8E8; color: #F72585; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 10px;">
                <i class="fas fa-trash"></i> Удалить
            </button>
        `;

        teamMembers.appendChild(memberDiv);

        memberDiv.querySelector('.remove-member').addEventListener('click', function () {
            teamMembers.removeChild(memberDiv);
        });
    }

    function collectTeamData() {
        const memberItems = document.querySelectorAll('.team-member-item');
        projectData.team = [];

        memberItems.forEach(item => {
            const name = item.querySelector('.team-name').value.trim();
            const role = item.querySelector('.team-role').value.trim();
            const faculty = item.querySelector('.team-faculty').value.trim();
            const contacts = item.querySelector('.team-contacts').value.trim();

            if (name || role) {
                projectData.team.push({
                    name: name,
                    role: role,
                    faculty: faculty,
                    contacts: contacts
                });
            }
        });
    }

    function addBudgetItem() {
        const budgetItems = document.getElementById('budgetItems');
        const itemId = Date.now();

        const itemDiv = document.createElement('div');
        itemDiv.className = 'budget-item';
        itemDiv.dataset.id = itemId;
        itemDiv.innerHTML = `
            <div class="budget-row">
                <input type="text" class="form-input budget-description" placeholder="Например: Покупка оборудования">
                <input type="number" class="form-input budget-amount" placeholder="10000" min="0">
            </div>
            <button type="button" class="remove-budget" style="background: #FFE8E8; color: #F72585; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 5px;">
                <i class="fas fa-trash"></i> Удалить
            </button>
        `;

        budgetItems.appendChild(itemDiv);

        itemDiv.querySelector('.remove-budget').addEventListener('click', function () {
            budgetItems.removeChild(itemDiv);
        });
    }

    function collectBudgetData() {
        const budgetItems = document.querySelectorAll('.budget-item');
        projectData.budget = [];

        budgetItems.forEach(item => {
            const description = item.querySelector('.budget-description').value.trim();
            const amount = parseInt(item.querySelector('.budget-amount').value) || 0;

            if (description && amount > 0) {
                projectData.budget.push({
                    description: description,
                    amount: amount
                });
            }
        });
    }

    function updateSummary() {
        document.getElementById('summaryTitle').textContent = projectData.title;
        document.getElementById('summaryAuthor').textContent = `${projectData.author_name} (${projectData.author_email})`;
        document.getElementById('summaryFaculty').textContent = projectData.author_faculty;
        document.getElementById('summaryAmount').textContent = projectData.target_amount.toLocaleString();
        document.getElementById('summaryTeam').textContent = projectData.needs_team ? 'Да' : 'Нет';

        const teamSummary = document.getElementById('summaryTeamList');
        if (projectData.team.length > 0) {
            teamSummary.innerHTML = projectData.team.map(member =>
                `<li>${escapeHtml(member.name)} - ${escapeHtml(member.role)} (${escapeHtml(member.faculty)})</li>`
            ).join('');
        } else {
            teamSummary.innerHTML = '<li>Команда не указана</li>';
        }

        const budgetSummary = document.getElementById('summaryBudgetList');
        if (projectData.budget.length > 0) {
            budgetSummary.innerHTML = projectData.budget.map(item =>
                `<li>${escapeHtml(item.description)} - ${item.amount.toLocaleString()} ₽</li>`
            ).join('');
        } else {
            budgetSummary.innerHTML = '<li>Бюджет не расписан</li>';
        }
    }

    async function submitProject() {
        if (!document.getElementById('confirmRules').checked) {
            alert('Пожалуйста, подтвердите согласие с правилами платформы');
            return;
        }

        const finalData = {
            title: projectData.title,
            description: projectData.description,
            author_name: projectData.author_name,
            author_faculty: projectData.author_faculty,
            author_email: projectData.author_email,
            target_amount: projectData.target_amount,
            collected_amount: 0,
            status: 'moderation',
            needs_team: projectData.needs_team,
            image_url: projectData.image_url,
            team_members: JSON.stringify(projectData.team),
            budget_items: JSON.stringify(projectData.budget),
            payment_details: projectData.payment_details || null
        };

        if (document.getElementById('hasDeadline').checked) {
            const days = parseInt(document.getElementById('projectDeadline').value);
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + days);
            finalData.deadline = deadline.toISOString().split('T')[0];
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        submitBtn.disabled = true;

        try {
            const { data, error } = await window.db
                .from('projects')
                .insert([finalData])
                .select();

            if (error) {
                throw error;
            }

            // ✅ ПРОСТАЯ РЕГИСТРАЦИЯ - просто сохраняем в localStorage
            registerUser(projectData.author_email, projectData.author_name, projectData.author_faculty);

            successMessage.style.display = 'block';
            summarySection.style.display = 'none';
            submitBtn.style.display = 'none';
            prevBtn.style.display = 'none';

            // Сохраняем профиль для автозаполнения
            saveProfileForAutofill(projectData.author_name, projectData.author_email, projectData.author_faculty);

        } catch (error) {
            console.error('Ошибка при создании проекта:', error);
            alert('Ошибка при создании проекта. Пожалуйста, попробуйте позже.');
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить проект';
            submitBtn.disabled = false;
        }
    }

    // ============================================
    // ПРОСТАЯ СИСТЕМА АККАУНТОВ (БЕЗ EMAIL)
    // ============================================

    function registerUser(email, name, faculty) {
        const user = {
            email: email,
            name: name,
            faculty: faculty || '',
            registeredAt: new Date().toISOString(),
            isActive: true
        };

        localStorage.setItem('campusHub_user', JSON.stringify(user));
        console.log('Пользователь зарегистрирован:', user);

        return user;
    }

    function autofillFromProfile() {
        const savedProfile = localStorage.getItem('campusHub_user');
        if (savedProfile) {
            try {
                const profile = JSON.parse(savedProfile);
                document.getElementById('authorName').value = profile.name || '';
                document.getElementById('authorEmail').value = profile.email || '';

                if (profile.faculty) {
                    document.getElementById('authorFaculty').value = profile.faculty;
                }

                showProfileNotification(profile.name);

            } catch (e) {
                console.warn('Не удалось загрузить профиль:', e);
            }
        }
    }

    function showProfileNotification(userName) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: #D4EDDA;
            color: #155724;
            padding: 12px 20px;
            border-radius: 10px;
            margin-bottom: 25px;
            border-left: 4px solid #C3E6CB;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: fadeIn 0.5s ease;
        `;

        notification.innerHTML = `
            <i class="fas fa-check-circle" style="color: #28a745;"></i>
            <span>Вы вошли как <strong>${escapeHtml(userName)}</strong>. Данные заполнены автоматически.</span>
        `;

        const formCard = document.querySelector('.form-card');
        if (formCard) {
            formCard.insertBefore(notification, formCard.firstChild);

            // Убираем через 10 секунд
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 10000);
        }
    }

    function saveProfileForAutofill(name, email, faculty) {
        const profile = {
            name: name,
            email: email,
            faculty: faculty || '',
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem('campusHub_profile', JSON.stringify(profile));
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Автосохранение черновика
    window.addEventListener('beforeunload', function() {
        if (currentStep > 1) {
            const draft = {
                step: currentStep,
                projectData: projectData,
                formValues: getFormValues()
            };
            localStorage.setItem('campusHub_draft', JSON.stringify(draft));
        }
    });

    // Восстановление черновика
    function restoreDraft() {
        try {
            const draft = localStorage.getItem('campusHub_draft');
            if (draft) {
                const data = JSON.parse(draft);
                if (confirm('У вас есть сохраненный черновик проекта. Хотите продолжить?')) {
                    setFormValues(data.formValues);
                    Object.assign(projectData, data.projectData);
                    currentStep = data.step;
                    updateStep();
                } else {
                    localStorage.removeItem('campusHub_draft');
                }
            }
        } catch (e) {
            console.warn('Не удалось восстановить черновик:', e);
            localStorage.removeItem('campusHub_draft');
        }
    }

    function getFormValues() {
        return {
            title: document.getElementById('projectTitle').value,
            description: document.getElementById('projectDescription').value,
            authorName: document.getElementById('authorName').value,
            authorFaculty: document.getElementById('authorFaculty').value,
            authorEmail: document.getElementById('authorEmail').value,
            projectImage: document.getElementById('projectImage').value,
            targetAmount: document.getElementById('targetAmount').value,
            paymentDetails: document.getElementById('paymentDetails').value,
            needsTeam: document.getElementById('needsTeam').checked,
            hasDeadline: document.getElementById('hasDeadline').checked,
            projectDeadline: document.getElementById('projectDeadline').value
        };
    }

    function setFormValues(values) {
        document.getElementById('projectTitle').value = values.title || '';
        document.getElementById('projectDescription').value = values.description || '';
        document.getElementById('authorName').value = values.authorName || '';
        document.getElementById('authorFaculty').value = values.authorFaculty || '';
        document.getElementById('authorEmail').value = values.authorEmail || '';
        document.getElementById('projectImage').value = values.projectImage || '';
        document.getElementById('targetAmount').value = values.targetAmount || '';
        document.getElementById('paymentDetails').value = values.paymentDetails || '';
        document.getElementById('needsTeam').checked = values.needsTeam || false;
        document.getElementById('hasDeadline').checked = values.hasDeadline || false;
        document.getElementById('projectDeadline').value = values.projectDeadline || '45';

        if (values.hasDeadline) {
            document.getElementById('deadlineField').style.display = 'block';
        }
    }

    // Запускаем восстановление черновика
    setTimeout(restoreDraft, 100);
});