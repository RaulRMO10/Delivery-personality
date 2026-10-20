import type { AcaoPedidoIfood, EventoIfood, PedidoIfood } from "./tipos";

export interface ConfigIfood {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  /** Padrão: API de produção. Em testes, aponta para um simulador. */
  baseUrl?: string;
  fetch?: typeof fetch;
  agora?: () => number;
}

export class ErroIfood extends Error {
  constructor(
    mensagem: string,
    readonly status: number | null,
    readonly corpo?: string,
  ) {
    super(mensagem);
  }

  /** Erros temporários (rede, 429, 5xx) podem ser tentados de novo. */
  get temporario() {
    return this.status === null || this.status === 429 || this.status >= 500;
  }
}

const CAMINHO_ACAO: Record<Exclude<AcaoPedidoIfood, "cancelar">, string> = {
  confirmar: "confirm",
  iniciar_preparo: "startPreparation",
  pronto: "readyToPickup",
  despachar: "dispatch",
};

/** Cliente da Merchant API: autenticação, eventos e ações do pedido. */
export class ClienteIfood {
  private token: { valor: string; expiraEm: number } | null = null;
  private readonly base: string;
  private readonly fetch: typeof fetch;
  private readonly agora: () => number;

  constructor(private readonly config: ConfigIfood) {
    this.base = (config.baseUrl ?? "https://merchant-api.ifood.com.br").replace(/\/$/, "");
    this.fetch = config.fetch ?? fetch;
    this.agora = config.agora ?? Date.now;
  }

  get merchantId() {
    return this.config.merchantId;
  }

  /** Token de acesso, renovado 60 s antes de expirar. */
  async obterToken(): Promise<string> {
    if (this.token && this.token.expiraEm - 60_000 > this.agora()) return this.token.valor;
    const corpo = new URLSearchParams({ grantType: "client_credentials", clientId: this.config.clientId, clientSecret: this.config.clientSecret });
    const resposta = await this.chamar("/authentication/v1.0/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo.toString(),
      semToken: true,
    });
    const dados = (await resposta.json()) as { accessToken: string; expiresIn: number };
    this.token = { valor: dados.accessToken, expiraEm: this.agora() + dados.expiresIn * 1000 };
    return dados.accessToken;
  }

  /** Eventos pendentes da loja (lista vazia quando não há novidades). */
  async buscarEventos(): Promise<EventoIfood[]> {
    const resposta = await this.chamar("/events/v1.0/events:polling", { headers: { "x-polling-merchants": this.config.merchantId } });
    if (resposta.status === 204) return [];
    return (await resposta.json()) as EventoIfood[];
  }

  /** Confirma o recebimento dos eventos; sem isso, o iFood os reenvia. */
  async confirmarEventos(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.chamar("/events/v1.0/events/acknowledgment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids.map((id) => ({ id }))),
    });
  }

  async buscarPedido(id: string): Promise<PedidoIfood> {
    const resposta = await this.chamar(`/order/v1.0/orders/${encodeURIComponent(id)}`);
    return (await resposta.json()) as PedidoIfood;
  }

  async executarAcao(pedidoId: string, acao: AcaoPedidoIfood, cancelamento?: { motivo: string; codigo: string }): Promise<void> {
    const id = encodeURIComponent(pedidoId);
    if (acao === "cancelar") {
      if (!cancelamento) throw new Error("Motivo do cancelamento obrigatório.");
      await this.chamar(`/order/v1.0/orders/${id}/requestCancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelamento.motivo, cancellationCode: cancelamento.codigo }),
      });
      return;
    }
    await this.chamar(`/order/v1.0/orders/${id}/${CAMINHO_ACAO[acao]}`, { method: "POST" });
  }

  private async chamar(caminho: string, opcoes: RequestInit & { semToken?: boolean } = {}): Promise<Response> {
    const { semToken, headers, ...resto } = opcoes;
    const cabecalhos: Record<string, string> = { ...(headers as Record<string, string>) };
    if (!semToken) cabecalhos.Authorization = `Bearer ${await this.obterToken()}`;
    let resposta: Response;
    try {
      resposta = await this.fetch(`${this.base}${caminho}`, { ...resto, headers: cabecalhos, signal: AbortSignal.timeout(20_000) });
    } catch (erro) {
      throw new ErroIfood(`Falha de rede ao chamar ${caminho}: ${(erro as Error).message}`, null);
    }
    if (resposta.status === 401 && !semToken) this.token = null;
    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      throw new ErroIfood(`iFood respondeu ${resposta.status} em ${caminho}`, resposta.status, corpo.slice(0, 500));
    }
    return resposta;
  }
}
