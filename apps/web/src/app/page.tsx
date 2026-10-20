import { LOJA } from "@delivery/core";

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-3xl font-bold text-marca-600">{LOJA.nome}</h1>
      <p className="text-texto-suave">Cardápio em breve.</p>
    </main>
  );
}
