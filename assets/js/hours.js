export function normalParaDecimal(valor) {
    const texto = valor.trim();
    if (!texto) return '';

    const partes = texto.split(':').map(p => p.trim());
    if (partes.length < 2 || partes.length > 3) return null;

    const numeros = partes.map(p => {
        const n = Number(p);
        return Number.isFinite(n) ? n : null;
    });

    if (numeros.some(n => n === null)) return null;

    const [h, m, s = 0] = numeros;
    if (h < 0 || m < 0 || m >= 60 || s < 0 || s >= 60) return null;

    const total = h + m / 60 + s / 3600;
    return formatarDecimal(total);
}

export function decimalParaNormal(valor) {
    const texto = valor.trim().replace(',', '.');
    if (!texto) return '';

    const total = Number(texto);
    if (!Number.isFinite(total) || total < 0) return null;

    const segundosTotais = Math.round(total * 3600);
    const h = Math.floor(segundosTotais / 3600);
    const m = Math.floor((segundosTotais % 3600) / 60);
    const s = segundosTotais % 60;

    const partes = [String(h), String(m).padStart(2, '0')];
    if (s > 0) partes.push(String(s).padStart(2, '0'));
    return partes.join(':');
}

function formatarDecimal(total) {
    let resultado = total.toFixed(2).replace('.', ',');
    if (resultado.endsWith(',00')) resultado = resultado.slice(0, -3);
    else if (resultado.endsWith('0')) resultado = resultado.slice(0, -1);
    return resultado;
}