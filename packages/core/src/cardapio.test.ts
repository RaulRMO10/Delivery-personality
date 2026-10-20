import { describe, expect, it } from "vitest";
import {
  custoProduto,
  descreverRegraGrupo,
  podeEditarCardapio,
  precoComAdicionais,
  validarEscolhas,
  validarLimitesGrupo,
  type GrupoComplemento,
} from "./cardapio";

const sabores: GrupoComplemento = {
  id: "sabores",
  nome: "Sabores",
  minimo: 3,
  maximo: 3,
  opcoes: [
    { id: "brig", nome: "Brigadeiro", precoAdicional: 0, esgotado: false },
    { id: "beijo", nome: "Beijinho", precoAdicional: 0, esgotado: false },
    { id: "pist", nome: "Pistache", precoAdicional: 200, esgotado: false },
    { id: "nozes", nome: "Nozes", precoAdicional: 300, esgotado: true },
  ],
};

const molho: GrupoComplemento = {
  id: "molho",
  nome: "Molho",
  minimo: 0,
  maximo: 1,
  opcoes: [{ id: "picante", nome: "Picante", precoAdicional: 150, esgotado: false }],
};

describe("cardápio", () => {
  it("só administradora e suporte editam", () => {
    expect(podeEditarCardapio("dona")).toBe(true);
    expect(podeEditarCardapio("suporte")).toBe(true);
    expect(podeEditarCardapio("cozinha")).toBe(false);
    expect(podeEditarCardapio("entregador")).toBe(false);
  });

  it("valida limites do grupo", () => {
    expect(validarLimitesGrupo(0, 1)).toBeNull();
    expect(validarLimitesGrupo(3, 3)).toBeNull();
    expect(validarLimitesGrupo(2, 1)).not.toBeNull();
    expect(validarLimitesGrupo(0, 0)).not.toBeNull();
    expect(validarLimitesGrupo(-1, 2)).not.toBeNull();
    expect(validarLimitesGrupo(1.5, 2)).not.toBeNull();
  });

  it("descreve a regra", () => {
    expect(descreverRegraGrupo(0, 1)).toBe("Opcional");
    expect(descreverRegraGrupo(0, 3)).toBe("Opcional, até 3");
    expect(descreverRegraGrupo(1, 1)).toBe("Obrigatório");
    expect(descreverRegraGrupo(3, 3)).toBe("Escolha 3");
    expect(descreverRegraGrupo(1, 3)).toBe("Escolha de 1 a 3");
  });

  it("aceita escolhas válidas, com repetição", () => {
    const escolhas = [
      { grupoId: "sabores", opcaoId: "brig", quantidade: 2 },
      { grupoId: "sabores", opcaoId: "pist", quantidade: 1 },
    ];
    expect(validarEscolhas([sabores, molho], escolhas)).toBeNull();
    expect(precoComAdicionais(5000, [sabores, molho], escolhas)).toBe(5200);
  });

  it("recusa quantidade abaixo do mínimo ou acima do máximo", () => {
    expect(validarEscolhas([sabores], [{ grupoId: "sabores", opcaoId: "brig", quantidade: 2 }])).toBe("Sabores: escolha 3.");
    expect(validarEscolhas([sabores], [{ grupoId: "sabores", opcaoId: "brig", quantidade: 4 }])).toBe("Sabores: no máximo 3.");
  });

  it("recusa opção esgotada ou de outro produto", () => {
    expect(validarEscolhas([sabores], [{ grupoId: "sabores", opcaoId: "nozes", quantidade: 3 }])).toBe("Nozes está esgotado.");
    expect(validarEscolhas([sabores], [{ grupoId: "molho", opcaoId: "picante", quantidade: 1 }])).not.toBeNull();
    expect(validarEscolhas([sabores], [{ grupoId: "sabores", opcaoId: "brig", quantidade: 0 }])).toBe("Quantidade inválida.");
  });

  it("grupo opcional pode ficar vazio", () => {
    expect(validarEscolhas([molho], [])).toBeNull();
  });

  it("custo do produto", () => {
    expect(custoProduto(43, 100, 200)).toBe(4500);
    expect(custoProduto(null, 100, 200)).toBeNull();
  });
});
