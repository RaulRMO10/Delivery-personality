import type { Perfil } from "./perfis";

/** Quem pode criar e alterar produtos, categorias e complementos. A cozinha só marca esgotado. */
export function podeEditarCardapio(perfil: Perfil): boolean {
  return perfil === "dona" || perfil === "suporte";
}

export interface OpcaoComplemento {
  id: string;
  nome: string;
  precoAdicional: number;
  esgotado: boolean;
}

export interface GrupoComplemento {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  opcoes: OpcaoComplemento[];
}

/** Escolha do cliente: opção e quantidade (ex.: 2× brigadeiro dentro de "escolha 3 sabores"). */
export interface Escolha {
  grupoId: string;
  opcaoId: string;
  quantidade: number;
}

export function validarLimitesGrupo(minimo: number, maximo: number): string | null {
  if (!Number.isInteger(minimo) || !Number.isInteger(maximo)) return "Mínimo e máximo devem ser inteiros.";
  if (minimo < 0) return "O mínimo não pode ser negativo.";
  if (maximo < 1) return "O máximo deve ser ao menos 1.";
  if (minimo > maximo) return "O mínimo não pode ser maior que o máximo.";
  return null;
}

/** Texto curto da regra do grupo, exibido ao cliente. */
export function descreverRegraGrupo(minimo: number, maximo: number): string {
  if (minimo === 0) return maximo === 1 ? "Opcional" : `Opcional, até ${maximo}`;
  if (minimo === maximo) return minimo === 1 ? "Obrigatório" : `Escolha ${minimo}`;
  return `Escolha de ${minimo} a ${maximo}`;
}

/** Valida as escolhas de um item; retorna a primeira inconsistência encontrada. */
export function validarEscolhas(grupos: readonly GrupoComplemento[], escolhas: readonly Escolha[]): string | null {
  const porGrupo = new Map<string, number>();
  for (const escolha of escolhas) {
    if (!Number.isInteger(escolha.quantidade) || escolha.quantidade < 1) return "Quantidade inválida.";
    const grupo = grupos.find((g) => g.id === escolha.grupoId);
    if (!grupo) return "Opção indisponível para este produto.";
    const opcao = grupo.opcoes.find((o) => o.id === escolha.opcaoId);
    if (!opcao) return "Opção indisponível para este produto.";
    if (opcao.esgotado) return `${opcao.nome} está esgotado.`;
    porGrupo.set(grupo.id, (porGrupo.get(grupo.id) ?? 0) + escolha.quantidade);
  }
  for (const grupo of grupos) {
    const total = porGrupo.get(grupo.id) ?? 0;
    if (total < grupo.minimo) return `${grupo.nome}: ${descreverRegraGrupo(grupo.minimo, grupo.maximo).toLowerCase()}.`;
    if (total > grupo.maximo) return `${grupo.nome}: no máximo ${grupo.maximo}.`;
  }
  return null;
}

/** Preço unitário do item: preço base + adicionais escolhidos. Supõe escolhas já validadas. */
export function precoComAdicionais(precoBase: number, grupos: readonly GrupoComplemento[], escolhas: readonly Escolha[]): number {
  let total = precoBase;
  for (const escolha of escolhas) {
    const opcao = grupos.find((g) => g.id === escolha.grupoId)?.opcoes.find((o) => o.id === escolha.opcaoId);
    if (opcao) total += opcao.precoAdicional * escolha.quantidade;
  }
  return total;
}

/** Custo do produto: porção da receita + embalagens. */
export function custoProduto(custoReceitaPorUnidade: number | null, quantidadeReceita: number, custoEmbalagens: number): number | null {
  if (custoReceitaPorUnidade === null) return null;
  return custoReceitaPorUnidade * quantidadeReceita + custoEmbalagens;
}
