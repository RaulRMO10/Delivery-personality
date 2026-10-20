import { describe, expect, it } from "vitest";
import { crc16, gerarPixCopiaECola, validarChavePix } from "./pix";

describe("Pix copia e cola", () => {
  it("CRC16-CCITT (valor de referência)", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("monta os campos na ordem do padrão e fecha com CRC válido", () => {
    const codigo = gerarPixCopiaECola({ chave: "teste@exemplo.com", nomeRecebedor: "Doces da Vó", cidade: "São Paulo", valor: 4450, identificador: "PED123" });
    expect(codigo.startsWith("000201")).toBe(true);
    expect(codigo).toContain("0014br.gov.bcb.pix0117teste@exemplo.com");
    expect(codigo).toContain("5303986");
    expect(codigo).toContain("540544.50");
    expect(codigo).toContain("5802BR");
    expect(codigo).toContain("5911Doces da Vo");
    expect(codigo).toContain("6009Sao Paulo");
    expect(codigo).toContain("62100506PED123");
    const semCrc = codigo.slice(0, -4);
    expect(semCrc.endsWith("6304")).toBe(true);
    expect(codigo.slice(-4)).toBe(crc16(semCrc));
  });

  it("sem valor e sem identificador", () => {
    const codigo = gerarPixCopiaECola({ chave: "12345678901", nomeRecebedor: "Loja", cidade: "Rio" });
    expect(codigo).not.toContain("5406");
    expect(codigo).toContain("62070503***");
  });

  it("limita nome (25) e cidade (15)", () => {
    const codigo = gerarPixCopiaECola({ chave: "x@y.com", nomeRecebedor: "A".repeat(40), cidade: "B".repeat(30), valor: 100 });
    expect(codigo).toContain(`5925${"A".repeat(25)}`);
    expect(codigo).toContain(`6015${"B".repeat(15)}`);
  });

  it("valida chaves", () => {
    expect(validarChavePix("123.456.789-01")).toEqual({ ok: true, chave: "12345678901" });
    expect(validarChavePix("12.345.678/0001-90")).toEqual({ ok: true, chave: "12345678000190" });
    expect(validarChavePix("(11) 98888-7777")).toEqual({ ok: true, chave: "+5511988887777" });
    expect(validarChavePix("+55 11 98888-7777")).toEqual({ ok: true, chave: "+5511988887777" });
    expect(validarChavePix("Loja@Exemplo.com")).toEqual({ ok: true, chave: "loja@exemplo.com" });
    expect(validarChavePix("123e4567-e89b-12d3-a456-426614174000").ok).toBe(true);
    expect(validarChavePix("abc").ok).toBe(false);
  });
});
