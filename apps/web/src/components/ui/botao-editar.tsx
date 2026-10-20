import { Pencil } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function BotaoEditar({ rotulo, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string }) {
  return (
    <button
      type="button"
      className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
      aria-label={rotulo}
      title="Editar"
      {...props}
    >
      <Pencil className="size-5" />
    </button>
  );
}
