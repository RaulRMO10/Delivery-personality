import type { Metadata } from "next";
import { descreverRegraGrupo, formatarDinheiro, podeEditarCardapio } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";
import { Vazio } from "@/components/ui/vazio";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { listarGrupos, listarProdutos } from "../dados";
import { excluirGrupo } from "../acoes";
import { BotaoEsgotado } from "../controles";
import { EditorGrupo } from "./editor-grupo";

export const metadata: Metadata = { title: "Complementos" };

export default async function PaginaComplementos() {
  const usuario = await exigirModulo("cardapio");
  const editor = podeEditarCardapio(usuario.perfil);
  const [grupos, produtos] = await Promise.all([listarGrupos(), listarProdutos()]);

  return (
    <div className="flex flex-col gap-4">
      {editor && (
        <div className="flex justify-end">
          <EditorGrupo />
        </div>
      )}
      {grupos.length === 0 ? (
        <Vazio texto="Nenhum grupo de complementos." />
      ) : (
        grupos.map((grupo) => {
          const usos = produtos.filter((p) => p.grupoIds.includes(grupo.id)).length;
          return (
            <Cartao key={grupo.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">{grupo.nome}</h2>
                  <p className="flex flex-wrap gap-1.5 text-sm text-texto-suave">
                    <Selo>{descreverRegraGrupo(grupo.minimo, grupo.maximo)}</Selo>
                    <span>{usos === 1 ? "Usado em 1 produto" : `Usado em ${usos} produtos`}</span>
                  </p>
                </div>
                {editor && (
                  <>
                    <EditorGrupo grupo={grupo} />
                    <BotaoExcluir id={grupo.id} nome={grupo.nome} acao={excluirGrupo} />
                  </>
                )}
              </div>
              <ul className="divide-y divide-borda border-t border-borda">
                {grupo.opcoes.map((opcao) => (
                  <li key={opcao.id} className="flex items-center gap-3 py-2">
                    <p className="flex-1">{opcao.nome}</p>
                    <p className="text-sm text-texto-suave">{opcao.precoAdicional > 0 ? `+ ${formatarDinheiro(opcao.precoAdicional)}` : "Sem acréscimo"}</p>
                    <BotaoEsgotado id={opcao.id} esgotado={opcao.esgotado} tipo="opcao" nome={opcao.nome} />
                  </li>
                ))}
              </ul>
            </Cartao>
          );
        })
      )}
    </div>
  );
}
