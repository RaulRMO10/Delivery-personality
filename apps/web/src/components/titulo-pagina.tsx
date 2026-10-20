import type { ReactNode } from "react";

export function TituloPagina({ titulo, acoes }: { titulo: string; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      {acoes}
    </div>
  );
}
