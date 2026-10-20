import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { descreverStatus } from "@delivery/core";
import { calcularStatus, obterConfiguracao } from "@/lib/loja";
import { cn } from "@/lib/utils";
import { CarrinhoProvider } from "@/components/loja/carrinho";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { nome } = await obterConfiguracao();
  return { title: { default: nome, template: `%s · ${nome}` } };
}

export default async function LayoutLoja({ children }: LayoutProps<"/">) {
  await connection();
  const config = await obterConfiguracao();
  const agora = new Date();
  const status = calcularStatus(config, agora);

  return (
    <CarrinhoProvider>
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <Link href="/" className="block truncate text-xl font-bold text-marca-600">
              {config.nome}
            </Link>
            <p className={cn("text-sm font-semibold", status.aberta ? "text-status-pronto" : "text-texto-suave")}>{descreverStatus(status, agora)}</p>
          </div>
          <Link href="/meus-pedidos" className="shrink-0 text-sm font-semibold text-texto-suave hover:text-texto">
            Meus pedidos
          </Link>
        </div>
        {config.aviso && <p className="bg-marca-50 px-4 py-2 text-center text-sm font-semibold text-marca-700">{config.aviso}</p>}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-x-4 gap-y-1 px-4 pt-8 pb-28 text-xs text-texto-suave">
        <Link href="/privacidade" className="hover:underline">
          Privacidade
        </Link>
        <Link href="/termos" className="hover:underline">
          Termos de uso
        </Link>
        {config.documento && <span>{config.documento}</span>}
      </footer>
    </CarrinhoProvider>
  );
}
