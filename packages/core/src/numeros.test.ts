import { describe, expect, it } from "vitest";
import { formatarDinheiro, lerDinheiro, lerNumero } from "./numeros";

describe("números", () => {
  it("lê formatos brasileiros e simples", () => {
    expect(lerNumero("6,50")).toBe(6.5);
    expect(lerNumero("1.234,56")).toBe(1234.56);
    expect(lerNumero("6.5")).toBe(6.5);
    expect(lerNumero("R$ 10")).toBe(10);
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("abc")).toBeNull();
    expect(lerNumero("1,2,3")).toBeNull();
  });

  it("converte dinheiro em centavos", () => {
    expect(lerDinheiro("6,50")).toBe(650);
    expect(lerDinheiro("0,1")).toBe(10);
    expect(lerDinheiro("19,999")).toBe(2000);
  });

  it("formata em reais", () => {
    expect(formatarDinheiro(650).replace(/\s/g, " ")).toBe("R$ 6,50");
  });
});
