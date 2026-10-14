import { initAuth, setAuthCallback, signInWithGoogle, signOut, getCurrentUser as getAuthUser } from './auth.js';
import { loadTasks, renderTasks, addNewTaskField, getTasks } from './tasks.js';
import { loadScheduledTasks, renderScheduledTasks, addScheduledTask, getScheduledTasks } from './scheduled-tasks.js';
import { loadFixedNotes, renderFixedNotes, showFixedNoteForm, hideFixedNoteForm, saveFixedNote, getFixedNotes } from './fixed-notes.js';
import { mudarCategoriaEprotocolo, formatarNome, gerarEprotocolo, limparEprotocolo, copiarEprotocolo } from './eprotocolo.js';
import { normalParaDecimal, decimalParaNormal } from './hours.js';
import { loadAuditLog, renderAuditEntries, resetAuditFilters } from './audit.js';
import { checkMigrationNeeded, showMigrationModal } from './migration.js';
import { initTermoRecebimento, updatePreview } from './termo-recebimento.js';
import { toast, confirmAction, copyToClipboard } from './ui.js';

const SIDEBAR_KEY = 'appSidebarCollapsed';

function showScreen(screenId) {
    ['login-screen', 'loading-screen', 'app-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === screenId ? 'flex' : 'none';
    });
}

function updateUserInfo(user) {
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');

    if (user) {
        const displayName = user.user_metadata?.full_name || user.email;
        if (nameEl) nameEl.textContent = displayName.split(' ')[0] + (displayName.split(' ').length > 1 ? ' ' + displayName.split(' ').slice(-1)[0] : '');
        if (avatarEl && user.user_metadata?.avatar_url) {
            avatarEl.src = user.user_metadata.avatar_url;
            avatarEl.style.display = 'block';
        }
    }
}

async function initApp(user) {
    showScreen('loading-screen');

    try {
        await Promise.all([
            loadTasks(),
            loadScheduledTasks(),
            loadFixedNotes()
        ]);

        renderTasks();
        renderScheduledTasks();
        renderFixedNotes();

        updateUserInfo(user);
        showScreen('app-screen');

        if (checkMigrationNeeded()) {
            showMigrationModal();
        }
    } catch (err) {
        console.error('Erro ao inicializar app:', err);
        toast('Erro ao carregar dados. Verifique sua conexao e tente novamente.', 'error', 6000);
        showScreen('login-screen');
    }
}

function applySidebarState(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(SIDEBAR_KEY, collapsed ? 'true' : 'false');
    const icon = document.querySelector('#btn-sidebar-toggle .material-symbols-rounded');
    if (icon) icon.textContent = collapsed ? 'menu' : 'menu_open';
    const btn = document.getElementById('btn-sidebar-toggle');
    if (btn) {
        btn.title = collapsed ? 'Expandir menu' : 'Recolher menu';
        btn.setAttribute('aria-label', btn.title);
    }
}

function setupEventListeners() {
    document.getElementById('btn-google-login')?.addEventListener('click', () => {
        signInWithGoogle().catch(err => {
            console.error('Falha no login:', err);
            toast('Erro ao conectar ao servidor de autenticacao.', 'error', 5000);
        });
    });

    document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => {
        applySidebarState(!document.body.classList.contains('sidebar-collapsed'));
    });

    const scrollTopBtn = document.getElementById('btn-scroll-top');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.addEventListener('scroll', () => {
            const show = window.scrollY > 300;
            scrollTopBtn.classList.toggle('visible', show);
        }, { passive: true });
    }

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        const ok = await confirmAction('Deseja realmente sair da sua conta?', 'Sair da conta', 'Sair');
        if (ok) await signOut();
    });

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

    document.getElementById('btn-open-auditoria')?.addEventListener('click', () => {
        openTab('tab-auditoria', null);
    });

    document.getElementById('audit-filter-table')?.addEventListener('change', renderAuditEntries);
    document.getElementById('audit-filter-operation')?.addEventListener('change', renderAuditEntries);
    document.getElementById('audit-search')?.addEventListener('input', () => {
        clearTimeout(window.__auditSearchDebounce);
        window.__auditSearchDebounce = setTimeout(renderAuditEntries, 250);
    });
    document.getElementById('btn-audit-refresh')?.addEventListener('click', () => {
        loadAuditLog().then(() => toast('Auditoria atualizada.', 'success'));
    });
    document.getElementById('btn-audit-clear')?.addEventListener('click', resetAuditFilters);

    document.getElementById('add-task-btn')?.addEventListener('click', addNewTaskField);
    document.getElementById('add-scheduled-btn')?.addEventListener('click', addScheduledTask);

    document.getElementById('btn-show-fixed-form')?.addEventListener('click', showFixedNoteForm);
    document.getElementById('btn-save-fixed-note')?.addEventListener('click', saveFixedNote);
    document.getElementById('btn-cancel-fixed-note')?.addEventListener('click', hideFixedNoteForm);

    document.getElementById('epro-categoria')?.addEventListener('change', mudarCategoriaEprotocolo);
    document.getElementById('btn-apply-epro')?.addEventListener('click', gerarEprotocolo);
    document.getElementById('btn-clear-epro')?.addEventListener('click', limparEprotocolo);
    document.getElementById('btn-copy-epro')?.addEventListener('click', copiarEprotocolo);

    document.getElementById('btn-format-name')?.addEventListener('click', () => formatarNome('epro-nome'));
    document.getElementById('btn-format-name-ausencia')?.addEventListener('click', () => formatarNome('epro-nome-ausencia'));

    document.getElementById('horas-normal')?.addEventListener('input', atualizarConversaoHoras);
    document.getElementById('horas-decimal')?.addEventListener('input', atualizarConversaoHoras);
    document.getElementById('btn-copy-horas-normal')?.addEventListener('click', () => copiarResultadoHoras('horas-normal-result'));
    document.getElementById('btn-copy-horas-decimal')?.addEventListener('click', () => copiarResultadoHoras('horas-decimal-result'));
    document.getElementById('btn-clear-horas-normal')?.addEventListener('click', () => limparConversao('horas-normal', 'horas-normal-result'));
    document.getElementById('btn-clear-horas-decimal')?.addEventListener('click', () => limparConversao('horas-decimal', 'horas-decimal-result'));

    document.getElementById('btn-apply-remover')?.addEventListener('click', aplicarRemocao);
    document.getElementById('btn-copy-remover')?.addEventListener('click', copiarRemocao);
    document.getElementById('btn-clear-remover')?.addEventListener('click', limparRemocao);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => openTab(btn.dataset.tab, btn));
    });
}

function openTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');

    // Se a aba foi aberta por atalho externo (ex: botao Auditoria no topo),
    // sincroniza o item correspondente da sidebar.
    const activeBtn = btnElement || document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    activeBtn?.classList.add('active');

    const titleEl = document.getElementById('page-title');
    if (titleEl && activeBtn?.dataset.title) {
        titleEl.textContent = activeBtn.dataset.title;
    }

    if (tabId === 'tab-auditoria') {
        loadAuditLog();
    } else if (tabId === 'tab-termo') {
        updatePreview();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    if (themeIcon) themeIcon.innerText = isDark ? 'light_mode' : 'dark_mode';
    if (themeText) themeText.innerText = isDark ? 'Modo Claro' : 'Modo Escuro';
    localStorage.setItem('appTheme', isDark ? 'dark' : 'light');
}

function loadTheme() {
    const currentTheme = localStorage.getItem('appTheme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        if (themeIcon) themeIcon.innerText = 'light_mode';
        if (themeText) themeText.innerText = 'Modo Claro';
    }
}

function aplicarRemocao() {
    const input = document.getElementById('remover-input').value;
    if (!input.trim()) {
        toast('Insira algum texto para remover os caracteres.', 'warning');
        document.getElementById('remover-input').focus();
        return;
    }
    const cleanText = input.replace(/[^\w\sÀ-ÿ]/gi, '');
    document.getElementById('remover-output-text').textContent = cleanText;
    document.getElementById('remover-output-box').style.display = 'flex';
}

async function copiarRemocao() {
    const texto = document.getElementById('remover-output-text').textContent;
    const ok = await copyToClipboard(texto);
    if (ok) toast('Texto copiado.', 'success');
    else toast('Nao foi possivel copiar. Copie manualmente.', 'error');
}

function limparRemocao() {
    document.getElementById('remover-input').value = '';
    document.getElementById('remover-output-box').style.display = 'none';
    document.getElementById('remover-output-text').textContent = '';
}

function atualizarConversaoHoras() {
    const normalResultEl = document.getElementById('horas-normal-result');
    const decimalResultEl = document.getElementById('horas-decimal-result');

    const normalInput = document.getElementById('horas-normal').value;
    const decimalInput = document.getElementById('horas-decimal').value;

    if (normalInput) {
        const resultado = normalParaDecimal(normalInput);
        if (resultado === null) {
            normalResultEl.textContent = 'Formato invalido';
            normalResultEl.classList.add('invalid');
        } else {
            normalResultEl.textContent = resultado;
            normalResultEl.classList.remove('invalid');
        }
    } else {
        normalResultEl.textContent = '—';
        normalResultEl.classList.remove('invalid');
    }

    if (decimalInput) {
        const resultado = decimalParaNormal(decimalInput);
        if (resultado === null) {
            decimalResultEl.textContent = 'Formato invalido';
            decimalResultEl.classList.add('invalid');
        } else {
            decimalResultEl.textContent = resultado;
            decimalResultEl.classList.remove('invalid');
        }
    } else {
        decimalResultEl.textContent = '—';
        decimalResultEl.classList.remove('invalid');
    }
}

async function copiarResultadoHoras(resultId) {
    const resultEl = document.getElementById(resultId);
    const texto = resultEl.textContent;
    if (!texto || texto === '—' || texto === 'Formato invalido') {
        toast('Nada para copiar ainda.', 'warning');
        return;
    }
    const ok = await copyToClipboard(texto);
    if (ok) toast('Resultado copiado.', 'success');
    else toast('Nao foi possivel copiar.', 'error');
}

function limparConversao(inputId, resultId) {
    document.getElementById(inputId).value = '';
    const resultEl = document.getElementById(resultId);
    resultEl.textContent = '—';
    resultEl.classList.remove('invalid');
}

window.autoGrow = function (element) {
    element.style.height = '46px';
    element.style.height = (element.scrollHeight) + 'px';
};

window.addEventListener('DOMContentLoaded', () => {
    loadTheme();

    const collapsed = localStorage.getItem(SIDEBAR_KEY) === 'true';
    applySidebarState(collapsed);

    showScreen('loading-screen');

    setAuthCallback((user, status) => {
        if (status === 'authorized' && user) {
            initApp(user);
        } else if (status === 'unauthorized') {
            showScreen('login-screen');
            toast('Esta conta Google nao esta autorizada a acessar o sistema.', 'error', 6000);
        } else if (status === 'signed_out') {
            showScreen('login-screen');
        }
    });

    try {
        initAuth();
    } catch (err) {
        console.error('Erro ao iniciar autenticacao:', err);
        showScreen('login-screen');
        toast('Nao foi possivel conectar ao servidor de autenticacao.', 'error', 6000);
    }

    setupEventListeners();
    initTermoRecebimento();

    // Se a sessao nao resolver em 12s, volta ao login com mensagem clara
    setTimeout(() => {
        const appScreen = document.getElementById('app-screen');
        if (appScreen && appScreen.style.display !== 'flex') {
            showScreen('login-screen');
            toast('A sessao expirou ou nao foi concluida. Entre novamente.', 'warning', 6000);
        }
    }, 12000);

    // Atualiza tarefas agendadas periodicamente, apenas com a aba visivel
    setInterval(() => {
        if (document.hidden) return;
        if (!getAuthUser()) return;
        if (!document.getElementById('tab-tarefas')?.classList.contains('active')) return;
        renderScheduledTasks();
    }, 60000);
});