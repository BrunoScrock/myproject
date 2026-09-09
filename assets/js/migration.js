import { getSupabase } from './supabase.js';
import { getCurrentUser } from './auth.js';
import { getTasks, loadTasks, renderTasks } from './tasks.js';
import { getScheduledTasks, loadScheduledTasks, renderScheduledTasks } from './scheduled-tasks.js';
import { getFixedNotes, loadFixedNotes, renderFixedNotes } from './fixed-notes.js';

const MIGRATION_KEY = 'supabase_migration_completed';

export function checkMigrationNeeded() {
    const migrationDone = localStorage.getItem(MIGRATION_KEY);
    if (migrationDone) return false;

    const hasLocalTasks = localStorage.getItem('dailyTasks');
    const hasLocalScheduled = localStorage.getItem('scheduledTasks');
    const hasLocalNotes = localStorage.getItem('fixedNotes');

    return !!(hasLocalTasks || hasLocalScheduled || hasLocalNotes);
}

export function showMigrationModal() {
    const modal = document.getElementById('migration-modal');
    if (modal) modal.style.display = 'flex';
}

function hideMigrationModal() {
    const modal = document.getElementById('migration-modal');
    if (modal) modal.style.display = 'none';
}

export async function migrateLocalData() {
    const user = getCurrentUser();
    if (!user) return;

    const supabase = getSupabase();
    let importedCount = 0;

    try {
        const localTasks = JSON.parse(localStorage.getItem('dailyTasks'));
        if (localTasks && Object.keys(localTasks).length > 0) {
            const tasksToInsert = Object.values(localTasks).map((desc, idx) => ({
                user_id: user.id,
                description: desc || '',
                position: idx
            }));
            const { error } = await supabase.from('tasks').insert(tasksToInsert);
            if (!error) importedCount += tasksToInsert.length;
        }

        const localScheduled = JSON.parse(localStorage.getItem('scheduledTasks'));
        if (localScheduled && localScheduled.length > 0) {
            const scheduledToInsert = localScheduled.map(t => ({
                user_id: user.id,
                title: t.title || '',
                description: t.text || '',
                due_date: t.date || null,
                notification_dismissed: t.notificationDismissed || false
            }));
            const { error } = await supabase.from('scheduled_tasks').insert(scheduledToInsert);
            if (!error) importedCount += scheduledToInsert.length;
        }

        const localNotes = JSON.parse(localStorage.getItem('fixedNotes'));
        if (localNotes && localNotes.length > 0) {
            const notesToInsert = localNotes.map((n, idx) => ({
                user_id: user.id,
                title: n.title || '',
                content: n.text || '',
                color: n.color || 'default',
                position: idx
            }));
            const { error } = await supabase.from('fixed_notes').insert(notesToInsert);
            if (!error) importedCount += notesToInsert.length;
        }

        localStorage.setItem(MIGRATION_KEY, 'true');
        hideMigrationModal();

        if (importedCount > 0) {
            await loadTasks();
            await loadScheduledTasks();
            await loadFixedNotes();
            renderTasks();
            renderScheduledTasks();
            renderFixedNotes();
            alert(`${importedCount} item(ns) importado(s) com sucesso!`);
        } else {
            alert('Nenhum dado encontrado para importar.');
        }
    } catch (err) {
        console.error('Erro na migração:', err);
        alert('Ocorreu um erro durante a importação. Tente novamente.');
    }
}

export function skipMigration() {
    localStorage.setItem(MIGRATION_KEY, 'true');
    hideMigrationModal();
}

window.MigrationModule = { migrateLocalData, skipMigration };
