/**
 * Worker de integrações. Roda continuamente, separado do site:
 * - a cada 30 s busca eventos do iFood (polling exigido na homologação);
 * - a cada 5 s envia ao iFood as ações feitas no painel.
 *
 * Variáveis: DATABASE_URL, IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET, IFOOD_MERCHANT_ID,
 * IFOOD_API_URL (opcional), IFOOD_CODIGO_CANCELAMENTO (opcional).
 */
import { ClienteIfood } from "@delivery/ifood";
import { cicloEventos, processarComandos, registrarErro } from "./ifood";

const INTERVALO_EVENTOS = Number(process.env.IFOOD_INTERVALO_MS ?? 30_000);
const INTERVALO_COMANDOS = 5_000;

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    console.error(`Variável ${nome} não definida.`);
    process.exit(1);
  }
  return valor;
}

const cliente = new ClienteIfood({
  clientId: obrigatoria("IFOOD_CLIENT_ID"),
  clientSecret: obrigatoria("IFOOD_CLIENT_SECRET"),
  merchantId: obrigatoria("IFOOD_MERCHANT_ID"),
  baseUrl: process.env.IFOOD_API_URL,
});
// Código de motivo exigido pelo iFood ao cancelar; conferir a lista em /cancellationReasons.
const codigoCancelamento = process.env.IFOOD_CODIGO_CANCELAMENTO ?? "501";

let encerrando = false;
const registro = (...partes: unknown[]) => console.log(new Date().toISOString(), ...partes);

async function repetir(nome: string, intervalo: number, tarefa: () => Promise<number>) {
  while (!encerrando) {
    const inicio = Date.now();
    try {
      const quantidade = await tarefa();
      if (quantidade > 0) registro(`${nome}: ${quantidade}`);
    } catch (erro) {
      registro(`${nome}: erro`, (erro as Error).message);
      await registrarErro(erro).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, Math.max(0, intervalo - (Date.now() - inicio))));
  }
}

for (const sinal of ["SIGINT", "SIGTERM"] as const) {
  process.on(sinal, () => {
    registro("Encerrando…");
    encerrando = true;
    setTimeout(() => process.exit(0), 2_000);
  });
}

registro(`Worker iFood iniciado (loja ${cliente.merchantId}).`);
void repetir("eventos", INTERVALO_EVENTOS, () => cicloEventos(cliente));
void repetir("comandos", INTERVALO_COMANDOS, () => processarComandos(cliente, codigoCancelamento));
