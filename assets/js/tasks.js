import { getSupabase } from './supabase.js';
import { getCurrentUser } from './auth.js';
import { escapeHtml, toast, confirmAction, copyToClipboard } from './ui.js';

let tasks = [];
let saveTimeout = null;
const dirtyTasks = new Set();

function debounceSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveChangedTasks(), 800);
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
        toast('Nao foi possivel carregar as tarefas do dia.', 'error');
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
                      data-task-index="${index}">${escapeHtml(task.description || '')}</textarea>
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
            dirtyTasks.add(tasks[index]);
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

export async function deleteTaskField(index) {
    const ok = await confirmAction('Deseja excluir este campo de tarefa?', 'Excluir campo');
    if (!ok) return;

    const deletedId = tasks[index]?.id;
    tasks.splice(index, 1);
    tasks.forEach((t, i) => t.position = i);

    if (tasks.length === 0) {
        tasks.push({ id: null, user_id: getCurrentUser().id, description: '', position: 0 });
    }

    renderTasks();
    deleteTaskFromDB(deletedId);
    tasks.forEach(t => dirtyTasks.add(t));
    debounceSave();
}

export async function copyTask(index) {
    const textarea = document.querySelector(`textarea[data-task-index="${index}"]`);
    if (!textarea || !textarea.value.trim()) {
        toast('A tarefa esta vazia.', 'warning');
        return;
    }
    const ok = await copyToClipboard(textarea.value);
    if (ok) {
        textarea.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#134E4A' : '#CCFBF1';
        setTimeout(() => textarea.style.backgroundColor = '', 500);
    } else {
        toast('Nao foi possivel copiar a tarefa.', 'error');
    }
}

export function clearTask(index) {
    const textarea = document.querySelector(`textarea[data-task-index="${index}"]`);
    if (textarea) {
        textarea.value = '';
        if (typeof autoGrow === 'function') autoGrow(textarea);
    }
    tasks[index].description = '';
    dirtyTasks.add(tasks[index]);
    debounceSave();
}

async function saveChangedTasks() {
    const user = getCurrentUser();
    if (!user) return;

    const pending = Array.from(dirtyTasks);
    dirtyTasks.clear();

    const supabase = getSupabase();
    let failed = 0;

    for (const task of pending) {
        if (!tasks.includes(task)) continue;

        if (!task.id) {
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    description: task.description,
                    position: task.position
                })
                .select()
                .single();
            if (error) {
                console.error('Erro ao salvar tarefa:', error.message);
                dirtyTasks.add(task);
                failed++;
            } else if (data) {
                task.id = data.id;
            }
        } else {
            const { error } = await supabase
                .from('tasks')
                .update({ description: task.description, position: task.position })
                .eq('id', task.id);
            if (error) {
                console.error('Erro ao atualizar tarefa:', error.message);
                dirtyTasks.add(task);
                failed++;
            }
        }
    }

    if (failed > 0) {
        toast('Nao foi possivel gravar uma ou mais tarefas. Verifique sua conexao.', 'error', 5000);
    }
}

async function deleteTaskFromDB(id) {
    if (!id) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('Erro ao excluir tarefa:', error.message);
}

window.TasksModule = { copyTask, clearTask, deleteTaskField };
