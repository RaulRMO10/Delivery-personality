import { podeEditarCardapio } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Abas } from "@/components/painel/abas";

export default async function LayoutCardapio({ children }: LayoutProps<"/painel/cardapio">) {
  const usuario = await exigirModulo("cardapio");
  const abas = [
    { nome: "Produtos", caminho: "/painel/cardapio" },
    ...(podeEditarCardapio(usuario.perfil) ? [{ nome: "Categorias", caminho: "/painel/cardapio/categorias" }] : []),
    { nome: "Complementos", caminho: "/painel/cardapio/complementos" },
  ];
  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina titulo="Cardápio" />
      <Abas abas={abas} />
      {children}
    </div>
  );
}
