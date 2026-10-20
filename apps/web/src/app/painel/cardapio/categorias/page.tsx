import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { podeEditarCardapio } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";
import { Campo } from "@/components/ui/campo";
import { Vazio } from "@/components/ui/vazio";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { FormularioDialogo } from "@/components/ui/formulario-dialogo";
import { listarCategorias, listarProdutos } from "../dados";
import { excluirCategoria, salvarCategoria } from "../acoes";
import { BotoesOrdem } from "../controles";
import { BotaoVisivel } from "./botao-visivel";

export const metadata: Metadata = { title: "Categorias" };

function CamposCategoria({ id, nome }: { id?: string; nome?: string }) {
  return (
    <>
      <input type="hidden" name="id" value={id ?? ""} />
      <Campo rotulo="Nome" name="nome" defaultValue={nome} placeholder="Ex.: Salgados" autoComplete="off" required />
    </>
  );
}

export default async function PaginaCategorias() {
  const usuario = await exigirModulo("cardapio");
  if (!podeEditarCardapio(usuario.perfil)) redirect("/painel/cardapio");
  const [categorias, produtos] = await Promise.all([listarCategorias(), listarProdutos()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <FormularioDialogo titulo="Nova categoria" acao={salvarCategoria}>
          <CamposCategoria />
        </FormularioDialogo>
      </div>
      {categorias.length === 0 ? (
        <Vazio texto="Nenhuma categoria cadastrada." />
      ) : (
        <Cartao className="p-0">
          <ul className="divide-y divide-borda">
            {categorias.map((c, indice) => {
              const quantidade = produtos.filter((p) => p.categoriaId === c.id).length;
              return (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2 sm:px-5">
                  <BotoesOrdem id={c.id} tipo="categoria" nome={c.nome} primeiro={indice === 0} ultimo={indice === categorias.length - 1} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.nome}</p>
                    <p className="text-sm text-texto-suave">{quantidade === 1 ? "1 produto" : `${quantidade} produtos`}</p>
                  </div>
                  <BotaoVisivel id={c.id} ativo={c.ativo} nome={c.nome} />
                  <FormularioDialogo titulo="Editar categoria" rotuloEditar={`Editar ${c.nome}`} acao={salvarCategoria}>
                    <CamposCategoria id={c.id} nome={c.nome} />
                  </FormularioDialogo>
                  <BotaoExcluir id={c.id} nome={c.nome} acao={excluirCategoria} />
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
