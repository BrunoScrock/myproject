import { getCurrentUser } from './auth.js';
import { getSupabase } from './supabase.js';

export function mudarCategoriaEprotocolo() {
    const categoria = document.getElementById('epro-categoria').value;
    document.getElementById('form-liberacao').style.display = categoria === 'liberacao' ? 'grid' : 'none';
    document.getElementById('form-ausencia').style.display = categoria === 'ausencia' ? 'grid' : 'none';
    document.getElementById('epro-output-box').style.display = 'none';
}

export function formatarNome(inputId) {
    const inputNome = document.getElementById(inputId);
    let nomeOriginal = inputNome.value.trim().toLowerCase();
    if (nomeOriginal === '') return;

    const excecoes = ['da', 'de', 'do', 'das', 'dos', 'e'];
    let palavras = nomeOriginal.split(/\s+/);

    for (let i = 0; i < palavras.length; i++) {
        if (palavras[i].length > 0) {
            if (i !== 0 && excecoes.includes(palavras[i])) {
                palavras[i] = palavras[i];
            } else {
                palavras[i] = palavras[i][0].toUpperCase() + palavras[i].substr(1);
            }
        }
    }
    inputNome.value = palavras.join(' ');
}

export function gerarEprotocolo() {
    const categoria = document.getElementById('epro-categoria').value;
    let textoGerado = '';

    if (categoria === 'liberacao') {
        const mov = document.getElementById('epro-mov').value.trim();
        const cargo = document.getElementById('epro-cargo').value;
        const nome = document.getElementById('epro-nome').value.trim();
        const checkboxes = document.querySelectorAll('#epro-sistemas-group input[type="checkbox"]:checked');
        let sistemasSelecionados = Array.from(checkboxes).map(cb => cb.value);

        const extraInfo = document.getElementById('epro-sistema-extra').value.trim();
        if (extraInfo !== '') sistemasSelecionados.push(extraInfo);

        if (!mov || sistemasSelecionados.length === 0 || !cargo || !nome) {
            alert("Por favor, preencha o MOV, selecione ao menos um sistema, o cargo e o nome.");
            return;
        }

        const hasDatapge = document.querySelector('#epro-sistemas-group input[value="DATAPGE - Agenda de Prazos"]').checked;

        let sistemasFormatados = '';
        if (sistemasSelecionados.length === 1) {
            sistemasFormatados = sistemasSelecionados[0];
        } else if (sistemasSelecionados.length > 1) {
            const ultimoSistema = sistemasSelecionados.pop();
            sistemasFormatados = sistemasSelecionados.join(', ') + ' e ' + ultimoSistema;
        }

        textoGerado = `    I - Conforme autorizado no Mov. ${mov}, foi liberado o acesso no sistema ${sistemasFormatados} do(a) ${cargo}, ${nome}.\n\n`;

        if (hasDatapge) {
            textoGerado += `    II - O Procurador responsável deverá proceder à vinculação do assessor de forma manual no sistema DATAPGE. Para tanto, deverá acessar o menu localizado no canto superior direito, em seu nome de usuário, e, ao final da página, selecionar a opção \u201cVincular Novo Assessor\u201d, oportunidade em que deverá localizar o respectivo assessor pelo nome e efetivar a vinculação.\n\n`;
            textoGerado += `    III - Registrado a devida anotação no Sistema de Gestão de Lotação.`;
        } else {
            textoGerado += `    II - Registrado a devida anotação no Sistema de Gestão de Lotação.`;
        }

    } else if (categoria === 'ausencia') {
        const cargo = document.getElementById('epro-cargo-ausencia').value;
        const nome = document.getElementById('epro-nome-ausencia').value.trim();
        const checkboxesAusencia = document.querySelectorAll('#epro-sistemas-group-ausencia input[type="checkbox"]:checked');
        let sistemasSelecionadosAusencia = Array.from(checkboxesAusencia).map(cb => cb.value);

        if (!cargo || !nome || sistemasSelecionadosAusencia.length === 0) {
            alert("Por favor, selecione o cargo, o nome do interessado e ao menos um sistema pendente.");
            return;
        }

        let sistemasFormatadosAusencia = '';
        if (sistemasSelecionadosAusencia.length === 1) {
            sistemasFormatadosAusencia = sistemasSelecionadosAusencia[0];
        } else if (sistemasSelecionadosAusencia.length > 1) {
            const ultimoSistema = sistemasSelecionadosAusencia.pop();
            sistemasFormatadosAusencia = sistemasSelecionadosAusencia.join(', ') + ' e ' + ultimoSistema;
        }

        textoGerado = `    I - Restitui-se ao setor de origem ao(à) ${cargo} ${nome} para que seja informado o perfil de acesso a ser concedido no ${sistemasFormatadosAusencia}.\n\n    II - Após, encaminha-se à PGE/CGTI/NII aos cuidados do servidor Bruno Batista Scrock.`;
    }

    document.getElementById('epro-output-text').innerText = textoGerado;
    document.getElementById('epro-output-box').style.display = 'flex';
}

export function limparEprotocolo() {
    if (!confirm('Tem certeza que deseja limpar todos os campos?')) return;

    document.getElementById('epro-mov').value = '';
    document.getElementById('epro-cargo').selectedIndex = 0;
    document.getElementById('epro-nome').value = '';
    document.getElementById('epro-sistema-extra').value = '';
    document.querySelectorAll('#epro-sistemas-group input[type="checkbox"]').forEach(cb => cb.checked = false);

    document.getElementById('epro-cargo-ausencia').selectedIndex = 0;
    document.getElementById('epro-nome-ausencia').value = '';
    document.querySelectorAll('#epro-sistemas-group-ausencia input[type="checkbox"]').forEach(cb => cb.checked = false);

    document.getElementById('epro-output-box').style.display = 'none';
}

export function copiarEprotocolo() {
    const texto = document.getElementById('epro-output-text').innerText;
    navigator.clipboard.writeText(texto).then(() => {
        const copyBtn = document.querySelector('#epro-output-box .btn-copy');
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

export async function salvarNoHistorico() {
    const texto = document.getElementById('epro-output-text').innerText;
    if (!texto.trim()) return;

    const user = getCurrentUser();
    if (!user) return;

    const categoria = document.getElementById('epro-categoria').value;
    const supabase = getSupabase();
    const { error } = await supabase
        .from('dispatch_history')
        .insert({
            user_id: user.id,
            category: categoria,
            data: {},
            generated_text: texto
        });

    if (error) {
        console.error('Erro ao salvar no histórico:', error.message);
        alert('Erro ao salvar no histórico.');
        return;
    }

    alert('Despacho salvo no histórico!');
}
