import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Selo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-fundo px-2.5 py-0.5 text-xs font-semibold text-texto-suave", className)}>
      {children}
    </span>
  );
}
