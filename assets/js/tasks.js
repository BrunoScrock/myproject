import { getSupabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

let tasks = [];
let saveTimeout = null;

function debounceSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveAllTasks(), 800);
}

export async function loadTasks() {
    const user = getCurrentUser();
    if (!user) return [];

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

    if (error) {
        console.error('Erro ao carregar tarefas:', error.message);
        return [];
    }

    tasks = data || [];
    if (tasks.length === 0) {
        tasks = [
            { id: null, user_id: user.id, description: '', position: 0 },
            { id: null, user_id: user.id, description: '', position: 1 },
            { id: null, user_id: user.id, description: '', position: 2 }
        ];
    }
    return tasks;
}

export function getTasks() {
    return tasks;
}

export function renderTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;
    taskList.innerHTML = '';

    tasks.forEach((task, index) => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        const num = index + 1;
        taskDiv.innerHTML = `
            <div class="task-number">${num}.</div>
            <textarea id="task-input-${task.id || 'new-' + index}" 
                      placeholder="Descreva a tarefa ${num}..." 
                      oninput="autoGrow(this)" 
                      data-task-index="${index}">${task.description || ''}</textarea>
            <button class="btn-copy btn-icon-only" onclick="window.TasksModule.copyTask(${index})" title="Copiar">
                <span class="material-symbols-rounded">content_copy</span>
            </button>
            <button class="btn-delete btn-icon-only" onclick="window.TasksModule.clearTask(${index})" title="Limpar Texto">
                <span class="material-symbols-rounded">close</span>
            </button>
            <button class="btn-remove-field btn-icon-only" onclick="window.TasksModule.deleteTaskField(${index})" title="Excluir Campo">
                <span class="material-symbols-rounded">delete</span>
            </button>
        `;
        taskList.appendChild(taskDiv);

        const textarea = taskDiv.querySelector('textarea');
        textarea.addEventListener('input', () => {
            tasks[index].description = textarea.value;
            debounceSave();
        });
    });

    setTimeout(() => {
        document.querySelectorAll('#task-list textarea').forEach(el => {
            if (typeof autoGrow === 'function') autoGrow(el);
        });
    }, 10);
}

export function addNewTaskField() {
    const user = getCurrentUser();
    if (!user) return;

    tasks.push({
        id: null,
        user_id: user.id,
        description: '',
        position: tasks.length
    });
    renderTasks();

    const newIndex = tasks.length - 1;
    const newField = document.querySelector(`#task-list textarea[data-task-index="${newIndex}"]`);
    if (newField) newField.focus();
}

export function deleteTaskField(index) {
    if (!confirm('Tem certeza que deseja excluir este campo de tarefa?')) return;
    const deletedId = tasks[index]?.id;
    tasks.splice(index, 1);
    tasks.forEach((t, i) => t.position = i);

    if (tasks.length === 0) {
        tasks.push({ id: null, user_id: getCurrentUser().id, description: '', position: 0 });
    }

    renderTasks();
    deleteTaskFromDB(deletedId);
    debounceSave();
}

export function copyTask(index) {
    const textarea = document.querySelector(`textarea[data-task-index="${index}"]`);
    if (!textarea || !textarea.value.trim()) {
        alert('A tarefa está vazia!');
        return;
    }
    navigator.clipboard.writeText(textarea.value).then(() => {
        const bg = textarea.style.backgroundColor;
        textarea.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#2e5c3a' : '#E8F5E9';
        setTimeout(() => textarea.style.backgroundColor = bg, 500);
    });
}

export function clearTask(index) {
    const textarea = document.querySelector(`textarea[data-task-index="${index}"]`);
    if (textarea) {
        textarea.value = '';
        if (typeof autoGrow === 'function') autoGrow(textarea);
    }
    tasks[index].description = '';
    debounceSave();
}

async function saveAllTasks() {
    const user = getCurrentUser();
    if (!user) return;

    const supabase = getSupabase();

    const toInsert = tasks.filter(t => !t.id).map((t, i) => ({
        user_id: user.id,
        description: t.description,
        position: t.position
    }));

    const toUpdate = tasks.filter(t => t.id).map(t => ({
        id: t.id,
        description: t.description,
        position: t.position
    }));

    if (toInsert.length > 0) {
        const { data: inserted } = await supabase
            .from('tasks')
            .insert(toInsert)
            .select();
        if (inserted) {
            let insertIdx = 0;
            for (let i = 0; i < tasks.length; i++) {
                if (!tasks[i].id) {
                    tasks[i].id = inserted[insertIdx]?.id;
                    insertIdx++;
                }
            }
        }
    }

    for (const t of toUpdate) {
        await supabase
            .from('tasks')
            .update({ description: t.description, position: t.position })
            .eq('id', t.id);
    }
}

async function deleteTaskFromDB(id) {
    if (!id) return;
    const supabase = getSupabase();
    await supabase.from('tasks').delete().eq('id', id);
}

window.TasksModule = { copyTask, clearTask, deleteTaskField };
