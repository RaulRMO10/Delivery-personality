import type { Metadata } from "next";
import Link from "next/link";
import { telaInicial } from "@delivery/core";
import { exigirUsuario } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";

export const metadata: Metadata = { title: "Sem acesso" };

export default async function PaginaSemAcesso() {
  const usuario = await exigirUsuario();
  return (
    <Cartao className="mx-auto max-w-md py-10 text-center">
      <h1 className="mb-2 text-xl font-bold">Sem acesso</h1>
      <p className="mb-6 text-texto-suave">Seu perfil não tem permissão para esta área.</p>
      <Link href={telaInicial(usuario.perfil)} className="font-semibold text-marca-600 hover:underline">
        Voltar
      </Link>
    </Cartao>
  );
}
