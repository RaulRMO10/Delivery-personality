/**
 * Código Pix "copia e cola" (BR Code estático) conforme o Manual de Padrões
 * para Iniciação do Pix do Banco Central (formato EMV QRCPS-MPM).
 */

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Remove acentos e caracteres fora do conjunto aceito pelo padrão. */
function limpar(texto: string, maximo: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .,-]/g, "")
    .trim()
    .slice(0, maximo);
}

export interface DadosPix {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  /** Valor em centavos; omitido para o cliente digitar. */
  valor?: number;
  /** Identificador exibido no extrato (até 25 caracteres alfanuméricos). */
  identificador?: string;
}

export type ValidacaoChave = { ok: true; chave: string } | { ok: false; erro: string };

/** Normaliza e valida a chave Pix (CPF, CNPJ, telefone, e-mail ou aleatória). */
export function validarChavePix(texto: string): ValidacaoChave {
  const valor = texto.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) return { ok: true, chave: valor.toLowerCase() };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) && valor.length <= 77) return { ok: true, chave: valor.toLowerCase() };
  const digitos = valor.replace(/\D/g, "");
  if (valor.startsWith("+") || /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(valor)) {
    const tel = digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;
    if (tel.length === 12 || tel.length === 13) return { ok: true, chave: `+${tel}` };
  }
  if (digitos.length === 11 || digitos.length === 14) return { ok: true, chave: digitos };
  return { ok: false, erro: "Chave Pix inválida." };
}

export function gerarPixCopiaECola(d: DadosPix): string {
  const contaRecebedor = campo("00", "br.gov.bcb.pix") + campo("01", d.chave);
  const identificador = limpar(d.identificador ?? "", 25).replace(/[^A-Za-z0-9]/g, "") || "***";
  const corpo =
    campo("00", "01") +
    campo("26", contaRecebedor) +
    campo("52", "0000") +
    campo("53", "986") +
    (d.valor !== undefined && d.valor > 0 ? campo("54", (d.valor / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(d.nomeRecebedor, 25) || "RECEBEDOR") +
    campo("60", limpar(d.cidade, 15) || "BRASIL") +
    campo("62", campo("05", identificador)) +
    "6304";
  return corpo + crc16(corpo);
}
