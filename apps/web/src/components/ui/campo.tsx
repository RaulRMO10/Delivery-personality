import { cn } from "@/lib/utils";
import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

const estiloCampo =
  "min-h-12 w-full rounded-xl border border-borda bg-superficie px-4 text-base outline-none transition-colors focus:border-marca-500 focus:ring-2 focus:ring-marca-100";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
}

export function Campo({ rotulo, className, id, ...props }: CampoProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-sm font-semibold">
        {rotulo}
      </label>
      <input id={idCampo} className={cn(estiloCampo, className)} {...props} />
    </div>
  );
}

interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string;
}

export function Selecao({ rotulo, className, id, children, ...props }: SelecaoProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-sm font-semibold">
        {rotulo}
      </label>
      <select id={idCampo} className={cn(estiloCampo, className)} {...props}>
        {children}
      </select>
    </div>
  );
}
