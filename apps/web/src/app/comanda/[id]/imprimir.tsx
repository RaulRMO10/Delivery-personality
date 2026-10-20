"use client";

import { useEffect } from "react";

export function ImprimirAoAbrir() {
  useEffect(() => {
    const id = setTimeout(() => window.print(), 300);
    return () => clearTimeout(id);
  }, []);
  return (
    <button type="button" onClick={() => window.print()} className="nao-imprimir mb-3 w-full rounded border border-black py-2 font-sans font-bold">
      Imprimir
    </button>
  );
}
