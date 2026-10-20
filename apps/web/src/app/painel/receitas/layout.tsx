import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Abas } from "@/components/painel/abas";

const ABAS = [
  { nome: "Receitas", caminho: "/painel/receitas" },
  { nome: "Ingredientes", caminho: "/painel/receitas/ingredientes" },
  { nome: "Embalagens", caminho: "/painel/receitas/embalagens" },
  { nome: "Custos fixos", caminho: "/painel/receitas/custos" },
  { nome: "Canais", caminho: "/painel/receitas/canais" },
  { nome: "Precificação", caminho: "/painel/receitas/precificacao" },
];

export default async function LayoutReceitas({ children }: LayoutProps<"/painel/receitas">) {
  await exigirModulo("receitas");
  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina titulo="Receitas e custos" />
      <Abas abas={ABAS} />
      {children}
    </div>
  );
}
