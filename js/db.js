// db.js - подключение к базе данных
// Убраны все console.log

// Проверяем конфигурацию
if (!window.supabaseConfig || !window.supabaseConfig.key) {
    window.db = null;
} else if (typeof supabase === 'undefined') {
    window.db = null;
} else {
    try {
        // Создаем подключение к базе
        window.db = supabase.createClient(
            window.supabaseConfig.url,
            window.supabaseConfig.key
        );

        // Тестовый запрос
        testConnection();

    } catch (error) {
        window.db = null;
    }
}

// Функция проверки подключения
async function testConnection() {
    if (!window.db) return;

    try {
        // Простой запрос к таблице projects
        const { data, error } = await window.db
            .from('projects')
            .select('id')
            .limit(1);

        if (error) {
            // Проблема с подключением
        }

    } catch (err) {
        // Не удалось подключиться к базе данных
    }
}