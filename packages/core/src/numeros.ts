/** Valores monetários são guardados em centavos (inteiros). */

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarDinheiro(centavos: number): string {
  return formatoMoeda.format(centavos / 100);
}

/** Converte texto digitado ("1.234,56", "6,5", "6.50") em número; retorna null se inválido. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\s|R\$/g, "");
  if (!limpo) return null;
  // Com vírgula, ela é o separador decimal e pontos são milhares.
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;
  return Number(normalizado);
}

export function lerDinheiro(texto: string): number | null {
  const valor = lerNumero(texto);
  return valor === null ? null : Math.round(valor * 100);
}

export function formatarNumero(valor: number, casas = 3): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor);
}

export function formatarPercentual(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(valor / 100);
}
