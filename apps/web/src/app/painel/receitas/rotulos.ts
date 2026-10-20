import { formatarDinheiro, type Unidade } from "@delivery/core";

/** Custo por unidade de rendimento, exibido por kg/L quando a unidade é g/ml. */
export function custoPorRendimento(porUnidade: number, unidade: Unidade): string {
  if (unidade === "g") return `${formatarDinheiro(porUnidade * 1000)}/kg`;
  if (unidade === "ml") return `${formatarDinheiro(porUnidade * 1000)}/L`;
  return `${formatarDinheiro(porUnidade)}/un`;
}
