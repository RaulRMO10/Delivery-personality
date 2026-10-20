import { LOJA } from "@delivery/core";

export default function LayoutEntrar({ children }: LayoutProps<"/entrar">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-2xl font-bold text-marca-600">{LOJA.nome}</p>
        {children}
      </div>
    </main>
  );
}
