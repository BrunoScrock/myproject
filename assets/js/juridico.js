const DICIONARIO = [
    { de: /\b(eu )?(quero|gostaria de) pedir\b/gi, para: "venho requerer" },
    { de: /\bpeço\b/gi, para: "requeiro" },
    { de: /\bsolicito\b/gi, para: "pleiteio" },
    { de: /\bpor causa d[eo]\b/gi, para: "em virtude de" },
    { de: /\b(agora|neste momento)\b/gi, para: "neste ato" },
    { de: /\b(depois|mais tarde)\b/gi, para: "posteriormente" },
    { de: /\bantes\b/gi, para: "previamente" },
    { de: /\bmas\b/gi, para: "entretanto" },
    { de: /\b(fazer|realizar)\b/gi, para: "proceder com a execução de" },
    { de: /\b(problema|situação)\b/gi, para: "lide" },
    { de: /\bresolver\b/gi, para: "sanar" },
    { de: /\b(sobre|a respeito de)\b/gi, para: "acerca de" },
    { de: /\b(conforme|de acordo com)\b/gi, para: "consoante" },
    { de: /\bmostrar\b/gi, para: "demonstrar" },
    { de: /\bfalar\b/gi, para: "manifestar" },
    { de: /\b(o|a)? juiz(a)?\b/gi, para: "$1 Magistrado(a)" },
    { de: /\b(o|a)? advogad[oa]\b/gi, para: "$1 causídico(a)" },
    { de: /\bcolocar\b/gi, para: "inserir" },
    { de: /\b(mandar|enviar)\b/gi, para: "encaminhar" },
    { de: /\bmando\b/gi, para: "encaminho" },
    { de: /\b(ver|olhar)\b/gi, para: "analisar" },
    { de: /\bvejo\b/gi, para: "observo" },
    { de: /\b(tá|está) claro\b/gi, para: "resta evidente" },
    { de: /\b(junto|anexo)\b/gi, para: "acostado" },
    { de: /\banexos?\b/gi, para: "documentos acostados" },
    { de: /\bprecisa\b/gi, para: "faz-se mister" },
    { de: /\b(urgente|importante)\b/gi, para: "imprescindível" },
    { de: /\blogo\b/gi, para: "incontinenti" }
];

export function aprimorarTextoJuridico() {
    const inputElement = document.getElementById('juridico-input');
    let texto = inputElement.value.trim();

    if (texto === '') {
        alert("Por favor, insira um texto para formatar.");
        return;
    }

    let textoFormatado = texto;
    DICIONARIO.forEach(regra => {
        textoFormatado = textoFormatado.replace(regra.de, regra.para);
    });

    document.getElementById('juridico-output-text').innerText = textoFormatado;
    document.getElementById('juridico-output-box').style.display = 'flex';
}

export function copiarJuridico() {
    const texto = document.getElementById('juridico-output-text').innerText;
    navigator.clipboard.writeText(texto).then(() => {
        const copyBtn = document.querySelector('#juridico-output-box .btn-copy');
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

export function limparJuridico() {
    document.getElementById('juridico-input').value = '';
    document.getElementById('juridico-output-box').style.display = 'none';
    document.getElementById('juridico-output-text').innerText = '';
}
