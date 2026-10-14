/**
 * ui.js — Camada de interface compartilhada
 * Responsavel por: escape de HTML, notificacoes (toast) e dialogo de confirmacao.
 * Nao contem regra de negocio: apenas apresentacao e seguranca de renderizacao.
 */

const TOAST_ICONS = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
};

/**
 * Escapa texto para interpolacao segura em HTML.
 * Use sempre que inserir dado do usuario via template string.
 */
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escapa texto para uso dentro de atributo entre aspas duplas (title, value, data-*).
 */
export function escapeAttr(value) {
    return escapeHtml(value);
}

/**
 * Exibe uma notificacao temporaria. Substitui os alert() bloqueantes.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration ms ate fechar automaticamente
 */
export function toast(message, type = 'info', duration = 3600) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.info('[toast]', type, message);
        return;
    }

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = TOAST_ICONS[type] || TOAST_ICONS.info;

    const text = document.createElement('span');
    text.textContent = message;

    el.append(icon, text);
    container.appendChild(el);

    const remove = () => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 220);
    };
    const timer = setTimeout(remove, duration);
    el.addEventListener('click', () => {
        clearTimeout(timer);
        remove();
    });
}

/**
 * Dialogo de confirmacao com o mesmo contrato de window.confirm (resolve boolean).
 * Mantem o comportamento atual das acoes destrutivas, com aparencia consistente.
 * @returns {Promise<boolean>}
 */
export function confirmAction(message, title = 'Confirmar acao', acceptLabel = 'Confirmar') {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        if (!modal) {
            resolve(window.confirm(message));
            return;
        }

        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const acceptBtn = document.getElementById('confirm-accept');
        const cancelBtn = document.getElementById('confirm-cancel');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (acceptBtn) acceptBtn.textContent = acceptLabel;

        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
            acceptBtn?.removeEventListener('click', onAccept);
            cancelBtn?.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        };
        const onAccept = () => finish(true);
        const onCancel = () => finish(false);
        const onBackdrop = (e) => { if (e.target === modal) finish(false); };
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            if (e.key === 'Enter')  { e.preventDefault(); finish(true); }
        };

        acceptBtn?.addEventListener('click', onAccept);
        cancelBtn?.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onKey);

        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        cancelBtn?.focus();
    });
}

/**
 * Copia texto com fallback para execCommand quando a Clipboard API nao existe
 * (contextos sem HTTPS, permissoes negadas).
 * @returns {Promise<boolean>} true se copiou
 */
export async function copyToClipboard(text) {
    if (!text) return false;
    try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // cai no fallback abaixo
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch (err) {
        console.error('Falha ao copiar texto:', err);
        return false;
    }
}