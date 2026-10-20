import { connection } from "next/server";
import { descreverStatus } from "@delivery/core";
import { calcularStatus, obterConfiguracao } from "@/lib/loja";

export default async function Inicio() {
  await connection();
  const config = await obterConfiguracao();
  const agora = new Date();
  const status = calcularStatus(config, agora);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-3xl font-bold text-marca-600">{config.nome}</h1>
      <p className={status.aberta ? "font-semibold text-status-pronto" : "text-texto-suave"}>{descreverStatus(status, agora)}</p>
      {config.aviso && <p className="text-sm text-texto-suave">{config.aviso}</p>}
      <p className="mt-4 text-texto-suave">Cardápio em breve.</p>
    </main>
  );
}
