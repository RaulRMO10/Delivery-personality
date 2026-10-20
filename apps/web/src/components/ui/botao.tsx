import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const variantes = {
  principal: "bg-marca-600 text-white hover:bg-marca-700",
  secundario: "border border-borda bg-superficie text-texto hover:bg-fundo",
  perigo: "bg-status-cancelado text-white hover:opacity-90",
  fantasma: "text-texto-suave hover:bg-fundo hover:text-texto",
} as const;

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof variantes;
}

export function Botao({ variante = "principal", className, type = "button", ...props }: BotaoProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-500",
        "disabled:pointer-events-none disabled:opacity-50",
        variantes[variante],
        className,
      )}
      {...props}
    />
  );
}
