import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <Link href="/" className="font-semibold text-marca-600 hover:underline">
        Voltar ao início
      </Link>
    </main>
  );
}
