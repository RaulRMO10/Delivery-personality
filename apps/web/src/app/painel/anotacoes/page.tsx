import type { Metadata } from "next";
import { Pin } from "lucide-react";
import { FUSO_LOJA } from "@delivery/core";
import { db, desc, ilike, or, schema } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Vazio } from "@/components/ui/vazio";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { FormularioDialogo } from "@/components/ui/formulario-dialogo";
import { excluirAnotacao, salvarAnotacao } from "./acoes";

export const metadata: Metadata = { title: "Anotações" };

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short" });

function CamposAnotacao({ id, titulo, conteudo, fixada }: { id?: string; titulo?: string; conteudo?: string; fixada?: boolean }) {
  return (
    <>
      <input type="hidden" name="id" value={id ?? ""} />
      <Campo rotulo="Título" name="titulo" defaultValue={titulo} maxLength={120} required />
      <AreaTexto rotulo="Conteúdo" name="conteudo" defaultValue={conteudo} maxLength={10000} className="min-h-48" />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="fixada" defaultChecked={fixada} className="size-5 accent-marca-600" />
        Fixar no topo
      </label>
    </>
  );
}

export default async function PaginaAnotacoes({ searchParams }: PageProps<"/painel/anotacoes">) {
  await exigirModulo("anotacoes");
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim().slice(0, 60) : "";
  const notas = await db
    .select()
    .from(schema.anotacoes)
    .where(busca ? or(ilike(schema.anotacoes.titulo, `%${busca}%`), ilike(schema.anotacoes.conteudo, `%${busca}%`)) : undefined)
    .orderBy(desc(schema.anotacoes.fixada), desc(schema.anotacoes.atualizadoEm));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <TituloPagina
        titulo="Anotações"
        acoes={
          <FormularioDialogo titulo="Nova anotação" acao={salvarAnotacao}>
            <CamposAnotacao />
          </FormularioDialogo>
        }
      />
      <form role="search">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Buscar"
          aria-label="Buscar anotações"
          className="min-h-12 w-full rounded-xl border border-borda bg-superficie px-4 outline-none focus:border-marca-500"
        />
      </form>
      {notas.length === 0 ? (
        <Vazio texto={busca ? "Nenhuma anotação encontrada." : "Nenhuma anotação."} />
      ) : (
        notas.map((n) => (
          <Cartao key={n.id} className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <h2 className="flex flex-1 items-center gap-2 text-lg font-bold">
                {n.fixada && <Pin className="size-4 text-marca-600" aria-label="Fixada" />}
                {n.titulo}
              </h2>
              <FormularioDialogo titulo="Editar anotação" rotuloEditar={`Editar ${n.titulo}`} acao={salvarAnotacao}>
                <CamposAnotacao id={n.id} titulo={n.titulo} conteudo={n.conteudo} fixada={n.fixada} />
              </FormularioDialogo>
              <BotaoExcluir id={n.id} nome={n.titulo} acao={excluirAnotacao} />
            </div>
            {n.conteudo && <p className="whitespace-pre-wrap text-texto">{n.conteudo}</p>}
            <p className="text-xs text-texto-suave">Atualizada em {formatoData.format(n.atualizadoEm)}</p>
          </Cartao>
        ))
      )}
    </div>
  );
}
