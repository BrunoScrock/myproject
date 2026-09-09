import { initAuth, setAuthCallback, signInWithGoogle, signOut, getCurrentUser as getAuthUser } from './auth.js';
import { loadTasks, renderTasks, addNewTaskField } from './tasks.js';
import { loadScheduledTasks, renderScheduledTasks, addScheduledTask } from './scheduled-tasks.js';
import { loadFixedNotes, renderFixedNotes, showFixedNoteForm, hideFixedNoteForm, saveFixedNote } from './fixed-notes.js';
import { mudarCategoriaEprotocolo, formatarNome, gerarEprotocolo, limparEprotocolo, copiarEprotocolo } from './eprotocolo.js';
import { normalParaDecimal, decimalParaNormal } from './hours.js';
import { loadAuditLog, renderAuditEntries, resetAuditFilters } from './audit.js';
import { checkMigrationNeeded, showMigrationModal } from './migration.js';

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
        alert('Erro ao carregar dados. Verifique sua conexão e tente novamente.');
        showScreen('login-screen');
    }
}

function setupEventListeners() {
    document.getElementById('btn-google-login')?.addEventListener('click', () => {
        signInWithGoogle().catch(err => {
            alert('Erro ao conectar com o servidor de autenticação.');
        });
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja sair?')) {
            await signOut();
        }
    });

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

    document.getElementById('btn-open-auditoria')?.addEventListener('click', () => {
        openTab('tab-auditoria', document.querySelector('.tab-btn[data-tab="tab-auditoria"]'));
    });

    document.getElementById('audit-filter-table')?.addEventListener('change', renderAuditEntries);
    document.getElementById('audit-filter-operation')?.addEventListener('change', renderAuditEntries);
    document.getElementById('audit-search')?.addEventListener('input', () => {
        clearTimeout(window.__auditSearchDebounce);
        window.__auditSearchDebounce = setTimeout(renderAuditEntries, 250);
    });
    document.getElementById('btn-audit-refresh')?.addEventListener('click', loadAuditLog);
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
    btnElement?.classList.add('active');

    if (tabId === 'tab-auditoria') {
        loadAuditLog();
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
        alert('Insira algum texto para remover os caracteres.');
        return;
    }
    const cleanText = input.replace(/[^\w\sÀ-ÿ]/gi, '');
    document.getElementById('remover-output-text').innerText = cleanText;
    document.getElementById('remover-output-box').style.display = 'flex';
}

function copiarRemocao() {
    const texto = document.getElementById('remover-output-text').innerText;
    navigator.clipboard.writeText(texto).then(() => {
        const copyBtn = document.querySelector('#remover-output-box .btn-copy');
        const originalBg = copyBtn.style.backgroundColor;
        const originalHtml = copyBtn.innerHTML;
        copyBtn.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#2e5c3a' : '#2ECC71';
        copyBtn.innerHTML = '<span class="material-symbols-rounded">check</span> Copiado!';
        setTimeout(() => {
            copyBtn.style.backgroundColor = originalBg;
            copyBtn.innerHTML = originalHtml;
        }, 1500);
    });
}

function limparRemocao() {
    document.getElementById('remover-input').value = '';
    document.getElementById('remover-output-box').style.display = 'none';
    document.getElementById('remover-output-text').innerText = '';
}

function atualizarConversaoHoras() {
    const normalResultEl = document.getElementById('horas-normal-result');
    const decimalResultEl = document.getElementById('horas-decimal-result');

    const normalInput = document.getElementById('horas-normal').value;
    const decimalInput = document.getElementById('horas-decimal').value;

    if (normalInput) {
        const resultado = normalParaDecimal(normalInput);
        if (resultado === null) {
            normalResultEl.textContent = 'Formato inválido';
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
            decimalResultEl.textContent = 'Formato inválido';
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

function copiarResultadoHoras(resultId) {
    const resultEl = document.getElementById(resultId);
    const texto = resultEl.innerText;
    if (!texto || texto === '—' || texto === 'Formato inválido') return;

    navigator.clipboard.writeText(texto).then(() => {
        const copyBtn = resultEl.closest('.hours-card').querySelector('.btn-copy');
        const originalHtml = copyBtn.innerHTML;
        const originalColor = copyBtn.style.backgroundColor;
        copyBtn.innerHTML = '<span class="material-symbols-rounded">check</span> Copiado!';
        copyBtn.style.backgroundColor = 'var(--success-color)';
        setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
            copyBtn.style.backgroundColor = originalColor;
        }, 1500);
    });
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
    showScreen('loading-screen');

    setAuthCallback((user, status) => {
        if (status === 'authorized' && user) {
            initApp(user);
        } else if (status === 'unauthorized') {
            showScreen('login-screen');
            alert('Esta conta Google não está autorizada a acessar o sistema.');
        } else if (status === 'signed_out') {
            showScreen('login-screen');
        }
    });

    try {
        initAuth();
    } catch (err) {
        console.error('Erro ao iniciar autenticação:', err);
        showScreen('login-screen');
        alert('Não foi possível conectar ao servidor de autenticação.');
    }

    setupEventListeners();

    setTimeout(() => {
        if (document.getElementById('app-screen').style.display !== 'flex') {
            showScreen('login-screen');
        }
    }, 5000);

    setInterval(() => {
        if (getAuthUser()) {
            renderScheduledTasks();
        }
    }, 60000);
});
