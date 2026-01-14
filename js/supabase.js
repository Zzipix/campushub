// ==== ВСТАВЬ СВОЙ КЛЮЧ НАКОНЕЦ-ТО! ====
const CAMPUSHUB_SUPABASE_URL = 'https://oeaghicieglymzftxso.supabase.co';
const CAMPUSHUB_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lYWdoaWNpZWdqdnJuemZ0eHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExMTEsImV4cCI6MjA4Mzc4NzExMX0.AOAaCRXtbqWPpUj5V057-NmJvenS7GUHzEmbrDPyxEw';

(function () {
    if (window.supabaseClient) {
        return;
    }

    if (typeof window.supabase === 'undefined') {
        window.supabaseClient = null;
        return;
    }

    try {
        window.supabaseClient = window.supabase.createClient(
            CAMPUSHUB_SUPABASE_URL,
            CAMPUSHUB_SUPABASE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        setTimeout(testSupabaseConnection, 500);

    } catch (error) {
        window.supabaseClient = null;
    }
})();

async function testSupabaseConnection() {
    if (!window.supabaseClient) return;

    try {
        const { data, error } = await window.supabaseClient
            .from('projects')
            .select('id', { count: 'exact', head: true });

        if (error) {
            // Ошибка подключения
        }

    } catch (err) {
        // Не удалось подключиться
    }
}

if (window.supabaseClient) {
    // Готово
}