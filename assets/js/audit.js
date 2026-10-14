import { getSupabase } from './supabase.js';
import { toast } from './ui.js';

const TABLE_LABELS = {
    tasks: 'Tarefas do Dia',
    scheduled_tasks: 'Tarefas Agendadas',
    fixed_notes: 'Anotações Fixas',
    dispatch_templates: 'Modelos de Despacho',
    dispatch_history: 'Histórico de Despachos'
};

const OP_LABELS = {
    INSERT: 'Criação',
    UPDATE: 'Alteração',
    DELETE: 'Exclusão'
};

const OP_ICONS = {
    INSERT: 'add',
    UPDATE: 'edit',
    DELETE: 'delete'
};

const HIDDEN_FIELDS = ['id', 'user_id', 'created_at', 'updated_at', 'is_editing'];

const PAGE_SIZE = 20;

let allEntries = [];
let currentPage = 1;
let lastFilterKey = '';
let expandedRows = new Set();

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
            showAuditMessage('Não foi possível carregar a auditoria. Verifique sua conexão.');
            toast('Erro ao carregar a auditoria.', 'error');
        }
        allEntries = [];
        currentPage = 1;
        renderAuditPagination(0);
        return;
    }

    allEntries = data || [];
    currentPage = 1;
    renderAuditEntries();
}

function showAuditMessage(message) {
    const list = document.getElementById('audit-list');
    const empty = document.getElementById('audit-empty');
    const countEl = document.getElementById('audit-count');
    const wrap = document.querySelector('.audit-table-wrap');
    if (list) list.innerHTML = '';
    if (countEl) countEl.textContent = '';
    if (wrap) wrap.style.display = message.includes('ainda não existe') ? 'none' : '';
    if (empty) {
        empty.style.display = 'block';
        const p = empty.querySelector('p');
        if (p) p.textContent = message;
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

    const filterKey = [filters.table, filters.operation, filters.search].join('|');
    if (filterKey !== lastFilterKey) {
        currentPage = 1;
        lastFilterKey = filterKey;
    }

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
    const wrap = document.querySelector('.audit-table-wrap');

    if (!list) return;
    if (countEl) countEl.textContent = entries.length === 1 ? '1 registro' : `${entries.length} registros`;
    list.innerHTML = '';

    if (entries.length === 0) {
        if (empty) {
            empty.style.display = 'block';
            const p = empty.querySelector('p');
            if (p) p.textContent = 'Nenhum registro encontrado para os filtros escolhidos.';
        }
        renderAuditPagination(0);
        return;
    }

    if (empty) empty.style.display = 'none';
    if (wrap) wrap.style.display = '';

    const totalPages = Math.ceil(entries.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageEntries = entries.slice(start, start + PAGE_SIZE);

    const frag = document.createDocumentFragment();
    pageEntries.forEach(e => frag.appendChild(buildAuditRow(e)));
    list.appendChild(frag);
    renderAuditPagination(totalPages);
}

export function goToAuditPage(page) {
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
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, page), totalPages);
    renderAuditEntries();
}

function renderAuditPagination(totalPages) {
    const container = document.getElementById('audit-pagination');
    if (!container) return;
    container.innerHTML = '';

    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.className = 'btn-audit-page';
    prev.innerHTML = '<span class="material-symbols-rounded">chevron_left</span>';
    prev.disabled = currentPage <= 1;
    prev.onclick = () => goToAuditPage(currentPage - 1);

    const next = document.createElement('button');
    next.className = 'btn-audit-page';
    next.innerHTML = '<span class="material-symbols-rounded">chevron_right</span>';
    next.disabled = currentPage >= totalPages;
    next.onclick = () => goToAuditPage(currentPage + 1);

    const info = document.createElement('span');
    info.className = 'audit-page-info';
    info.textContent = `Página ${currentPage} de ${totalPages}`;

    container.append(prev, info, next);
}

function rowKey(entry) {
    return `${entry.created_at}-${entry.operation}-${entry.record_id ?? ''}`;
}

/**
 * Monta a linha principal da tabela. O diff fica numa linha extra,
 * revelada sob demanda pelo botao de campos — mantem a tabela compacta.
 */
function buildAuditRow(entry) {
    const tr = document.createElement('tr');
    const op = (entry.operation || '').toUpperCase();
    tr.className = `audit-op-${op.toLowerCase()}`;

    const key = rowKey(entry);
    const expanded = expandedRows.has(key);
    const diff = buildDiffLines(entry);

    const tdWhen = document.createElement('td');
    tdWhen.className = 'col-when';
    const time = document.createElement('span');
    time.className = 'audit-time';
    time.textContent = formatDateTime(entry.created_at);
    tdWhen.appendChild(time);

    const tdOp = document.createElement('td');
    tdOp.className = 'col-op';
    const badge = document.createElement('span');
    badge.className = 'audit-badge';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = OP_ICONS[op] || 'help';
    badge.append(icon, OP_LABELS[op] || entry.operation || '');
    tdOp.appendChild(badge);

    const tdTable = document.createElement('td');
    tdTable.className = 'col-table';
    const tableName = document.createElement('span');
    tableName.className = 'audit-table-name';
    tableName.textContent = TABLE_LABELS[entry.table_name] || entry.table_name;
    tdTable.appendChild(tableName);

    const tdRecord = document.createElement('td');
    tdRecord.className = 'col-record col-record-cell';
    const rid = entry.record_id ? String(entry.record_id) : '-';
    const meta = document.createElement('span');
    meta.className = 'audit-meta';
    meta.textContent = rid.length > 13 ? rid.slice(0, 13) + '\u2026' : rid;
    tdRecord.appendChild(meta);

    const tdActions = document.createElement('td');
    tdActions.className = 'audit-row-actions';
    if (diff) {
        const toggle = document.createElement('button');
        toggle.className = 'audit-diff-toggle';
        toggle.setAttribute('aria-expanded', String(expanded));
        const icon2 = document.createElement('span');
        icon2.className = 'material-symbols-rounded';
        icon2.textContent = 'expand_more';
        toggle.append(icon2, document.createTextNode(diff.length === 1 ? '1 campo' : `${diff.length} campos`));
        toggle.addEventListener('click', () => {
            if (expandedRows.has(key)) expandedRows.delete(key);
            else expandedRows.add(key);
            renderAuditEntries();
        });
        tdActions.appendChild(toggle);
    } else {
        const dash = document.createElement('span');
        dash.className = 'audit-meta';
        dash.textContent = '\u2014';
        tdActions.appendChild(dash);
    }

    tr.append(tdWhen, tdOp, tdTable, tdRecord, tdActions);

    if (diff && expanded) {
        tr.appendChild(buildDiffRow(diff));
    }
    return tr;
}

function buildDiffRow(lines) {
    const tr = document.createElement('tr');
    tr.className = 'audit-diff-row';

    const td = document.createElement('td');
    td.colSpan = 5;

    const box = document.createElement('div');
    box.className = 'audit-diff';
    lines.forEach(line => box.appendChild(line));

    td.appendChild(box);
    tr.appendChild(td);
    return tr;
}

function buildDiffLines(entry) {
    const oldData = entry.old_data || {};
    const newData = entry.new_data || {};
    const keys = new Set(
        [...Object.keys(oldData), ...Object.keys(newData)].filter(k => !HIDDEN_FIELDS.includes(k))
    );

    if (keys.size === 0) return [];

    return Array.from(keys).sort((a, b) => a.localeCompare(b)).map(k => {
        const line = document.createElement('div');
        line.className = 'audit-diff-line';

        const keyEl = document.createElement('span');
        keyEl.className = 'k';
        keyEl.textContent = k;
        line.appendChild(keyEl);

        const vals = document.createElement('span');
        vals.className = 'vals';

        const hasOld = oldData[k] !== undefined;
        const hasNew = newData[k] !== undefined;

        if (hasOld && hasNew) {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'old';
            oldSpan.textContent = formatValue(oldData[k]);
            const arrow = document.createElement('span');
            arrow.className = 'arrow';
            arrow.textContent = '\u2192';
            const newSpan = document.createElement('span');
            newSpan.className = 'new';
            newSpan.textContent = formatValue(newData[k]);
            vals.append(oldSpan, arrow, newSpan);
        } else if (hasNew) {
            const newSpan = document.createElement('span');
            newSpan.className = 'new';
            newSpan.textContent = formatValue(newData[k]);
            vals.appendChild(newSpan);
        } else {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'old';
            oldSpan.textContent = formatValue(oldData[k]);
            vals.appendChild(oldSpan);
        }

        line.appendChild(vals);
        return line;
    });
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