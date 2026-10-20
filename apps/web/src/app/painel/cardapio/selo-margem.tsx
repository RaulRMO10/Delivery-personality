import { formatarPercentual } from "@delivery/core";
import { Selo } from "@/components/ui/selo";
import type { MargemCanal } from "./margens";

export function classeMargem(margem: MargemCanal, desejada: number) {
  if (margem.lucro < 0) return "bg-status-cancelado/10 text-status-cancelado";
  if (margem.margemPercentual < desejada) return "bg-status-atrasado/10 text-status-atrasado";
  return "bg-status-pronto/10 text-status-pronto";
}

/** Margem na loja própria e alerta de prejuízo em outros canais. */
export function SeloMargem({ canais, desejada }: { canais: MargemCanal[]; desejada: number }) {
  const [loja, ...outros] = canais;
  if (!loja) return null;
  const comPrejuizo = outros.filter((c) => c.lucro < 0);
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <Selo className={classeMargem(loja, desejada)}>
        {loja.lucro < 0 ? "Prejuízo" : `Margem ${formatarPercentual(loja.margemPercentual)}`}
      </Selo>
      {comPrejuizo.map((c) => (
        <Selo key={c.canalId} className="bg-status-cancelado/10 text-status-cancelado">
          Prejuízo no {c.canal}
        </Selo>
      ))}
    </span>
  );
}
