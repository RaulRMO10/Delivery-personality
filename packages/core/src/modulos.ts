import type { Perfil } from "./perfis";

export type GrupoModulo = "operacao" | "producao" | "vendas" | "configuracoes";

export type ModuloId =
  | "inicio"
  | "pedidos"
  | "agenda"
  | "cardapio"
  | "receitas"
  | "estoque"
  | "clientes"
  | "marketing"
  | "avaliacoes"
  | "relatorios"
  | "loja"
  | "entrega"
  | "pagamentos"
  | "integracoes"
  | "usuarios"
  | "anotacoes"
  | "atividades";

export interface Modulo {
  id: ModuloId;
  nome: string;
  caminho: string;
  grupo: GrupoModulo;
  perfis: readonly Perfil[];
}

const TODOS: readonly Perfil[] = ["dona", "suporte"];

export const NOME_GRUPO: Record<GrupoModulo, string> = {
  operacao: "Operação",
  producao: "Produção",
  vendas: "Vendas",
  configuracoes: "Configurações",
};

export const MODULOS: readonly Modulo[] = [
  { id: "inicio", nome: "Início", caminho: "/painel", grupo: "operacao", perfis: TODOS },
  {
    id: "pedidos",
    nome: "Pedidos",
    caminho: "/painel/pedidos",
    grupo: "operacao",
    perfis: [...TODOS, "cozinha", "entregador"],
  },
  {
    id: "agenda",
    nome: "Agenda",
    caminho: "/painel/agenda",
    grupo: "operacao",
    perfis: [...TODOS, "cozinha"],
  },
  {
    id: "cardapio",
    nome: "Cardápio",
    caminho: "/painel/cardapio",
    grupo: "producao",
    perfis: [...TODOS, "cozinha"],
  },
  { id: "receitas", nome: "Receitas e custos", caminho: "/painel/receitas", grupo: "producao", perfis: TODOS },
  { id: "estoque", nome: "Estoque", caminho: "/painel/estoque", grupo: "producao", perfis: TODOS },
  { id: "clientes", nome: "Clientes", caminho: "/painel/clientes", grupo: "vendas", perfis: TODOS },
  { id: "marketing", nome: "Marketing", caminho: "/painel/marketing", grupo: "vendas", perfis: TODOS },
  { id: "avaliacoes", nome: "Avaliações", caminho: "/painel/avaliacoes", grupo: "vendas", perfis: TODOS },
  { id: "relatorios", nome: "Relatórios", caminho: "/painel/relatorios", grupo: "vendas", perfis: TODOS },
  { id: "loja", nome: "Loja", caminho: "/painel/loja", grupo: "configuracoes", perfis: TODOS },
  { id: "entrega", nome: "Entrega", caminho: "/painel/entrega", grupo: "configuracoes", perfis: TODOS },
  { id: "pagamentos", nome: "Pagamentos", caminho: "/painel/pagamentos", grupo: "configuracoes", perfis: TODOS },
  { id: "integracoes", nome: "Integrações", caminho: "/painel/integracoes", grupo: "configuracoes", perfis: TODOS },
  { id: "usuarios", nome: "Usuários", caminho: "/painel/usuarios", grupo: "configuracoes", perfis: TODOS },
  { id: "anotacoes", nome: "Anotações", caminho: "/painel/anotacoes", grupo: "configuracoes", perfis: TODOS },
  { id: "atividades", nome: "Atividades", caminho: "/painel/atividades", grupo: "configuracoes", perfis: TODOS },
];

export function buscarModulo(id: ModuloId): Modulo {
  const modulo = MODULOS.find((m) => m.id === id);
  if (!modulo) throw new Error(`Módulo inexistente: ${id}`);
  return modulo;
}

export function podeAcessar(perfil: Perfil, id: ModuloId): boolean {
  return buscarModulo(id).perfis.includes(perfil);
}

export function modulosDoPerfil(perfil: Perfil): Modulo[] {
  return MODULOS.filter((m) => m.perfis.includes(perfil));
}

/** Primeira tela disponível para o perfil após o login. */
export function telaInicial(perfil: Perfil): string {
  const [primeiro] = modulosDoPerfil(perfil);
  if (!primeiro) throw new Error(`Perfil sem módulos: ${perfil}`);
  return primeiro.caminho;
}
