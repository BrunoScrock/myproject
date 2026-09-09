const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

const ITENS_PADRAO = [
    { numero: '01', descricao: 'PABX Virtual com Central de Atendimento', unidade: 'Licença de Uso', quantidade: '1', valorUnitario: '3002,88' },
    { numero: '02', descricao: 'Licença Disponível para Usuário de PABX Virtual', unidade: 'Usuário', quantidade: '465', valorUnitario: '12,09' },
    { numero: '03', descricao: 'Posição de Atendimento', unidade: 'Posição', quantidade: '11', valorUnitario: '77,18' },
    { numero: '04', descricao: 'URA Tipo 2', unidade: 'URA', quantidade: '1', valorUnitario: '290,17' }
];

const INDICADORES_PADRAO = [
    { indicador: 'Disponibilidade do Serviço', resultado: '99,50%', meta: '99,50%' },
    { indicador: 'Incidentes Críticos', resultado: '0', meta: '0' },
    { indicador: 'Incidentes de Alta Severidade', resultado: '0', meta: '0' },
    { indicador: 'Chamados Atendidos no Prazo', resultado: '100%', meta: '100%' },
    { indicador: 'Tempo Médio de Atendimento', resultado: '100%', meta: '100%' }
];

const ORIGINAL_TITLE = document.title;

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

function mesLetra(iso) {
    if (!iso) return '';
    const [y, m] = iso.split('-');
    const idx = parseInt(m, 10) - 1;
    return MESES[idx] || '';
}

function capitalize(str) {
    return str.charAt(0) + str.slice(1).toLowerCase();
}

function autoPeriodo(inicio, fim) {
    const mi = mesLetra(inicio);
    const mf = mesLetra(fim);
    if (!mi || !mf) return '';
    let periodo;
    if (mi === mf) {
        periodo = capitalize(mi) + (inicio ? '/' + inicio.split('-')[0] : '');
    } else {
        periodo = `${capitalize(mi)}/${capitalize(mf)}`;
    }
    return periodo;
}

function autoDescricao(periodo, inicio, fim) {
    return `Serviço de Telefonia Digital no mês de ${capitalize(periodo.split('/')[0])}${periodo.includes('/') ? '/' + periodo.split('/').pop() : ''} entre as datas de ${formatDate(inicio)} a ${formatDate(fim)}.`;
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

function getRowData(row) {
    const q = row.querySelector('.trd-row-qtd');
    const u = row.querySelector('.trd-row-unit');
    const t = row.querySelector('.trd-row-total');
    const num = parseNum(q?.value ?? '0');
    const unit = parseNum(u?.value ?? '0');
    let total = parseNum(t?.value ?? '0');
    const auto = document.getElementById('trd-autocalc')?.checked ?? true;
    if (auto) total = num * unit;
    return { qtd: num, unit, total };
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

    const contratante = escapeHtml(document.getElementById('trd-contratante')?.value || '');
    const contratado = escapeHtml(document.getElementById('trd-contratado')?.value || '');
    const objeto = escapeHtml(document.getElementById('trd-objeto')?.value || '');
    const comissao = (document.getElementById('trd-comissao')?.value || '').split('\n').map(s => escapeHtml(s));
    const dataRecebimento = formatDate(document.getElementById('trd-data-recebimento')?.value);
    const inicio = document.getElementById('trd-data-inicio')?.value || '';
    const fim = document.getElementById('trd-data-fim')?.value || '';
    const periodo = escapeHtml(document.getElementById('trd-periodo')?.value || '');
    const descricao = escapeHtml(document.getElementById('trd-descricao')?.value || '');
    const conferenciaStatus = escapeHtml(document.getElementById('trd-conferencia-status')?.value || '');
    const ressalvas = escapeHtml(document.getElementById('trd-ressalvas')?.value || '');

    const rows = getRows();
    const indicadores = getIndicadores();
    const total = getTotalGeral();

    const itemsRows = rows.map(r => `
        <tr>
            <td class="c">${escapeHtml(r.numero)}</td>
            <td class="l">${escapeHtml(r.descricao)}</td>
            <td class="c">${escapeHtml(r.unidade)}</td>
            <td class="c">${String(r.qtd).replace('.', ',')}</td>
            <td class="r">${formatMoney(r.unit)}</td>
            <td class="r">${formatMoney(r.total)}</td>
        </tr>`).join('');

    const indRows = indicadores.map(i => `
        <tr>
            <td class="l">${escapeHtml(i.indicador)}</td>
            <td class="c">${escapeHtml(i.resultado)}</td>
            <td class="c">${escapeHtml(i.meta)}</td>
        </tr>`).join('');

    doc.innerHTML = `
        <div class="trd-sheet">
            <div class="trd-header">
                <img class="trd-logo" src="assets/img/pge-logo.png" alt="" onerror="this.style.display='none'">
                <div class="trd-header-titles">
                    <div class="trd-header-estado">PARANÁ - GOVERNO DO ESTADO</div>
                    <div class="trd-header-orgao">PROCURADORIA-GERAL DO ESTADO</div>
                    <div class="trd-header-doc">TERMO DE RECEBIMENTO DEFINITIVO</div>
                    <div class="trd-header-contrato">CONTRATO Nº 6852/2025</div>
                </div>
            </div>

            <h2 class="trd-h1">TERMO DE RECEBIMENTO DEFINITIVO</h2>

            <h3 class="trd-h3">IDENTIFICAÇÃO DAS PARTES</h3>
            <table class="trd-table-min">
                <tr><td class="w">CONTRATANTE</td><td>${contratante}</td></tr>
                <tr><td class="w">CONTRATADO</td><td>${contratado}</td></tr>
            </table>

            <h3 class="trd-h3">OBJETO DO CONTRATO</h3>
            <p class="trd-p">${objeto}</p>

            <h3 class="trd-h3">DATA DO RECEBIMENTO</h3>
            <p class="trd-p"><strong>${dataRecebimento || '____/____/____'}</strong></p>

            <h3 class="trd-h3">PERÍODO DE APURAÇÃO</h3>
            <p class="trd-p"><strong>${periodo ? escapeHtml(autoPeriodoLine(periodo, inicio, fim)) : '____________________'}</strong></p>

            <h3 class="trd-h3">VOLUMES E VALORES ENTREGUES</h3>
            <table class="trd-table-list">
                <thead>
                    <tr>
                        <th class="c w-sm">Nº</th>
                        <th class="l">Descrição</th>
                        <th class="c">Und.</th>
                        <th class="c">Quantidade</th>
                        <th class="r">Valor Unitário</th>
                        <th class="r">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                    <tr class="trd-total">
                        <td colspan="5" class="r"><strong>TOTAL</strong></td>
                        <td class="r"><strong>${formatMoney(total)}</strong></td>
                    </tr>
                </tbody>
            </table>

            <h3 class="trd-h3">DESCRIÇÃO DA ENTREGA</h3>
            <p class="trd-p">${descricao || '____'}</p>

            <h3 class="trd-h3">MEDIÇÃO DE RESULTADOS</h3>
            <table class="trd-table-list">
                <thead>
                    <tr>
                        <th class="l">Indicador</th>
                        <th class="c">Resultado</th>
                        <th class="c">Meta</th>
                    </tr>
                </thead>
                <tbody>${indRows}</tbody>
            </table>

            <h3 class="trd-h3">CONFERÊNCIA E AVALIAÇÃO</h3>
            <p class="trd-p"><strong>${conferenciaStatus}</strong></p>

            <h3 class="trd-h3">RESSALVAS</h3>
            <p class="trd-p">${ressalvas || '____'}</p>

            <h3 class="trd-h3">COMISSÃO DE RECEBIMENTO</h3>
            <table class="trd-table-min">
                ${comissao.map(linha => linha ? `<tr><td class="l">${linha}</td></tr>` : '').join('')}
            </table>

            <div class="trd-assinaturas">
                ${(() => comissao.filter(Boolean).slice(0, 2).map(l => `
                    <div class="trd-assinatura">
                        <div class="trd-assinatura-linha"></div>
                        <div class="trd-assinatura-cargo">${l}</div>
                    </div>`).join(''))()}
            </div>
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
        alert('Preencha os campos obrigatórios antes de gerar o PDF:\n\n• ' + missing.join('\n• '));
        return;
    }
    updatePreview();
    const filename = autoFilename();
    const prev = document.title;
    document.title = filename;
    window.print();
    document.title = prev;
}

function limparFormulario() {
    document.getElementById('trd-data-recebimento').value = '';
    document.getElementById('trd-data-inicio').value = '';
    document.getElementById('trd-data-fim').value = '';
    document.getElementById('trd-periodo').value = 'Julho/Agosto';
    document.getElementById('trd-descricao').value = '';
    document.getElementById('trd-autocalc').checked = true;
    document.getElementById('trd-conferencia-status').value = 'RECEBI CONFORME';
    document.getElementById('trd-ressalvas').value = 'Sem ressalvas.';
    buildItems();
    buildIndicadores();
    updateTotalsRows();
    updatePreview();
}