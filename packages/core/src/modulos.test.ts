import { describe, expect, it } from "vitest";
import { MODULOS, modulosDoPerfil, podeAcessar, telaInicial } from "./modulos";
import { PERFIS, ehAdmin, ehPerfil, exige2fa } from "./perfis";

describe("módulos", () => {
  it("têm ids e caminhos únicos", () => {
    expect(new Set(MODULOS.map((m) => m.id)).size).toBe(MODULOS.length);
    expect(new Set(MODULOS.map((m) => m.caminho)).size).toBe(MODULOS.length);
  });

  it("todo perfil tem ao menos um módulo", () => {
    for (const perfil of PERFIS) expect(modulosDoPerfil(perfil).length).toBeGreaterThan(0);
  });

  it("administradora e suporte acessam tudo", () => {
    for (const m of MODULOS) {
      expect(podeAcessar("dona", m.id)).toBe(true);
      expect(podeAcessar("suporte", m.id)).toBe(true);
    }
  });

  it("cozinha não acessa financeiro nem configurações", () => {
    expect(podeAcessar("cozinha", "pedidos")).toBe(true);
    expect(podeAcessar("cozinha", "agenda")).toBe(true);
    expect(podeAcessar("cozinha", "cardapio")).toBe(true);
    for (const id of ["inicio", "receitas", "relatorios", "usuarios", "pagamentos"] as const) {
      expect(podeAcessar("cozinha", id)).toBe(false);
    }
  });

  it("entregador acessa somente pedidos", () => {
    expect(modulosDoPerfil("entregador").map((m) => m.id)).toEqual(["pedidos"]);
  });

  it("define a tela inicial por perfil", () => {
    expect(telaInicial("dona")).toBe("/painel");
    expect(telaInicial("cozinha")).toBe("/painel/pedidos");
    expect(telaInicial("entregador")).toBe("/painel/pedidos");
  });
});

describe("perfis", () => {
  it("valida perfis", () => {
    expect(ehPerfil("dona")).toBe(true);
    expect(ehPerfil("admin")).toBe(false);
    expect(ehPerfil(undefined)).toBe(false);
  });

  it("exige 2FA e acesso admin apenas para dona e suporte", () => {
    expect(PERFIS.filter(exige2fa)).toEqual(["dona", "suporte"]);
    expect(PERFIS.filter(ehAdmin)).toEqual(["dona", "suporte"]);
  });
});
