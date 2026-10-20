import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FUSO_LOJA, NOME_CANAL, NOME_PAGAMENTO, formatarDinheiro, formatarTelefone, type CanalPedido, type FormaPagamento } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { carregarPedido } from "@/lib/pedidos";
import { obterConfiguracao } from "@/lib/loja";
import { ImprimirAoAbrir } from "./imprimir";

export const metadata: Metadata = { title: "Comanda", robots: { index: false } };

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short", timeStyle: "short" });

export default async function Comanda({ params }: PageProps<"/comanda/[id]">) {
  await exigirModulo("pedidos");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [pedido, config] = await Promise.all([carregarPedido(id), obterConfiguracao()]);
  if (!pedido) notFound();

  const linha = <hr className="my-2 border-t border-dashed border-black" />;

  return (
    <main className="comanda mx-auto w-[80mm] bg-white p-2 font-mono text-[13px] leading-snug text-black">
      <ImprimirAoAbrir />
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print { body { background: #fff; } .nao-imprimir { display: none; } }
      `}</style>
      <p className="text-center font-bold">{config.nome}</p>
      <p className="text-center text-2xl font-bold">PEDIDO #{pedido.numero}</p>
      <p className="text-center">
        {NOME_CANAL[pedido.canal as CanalPedido]}
        {pedido.codigoExterno ? ` · ${pedido.codigoExterno}` : ""}
      </p>
      <p className="text-center">{formatoDataHora.format(pedido.criadoEm)}</p>
      {pedido.agendadoPara && <p className="mt-1 text-center font-bold">AGENDADO: {formatoDataHora.format(pedido.agendadoPara)}</p>}
      {linha}
      <p className="font-bold">{pedido.tipo === "entrega" ? "ENTREGA" : "RETIRADA"}</p>
      <p>{pedido.nomeCliente}</p>
      {pedido.telefoneCliente && <p>{formatarTelefone(pedido.telefoneCliente)}</p>}
      {pedido.endereco && (
        <>
          <p>
            {pedido.endereco.rua}, {pedido.endereco.numero}
          </p>
          {pedido.endereco.complemento && <p>{pedido.endereco.complemento}</p>}
          <p className="font-bold">{pedido.endereco.bairro}</p>
          {pedido.endereco.referencia && <p>Ref.: {pedido.endereco.referencia}</p>}
        </>
      )}
      {linha}
      {pedido.itens.map((item) => (
        <div key={item.id} className="mb-1.5">
          <div className="flex justify-between gap-2">
            <span className="font-bold">
              {item.quantidade}x {item.nome}
            </span>
            <span>{formatarDinheiro(item.precoUnitario * item.quantidade)}</span>
          </div>
          {item.opcoes.map((o, i) => (
            <p key={i} className="pl-3">
              - {o.quantidade > 1 ? `${o.quantidade}x ` : ""}
              {o.opcao}
            </p>
          ))}
          {item.observacao && <p className="pl-3 font-bold">OBS: {item.observacao}</p>}
        </div>
      ))}
      {pedido.observacao && (
        <>
          {linha}
          <p className="font-bold">OBS. DO PEDIDO: {pedido.observacao}</p>
        </>
      )}
      {linha}
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatarDinheiro(pedido.subtotal)}</span>
      </div>
      {pedido.desconto > 0 && (
        <div className="flex justify-between">
          <span>Desconto</span>
          <span>-{formatarDinheiro(pedido.desconto)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Entrega</span>
        <span>{formatarDinheiro(pedido.taxaEntrega)}</span>
      </div>
      <div className="flex justify-between text-base font-bold">
        <span>TOTAL</span>
        <span>{formatarDinheiro(pedido.total)}</span>
      </div>
      <p className="mt-1">
        {NOME_PAGAMENTO[pedido.formaPagamento as FormaPagamento] ?? "Pago online"} · {pedido.statusPagamento === "pago" ? "PAGO" : "A RECEBER"}
      </p>
      {pedido.trocoPara && (
        <p className="font-bold">
          Troco para {formatarDinheiro(pedido.trocoPara)}: levar {formatarDinheiro(pedido.trocoPara - pedido.total)}
        </p>
      )}
      {linha}
      <p className="text-center">Obrigado pela preferência!</p>
    </main>
  );
}
