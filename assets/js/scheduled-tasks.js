import { getSupabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

let scheduledTasks = [];

export async function loadScheduledTasks() {
    const user = getCurrentUser();
    if (!user) return [];

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar tarefas agendadas:', error.message);
        return [];
    }

    scheduledTasks = (data || []).map(t => ({
        ...t,
        isEditing: false
    }));
    return scheduledTasks;
}

export function getScheduledTasks() {
    return scheduledTasks;
}

function getTodayDateString() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
}

function escAttr(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function renderScheduledTasks() {
    const listContainer = document.getElementById('scheduled-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let dueCount = 0;
    const today = getTodayDateString();
    const dropdownContent = document.getElementById('dropdown-content');
    let dropdownHTML = '';

    scheduledTasks.forEach(task => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'scheduled-card';

        const isDue = task.due_date && task.due_date <= today;
        if (isDue) {
            cardDiv.classList.add('due');
            if (!task.notification_dismissed) {
                dueCount++;
                const taskTitle = task.title || 'Sem título';
                dropdownHTML += `
                    <div class="notification-item">
                        <span>A tarefa <strong>${taskTitle}</strong> já está no prazo!</span>
                        <button class="btn-clear-notif" onclick="window.ScheduledTasksModule.dismissNotification('${task.id}')">
                            <span class="material-symbols-rounded">done_all</span> Limpar Aviso
                        </button>
                    </div>
                `;
            }
        }

        const taskKey = task.id || task._draftId || '';
        if (task.isEditing) {
            cardDiv.innerHTML = `
                <div class="scheduled-header">
                    <input type="text" placeholder="Título da Tarefa Agendada" value="${escAttr(task.title || '')}" 
                           data-field="title" data-id="${taskKey}">
                </div>
                <textarea placeholder="Detalhes da tarefa..." 
                          data-field="description" data-id="${taskKey}">${task.description || ''}</textarea>
                <div class="scheduled-footer">
                    <div class="scheduled-date-group">
                        <span class="material-symbols-rounded">event</span> Data Final:
                        <input type="date" value="${task.due_date || ''}" 
                               data-field="due_date" data-id="${taskKey}">
                    </div>
                </div>
                <div class="scheduled-edit-actions">
                    <button class="btn-save" onclick="window.ScheduledTasksModule.saveScheduledTask('${taskKey}')">
                        <span class="material-symbols-rounded">save</span> Salvar Tarefa
                    </button>
                    <button class="btn-delete" onclick="window.ScheduledTasksModule.cancelScheduledTask('${taskKey}')">
                        <span class="material-symbols-rounded">close</span> Cancelar
                    </button>
                </div>
            `;
        } else {
            const displayDate = task.due_date
                ? task.due_date.split('-').reverse().join('/')
                : 'Sem data definida';
            const escapedTitle = (task.title || '(Sem título)').replace(/"/g, '&quot;');
            cardDiv.innerHTML = `
                <div class="view-actions">
                    <button class="btn-edit btn-icon-only" onclick="window.ScheduledTasksModule.toggleEditMode('${task.id}', true)" title="Editar Tarefa">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="btn-copy btn-icon-only" onclick="window.ScheduledTasksModule.copyScheduledTask('${task.id}')" title="Copiar Tarefa">
                        <span class="material-symbols-rounded">content_copy</span>
                    </button>
                    <button class="btn-remove-field btn-icon-only" onclick="window.ScheduledTasksModule.deleteScheduledTask('${task.id}')" title="Excluir Tarefa">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
                <div class="view-title">${task.title || '(Sem título)'}</div>
                <div class="view-details">${task.description || '(Sem descrição)'}</div>
                <div class="scheduled-date-group">
                    <span class="material-symbols-rounded">event</span> Data Final: ${displayDate}
                </div>
            `;
        }

        listContainer.appendChild(cardDiv);
    });

    const badge = document.getElementById('notification-badge');
    if (dueCount > 0) {
        badge.style.display = 'block';
        badge.innerText = dueCount;
        dropdownContent.innerHTML = dropdownHTML;
    } else {
        badge.style.display = 'none';
        dropdownContent.innerHTML = '<div class="no-notifications">Nenhuma nova notificação</div>';
    }

    setTimeout(() => {
        listContainer.querySelectorAll('textarea').forEach(el => {
            if (typeof autoGrow === 'function') autoGrow(el);
        });
        listContainer.querySelectorAll('input[data-field], textarea[data-field]').forEach(el => {
            el.addEventListener('input', () => {
                updateScheduledTask(el.dataset.id, el.dataset.field, el.value);
            });
            el.addEventListener('change', () => {
                updateScheduledTask(el.dataset.id, el.dataset.field, el.value);
            });
        });
    }, 10);
}

export async function addScheduledTask() {
    const user = getCurrentUser();
    if (!user) return;

    const draft = {
        id: null,
        _draftId: 'draft-' + Date.now(),
        user_id: user.id,
        title: '',
        description: '',
        due_date: null,
        notification_dismissed: false,
        isEditing: true
    };

    scheduledTasks.unshift(draft);
    renderScheduledTasks();
}

function findTask(key) {
    return scheduledTasks.find(t => (t.id || t._draftId) === key);
}

function updateScheduledTask(key, field, value) {
    const task = findTask(key);
    if (!task) return;

    task[field] = value;
    if (field === 'due_date') {
        task.notification_dismissed = false;
        renderScheduledTasks();
    }
}

export async function saveScheduledTask(key) {
    const task = findTask(key);
    if (!task) return;

    const user = getCurrentUser();
    if (!user) return;

    const payload = {
        title: task.title,
        description: task.description,
        due_date: task.due_date || null,
        notification_dismissed: !!task.notification_dismissed
    };

    const supabase = getSupabase();

    if (task.id) {
        const { error } = await supabase
            .from('scheduled_tasks')
            .update(payload)
            .eq('id', task.id);
        if (error) {
            console.error('Erro ao salvar tarefa agendada:', error.message);
            alert('Erro ao salvar. Tente novamente.');
            return;
        }
    } else {
        const { data, error } = await supabase
            .from('scheduled_tasks')
            .insert({ ...payload, user_id: user.id })
            .select()
            .single();
        if (error) {
            console.error('Erro ao criar tarefa agendada:', error.message);
            alert('Erro ao salvar. Tente novamente.');
            return;
        }
        task.id = data.id;
        delete task._draftId;
    }

    task.isEditing = false;
    delete task._savedValues;
    renderScheduledTasks();
}

export function cancelScheduledTask(key) {
    const task = findTask(key);
    if (!task) return;

    if (!task.id) {
        scheduledTasks = scheduledTasks.filter(t => (t.id || t._draftId) !== key);
    } else {
        if (task._savedValues) {
            Object.assign(task, task._savedValues);
        }
        task.isEditing = false;
    }
    delete task._savedValues;
    renderScheduledTasks();
}

export function toggleEditMode(key, isEditing) {
    const task = findTask(key);
    if (!task) return;
    if (isEditing && task.id) {
        task._savedValues = {
            title: task.title,
            description: task.description,
            due_date: task.due_date
        };
    }
    task.isEditing = isEditing;
    renderScheduledTasks();
}

export async function deleteScheduledTask(key) {
    const task = findTask(key);
    if (!task) return;

    if (!task.id) {
        scheduledTasks = scheduledTasks.filter(t => (t.id || t._draftId) !== key);
        renderScheduledTasks();
        return;
    }

    if (!confirm('Tem certeza que deseja excluir esta tarefa agendada?')) return;

    scheduledTasks = scheduledTasks.filter(t => t.id !== task.id);
    renderScheduledTasks();

    const supabase = getSupabase();
    await supabase.from('scheduled_tasks').delete().eq('id', task.id);
}

export async function dismissNotification(id) {
    const task = scheduledTasks.find(t => t.id === id);
    if (!task) return;

    task.notification_dismissed = true;
    renderScheduledTasks();

    const supabase = getSupabase();
    await supabase
        .from('scheduled_tasks')
        .update({ notification_dismissed: true })
        .eq('id', id);
}

export function copyScheduledTask(id) {
    const task = scheduledTasks.find(t => t.id === id);
    if (!task) return;

    const displayDate = task.due_date
        ? task.due_date.split('-').reverse().join('/')
        : 'Sem data';
    const textToCopy = `Título: ${task.title || ''}\nDetalhes: ${task.description || ''}\nData Final: ${displayDate}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Tarefa agendada copiada!');
    });
}

window.ScheduledTasksModule = { dismissNotification, toggleEditMode, saveScheduledTask, cancelScheduledTask, deleteScheduledTask, copyScheduledTask };
