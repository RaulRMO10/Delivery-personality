import { describe, expect, it } from "vitest";
import {
  descreverStatus,
  horarioLocal,
  minutosParaTexto,
  proximaAbertura,
  statusLoja,
  taxaEntrega,
  textoParaMinutos,
  validarIntervalos,
  type Intervalo,
} from "./funcionamento";

// São Paulo = UTC−3 (sem horário de verão).
const sp = (iso: string) => new Date(`${iso}-03:00`);

// Terça a sábado, 10:00–19:00; sexta e sábado também 20:00–01:00.
const horarios: Intervalo[] = [
  ...[2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, abre: 600, fecha: 1140 })),
  { diaSemana: 5, abre: 1200, fecha: 60 },
  { diaSemana: 6, abre: 1200, fecha: 60 },
];
const semPausa = { fechadaManual: false, pausadaAte: null };

describe("horário local", () => {
  it("converte para o fuso de São Paulo", () => {
    // 2026-10-20 é terça-feira.
    expect(horarioLocal(new Date("2026-10-20T02:30:00Z"))).toEqual({ diaSemana: 1, minutos: 23 * 60 + 30, data: "2026-10-19" });
    expect(horarioLocal(sp("2026-10-20T10:15:00"))).toEqual({ diaSemana: 2, minutos: 615, data: "2026-10-20" });
  });

  it("lê e escreve HH:MM", () => {
    expect(textoParaMinutos("09:30")).toBe(570);
    expect(textoParaMinutos("24:00")).toBeNull();
    expect(textoParaMinutos("9h")).toBeNull();
    expect(minutosParaTexto(570)).toBe("09:30");
  });
});

describe("status da loja", () => {
  it("aberta dentro do horário, com horário de fechamento", () => {
    const s = statusLoja(sp("2026-10-20T12:00:00"), horarios, semPausa);
    expect(s).toEqual({ aberta: true, fechaEm: sp("2026-10-20T19:00:00") });
  });

  it("fechada fora do horário, com próxima abertura", () => {
    const s = statusLoja(sp("2026-10-20T08:00:00"), horarios, semPausa);
    expect(s).toEqual({ aberta: false, motivo: "fora_do_horario", reabreEm: sp("2026-10-20T10:00:00") });
  });

  it("segunda (sem expediente) reabre na terça", () => {
    const s = statusLoja(sp("2026-10-19T12:00:00"), horarios, semPausa);
    expect(s.aberta).toBe(false);
    if (!s.aberta) expect(s.reabreEm).toEqual(sp("2026-10-20T10:00:00"));
  });

  it("intervalo que passa da meia-noite", () => {
    // Sábado 00:30 ainda está no turno de sexta 20:00–01:00.
    expect(statusLoja(sp("2026-10-24T00:30:00"), horarios, semPausa).aberta).toBe(true);
    // Domingo 00:30: turno de sábado 20:00–01:00.
    const domingo = statusLoja(sp("2026-10-25T00:30:00"), horarios, semPausa);
    expect(domingo).toEqual({ aberta: true, fechaEm: sp("2026-10-25T01:00:00") });
    expect(statusLoja(sp("2026-10-25T01:00:00"), horarios, semPausa).aberta).toBe(false);
  });

  it("pausa e fechamento manual têm prioridade", () => {
    const agora = sp("2026-10-20T12:00:00");
    const ate = sp("2026-10-20T12:30:00");
    expect(statusLoja(agora, horarios, { fechadaManual: false, pausadaAte: ate })).toEqual({ aberta: false, motivo: "pausada", reabreEm: ate });
    expect(statusLoja(sp("2026-10-20T12:31:00"), horarios, { fechadaManual: false, pausadaAte: ate }).aberta).toBe(true);
    expect(statusLoja(agora, horarios, { fechadaManual: true, pausadaAte: null })).toEqual({ aberta: false, motivo: "fechada", reabreEm: null });
  });

  it("data fechada pula para o próximo dia aberto", () => {
    const s = statusLoja(sp("2026-10-20T12:00:00"), horarios, semPausa, new Set(["2026-10-20"]));
    expect(s).toEqual({ aberta: false, motivo: "data_fechada", reabreEm: sp("2026-10-21T10:00:00") });
  });

  it("sem horários cadastrados nunca abre", () => {
    expect(statusLoja(sp("2026-10-20T12:00:00"), [], semPausa)).toEqual({ aberta: false, motivo: "fora_do_horario", reabreEm: null });
    expect(proximaAbertura(sp("2026-10-20T12:00:00"), [])).toBeNull();
  });
});

describe("texto do status", () => {
  const agora = sp("2026-10-20T12:00:00");
  it("descreve cada situação", () => {
    expect(descreverStatus(statusLoja(agora, horarios, semPausa), agora)).toBe("Aberta · fecha às 19:00");
    expect(descreverStatus({ aberta: false, motivo: "pausada", reabreEm: sp("2026-10-20T12:30:00") }, agora)).toBe("Pausada até 12:30");
    expect(descreverStatus({ aberta: false, motivo: "fechada", reabreEm: null }, agora)).toBe("Fechada");
    expect(descreverStatus({ aberta: false, motivo: "fora_do_horario", reabreEm: sp("2026-10-20T18:00:00") }, agora)).toBe("Fechada · abre às 18:00");
    expect(descreverStatus({ aberta: false, motivo: "fora_do_horario", reabreEm: sp("2026-10-21T10:00:00") }, agora)).toBe("Fechada · abre amanhã às 10:00");
    expect(descreverStatus({ aberta: false, motivo: "fora_do_horario", reabreEm: sp("2026-10-23T10:00:00") }, agora)).toBe("Fechada · abre sex. às 10:00");
  });
});

describe("entrega e validação", () => {
  it("frete grátis acima do valor", () => {
    expect(taxaEntrega(5000, 800, { freteGratisAcima: 10000 })).toBe(800);
    expect(taxaEntrega(10000, 800, { freteGratisAcima: 10000 })).toBe(0);
    expect(taxaEntrega(99999, 800, { freteGratisAcima: null })).toBe(800);
  });

  it("valida intervalos", () => {
    expect(validarIntervalos(horarios)).toBeNull();
    expect(validarIntervalos([{ diaSemana: 1, abre: 600, fecha: 600 }])).not.toBeNull();
    expect(
      validarIntervalos([
        { diaSemana: 1, abre: 600, fecha: 900 },
        { diaSemana: 1, abre: 840, fecha: 1000 },
      ]),
    ).toBe("Há horários sobrepostos.");
    // Sábado 22:00–02:00 invade domingo 01:00–03:00.
    expect(
      validarIntervalos([
        { diaSemana: 6, abre: 1320, fecha: 120 },
        { diaSemana: 0, abre: 60, fecha: 180 },
      ]),
    ).toBe("Há horários sobrepostos.");
  });
});
