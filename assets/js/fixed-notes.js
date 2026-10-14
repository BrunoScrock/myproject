import { getSupabase } from './supabase.js';
import { getCurrentUser } from './auth.js';
import { escapeHtml, escapeAttr, toast, confirmAction, copyToClipboard } from './ui.js';

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
        console.error('Erro ao carregar anotacoes:', error.message);
        toast('Nao foi possivel carregar as anotacoes.', 'error');
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

    if (fixedNotes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <span class="material-symbols-rounded">sticky_note_2</span>
            <p>Nenhuma anotacao fixa. Clique em <strong>Adicionar Anotacao</strong> para criar a primeira.</p>
        `;
        listContainer.appendChild(empty);
        return;
    }

    fixedNotes.forEach((note, index) => {
        const noteDiv = document.createElement('div');
        const noteColorClass = note.color ? `note-color-${note.color}` : 'note-color-default';
        noteDiv.className = `fixed-note-item ${noteColorClass}`;

        if (note.isEditing) {
            noteDiv.innerHTML = `
                <div class="inline-edit-form">
                    <input type="text" id="edit-fixed-title-${note.id}" value="${escapeAttr(note.title || '')}"
                           placeholder="Titulo da anotacao (opcional)…">
                    <textarea id="edit-fixed-text-${note.id}" class="fixed-note-edit-textarea"
                              placeholder="Digite a sua anotacao…">${escapeHtml(note.content || '')}</textarea>
                    <div class="fixed-note-form-actions">
                        <button class="btn-save" onclick="window.FixedNotesModule.saveFixedNoteEdit('${note.id}')">
                            <span class="material-symbols-rounded">save</span> Salvar
                        </button>
                        <button class="btn-delete btn-block" onclick="window.FixedNotesModule.toggleFixedNoteEdit('${note.id}', false)">
                            <span class="material-symbols-rounded">close</span> Cancelar
                        </button>
                    </div>
                </div>
            `;
        } else {
            const isFirst = index === 0;
            const isLast = index === fixedNotes.length - 1;
            const titleHTML = note.title
                ? `<div class="fixed-note-title-display">${escapeHtml(note.title)}</div>`
                : '';

            noteDiv.innerHTML = `
                <div class="fixed-note-content-area" role="button" tabindex="0"
                     onclick="window.FixedNotesModule.openFixedNoteModal('${note.id}')"
                     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.FixedNotesModule.openFixedNoteModal('${note.id}');}"
                     title="Clique para expandir">
                    ${titleHTML}
                    <span class="fixed-note-text">${escapeHtml(note.content || '')}</span>
                </div>
                <div class="fixed-note-actions">
                    <button class="btn-move" onclick="window.FixedNotesModule.moveFixedNote(${index}, -1)" title="Mover para Cima" ${isFirst ? 'disabled' : ''}>
                        <span class="material-symbols-rounded">arrow_upward</span>
                    </button>
                    <button class="btn-color-palette" onclick="window.FixedNotesModule.changeFixedNoteColor('${note.id}')" title="Alterar Cor de Fundo">
                        <span class="material-symbols-rounded">palette</span>
                    </button>
                    <button class="btn-edit" onclick="window.FixedNotesModule.toggleFixedNoteEdit('${note.id}', true)" title="Editar">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="btn-move" onclick="window.FixedNotesModule.moveFixedNote(${index}, 1)" title="Mover para Baixo" ${isLast ? 'disabled' : ''}>
                        <span class="material-symbols-rounded">arrow_downward</span>
                    </button>
                    <button class="btn-copy btn-icon-only" onclick="window.FixedNotesModule.copyFixedNote(this)" title="Copiar Texto">
                        <span class="material-symbols-rounded">content_copy</span>
                    </button>
                    <button class="btn-delete" onclick="window.FixedNotesModule.removeFixedNote('${note.id}')" title="Excluir">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;
        }
        listContainer.appendChild(noteDiv);
    });
}

export function showFixedNoteForm() {
    const btn = document.getElementById('btn-show-fixed-form');
    const form = document.getElementById('fixed-note-form');
    if (btn) btn.style.display = 'none';
    if (form) form.style.display = 'flex';
    document.getElementById('new-fixed-note-title')?.focus();
}

export function hideFixedNoteForm() {
    const btn = document.getElementById('btn-show-fixed-form');
    const form = document.getElementById('fixed-note-form');
    if (form) form.style.display = 'none';
    if (btn) btn.style.display = 'inline-flex';
    const titleEl = document.getElementById('new-fixed-note-title');
    const textEl = document.getElementById('new-fixed-note-text');
    if (titleEl) titleEl.value = '';
    if (textEl) {
        textEl.value = '';
        if (typeof autoGrow === 'function') autoGrow(textEl);
    }
}

export async function saveFixedNote() {
    const user = getCurrentUser();
    if (!user) return;

    const noteTitle = document.getElementById('new-fixed-note-title').value.trim();
    const noteText = document.getElementById('new-fixed-note-text').value.trim();
    if (!noteText) {
        toast('Digite pelo menos o texto da anotacao antes de salvar.', 'warning');
        document.getElementById('new-fixed-note-text')?.focus();
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
        console.error('Erro ao salvar anotacao:', error.message);
        toast('Erro ao salvar a anotacao. Tente novamente.', 'error');
        return;
    }

    fixedNotes.push({ ...data, isEditing: false });
    renderFixedNotes();
    hideFixedNoteForm();
    toast('Anotacao salva.', 'success');
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
        toast('O texto da anotacao nao pode ficar vazio.', 'warning');
        return;
    }

    const note = fixedNotes.find(n => n.id === id);
    if (!note) return;

    note.title = noteTitle;
    note.content = noteText;
    note.isEditing = false;

    const supabase = getSupabase();
    const { error } = await supabase
        .from('fixed_notes')
        .update({ title: noteTitle, content: noteText })
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar anotacao:', error.message);
        toast('Erro ao salvar a anotacao.', 'error');
        return;
    }

    renderFixedNotes();
    toast('Anotacao atualizada.', 'success');
}

const CORES = ['default', 'yellow', 'blue', 'green', 'pink'];

export async function changeFixedNoteColor(id) {
    const note = fixedNotes.find(n => n.id === id);
    if (!note) return;

    const corAtual = note.color || 'default';
    const proximoIndice = (CORES.indexOf(corAtual) + 1) % CORES.length;
    note.color = CORES[proximoIndice];

    const supabase = getSupabase();
    const { error } = await supabase
        .from('fixed_notes')
        .update({ color: note.color })
        .eq('id', id);

    if (error) {
        console.error('Erro ao alterar cor da anotacao:', error.message);
    }
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
            const { error } = await supabase
                .from('fixed_notes')
                .update({ position: note.position })
                .eq('id', note.id);
            if (error) {
                console.error('Erro ao reordenar anotacoes:', error.message);
                toast('Nao foi possivel salvar a nova ordem.', 'error');
                break;
            }
        }
    }

    renderFixedNotes();
}

export async function copyFixedNote(buttonElement) {
    const noteDiv = buttonElement.closest('.fixed-note-item');
    const textElement = noteDiv.querySelector('.fixed-note-text');
    const textToCopy = textElement.innerText;

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
        noteDiv.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#134E4A' : '#CCFBF1';
        setTimeout(() => noteDiv.style.backgroundColor = '', 500);
    } else {
        toast('Nao foi possivel copiar a anotacao.', 'error');
    }
}

export async function removeFixedNote(id) {
    const ok = await confirmAction('Deseja excluir esta anotacao?', 'Excluir anotacao');
    if (!ok) return;

    fixedNotes = fixedNotes.filter(n => n.id !== id);
    renderFixedNotes();

    const supabase = getSupabase();
    const { error } = await supabase.from('fixed_notes').delete().eq('id', id);
    if (error) {
        console.error('Erro ao excluir anotacao:', error.message);
        toast('Nao foi possivel excluir a anotacao.', 'error');
        return;
    }
    toast('Anotacao excluida.', 'success');
}

export function openFixedNoteModal(id) {
    const note = fixedNotes.find(n => n.id === id);
    if (!note) return;

    const modal = document.getElementById('fixed-note-modal');
    if (!modal) return;

    const card = modal.querySelector('.fixed-note-modal-card');
    const titleEl = document.getElementById('fixed-note-modal-title');
    const textEl = document.getElementById('fixed-note-modal-text');

    const colorClass = note.color ? `note-color-${note.color}` : 'note-color-default';
    card.className = `fixed-note-modal-card ${colorClass}`;
    titleEl.textContent = note.title || '';
    titleEl.style.display = note.title ? 'block' : 'none';
    textEl.textContent = note.content || '';

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.fixed-note-modal-close')?.focus();
}

export function closeFixedNoteModal() {
    const modal = document.getElementById('fixed-note-modal');
    if (!modal) return;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFixedNoteModal();
});

window.FixedNotesModule = {
    saveFixedNoteEdit,
    toggleFixedNoteEdit,
    changeFixedNoteColor,
    moveFixedNote,
    copyFixedNote,
    removeFixedNote,
    openFixedNoteModal,
    closeFixedNoteModal
};
