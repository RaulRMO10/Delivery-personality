/**
 * Funcionamento da loja: horários, pausas e datas fechadas.
 * Horários em minutos desde 00:00 no fuso da loja.
 */

export const FUSO_LOJA = "America/Sao_Paulo";

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export interface Intervalo {
  /** 0 = domingo … 6 = sábado */
  diaSemana: number;
  abre: number;
  /** Se `fecha <= abre`, o intervalo termina no dia seguinte. */
  fecha: number;
}

export interface EstadoManual {
  fechadaManual: boolean;
  pausadaAte: Date | null;
}

export type StatusLoja =
  | { aberta: true; fechaEm: Date | null }
  | { aberta: false; motivo: "fechada" | "pausada" | "fora_do_horario" | "data_fechada"; reabreEm: Date | null };

interface Local {
  diaSemana: number;
  minutos: number;
  data: string;
}

const formatoLocal = (fuso: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

const DIA_INGLES: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Dia da semana, minutos e data (AAAA-MM-DD) no fuso informado. */
export function horarioLocal(instante: Date, fuso = FUSO_LOJA): Local {
  const partes = Object.fromEntries(formatoLocal(fuso).formatToParts(instante).map((p) => [p.type, p.value]));
  return {
    diaSemana: DIA_INGLES[partes.weekday!]!,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
    data: `${partes.year}-${partes.month}-${partes.day}`,
  };
}

export function textoParaMinutos(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function minutosParaTexto(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Intervalos já abertos em minutos absolutos da semana (0 = domingo 00:00), quebrando os que viram o dia. */
function intervalosSemanais(intervalos: readonly Intervalo[]): [number, number][] {
  const SEMANA = 7 * 1440;
  const resultado: [number, number][] = [];
  for (const i of intervalos) {
    const inicio = i.diaSemana * 1440 + i.abre;
    const duracao = i.fecha > i.abre ? i.fecha - i.abre : 1440 - i.abre + i.fecha;
    const fim = inicio + duracao;
    if (fim <= SEMANA) resultado.push([inicio, fim]);
    else resultado.push([inicio, SEMANA], [0, fim - SEMANA]);
  }
  return resultado;
}

function minutoDaSemana(local: Local) {
  return local.diaSemana * 1440 + local.minutos;
}

/**
 * Situação da loja no instante informado.
 * Prioridade: fechada manualmente > pausa > data fechada > horário.
 */
export function statusLoja(
  agora: Date,
  intervalos: readonly Intervalo[],
  manual: EstadoManual,
  datasFechadas: ReadonlySet<string> = new Set(),
  fuso = FUSO_LOJA,
): StatusLoja {
  if (manual.fechadaManual) return { aberta: false, motivo: "fechada", reabreEm: null };
  if (manual.pausadaAte && manual.pausadaAte > agora) return { aberta: false, motivo: "pausada", reabreEm: manual.pausadaAte };

  const proxima = () => proximaAbertura(agora, intervalos, datasFechadas, fuso);
  const local = horarioLocal(agora, fuso);
  if (datasFechadas.has(local.data)) return { aberta: false, motivo: "data_fechada", reabreEm: proxima() };

  const atual = minutoDaSemana(local);
  const aberto = intervalosSemanais(intervalos).find(([inicio, fim]) => atual >= inicio && atual < fim);
  if (!aberto) return { aberta: false, motivo: "fora_do_horario", reabreEm: proxima() };
  const inicioDoMinuto = Math.floor(agora.getTime() / 60_000) * 60_000;
  return { aberta: true, fechaEm: new Date(inicioDoMinuto + (aberto[1] - atual) * 60_000) };
}

/** Próximo instante em que a loja abre (considerando datas fechadas), em até 14 dias. */
export function proximaAbertura(
  agora: Date,
  intervalos: readonly Intervalo[],
  datasFechadas: ReadonlySet<string> = new Set(),
  fuso = FUSO_LOJA,
): Date | null {
  if (intervalos.length === 0) return null;
  const inicioMinuto = new Date(Math.floor(agora.getTime() / 60_000) * 60_000);
  const local = horarioLocal(inicioMinuto, fuso);
  const atual = minutoDaSemana(local);
  const aberturas = intervalos.map((i) => i.diaSemana * 1440 + i.abre);
  const SEMANA = 7 * 1440;

  // Avança semana a semana pelos inícios de intervalo, pulando datas fechadas.
  const candidatos = aberturas
    .flatMap((a) => [a, a + SEMANA])
    .map((a) => (a > atual ? a - atual : a + SEMANA - atual))
    .sort((x, y) => x - y);
  for (const minutos of [...new Set(candidatos)]) {
    const instante = new Date(inicioMinuto.getTime() + minutos * 60_000);
    if (!datasFechadas.has(horarioLocal(instante, fuso).data)) return instante;
  }
  return null;
}

const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, hour: "2-digit", minute: "2-digit" });
const formatoDiaSemana = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, weekday: "short" });

/** "às 10:00", "amanhã às 10:00" ou "sex. às 10:00", relativo a `agora`, no fuso da loja. */
export function quandoReabre(instante: Date, agora: Date): string {
  const hora = formatoHora.format(instante);
  const hoje = horarioLocal(agora).data;
  const dia = horarioLocal(instante).data;
  if (dia === hoje) return `às ${hora}`;
  const amanha = horarioLocal(new Date(agora.getTime() + 86_400_000)).data;
  if (dia === amanha) return `amanhã às ${hora}`;
  return `${formatoDiaSemana.format(instante)} às ${hora}`;
}

/** Texto curto da situação da loja. */
export function descreverStatus(status: StatusLoja, agora: Date): string {
  if (status.aberta) return status.fechaEm ? `Aberta · fecha às ${formatoHora.format(status.fechaEm)}` : "Aberta";
  if (status.motivo === "pausada" && status.reabreEm) return `Pausada até ${formatoHora.format(status.reabreEm)}`;
  if (status.motivo === "fechada") return "Fechada";
  return status.reabreEm ? `Fechada · abre ${quandoReabre(status.reabreEm, agora)}` : "Fechada";
}

export interface RegrasEntrega {
  freteGratisAcima: number | null;
}

/** Taxa de entrega do bairro, zerada quando o subtotal atinge o frete grátis. */
export function taxaEntrega(subtotal: number, taxaBairro: number, regras: RegrasEntrega): number {
  if (regras.freteGratisAcima !== null && subtotal >= regras.freteGratisAcima) return 0;
  return taxaBairro;
}

/** Valida os intervalos de um mesmo dia: sem duração zero e sem sobreposição. */
export function validarIntervalos(intervalos: readonly Intervalo[]): string | null {
  for (const i of intervalos) {
    if (i.diaSemana < 0 || i.diaSemana > 6) return "Dia inválido.";
    if (i.abre === i.fecha) return `${DIAS_SEMANA[i.diaSemana]}: abertura e fechamento iguais.`;
  }
  const semanais = intervalosSemanais(intervalos).sort((a, b) => a[0] - b[0]);
  for (let k = 1; k < semanais.length; k++) {
    if (semanais[k]![0] < semanais[k - 1]![1]) return "Há horários sobrepostos.";
  }
  return null;
}
