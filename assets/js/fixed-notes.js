import { getSupabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

let fixedNotes = [];

export async function loadFixedNotes() {
    const user = getCurrentUser();
    if (!user) return [];

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('fixed_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

    if (error) {
        console.error('Erro ao carregar anotações:', error.message);
        return [];
    }

    fixedNotes = (data || []).map(n => ({
        ...n,
        isEditing: false
    }));
    return fixedNotes;
}

export function getFixedNotes() {
    return fixedNotes;
}

export function renderFixedNotes() {
    const listContainer = document.getElementById('fixed-notes-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    fixedNotes.forEach((note, index) => {
        const noteDiv = document.createElement('div');
        const noteColorClass = note.color ? `note-color-${note.color}` : 'note-color-default';
        noteDiv.className = `fixed-note-item ${noteColorClass}`;

        if (note.isEditing) {
            noteDiv.innerHTML = `
                <div class="inline-edit-form">
                    <input type="text" id="edit-fixed-title-${note.id}" value="${note.title || ''}" 
                           placeholder="Título da anotação (opcional)..." style="font-size: 14px; padding: 10px;">
                    <textarea id="edit-fixed-text-${note.id}" class="fixed-note-edit-textarea" 
                              placeholder="Digite a sua anotação..." 
                              style="font-size: 15px; padding: 10px;">${note.content || ''}</textarea>
                    <div class="fixed-note-form-actions" style="margin-top: 5px;">
                        <button class="btn-save" onclick="window.FixedNotesModule.saveFixedNoteEdit('${note.id}')" style="margin: 0; flex: 1; padding: 10px;">
                            <span class="material-symbols-rounded">save</span> Salvar
                        </button>
                        <button class="btn-delete" onclick="window.FixedNotesModule.toggleFixedNoteEdit('${note.id}', false)" style="margin: 0; flex: 1; padding: 10px;">
                            <span class="material-symbols-rounded">close</span> Cancelar
                        </button>
                    </div>
                </div>
            `;
        } else {
            const isFirst = index === 0;
            const isLast = index === fixedNotes.length - 1;
            const titleHTML = note.title ? `<div class="fixed-note-title-display">${note.title}</div>` : '';

            noteDiv.innerHTML = `
                <div class="fixed-note-content-area">
                    ${titleHTML}
                    <span class="fixed-note-text">${note.content || ''}</span>
                </div>
                <div class="fixed-note-actions">
                    <button class="btn-move btn-icon-only" onclick="window.FixedNotesModule.moveFixedNote(${index}, -1)" title="Mover para Cima" ${isFirst ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
                        <span class="material-symbols-rounded">arrow_upward</span>
                    </button>
                    <button class="btn-color-palette btn-icon-only" onclick="window.FixedNotesModule.changeFixedNoteColor('${note.id}')" title="Alterar Cor de Fundo">
                        <span class="material-symbols-rounded">palette</span>
                    </button>
                    <button class="btn-edit btn-icon-only" onclick="window.FixedNotesModule.toggleFixedNoteEdit('${note.id}', true)" title="Editar">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="btn-move btn-icon-only" onclick="window.FixedNotesModule.moveFixedNote(${index}, 1)" title="Mover para Baixo" ${isLast ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
                        <span class="material-symbols-rounded">arrow_downward</span>
                    </button>
                    <button class="btn-copy btn-icon-only" onclick="window.FixedNotesModule.copyFixedNote(this)" title="Copiar Texto">
                        <span class="material-symbols-rounded">content_copy</span>
                    </button>
                    <button class="btn-delete btn-icon-only" onclick="window.FixedNotesModule.removeFixedNote('${note.id}')" title="Excluir">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;
        }
        listContainer.appendChild(noteDiv);
    });
}

export function showFixedNoteForm() {
    document.getElementById('btn-show-fixed-form').style.display = 'none';
    document.getElementById('fixed-note-form').style.display = 'flex';
    document.getElementById('new-fixed-note-title').focus();
}

export function hideFixedNoteForm() {
    document.getElementById('fixed-note-form').style.display = 'none';
    document.getElementById('btn-show-fixed-form').style.display = 'flex';
    document.getElementById('new-fixed-note-title').value = '';
    document.getElementById('new-fixed-note-text').value = '';
    const textarea = document.getElementById('new-fixed-note-text');
    if (typeof autoGrow === 'function') autoGrow(textarea);
}

export async function saveFixedNote() {
    const user = getCurrentUser();
    if (!user) return;

    const noteTitle = document.getElementById('new-fixed-note-title').value.trim();
    const noteText = document.getElementById('new-fixed-note-text').value.trim();
    if (!noteText) {
        alert('Por favor, digite pelo menos o texto da anotação antes de salvar.');
        return;
    }

    const supabase = getSupabase();
    const maxPos = fixedNotes.length > 0
        ? Math.max(...fixedNotes.map(n => n.position)) + 1
        : 0;

    const { data, error } = await supabase
        .from('fixed_notes')
        .insert({
            user_id: user.id,
            title: noteTitle,
            content: noteText,
            color: 'default',
            position: maxPos
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao salvar anotação:', error.message);
        alert('Erro ao salvar. Tente novamente.');
        return;
    }

    fixedNotes.push({ ...data, isEditing: false });
    renderFixedNotes();
    hideFixedNoteForm();
}

export function toggleFixedNoteEdit(id, isEditing) {
    const note = fixedNotes.find(n => n.id === id);
    if (!note) return;
    note.isEditing = isEditing;
    renderFixedNotes();
}

export async function saveFixedNoteEdit(id) {
    const titleEl = document.getElementById(`edit-fixed-title-${id}`);
    const textEl = document.getElementById(`edit-fixed-text-${id}`);
    const noteTitle = titleEl.value.trim();
    const noteText = textEl.value.trim();

    if (!noteText) {
        alert('O texto da anotação não pode ficar vazio.');
        return;
    }

    const note = fixedNotes.find(n => n.id === id);
    if (!note) return;

    note.title = noteTitle;
    note.content = noteText;
    note.isEditing = false;

    const supabase = getSupabase();
    await supabase
        .from('fixed_notes')
        .update({ title: noteTitle, content: noteText })
        .eq('id', id);

    renderFixedNotes();
}

const CORES = ['default', 'yellow', 'blue', 'green', 'pink'];

export async function changeFixedNoteColor(id) {
    const note = fixedNotes.find(n => n.id === id);
    if (!note) return;

    const corAtual = note.color || 'default';
    const proximoIndice = (CORES.indexOf(corAtual) + 1) % CORES.length;
    note.color = CORES[proximoIndice];

    const supabase = getSupabase();
    await supabase
        .from('fixed_notes')
        .update({ color: note.color })
        .eq('id', id);

    renderFixedNotes();
}

export async function moveFixedNote(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fixedNotes.length) return;

    const temp = fixedNotes[index];
    fixedNotes[index] = fixedNotes[newIndex];
    fixedNotes[newIndex] = temp;

    fixedNotes.forEach((n, i) => n.position = i);

    const supabase = getSupabase();
    for (const note of fixedNotes) {
        if (note.id) {
            await supabase
                .from('fixed_notes')
                .update({ position: note.position })
                .eq('id', note.id);
        }
    }

    renderFixedNotes();
}

export function copyFixedNote(buttonElement) {
    const noteDiv = buttonElement.closest('.fixed-note-item');
    const textElement = noteDiv.querySelector('.fixed-note-text');
    const textToCopy = textElement.innerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const bg = noteDiv.style.backgroundColor;
        noteDiv.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#2e5c3a' : '#E8F5E9';
        setTimeout(() => noteDiv.style.backgroundColor = bg, 500);
    });
}

export async function removeFixedNote(id) {
    if (!confirm('Tem a certeza que deseja excluir esta anotação?')) return;

    fixedNotes = fixedNotes.filter(n => n.id !== id);
    renderFixedNotes();

    const supabase = getSupabase();
    await supabase.from('fixed_notes').delete().eq('id', id);
}

window.FixedNotesModule = {
    saveFixedNoteEdit,
    toggleFixedNoteEdit,
    changeFixedNoteColor,
    moveFixedNote,
    copyFixedNote,
    removeFixedNote
};
