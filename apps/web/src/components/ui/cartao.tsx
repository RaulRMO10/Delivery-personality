import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Cartao({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-borda bg-superficie p-5", className)} {...props} />;
}
