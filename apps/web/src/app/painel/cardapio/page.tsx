import type { Metadata } from "next";
import Link from "next/link";
import { ImageIcon, Pencil, Plus } from "lucide-react";
import { formatarDinheiro, podeEditarCardapio } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";
import { Vazio } from "@/components/ui/vazio";
import { calcularMargens, carregarCustos, listarCategorias, listarProdutos } from "./dados";
import { BotaoEsgotado, BotoesOrdem } from "./controles";
import { SeloMargem } from "./selo-margem";

export const metadata: Metadata = { title: "Cardápio" };

export default async function PaginaCardapio() {
  const usuario = await exigirModulo("cardapio");
  const editor = podeEditarCardapio(usuario.perfil);
  const [categorias, produtos, custos] = await Promise.all([listarCategorias(), listarProdutos(), editor ? carregarCustos() : null]);

  if (categorias.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Vazio texto="Nenhuma categoria cadastrada." />
        {editor && (
          <Link href="/painel/cardapio/categorias" className="font-semibold text-marca-600 hover:underline">
            Criar categoria
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {editor && (
        <div className="flex justify-end">
          <Link
            href="/painel/cardapio/novo"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-marca-600 px-5 font-semibold text-white hover:bg-marca-700"
          >
            <Plus className="size-5" aria-hidden />
            Novo produto
          </Link>
        </div>
      )}
      {categorias.map((categoria) => {
        const itens = produtos.filter((p) => p.categoriaId === categoria.id);
        return (
          <section key={categoria.id} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              {categoria.nome}
              {!categoria.ativo && <Selo>Oculta</Selo>}
            </h2>
            {itens.length === 0 ? (
              <p className="text-sm text-texto-suave">Nenhum produto.</p>
            ) : (
              <Cartao className="p-0">
                <ul className="divide-y divide-borda">
                  {itens.map((produto, indice) => {
                    const margens = custos ? calcularMargens(produto, custos) : null;
                    return (
                      <li key={produto.id} className="flex items-center gap-3 px-3 py-3 sm:px-5">
                        {editor && (
                          <BotoesOrdem id={produto.id} tipo="produto" nome={produto.nome} primeiro={indice === 0} ultimo={indice === itens.length - 1} />
                        )}
                        {produto.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- foto servida pela própria API
                          <img src={produto.fotoUrl} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-fundo text-texto-suave">
                            <ImageIcon className="size-5" aria-hidden />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{produto.nome}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-texto-suave">
                            <span>{formatarDinheiro(produto.preco)}</span>
                            {!produto.ativo && <Selo>Oculto</Selo>}
                            {produto.destaque && <Selo className="bg-marca-50 text-marca-700">Destaque</Selo>}
                            {margens && custos && <SeloMargem canais={margens.canais} desejada={custos.margemDesejada} />}
                          </div>
                        </div>
                        <BotaoEsgotado id={produto.id} esgotado={produto.esgotado} nome={produto.nome} />
                        {editor && (
                          <Link
                            href={`/painel/cardapio/${produto.id}`}
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
                            aria-label={`Editar ${produto.nome}`}
                          >
                            <Pencil className="size-5" />
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Cartao>
            )}
          </section>
        );
      })}
    </div>
  );
}
