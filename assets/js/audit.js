import { getSupabase } from './supabase.js';

const TABLE_LABELS = {
    tasks: 'Tarefas do Dia',
    scheduled_tasks: 'Tarefas Agendadas',
    fixed_notes: 'Anotações Fixas',
    dispatch_templates: 'Modelos de Despacho',
    dispatch_history: 'Histórico de Despachos'
};

const HIDDEN_FIELDS = ['id', 'user_id', 'created_at', 'updated_at', 'is_editing'];

let allEntries = [];

export async function loadAuditLog() {
    const { data, error } = await getSupabase()
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        if (/audit_log/.test(error.message)) {
            showAuditMessage('A tabela de auditoria ainda não existe no banco. Rode o script docs/audit.sql no SQL Editor do Supabase e atualize.');
        } else {
            console.error('Erro ao carregar auditoria:', error.message);
            showAuditMessage('Erro ao carregar auditoria: ' + error.message);
        }
        allEntries = [];
        return;
    }

    allEntries = data || [];
    renderAuditEntries();
}

function showAuditMessage(message) {
    const list = document.getElementById('audit-list');
    const empty = document.getElementById('audit-empty');
    const countEl = document.getElementById('audit-count');
    if (list) list.innerHTML = '';
    if (countEl) countEl.textContent = '';
    if (empty) {
        empty.style.display = 'block';
        empty.textContent = message;
    }
}

function getFilters() {
    return {
        table: document.getElementById('audit-filter-table')?.value || '',
        operation: document.getElementById('audit-filter-operation')?.value || '',
        search: (document.getElementById('audit-search')?.value || '').trim().toLowerCase()
    };
}

export function renderAuditEntries() {
    const filters = getFilters();
    const entries = allEntries.filter(e => {
        if (filters.table && e.table_name !== filters.table) return false;
        if (filters.operation && e.operation !== filters.operation) return false;
        if (filters.search) {
            const haystack = JSON.stringify(e) || '';
            if (!haystack.toLowerCase().includes(filters.search)) return false;
        }
        return true;
    });

    const list = document.getElementById('audit-list');
    const empty = document.getElementById('audit-empty');
    const countEl = document.getElementById('audit-count');

    if (!list) return;
    if (countEl) countEl.textContent = entries.length === 1 ? '1 registro' : `${entries.length} registros`;
    list.innerHTML = '';

    if (entries.length === 0) {
        if (empty) {
            empty.style.display = 'block';
            empty.textContent = 'Nenhum registro encontrado para os filtros escolhidos.';
        }
        return;
    }

    if (empty) empty.style.display = 'none';
    entries.forEach(e => list.appendChild(buildAuditItem(e)));
}

function buildAuditItem(entry) {
    const div = document.createElement('div');
    div.className = `audit-item audit-op-${(entry.operation || '').toLowerCase()}`;

    const header = document.createElement('div');
    header.className = 'audit-item-header';

    const badge = document.createElement('span');
    badge.className = 'audit-badge';
    badge.textContent = entry.operation || '';

    const table = document.createElement('span');
    table.className = 'audit-table';
    table.textContent = TABLE_LABELS[entry.table_name] || entry.table_name;

    const time = document.createElement('span');
    time.className = 'audit-time';
    time.textContent = formatDateTime(entry.created_at);

    header.append(badge, table, time);
    div.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'audit-meta';
    const rid = entry.record_id ? String(entry.record_id) : '-';
    meta.textContent = 'Registro: ' + (rid.length > 13 ? rid.slice(0, 13) + '…' : rid);
    div.appendChild(meta);

    const diff = buildDiff(entry);
    if (diff) div.appendChild(diff);

    return div;
}

function buildDiff(entry) {
    const oldData = entry.old_data || {};
    const newData = entry.new_data || {};
    const keys = new Set(
        [...Object.keys(oldData), ...Object.keys(newData)].filter(k => !HIDDEN_FIELDS.includes(k))
    );

    if (keys.size === 0) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'audit-diff';

    Array.from(keys).sort((a, b) => a.localeCompare(b)).forEach(k => {
        const row = document.createElement('div');
        row.className = 'audit-diff-row';

        const keyEl = document.createElement('span');
        keyEl.className = 'k';
        keyEl.textContent = k;
        row.appendChild(keyEl);
        row.appendChild(document.createTextNode(': '));

        const hasOld = oldData[k] !== undefined;
        const hasNew = newData[k] !== undefined;

        if (hasOld && hasNew) {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'old';
            oldSpan.textContent = formatValue(oldData[k]);
            const arrow = document.createElement('span');
            arrow.className = 'arrow';
            arrow.textContent = ' → ';
            const newSpan = document.createElement('span');
            newSpan.className = 'new';
            newSpan.textContent = formatValue(newData[k]);
            row.append(oldSpan, arrow, newSpan);
        } else if (hasNew) {
            const newSpan = document.createElement('span');
            newSpan.className = 'new';
            newSpan.textContent = formatValue(newData[k]);
            row.append(newSpan);
        } else {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'old';
            oldSpan.textContent = formatValue(oldData[k]);
            row.append(oldSpan);
        }

        wrapper.appendChild(row);
    });

    return wrapper;
}

function formatValue(v) {
    if (v === null || v === undefined || v === '') return '(vazio)';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function resetAuditFilters() {
    ['audit-filter-table', 'audit-filter-operation'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const search = document.getElementById('audit-search');
    if (search) search.value = '';
    renderAuditEntries();
}