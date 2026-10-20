import type { Metadata } from "next";
import { desc, eq, db, schema } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { formatarDataHora } from "@/lib/utils";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";

export const metadata: Metadata = { title: "Atividades" };

const LIMITE = 200;

const DESCRICAO_ACAO: Record<string, string> = {
  login: "Entrou no sistema",
  "usuario.criado": "Criou usuário",
  "usuario.perfil_alterado": "Alterou perfil",
  "usuario.bloqueado": "Bloqueou usuário",
  "usuario.desbloqueado": "Desbloqueou usuário",
  "usuario.senha_redefinida": "Redefiniu senha",
  "insumo.criado": "Cadastrou item",
  "insumo.atualizado": "Alterou item",
  "insumo.excluido": "Excluiu item",
  "receita.criada": "Criou receita",
  "receita.atualizada": "Alterou receita",
  "receita.excluida": "Excluiu receita",
  "custo_fixo.salvo": "Salvou custo fixo",
  "custo_fixo.excluido": "Excluiu custo fixo",
  "parametros.salvos": "Alterou parâmetros de preço",
  "canal.salvo": "Salvou canal",
  "canal.excluido": "Excluiu canal",
  "produto.criado": "Criou produto",
  "produto.atualizado": "Alterou produto",
  "produto.excluido": "Excluiu produto",
  "produto.esgotado": "Marcou esgotado",
  "produto.disponivel": "Marcou disponível",
  "produto.ativado": "Exibiu produto",
  "produto.ocultado": "Ocultou produto",
  "opcao.esgotada": "Marcou opção esgotada",
  "opcao.disponivel": "Marcou opção disponível",
  "categoria.salva": "Salvou categoria",
  "categoria.excluida": "Excluiu categoria",
  "grupo.criado": "Criou complemento",
  "grupo.atualizado": "Alterou complemento",
  "grupo.excluido": "Excluiu complemento",
  "loja.pausada": "Pausou a loja",
  "loja.fechada": "Fechou a loja",
  "loja.reaberta": "Reabriu a loja",
  "loja.dados_salvos": "Alterou dados da loja",
  "loja.horarios_salvos": "Alterou horários",
  "loja.data_fechada": "Adicionou data fechada",
  "entrega.regras_salvas": "Alterou regras de entrega",
  "bairro.salvo": "Salvou bairro",
  "bairro.excluido": "Excluiu bairro",
  "pedido.cancelado": "Cancelou pedido",
  "pedido.pago": "Registrou pagamento",
  "pagamentos.salvos": "Alterou formas de pagamento",
  "cliente.atualizado": "Alterou cliente",
  "cliente.dados_excluidos": "Excluiu dados de cliente",
  "cupom.salvo": "Salvou cupom",
  "cupom.excluido": "Excluiu cupom",
  "fidelidade.salva": "Alterou fidelidade",
  "agenda.regras_salvas": "Alterou regras de encomenda",
  "integracao.reenvio": "Reenviou ação ao iFood",
  "estoque.configurado": "Configurou estoque",
  "estoque.entrada": "Registrou entrada no estoque",
  "estoque.perda": "Registrou perda no estoque",
  "estoque.ajuste": "Ajustou estoque",
  "avaliacao.respondida": "Respondeu avaliação",
};

export default async function PaginaAtividades() {
  await exigirModulo("atividades");
  const atividades = await db
    .select({
      id: schema.atividades.id,
      acao: schema.atividades.acao,
      detalhes: schema.atividades.detalhes,
      criadoEm: schema.atividades.criadoEm,
      usuario: schema.user.name,
    })
    .from(schema.atividades)
    .leftJoin(schema.user, eq(schema.atividades.usuarioId, schema.user.id))
    .orderBy(desc(schema.atividades.criadoEm))
    .limit(LIMITE);

  return (
    <div className="mx-auto max-w-3xl">
      <TituloPagina titulo="Atividades" />
      <Cartao className="p-0">
        {atividades.length === 0 ? (
          <p className="p-8 text-center text-texto-suave">Nenhuma atividade.</p>
        ) : (
          <ul className="divide-y divide-borda">
            {atividades.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                <div>
                  <span className="font-semibold">{a.usuario ?? "Usuário removido"}</span>{" "}
                  <span className="text-texto-suave">{DESCRICAO_ACAO[a.acao] ?? a.acao}</span>
                  {typeof a.detalhes?.email === "string" && <span className="text-texto-suave"> · {a.detalhes.email}</span>}
                  {typeof a.detalhes?.nome === "string" && <span className="text-texto-suave"> · {a.detalhes.nome}</span>}
                </div>
                <time dateTime={a.criadoEm.toISOString()} className="text-sm text-texto-suave">
                  {formatarDataHora(a.criadoEm)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
