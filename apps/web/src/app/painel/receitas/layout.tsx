import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { AbasReceitas } from "./abas";

export default async function LayoutReceitas({ children }: LayoutProps<"/painel/receitas">) {
  await exigirModulo("receitas");
  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina titulo="Receitas e custos" />
      <AbasReceitas />
      {children}
    </div>
  );
}
