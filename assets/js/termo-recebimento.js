import { toast, confirmAction } from './ui.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const ITENS_PADRAO = [
    { numero: '01', descricao: 'PABX Virtual com Central de Atendimento', unidade: 'Licença de Uso', quantidade: '1', valorUnitario: '3002,88' },
    { numero: '02', descricao: 'Licença para Usuário de PABX Virtual', unidade: 'Usuário', quantidade: '465', valorUnitario: '12,09' },
    { numero: '03', descricao: 'Licença para Posição de Central de Atendimento', unidade: 'Posição de Atendimento', quantidade: '11', valorUnitario: '77,18' },
    { numero: '04', descricao: 'Licença para URA Tipo 2', unidade: 'URA', quantidade: '1', valorUnitario: '290,17' }
];

const INDICADORES_PADRAO = [
    { indicador: 'Disponibilidade do serviço', resultado: '100%', meta: '>=99%' },
    { indicador: 'Resolução de Incidentes de Alta Severidade', resultado: 'não foram registrados incidentes no período', meta: 'Resolução de todos os incidentes de alta severidade no tempo de solução acordado' },
    { indicador: 'Resolução de Incidentes de Média Severidade', resultado: 'não foram registrados incidentes no período', meta: 'Resolução de todos os incidentes de média severidade no tempo de solução acordado' },
    { indicador: 'Resolução de Incidentes de Baixa Severidade', resultado: 'não foram registrados incidentes no período', meta: 'Resolução de todos os incidentes de baixa severidade no tempo de solução acordado' },
    { indicador: 'Resolução de Requisições', resultado: 'não foram registrados incidentes no período', meta: 'Resolução de todos os incidentes de baixa severidade no tempo de solução acordado' }
];

const CONFERENCIA_PADRAO = 'Declaramos que foram conferidas a disponibilidade do serviço, os incidentes, as requisições e os valores do período de apuração, e que a(s) entrega(s) atende(m) às exigências contratuais.';

const ASSINATURA_1 = {
    nome: 'Bruno Batista Scrock',
    cargo: 'Assessor',
    comissao: 'Comissão de Recebimento',
    portaria: 'Portaria nº 081/2025-PGE'
};

const ASSINATURA_2 = {
    nome: 'Alan Ferreira de Oliveira',
    cargo: 'Profissional de Tecnologia da Informação',
    comissao: 'Comissão de Recebimento',
    portaria: 'Portaria nº 081/2025-PGE'
};

function parseNum(s) {
    s = String(s).trim().replace(/[^\d.,-]/g, '');
    if (!s) return 0;
    if (s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function formatMoney(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
}

function mesNome(iso) {
    if (!iso) return '';
    const idx = parseInt(iso.split('-')[1], 10) - 1;
    return MESES[idx] || '';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function autoPeriodo(inicio, fim) {
    const mi = mesNome(inicio);
    const mf = mesNome(fim);
    if (!mi || !mf) return '';
    const a = capitalize(mi);
    const b = capitalize(mf);
    return a === b ? a : `${a}/${b}`;
}

function autoDescricao(periodo, inicio, fim) {
    return `Serviço de Telefonia Digital no mês de ${periodo} entre as datas de ${formatDate(inicio)} a ${formatDate(fim)}.`;
}

function autoPeriodoLine(periodo, inicio, fim) {
    if (inicio && fim) return `${periodo} (${formatDate(inicio)} a ${formatDate(fim)})`;
    return periodo;
}

function slugify(str) {
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function autoFilename() {
    const periodo = (document.getElementById('trd-periodo')?.value || '').trim();
    return `Termo_Recebimento_Definitivo_Contrato_6852-2025_${slugify(periodo || 'Periodo')}.pdf`;
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function initTermoRecebimento() {
    buildItems();
    buildIndicadores();
    bindEvents();
    updatePreview();
}

function buildItems() {
    const tbody = document.getElementById('trd-itens-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    ITENS_PADRAO.forEach(item => tbody.appendChild(createItemRow(item)));
}

function createItemRow(item) {
    const tr = document.createElement('tr');
    tr.dataset.numero = item.numero;

    const tdNumero = document.createElement('td');
    tdNumero.className = 'trd-row-num';
    tdNumero.textContent = item.numero;

    const tdDesc = document.createElement('td');
    const desc = document.createElement('input');
    desc.type = 'text';
    desc.className = 'trd-row-desc';
    desc.value = item.descricao;
    tdDesc.appendChild(desc);

    const tdUnid = document.createElement('td');
    const unid = document.createElement('input');
    unid.type = 'text';
    unid.className = 'trd-row-unid';
    unid.value = item.unidade;
    tdUnid.appendChild(unid);

    const tdQtd = document.createElement('td');
    const qtd = document.createElement('input');
    qtd.type = 'text';
    qtd.inputMode = 'decimal';
    qtd.className = 'trd-row-qtd';
    qtd.value = item.quantidade;
    tdQtd.appendChild(qtd);

    const tdUnit = document.createElement('td');
    const unit = document.createElement('input');
    unit.type = 'text';
    unit.inputMode = 'decimal';
    unit.className = 'trd-row-unit';
    unit.value = item.valorUnitario;
    tdUnit.appendChild(unit);

    const tdTotal = document.createElement('td');
    const total = document.createElement('input');
    total.type = 'text';
    total.inputMode = 'decimal';
    total.className = 'trd-row-total';
    total.value = item.valorUnitario;
    tdTotal.appendChild(total);

    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete btn-icon-only trd-row-del';
    delBtn.title = 'Remover';
    delBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
    tdDel.appendChild(delBtn);

    tr.append(tdNumero, tdDesc, tdUnid, tdQtd, tdUnit, tdTotal, tdDel);
    return tr;
}

function buildIndicadores() {
    const tbody = document.getElementById('trd-indicadores-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    INDICADORES_PADRAO.forEach(ind => tbody.appendChild(createIndicadorRow(ind)));
}

function createIndicadorRow(ind) {
    const tr = document.createElement('tr');

    const tdInd = document.createElement('td');
    const indInput = document.createElement('input');
    indInput.type = 'text';
    indInput.className = 'trd-ind-indicador';
    indInput.value = ind.indicador;
    tdInd.appendChild(indInput);

    const tdRes = document.createElement('td');
    const resInput = document.createElement('input');
    resInput.type = 'text';
    resInput.className = 'trd-ind-resultado';
    resInput.value = ind.resultado;
    tdRes.appendChild(resInput);

    const tdMeta = document.createElement('td');
    const metaInput = document.createElement('input');
    metaInput.type = 'text';
    metaInput.className = 'trd-ind-meta';
    metaInput.value = ind.meta;
    tdMeta.appendChild(metaInput);

    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete btn-icon-only trd-ind-del';
    delBtn.title = 'Remover';
    delBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
    tdDel.appendChild(delBtn);

    tr.append(tdInd, tdRes, tdMeta, tdDel);
    return tr;
}

function bindEvents() {
    const autocalc = document.getElementById('trd-autocalc');
    autocalc?.addEventListener('change', () => {
        updateTotalsRows();
        updatePreview();
    });

    document.getElementById('trd-data-inicio')?.addEventListener('change', syncPeriodoFromDates);
    document.getElementById('trd-data-fim')?.addEventListener('change', syncPeriodoFromDates);
    document.getElementById('trd-data-recebimento')?.addEventListener('change', updatePreview);

    document.getElementById('trd-periodo')?.addEventListener('input', updatePreview);
    document.getElementById('trd-descricao')?.addEventListener('input', updatePreview);
    document.getElementById('trd-conferencia')?.addEventListener('input', updatePreview);
    document.getElementById('trd-ressalvas')?.addEventListener('input', updatePreview);

    document.getElementById('trd-itens-tbody')?.addEventListener('input', (e) => {
        if (e.target.classList.contains('trd-row-qtd') || e.target.classList.contains('trd-row-unit')) {
            updateRowTotal(e.target.closest('tr'));
        }
        updateTotalsRows();
        updatePreview();
    });

    document.getElementById('trd-itens-tbody')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('trd-row-qtd') || e.target.classList.contains('trd-row-unit')) {
            formatNumericInput(e.target);
            updateRowTotal(e.target.closest('tr'));
            updateTotalsRows();
            updatePreview();
        }
    });

    document.getElementById('trd-indicadores-tbody')?.addEventListener('input', updatePreview);

    document.getElementById('trd-indicadores-tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.trd-ind-del');
        if (btn) btn.closest('tr').remove();
    });

    document.getElementById('trd-itens-tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.trd-row-del');
        if (btn) btn.closest('tr').remove();
    });

    document.getElementById('trd-add-item')?.addEventListener('click', () => {
        const tbody = document.getElementById('trd-itens-tbody');
        const next = String(tbody.children.length + 1).padStart(2, '0');
        tbody.appendChild(createItemRow({ numero: next, descricao: '', unidade: '', quantidade: '1', valorUnitario: '0,00' }));
        updatePreview();
    });

    document.getElementById('trd-add-indicador')?.addEventListener('click', () => {
        document.getElementById('trd-indicadores-tbody').appendChild(createIndicadorRow({ indicador: '', resultado: '', meta: '' }));
        updatePreview();
    });

    document.getElementById('trd-btn-preview')?.addEventListener('click', updatePreview);
    document.getElementById('trd-btn-clear')?.addEventListener('click', limparFormulario);
    document.getElementById('trd-btn-pdf')?.addEventListener('click', gerarPDF);
}

function syncPeriodoFromDates() {
    const inicio = document.getElementById('trd-data-inicio').value;
    const fim = document.getElementById('trd-data-fim').value;
    const periodo = autoPeriodo(inicio, fim);
    if (periodo) {
        document.getElementById('trd-periodo').value = periodo;
        const descricao = document.getElementById('trd-descricao');
        if (!descricao.value.trim() || descricao.dataset.auto !== 'false') {
            descricao.value = autoDescricao(periodo, inicio, fim);
        }
    }
    updatePreview();
}

function updateRowTotal(tr) {
    if (!tr) return;
    const autocalc = document.getElementById('trd-autocalc')?.checked ?? true;
    const totalInput = tr.querySelector('.trd-row-total');
    if (!totalInput) return;
    if (autocalc) {
        const qtd = parseNum(tr.querySelector('.trd-row-qtd')?.value);
        const unit = parseNum(tr.querySelector('.trd-row-unit')?.value);
        totalInput.value = (qtd * unit).toFixed(2).replace('.', ',');
        totalInput.disabled = true;
    } else {
        totalInput.disabled = false;
    }
}

function updateTotalsRows() {
    document.querySelectorAll('#trd-itens-tbody tr').forEach(tr => updateRowTotal(tr));
    const total = getTotalGeral();
    document.getElementById('trd-total-geral').textContent = formatMoney(total);
}

function formatNumericInput(input) {
    const n = parseNum(input.value);
    input.value = n.toFixed(2).replace('.', ',');
}

function getRows() {
    return Array.from(document.querySelectorAll('#trd-itens-tbody tr')).map((tr, i) => {
        const descricao = tr.querySelector('.trd-row-desc')?.value || '';
        const unidade = tr.querySelector('.trd-row-unid')?.value || '';
        const qtd = parseNum(tr.querySelector('.trd-row-qtd')?.value);
        const unit = parseNum(tr.querySelector('.trd-row-unit')?.value);
        const total = parseNum(tr.querySelector('.trd-row-total')?.value);
        const numero = tr.dataset.numero || String(i + 1).padStart(2, '0');
        return { numero, descricao, unidade, qtd, unit, total };
    });
}

function getIndicadores() {
    return Array.from(document.querySelectorAll('#trd-indicadores-tbody tr')).map(tr => ({
        indicador: tr.querySelector('.trd-ind-indicador')?.value || '',
        resultado: tr.querySelector('.trd-ind-resultado')?.value || '',
        meta: tr.querySelector('.trd-ind-meta')?.value || ''
    }));
}

function getTotalGeral() {
    return getRows().reduce((acc, r) => acc + r.total, 0);
}

export function updatePreview() {
    const doc = document.getElementById('trd-document');
    if (!doc) return;

    const objeto = escapeHtml(document.getElementById('trd-objeto')?.value || '');
    const dataRecebimento = formatDate(document.getElementById('trd-data-recebimento')?.value);
    const inicio = document.getElementById('trd-data-inicio')?.value || '';
    const fim = document.getElementById('trd-data-fim')?.value || '';
    const periodo = escapeHtml(document.getElementById('trd-periodo')?.value || '');
    const descricao = escapeHtml(document.getElementById('trd-descricao')?.value || '');
    const conferencia = escapeHtml(document.getElementById('trd-conferencia')?.value || '');
    const ressalvas = escapeHtml(document.getElementById('trd-ressalvas')?.value || '');

    const rows = getRows();
    const indicadores = getIndicadores();
    const total = getTotalGeral();

    const itemsRows = rows.map(r => `
        <tr>
            <td class="num">${escapeHtml(r.numero)}</td>
            <td class="desc">${escapeHtml(r.descricao)}</td>
            <td class="num">${escapeHtml(r.unidade)}</td>
            <td class="num">${String(r.qtd).replace('.', ',')}</td>
            <td class="money">${formatMoney(r.unit)}</td>
            <td class="money">${formatMoney(r.total)}</td>
        </tr>`).join('');

    const totalRow = rows.length
        ? `<tr class="total">
            <td colspan="5">TOTAL</td>
            <td class="money">${formatMoney(total)}</td>
        </tr>`
        : '';

    const indRows = indicadores.map(i => `
        <tr>
            <td class="ind">${escapeHtml(i.indicador)}</td>
            <td class="ind">${escapeHtml(i.resultado)}</td>
            <td class="ind">${escapeHtml(i.meta)}</td>
        </tr>`).join('');

    const periodoLine = autoPeriodoLine(periodo, inicio, fim);

    doc.innerHTML = `
        <div class="trd-sheet">
            <div class="trd-logo-wrap">
                <img class="trd-logo" src="assets/img/pge-logo.png" alt="" onerror="this.style.display='none'">
            </div>

            <table class="trd-main">
                <tr>
                    <td colspan="2" class="trd-titlebar">TERMO DE RECEBIMENTO DEFINITIVO</td>
                </tr>
                <tr>
                    <td class="trd-lbl">CONTRATO Nº</td>
                    <td class="trd-val"><span class="trd-strong">6852/2025</span></td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">IDENTIFICAÇÃO DAS PARTES</td>
                    <td class="trd-val">
                        <span class="trd-strong">CONTRATANTE: PROCURADORIA-GERAL DO ESTADO</span>
                        <br><span class="trd-strong">CONTRATADO: &nbsp; CELEPAR</span>
                    </td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">OBJETO DO CONTRATO</td>
                    <td class="trd-val"><span class="trd-strong">${objeto}</span></td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">DATA DO RECEBIMENTO</td>
                    <td class="trd-val"><span class="trd-strong">${dataRecebimento || '____/____/____'}</span></td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">PERÍODO DE APURAÇÃO</td>
                    <td class="trd-val">
                        <span class="trd-strong">${periodo || '____________________'}</span>
                        ${inicio && fim ? `<span> (${formatDate(inicio)} a ${formatDate(fim)})</span>` : ''}
                    </td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">DESCRIÇÃO DA ENTREGA</td>
                    <td class="trd-val"><span class="trd-strong">${descricao || '____'}</span></td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">VOLUMES E VALORES ENTREGUES</td>
                    <td class="trd-val">
                        <p class="trd-period-line">Período: ${periodoLine}</p>
                        <table class="trd-sub-table">
                            <tr>
                                <th class="num">Item</th>
                                <th class="desc">Descrição</th>
                                <th class="num">Unidade Medida</th>
                                <th class="num">Quantidade</th>
                                <th class="money">Valor Unitário</th>
                                <th class="money">Valor Total</th>
                            </tr>
                            ${itemsRows}
                            ${totalRow}
                        </table>
                    </td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">MEDIÇÃO DE RESULTADOS</td>
                    <td class="trd-val">
                        <table class="trd-sub-table ind">
                            <tr>
                                <th class="ind">Indicador</th>
                                <th class="ind">Resultado</th>
                                <th class="ind">Meta</th>
                            </tr>
                            ${indRows}
                        </table>
                    </td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">CONFERÊNCIA E AVALIAÇÃO</td>
                    <td class="trd-val">${conferencia || '____'}</td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-lbl">RESSALVAS (SE HOUVER)</td>
                    <td class="trd-val">${ressalvas || 'Sem ressalvas.'}</td>
                </tr>
                <tr class="trd-spacer"><td></td><td></td></tr>
                <tr>
                    <td class="trd-assin">
                        <div class="trd-assin-name">${escapeHtml(ASSINATURA_1.nome)}</div>
                        <div class="trd-assin-role">${escapeHtml(ASSINATURA_1.cargo)}</div>
                        <div class="trd-assin-comm">${escapeHtml(ASSINATURA_1.comissao)} &nbsp;${escapeHtml(ASSINATURA_1.portaria)}</div>
                    </td>
                    <td class="trd-assin">
                        <div class="trd-assin-name">${escapeHtml(ASSINATURA_2.nome)}</div>
                        <div class="trd-assin-role">${escapeHtml(ASSINATURA_2.cargo)}</div>
                        <div class="trd-assin-comm">${escapeHtml(ASSINATURA_2.comissao)}</div>
                        <div class="trd-assin-comm">${escapeHtml(ASSINATURA_2.portaria)}</div>
                    </td>
                </tr>
            </table>
        </div>`;
}

function validateBeforePrint() {
    const missing = [];
    const checks = [
        ['trd-data-recebimento', 'Data do Recebimento'],
        ['trd-data-inicio', 'Data Inicial'],
        ['trd-data-fim', 'Data Final'],
        ['trd-periodo', 'Período'],
        ['trd-descricao', 'Descrição da Entrega']
    ];
    checks.forEach(([id, label]) => {
        const v = (document.getElementById(id)?.value || '').trim();
        if (!v) missing.push(label);
    });
    if (getRows().length === 0) missing.push('Itens de volume (adicione ao menos 1 item)');
    return missing;
}

function gerarPDF() {
    const missing = validateBeforePrint();
    if (missing.length) {
        showValidationReport(missing);
        return;
    }
    updatePreview();
    const filename = autoFilename();
    const prev = document.title;
    document.title = filename;
    window.print();
    document.title = prev;
}

/**
 * Exibe os campos obrigatorios pendentes junto ao formulario,
 * destacando o primeiro item para orientar o preenchimento.
 */
function showValidationReport(missing) {
    const descricao = document.getElementById('trd-descricao');
    if (missing.includes('Descrição da Entrega') && descricao) {
        descricao.focus();
    } else if (missing.includes('Data do Recebimento')) {
        document.getElementById('trd-data-recebimento')?.focus();
    } else if (missing.includes('Data Inicial')) {
        document.getElementById('trd-data-inicio')?.focus();
    } else if (missing.includes('Data Final')) {
        document.getElementById('trd-data-fim')?.focus();
    } else if (missing.includes('Período')) {
        document.getElementById('trd-periodo')?.focus();
    }

    toast(
        `Preencha antes de gerar o PDF: ${missing.join(', ')}.`,
        'warning',
        6500
    );
}

async function limparFormulario() {
    const ok = await confirmAction(
        'Deseja limpar o formulario e restaurar os valores padrao do termo?',
        'Limpar formulario'
    );
    if (!ok) return;

    document.getElementById('trd-data-recebimento').value = '';
    document.getElementById('trd-data-inicio').value = '';
    document.getElementById('trd-data-fim').value = '';
    document.getElementById('trd-periodo').value = 'Julho/Agosto';
    document.getElementById('trd-descricao').value = '';
    document.getElementById('trd-autocalc').checked = true;
    document.getElementById('trd-conferencia').value = CONFERENCIA_PADRAO;
    document.getElementById('trd-ressalvas').value = 'Sem ressalvas.';
    buildItems();
    buildIndicadores();
    updateTotalsRows();
    updatePreview();
    toast('Formulario restaurado.', 'info');
}