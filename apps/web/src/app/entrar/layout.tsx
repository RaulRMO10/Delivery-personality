import { connection } from "next/server";
import { obterConfiguracao } from "@/lib/loja";

export default async function LayoutEntrar({ children }: LayoutProps<"/entrar">) {
  await connection();
  const { nome } = await obterConfiguracao();
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-2xl font-bold text-marca-600">{nome}</p>
        {children}
      </div>
    </main>
  );
}
